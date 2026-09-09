// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLedgerStream, waitForStream } from '../../../src/client/stream.js';
import type {
	LedgerStreamAdapter,
	LedgerStreamEvent,
	LedgerStreamRequest,
} from '../../../src/client/stream.js';
import type { SuiClientTypes } from '../../../src/client/types.js';

type Frame = { $kind: 'Item'; value: number; resumeToken: string };
const item = (value: number, cp = String(value)): LedgerStreamEvent<Frame> => ({
	$kind: 'item',
	frame: { $kind: 'Item', value, resumeToken: '' },
	position: { cursor: String(value), checkpoint: cp },
});
const end = { $kind: 'end', complete: true } as const;
const retry = { initialDelay: 0, maxDelay: 0, jitter: 0, maxAttempts: 2 };
function adapter(overrides: Partial<LedgerStreamAdapter<Frame>> = {}): LedgerStreamAdapter<Frame> {
	return {
		transport: 'graphql',
		family: 'events',
		initialize: vi.fn(async () => ({ chain: 'chain-a', filter: { package: 'resolved-package' } })),
		getIndexedTip: vi.fn(async () => '10'),
		comparePositions: (a, b) => Number(a.cursor) - Number(b.cursor),
		isRetryable: (error) => error instanceof TypeError,
		scan: vi.fn(async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
			yield item(1);
			yield item(2);
			yield end;
		}),
		live: vi.fn(async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
			yield item(11);
			yield item(12);
		}),
		...overrides,
	};
}
async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
	const result: T[] = [];
	for await (const value of iterable) result.push(value);
	return result;
}
async function token(value = 2, options: SuiClientTypes.StreamOptions = {}, source = adapter()) {
	source.live = async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
		yield item(value);
	};
	const stream = createLedgerStream({ start: { checkpoint: '0' }, ...options }, source);
	const next = await stream.next();
	await stream.return(undefined);
	return (next.value as Frame).resumeToken;
}

afterEach(() => vi.useRealTimers());

describe('ledger stream range and tokens', () => {
	it('starts lazily and captures the indexed tip once for finite ascending reads', async () => {
		const source = adapter();
		const stream = createLedgerStream(
			{ start: { checkpoint: '0' }, follow: false, include: { completion: true } },
			source,
		);
		expect(source.initialize).not.toHaveBeenCalled();
		const frames = await collect(stream);
		expect(source.getIndexedTip).toHaveBeenCalledTimes(1);
		expect(source.scan).toHaveBeenCalledWith(
			expect.objectContaining({ start: { checkpoint: '0' }, end: { checkpoint: '11' } }),
		);
		expect(frames.at(-1)).toMatchObject({
			$kind: 'Complete',
			completion: {
				reason: 'indexedTip',
				order: 'ascending',
				range: { capturedCheckpoint: '10', end: { checkpoint: '11' } },
				resumeToken: (frames[1] as Frame).resumeToken,
			},
		});
	});

	it('retains captured tip and direction when resuming after the ledger grows', async () => {
		const source = adapter();
		const first = createLedgerStream({ order: 'descending' }, source);
		const saved = (await first.next()).value as Frame;
		await first.return(undefined);
		const resumed = adapter({ getIndexedTip: vi.fn(async () => '20') });
		await collect(
			createLedgerStream(
				{ start: { resumeToken: saved.resumeToken }, include: { completion: true } },
				resumed,
			),
		);
		expect(resumed.getIndexedTip).not.toHaveBeenCalled();
		expect(resumed.scan).toHaveBeenCalledWith(
			expect.objectContaining({
				order: 'descending',
				capturedTip: '10',
				start: { position: { cursor: '1', checkpoint: '1' } },
			}),
		);
	});

	it('rejects replacing an implicit genesis bound when resuming descending history', async () => {
		const stream = createLedgerStream({ order: 'descending' }, adapter());
		const saved = (await stream.next()).value as Frame;
		await stream.return(undefined);
		await expect(
			collect(
				createLedgerStream(
					{ start: { resumeToken: saved.resumeToken }, end: { checkpoint: '0' } },
					adapter(),
				),
			),
		).rejects.toThrow('end bound cannot change');
	});

	it('uses a recoverable checkpoint baseline before the first live match', async () => {
		const source = adapter();
		const stream = createLedgerStream({}, source);
		await stream.next();
		expect(source.live).toHaveBeenCalledWith(
			expect.objectContaining({ start: { checkpoint: '11' } }),
		);
		await stream.return(undefined);
	});

	it('captures ascending finite end across retries and resumed jobs', async () => {
		const first = createLedgerStream({ start: { checkpoint: '0' }, follow: false }, adapter());
		const saved = (await first.next()).value as Frame;
		await first.return(undefined);
		const source = adapter({ getIndexedTip: vi.fn(async () => '20') });
		await collect(createLedgerStream({ start: { resumeToken: saved.resumeToken } }, source));
		expect(source.getIndexedTip).not.toHaveBeenCalled();
		expect(source.scan).toHaveBeenCalledWith(
			expect.objectContaining({ end: { checkpoint: '11' } }),
		);
		await expect(
			collect(
				createLedgerStream(
					{ start: { resumeToken: saved.resumeToken }, end: { checkpoint: '21' } },
					source,
				),
			),
		).rejects.toThrow('end bound cannot change');
		await expect(
			collect(
				createLedgerStream({ start: { resumeToken: saved.resumeToken }, follow: true }, source),
			),
		).rejects.toThrow('Cannot expand');
	});

	it.each(['transport', 'family', 'chain', 'filter'] as const)(
		'rejects incompatible %s identities',
		async (field) => {
			const saved = await token();
			const source = adapter();
			if (field === 'transport') source.transport = 'grpc';
			else if (field === 'family') source.family = 'transactions';
			else
				source.initialize = async () => ({
					chain: field === 'chain' ? 'other' : 'chain-a',
					filter:
						field === 'filter'
							? { package: 'updated-resolution' }
							: { package: 'resolved-package' },
				});
			await expect(
				createLedgerStream({ start: { resumeToken: saved } }, source).next(),
			).rejects.toThrow('incompatible');
			expect(source.live).not.toHaveBeenCalled();
		},
	);

	it('validates native token metadata before a mixed-bound empty completion', async () => {
		const saved = await token(2);
		const source = adapter({
			validatePosition: () => {
				throw new Error('native metadata mismatch');
			},
		});
		await expect(
			collect(
				createLedgerStream(
					{
						start: { resumeToken: saved },
						end: { checkpoint: '2' },
						include: { completion: true },
					},
					source,
				),
			),
		).rejects.toThrow('native metadata mismatch');
		expect(source.scan).not.toHaveBeenCalled();
	});

	it('validates end-token native positions even for an empty interval', async () => {
		const saved = await token(2);
		const source = adapter({
			validatePosition: () => {
				throw new Error('invalid cursor kind');
			},
		});
		await expect(
			collect(
				createLedgerStream({ start: { checkpoint: '2' }, end: { resumeToken: saved } }, source),
			),
		).rejects.toThrow('invalid cursor kind');
		expect(source.scan).not.toHaveBeenCalled();
	});

	it('normalizes object key ordering and permits completion/projection changes', async () => {
		const saved = await token(
			2,
			{},
			adapter({ initialize: async () => ({ chain: 'a', filter: { b: 2, a: 1 } }) }),
		);
		const source = adapter({ initialize: async () => ({ chain: 'a', filter: { a: 1, b: 2 } }) });
		const frames = await collect(
			createLedgerStream(
				{ start: { resumeToken: saved }, follow: false, include: { completion: true } },
				source,
			),
		);
		expect(frames.at(-1)?.$kind).toBe('Complete');
	});

	it('uses tokens as exact interval positions without importing end-token direction or range', async () => {
		const older = await token(2);
		const newer = await token(
			5,
			{ order: 'descending' },
			adapter({
				scan: async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
					yield item(5);
					yield end;
				},
			}),
		);
		const source = adapter();
		await collect(
			createLedgerStream({ start: { resumeToken: older }, end: { resumeToken: newer } }, source),
		);
		expect(source.scan).toHaveBeenCalledWith(
			expect.objectContaining({
				order: 'ascending',
				start: { position: { cursor: '2', checkpoint: '2' } },
				end: { position: { cursor: '5', checkpoint: '5' } },
			}),
		);
	});

	it('compares exact positions numerically instead of encoded token strings', async () => {
		const later = await token(10);
		const earlier = await token(2);
		await expect(
			collect(
				createLedgerStream(
					{ start: { resumeToken: later }, end: { resumeToken: earlier } },
					adapter(),
				),
			),
		).rejects.toThrow('reversed');
	});

	it.each(['ascending', 'descending'] as const)(
		'completes equal %s bounds without a scan',
		async (order) => {
			const source = adapter();
			const frames = await collect(
				createLedgerStream(
					{
						start: { checkpoint: '0' },
						end: { checkpoint: '0' },
						order,
						include: { completion: true },
					},
					source,
				),
			);
			expect(source.scan).not.toHaveBeenCalled();
			expect(frames).toMatchObject([
				{ $kind: 'Complete', completion: { reason: 'checkpointBound' } },
			]);
		},
	);

	it('supports the uint64 maximum without overflowing a captured exclusive end', async () => {
		const max = ((1n << 64n) - 1n).toString();
		const source = adapter({ getIndexedTip: async () => max });
		await collect(createLedgerStream({ start: { checkpoint: max }, follow: false }, source));
		expect(source.scan).toHaveBeenCalledWith(
			expect.objectContaining({ end: { checkpoint: (1n << 64n).toString() }, capturedTip: max }),
		);
	});

	it.each([
		{ start: {} },
		{ start: { checkpoint: '0', resumeToken: 'x' } },
		{ start: { checkpoint: '-1' } },
		{ start: { checkpoint: '1.5' } },
		{ start: { checkpoint: '18446744073709551616' } },
		{ end: {} },
		{ follow: true, order: 'descending' },
		{ follow: true, end: { checkpoint: '5' } },
		{ follow: false },
		{ pollInterval: 0 },
		{ retry: { maxAttempts: -1 } },
		{ retry: { maxDelay: 1, initialDelay: 2 } },
		{ start: { resumeToken: 'broken' } },
	] as SuiClientTypes.StreamOptions[])(
		'rejects invalid options %j before network work',
		async (options) => {
			const source = adapter();
			await expect(createLedgerStream(options, source).next()).rejects.toThrow();
			expect(source.initialize).not.toHaveBeenCalled();
		},
	);
});

describe('ledger stream delivery and cleanup', () => {
	it('waits through empty scans before an explicit future bound', async () => {
		vi.useFakeTimers();
		let scans = 0;
		const source = adapter({
			scan: vi.fn(async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
				if (++scans === 1) yield { $kind: 'end', complete: false };
				else {
					yield item(12);
					yield end;
				}
			}),
		});
		const result = collect(
			createLedgerStream(
				{
					start: { checkpoint: '1' },
					end: { checkpoint: '13' },
					include: { completion: true },
					pollInterval: 20,
				},
				source,
			),
		);
		await vi.advanceTimersByTimeAsync(19);
		expect(scans).toBe(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(await result).toMatchObject([{ $kind: 'Item', value: 12 }, { $kind: 'Complete' }]);
	});

	it('retains empty-scan safe progress for polling and delivers no itemless default frames', async () => {
		vi.useFakeTimers();
		let scans = 0;
		const source = adapter({
			scan: vi.fn(async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
				if (++scans === 1) {
					yield { $kind: 'progress', position: { cursor: '15', checkpoint: '15' } };
					yield { $kind: 'end', complete: false };
				} else {
					yield item(16);
					yield end;
				}
			}),
		});
		const stream = createLedgerStream({ delivery: 'poll', pollInterval: 10 }, source);
		const next = stream.next();
		await vi.advanceTimersByTimeAsync(10);
		expect((await next).value).toMatchObject({ $kind: 'Item', value: 16 });
		expect(source.scan).toHaveBeenLastCalledWith(
			expect.objectContaining({ start: { position: { cursor: '15', checkpoint: '15' } } }),
		);
		expect(source.live).not.toHaveBeenCalled();
		await stream.return(undefined);
	});

	it('saves tokens only through the delivered item with a slow consumer', async () => {
		let pulled = 0;
		const source = adapter({
			live: async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
				for (let n = 1; n <= 3; n++) {
					pulled++;
					yield item(n);
				}
			},
		});
		const stream = createLedgerStream({ start: { checkpoint: '0' } }, source);
		const first = (await stream.next()).value as Frame;
		await Promise.resolve();
		expect(pulled).toBe(1);
		await stream.return(undefined);
		const resumed = adapter();
		const continuation = createLedgerStream({ start: { resumeToken: first.resumeToken } }, resumed);
		await continuation.next();
		expect(resumed.live).toHaveBeenCalledWith(
			expect.objectContaining({ start: { position: { cursor: '1', checkpoint: '1' } } }),
		);
		await continuation.return(undefined);
	});

	it('retries from the last yielded item and keeps the original end', async () => {
		let attempts = 0;
		const source = adapter({
			scan: vi.fn(async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
				if (++attempts === 1) {
					yield item(1);
					throw new TypeError('network');
				}
				yield item(2);
				yield end;
			}),
		});
		const frames = await collect(
			createLedgerStream({ start: { checkpoint: '0' }, follow: false, retry }, source),
		);
		expect(frames).toMatchObject([{ value: 1 }, { value: 2 }]);
		expect(source.scan).toHaveBeenLastCalledWith(
			expect.objectContaining({
				start: { position: { cursor: '1', checkpoint: '1' } },
				end: { checkpoint: '11' },
			}),
		);
		expect(source.getIndexedTip).toHaveBeenCalledTimes(1);
	});

	it('bounds consecutive retries and resets the budget only with progress', async () => {
		let calls = 0;
		const source = adapter({
			live: vi.fn(async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
				calls++;
				if (calls === 2) yield item(2);
				throw new TypeError('network');
			}),
		});
		await expect(
			collect(createLedgerStream({ retry: { ...retry, maxAttempts: 1 } }, source)),
		).rejects.toThrow('network');
		expect(calls).toBe(3);
	});

	it('treats a thrown diagnostic callback as terminal even if its error looks transient', async () => {
		const source = adapter();
		await expect(
			collect(
				createLedgerStream(
					{
						retry,
						onStatus: () => {
							throw new TypeError('callback');
						},
					},
					source,
				),
			),
		).rejects.toThrow('callback');
		expect(source.live).not.toHaveBeenCalled();
	});

	it('rejects missing terminal metadata instead of reporting completion', async () => {
		const source = adapter({
			scan: async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
				yield item(1);
			},
		});
		await expect(
			collect(
				createLedgerStream(
					{ start: { checkpoint: '0' }, follow: false, include: { completion: true } },
					source,
				),
			),
		).rejects.toThrow('terminal range result');
	});

	it('does not attach a safe token to raw metadata', async () => {
		const source = adapter({
			scan: async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
				yield item(1);
				yield { $kind: 'metadata', frame: { $kind: 'Item', value: 99 } as Frame };
				yield end;
			},
		});
		const frames = await collect(
			createLedgerStream(
				{ start: { checkpoint: '0' }, end: { checkpoint: '5' }, include: { completion: true } },
				source,
			),
		);
		expect(frames[1]).not.toHaveProperty('resumeToken');
		expect(frames[2]).toMatchObject({
			completion: { resumeToken: (frames[0] as Frame).resumeToken },
		});
	});

	it('cancels an active quiet read on return while next is pending', async () => {
		let activeSignal: AbortSignal | undefined;
		let started!: () => void;
		const ready = new Promise<void>((resolve) => {
			started = resolve;
		});
		const source = adapter({
			live: async function* (request: LedgerStreamRequest) {
				activeSignal = request.signal;
				started();
				await waitForStream(60_000, request.signal);
				yield item(1);
			},
		});
		const stream = createLedgerStream({}, source);
		const next = stream.next();
		const rejected = expect(next).rejects.toMatchObject({ name: 'AbortError' });
		await ready;
		const returned = stream.return(undefined);
		expect(activeSignal?.aborted).toBe(true);
		await rejected;
		await returned;
	});

	it('lets native subscriptions establish an initial safe baseline without a tip query', async () => {
		const source = adapter({
			liveFromTip: true,
			live: vi.fn(async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
				yield {
					$kind: 'progress',
					position: { cursor: '10', coveredCheckpoint: '10' },
					frame: { $kind: 'Item', value: 0, resumeToken: '' },
				};
				yield item(11);
			}),
		});
		const stream = createLedgerStream({}, source);
		const first = (await stream.next()).value as Frame;
		expect(first.resumeToken).toMatch(/^sui-stream-v1:/);
		expect(source.getIndexedTip).not.toHaveBeenCalled();
		expect(source.live).toHaveBeenCalledWith(expect.objectContaining({ start: undefined }));
		await stream.return(undefined);
	});

	it('keeps the initial GraphQL baseline across disconnects before the first match', async () => {
		let calls = 0;
		const source = adapter({
			live: vi.fn(async function* (): AsyncGenerator<LedgerStreamEvent<Frame>> {
				if (++calls === 1) throw new TypeError('disconnected before first item');
				yield item(11);
			}),
		});
		const stream = createLedgerStream({ retry }, source);
		await stream.next();
		expect(source.getIndexedTip).toHaveBeenCalledTimes(1);
		expect(source.live).toHaveBeenCalledTimes(2);
		expect(source.live).toHaveBeenLastCalledWith(
			expect.objectContaining({ start: { checkpoint: '11' } }),
		);
		await stream.return(undefined);
	});

	it('retains the newly captured range on an empty finite continuation', async () => {
		const saved = await token();
		const source = adapter({
			scan: async function* () {
				yield end;
			},
		});
		const frames = await collect(
			createLedgerStream(
				{ start: { resumeToken: saved }, follow: false, include: { completion: true } },
				source,
			),
		);
		const completion = frames[0] as SuiClientTypes.StreamCompletionFrame;
		const resumed = adapter();
		await collect(
			createLedgerStream({ start: { resumeToken: completion.completion.resumeToken! } }, resumed),
		);
		expect(resumed.getIndexedTip).not.toHaveBeenCalled();
		expect(resumed.scan).toHaveBeenCalledWith(
			expect.objectContaining({ end: { checkpoint: '11' } }),
		);
	});

	it('aborts before startup without reading identity or reporting completion', async () => {
		const source = adapter();
		const signal = AbortSignal.abort(new Error('cancelled'));
		await expect(createLedgerStream({ signal }, source).next()).rejects.toThrow('cancelled');
		expect(source.initialize).not.toHaveBeenCalled();
	});

	it('cancels retry waits and never emits successful completion', async () => {
		const controller = new AbortController();
		const statuses: string[] = [];
		const source = adapter({
			scan: () => {
				throw new TypeError('network');
			},
		});
		const result = collect(
			createLedgerStream(
				{
					start: { checkpoint: '0' },
					follow: false,
					signal: controller.signal,
					include: { completion: true },
					retry: { initialDelay: 30_000 },
					onStatus: (status) => {
						statuses.push(status.$kind);
						if (status.$kind === 'Retrying') controller.abort();
					},
				},
				source,
			),
		);
		await expect(result).rejects.toMatchObject({ name: 'AbortError' });
		expect(statuses).toEqual(['Connecting', 'Retrying']);
	});
});
