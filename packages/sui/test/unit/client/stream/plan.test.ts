// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SuiStreamError } from '../../../../src/client/stream/errors.js';
import { progressPosition } from '../../../../src/client/stream/position.js';
import { compareBounds } from '../../../../src/client/stream/plan.js';
import { decodeToken, encodeToken } from '../../../../src/client/stream/token.js';
import type { SuiClientTypes } from '../../../../src/client/types.js';
import {
	collect,
	fakeAdapter,
	ids,
	Ledger,
	NetworkError,
	statusLog,
	stream,
	take,
	tokenOf,
	type FakeOptions,
	cursorOf,
} from './fake-ledger.js';

type Options = SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions>;

/** Checkpoints 0..10 with one item each, all indexed. */
const tenCheckpoints = () => new Ledger(Array(11).fill(1));

/** The token of the `count`th frame of a stream. */
async function tokenAt(options: Options, count = 1, fake: FakeOptions = {}) {
	const adapter = fakeAdapter(tenCheckpoints(), fake);
	return tokenOf((await take(stream(adapter, options), count)).at(-1));
}
const followToken = () => tokenAt({ start: { checkpoint: 2 } }, 1, { live: [] }); // after 2:0
const finiteToken = () => tokenAt({ start: { checkpoint: 0 }, follow: false }); // range ends at tip + 1
const descendingToken = () => tokenAt({ order: 'descending' }); // range ends at genesis
/** A token whose position no SDK stream produces: progress without a cursor. */
async function invalidToken() {
	const token = decodeToken(await followToken());
	return encodeToken({
		...token,
		position: { ...token.position, kind: 'Progress', checkpoint: null },
	});
}

async function failure(options: Options, adapter = fakeAdapter(tenCheckpoints())) {
	const error = await stream(adapter, options)
		.next()
		.then(
			() => undefined,
			(error: unknown) => error,
		);
	return { error: error as SuiStreamError, adapter };
}

describe('option errors', () => {
	it.each<[string, () => Promise<Options> | Options, string]>([
		[
			'follow with descending order',
			() => ({ follow: true, order: 'descending' }),
			'InvalidOptions',
		],
		['follow with an end', () => ({ follow: true, end: { checkpoint: 5 } }), 'InvalidOptions'],
		['a finite ascending stream without a start', () => ({ follow: false }), 'InvalidOptions'],
		[
			'a negative checkpoint',
			() => ({ start: { checkpoint: -1 }, follow: false }),
			'InvalidOptions',
		],
		['a fractional checkpoint', () => ({ start: { checkpoint: '1.5' } }), 'InvalidOptions'],
		[
			'a checkpoint above 2^53',
			() => ({ start: { checkpoint: 0 }, end: { checkpoint: '9007199254740992' } }),
			'InvalidOptions',
		],
		['a zero poll interval', () => ({ pollInterval: 0 }), 'InvalidOptions'],
		['a negative retry budget', () => ({ retry: { maxAttempts: -1 } }), 'InvalidOptions'],
		['a malformed token', () => ({ start: { resumeToken: 'broken' } }), 'InvalidToken'],
		['an empty token', () => ({ start: { resumeToken: '' } }), 'InvalidToken'],
		[
			'a changed traversal order',
			async () => ({ start: { resumeToken: await descendingToken() }, order: 'ascending' }),
			'IncompatibleToken',
		],
		[
			'following a finite token',
			async () => ({ start: { resumeToken: await finiteToken() }, follow: true }),
			'IncompatibleToken',
		],
		[
			'a changed end',
			async () => ({ start: { resumeToken: await finiteToken() }, end: { checkpoint: 21 } }),
			'IncompatibleToken',
		],
		[
			'an explicit end replacing an implicit genesis end',
			async () => ({ start: { resumeToken: await descendingToken() }, end: { checkpoint: 0 } }),
			'IncompatibleToken',
		],
	])('rejects %s before any request', async (_, options, code) => {
		const { error, adapter } = await failure(await options());
		expect(error).toBeInstanceOf(SuiStreamError);
		expect(error.code).toBe(code);
		expect(adapter.calls.initialize).toBe(0);
	});

	it.each([
		['transport', { transport: 'grpc' }, 0],
		['family', { family: 'transactions' }, 0],
		// Only the chain and the resolved filter need the network.
		['chain', { chain: 'other-chain' }, 1],
		['filter', { filter: { sender: '0x2' } }, 1],
	] as const)('rejects a token from another %s', async (_, identity, initialized) => {
		const token = await followToken();
		const adapter = fakeAdapter(tenCheckpoints(), identity);
		const { error } = await failure({ start: { resumeToken: token } }, adapter);
		expect(error.code).toBe('IncompatibleToken');
		expect(adapter.calls.initialize).toBe(initialized);
		expect(adapter.calls.pages).toHaveLength(0);
	});

	describe('rejects input that needs no network before the first request', () => {
		/** An identity request that keeps failing: under the default budget it retries forever. */
		const unreachable = (options: FakeOptions = {}) =>
			fakeAdapter(tenCheckpoints(), {
				...options,
				initializeFaults: Array.from({ length: 1000 }, () => new NetworkError('offline')),
			});

		it.each<[string, () => Promise<Options>, string]>([
			[
				'reversed ascending checkpoints',
				async () => ({ start: { checkpoint: 10 }, end: { checkpoint: 5 } }),
				'InvalidOptions',
			],
			[
				'reversed descending checkpoints',
				async () => ({ order: 'descending', start: { checkpoint: 5 }, end: { checkpoint: 10 } }),
				'InvalidOptions',
			],
			[
				'reversed tokens',
				async () => ({
					start: { resumeToken: await tokenAt({ start: { checkpoint: 8 } }, 1, { live: [] }) },
					end: { resumeToken: await followToken() },
				}),
				'InvalidOptions',
			],
		])('%s', async (_, options, code) => {
			const { log, onStatus } = statusLog();
			const adapter = unreachable();
			const { error } = await failure(
				{ ...(await options()), retry: { initialDelay: 0, maxDelay: 0, jitter: 0 }, onStatus },
				adapter,
			);
			expect(error).toMatchObject({ name: 'SuiStreamError', code });
			expect(adapter.calls.initialize).toBe(0);
			expect(log).toEqual(['Error']);
		});

		it('a token position this SDK cannot have produced', async () => {
			const adapter = unreachable();
			const { error } = await failure({ start: { resumeToken: await invalidToken() } }, adapter);
			expect(error).toMatchObject({ code: 'InvalidToken' });
			expect(adapter.calls.initialize).toBe(0);
		});
	});

	it.each<[string, Options]>([
		['an ascending start beyond the captured tip', { start: { checkpoint: 20 }, follow: false }],
		['a descending end above the tip', { order: 'descending', end: { checkpoint: 20 } }],
	])('rejects %s once the tip is known, without retrying', async (_, options) => {
		const { log, onStatus } = statusLog();
		const adapter = fakeAdapter(tenCheckpoints());
		const { error } = await failure({ ...options, onStatus }, adapter);
		expect(error).toMatchObject({ name: 'SuiStreamError', code: 'InvalidOptions' });
		expect(adapter.calls).toMatchObject({ initialize: 1, indexedTip: 1, pages: [] });
		expect(log.filter((status) => status.startsWith('Retrying'))).toEqual([]);
	});

	it('rejects reversed bounds after resolving them', async () => {
		const later = await tokenAt({ start: { checkpoint: 8 } }, 1, { live: [] });
		const earlier = await followToken();
		const { error } = await failure({
			start: { resumeToken: later },
			end: { resumeToken: earlier },
		});
		expect(error.code).toBe('InvalidOptions');
	});

	it.each(['start', 'end'] as const)(
		'validates %s token positions even when the interval is empty',
		async (side) => {
			const token = await invalidToken();
			const adapter = fakeAdapter(tenCheckpoints());
			const options: Options =
				side === 'start'
					? { start: { resumeToken: token }, end: { checkpoint: 3 } }
					: { start: { checkpoint: 3 }, end: { resumeToken: token } };
			const { error } = await failure(options, adapter);
			expect(error.code).toBe('InvalidToken');
			expect(adapter.calls.pages).toHaveLength(0);
		},
	);
});

describe('range planning', () => {
	it('anchors a fresh follow at the indexed tip and keeps that anchor across reconnects', async () => {
		const ledger = tenCheckpoints();
		ledger.indexedTip = 7n;
		const adapter = fakeAdapter(ledger, {
			// The first connection ends before any match; meanwhile checkpoints 8..10 get indexed.
			live: (connection) => {
				ledger.indexedTip = 10n;
				return connection === 0 ? { events: [], end: 'eof' } : { events: [], end: 'hang' };
			},
		});
		const frames = await take(stream(adapter), 1);
		expect(ids(frames)).toEqual(['8:0']);
		expect(adapter.calls.indexedTip).toBe(1);
		// At the tip it subscribes at once; the reconnect, never live, reads history first.
		expect(adapter.calls.pages.map((page) => page.range)).toEqual([{ start: 8n }]);
	});

	it('uses the indexed tip that initialize returned instead of reading it again', async () => {
		const ledger = tenCheckpoints();
		ledger.indexedTip = 7n;
		const adapter = fakeAdapter(ledger, {
			initializeReadsTip: true,
			live: () => {
				ledger.indexedTip = 10n;
				return { events: ledger.liveFrom(8), end: 'hang' };
			},
		});
		const frames = await take(stream(adapter), 1);
		expect(ids(frames)).toEqual(['8:0']);
		expect(adapter.calls.initialize).toBe(1);
		expect(adapter.calls.indexedTip).toBe(0);
	});

	it('lets an adapter that anchors at the live tip follow without a tip read or page', async () => {
		const ledger = tenCheckpoints();
		const adapter = fakeAdapter(ledger, {
			anchorsAtLiveTip: true,
			live: [{ events: ledger.liveFrom(9), end: 'hang' }],
		});
		const frames = await take(stream(adapter, { frames: { progress: true } }), 3);
		expect(frames.map((frame) => frame.$kind)).toEqual(['Progress', 'Item', 'Item']);
		expect(adapter.calls.indexedTip).toBe(0);
		expect(adapter.calls.pages).toHaveLength(0);
	});

	it('captures the indexed tip once as the end of a finite ascending read', async () => {
		const adapter = fakeAdapter(tenCheckpoints());
		const frames = await collect(
			stream(adapter, { start: { checkpoint: 8 }, follow: false, frames: { completion: true } }),
		);
		expect(ids(frames)).toEqual(['8:0', '9:0', '10:0']);
		expect(adapter.calls.indexedTip).toBe(1);
		expect(adapter.calls.pages[0]).toMatchObject({ range: { start: 8n, end: 11n } });
		expect(frames.at(-1)).toMatchObject({
			$kind: 'Complete',
			completion: {
				reason: 'indexedTip',
				order: 'ascending',
				range: { start: { checkpoint: '8' }, end: { checkpoint: '11' }, capturedCheckpoint: '10' },
				// The boundary after the range: resuming it reads nothing.
				resumeToken: expect.stringMatching(/^sui-stream:/),
			},
		});
	});

	it('keeps the captured tip and direction when a finite read resumes after the ledger grows', async () => {
		const token = await descendingToken(); // after 10:0, captured tip 10
		const ledger = new Ledger(Array(21).fill(1));
		const adapter = fakeAdapter(ledger);
		const frames = await collect(stream(adapter, { start: { resumeToken: token } }));
		expect(adapter.calls.indexedTip).toBe(0);
		expect(adapter.calls.pages[0]).toMatchObject({
			order: 'descending',
			range: { end: 11n },
			before: cursorOf({ checkpoint: 10n, index: 0 }),
		});
		expect(ids(frames)).toEqual([
			'9:0',
			'8:0',
			'7:0',
			'6:0',
			'5:0',
			'4:0',
			'3:0',
			'2:0',
			'1:0',
			'0:0',
		]);
	});

	it('keeps an ascending finite end across resumes and accepts it repeated explicitly', async () => {
		const token = await finiteToken(); // after 0:0, ends at 11
		const ledger = new Ledger(Array(21).fill(1));
		for (const end of [undefined, { checkpoint: 11 }]) {
			const adapter = fakeAdapter(ledger);
			const frames = await collect(stream(adapter, { start: { resumeToken: token }, end }));
			expect(adapter.calls.indexedTip).toBe(0);
			expect(ids(frames)).toHaveLength(10);
		}
	});

	it('starts a new finite range when a follow token is read to the tip', async () => {
		const token = await followToken(); // after 2:0
		const empty = fakeAdapter(new Ledger([1, 1, 1]));
		const [completion] = await collect(
			stream(empty, { start: { resumeToken: token }, follow: false, frames: { completion: true } }),
		);
		expect(completion).toMatchObject({ completion: { range: { end: { checkpoint: '3' } } } });
		// The completion token carries the newly captured range: resuming it reads no tip.
		const resumed = fakeAdapter(tenCheckpoints());
		const { resumeToken } = (completion as SuiClientTypes.StreamCompletionFrame).completion;
		await collect(stream(resumed, { start: { resumeToken: resumeToken! } }));
		expect(resumed.calls.indexedTip).toBe(0);
		// It sits at the range's end, so the resumed range is already complete.
		expect(resumed.calls.pages).toHaveLength(0);
	});

	it('reports the invocation start, not the original start, when resuming', async () => {
		const token = await followToken();
		const frames = await collect(
			stream(fakeAdapter(tenCheckpoints()), {
				start: { resumeToken: token },
				end: { checkpoint: 5 },
				frames: { completion: true },
			}),
		);
		expect(ids(frames)).toEqual(['3:0', '4:0']);
		// The reported start is this invocation's start (after 2:0), not the original checkpoint 2.
		const { start } = (frames.at(-1) as SuiClientTypes.StreamCompletionFrame).completion.range;
		expect(start).toHaveProperty('resumeToken');
		const again = await collect(
			stream(fakeAdapter(tenCheckpoints()), { start, end: { checkpoint: 5 } }),
		);
		expect(ids(again)).toEqual(['3:0', '4:0']);
	});

	it('keeps tokens compatible across filter key order, includes and frame options', async () => {
		const token = await tokenAt({ start: { checkpoint: 2 } }, 1, {
			live: [],
			filter: { b: 2, a: 1, skipped: undefined },
		});
		const adapter = fakeAdapter(tenCheckpoints(), { filter: { a: 1, b: 2 } });
		const frames = await collect(
			stream(adapter, {
				start: { resumeToken: token },
				follow: false,
				frames: { completion: true, progress: true },
			}),
		);
		expect(frames.at(-1)?.$kind).toBe('Complete');
	});

	it('uses an end token only as an exact position, not its direction or range', async () => {
		const start = await followToken(); // after 2:0
		const end = await tokenAt({ order: 'descending' }, 5); // descending token at 6:0
		const adapter = fakeAdapter(tenCheckpoints());
		const frames = await collect(
			stream(adapter, { start: { resumeToken: start }, end: { resumeToken: end } }),
		);
		// The end's checkpoint bounds the read, and its coordinates stop it.
		expect(adapter.calls.pages[0]).toMatchObject({ order: 'ascending', range: { end: 7n } });
		expect(adapter.calls.pages[0].before).toBeUndefined();
		expect(ids(frames)).toEqual(['3:0', '4:0', '5:0']);
	});

	it('leaves positions it cannot order to the server', () => {
		// Progress cursors carry no coordinates, and cursors are never compared.
		const a = { position: progressPosition(new Uint8Array([2])) };
		const b = { position: progressPosition(new Uint8Array([1])) };
		expect(compareBounds(a, b, 'ascending')).toBeUndefined();
		expect(compareBounds(a, a, 'ascending')).toBeUndefined();
	});

	it.each(['ascending', 'descending'] as const)(
		'completes equal %s bounds without a request',
		async (order) => {
			const adapter = fakeAdapter(tenCheckpoints());
			const frames = await collect(
				stream(adapter, {
					order,
					start: { checkpoint: 4 },
					end: { checkpoint: 4 },
					frames: { completion: true },
				}),
			);
			expect(adapter.calls.pages).toHaveLength(0);
			expect(frames).toMatchObject([
				{ $kind: 'Complete', completion: { reason: 'checkpointBound' } },
			]);
		},
	);

	it('compares a checkpoint bound with a token through the checkpoint it reports', async () => {
		const token = await followToken(); // inside checkpoint 2
		const { error } = await failure({ start: { checkpoint: 3 }, end: { resumeToken: token } });
		expect(error.code).toBe('InvalidOptions');
		const frames = await collect(
			stream(fakeAdapter(tenCheckpoints()), {
				start: { checkpoint: 2 },
				end: { resumeToken: token },
			}),
		);
		expect(ids(frames)).toEqual([]);
	});

	it('supports the largest checkpoint without overflowing the exclusive end', async () => {
		const max = (1n << 64n) - 1n;
		const ledger = new Ledger([1]);
		ledger.indexedTip = max;
		const first = fakeAdapter(ledger);
		const token = tokenOf(
			(await take(stream(first, { start: { checkpoint: 0 }, follow: false }), 1))[0],
		);
		expect(first.calls.pages[0]).toMatchObject({ range: { end: max + 1n } });
		const resumed = fakeAdapter(ledger);
		await collect(stream(resumed, { start: { resumeToken: token } }));
		expect(resumed.calls.indexedTip).toBe(0);
		expect(resumed.calls.pages[0]).toMatchObject({ range: { end: max + 1n } });
	});

	it('starts a descending read without a start at the indexed tip and ends at genesis', async () => {
		const adapter = fakeAdapter(new Ledger([1, 1, 1]));
		const frames = await collect(
			stream(adapter, { order: 'descending', frames: { completion: true } }),
		);
		expect(ids(frames)).toEqual(['2:0', '1:0', '0:0']);
		expect(adapter.calls.pages[0]).toMatchObject({ range: { end: 3n } });
		expect(frames.at(-1)).toMatchObject({
			completion: {
				reason: 'genesis',
				range: { start: { checkpoint: '2' }, capturedCheckpoint: '2' },
			},
		});
	});
});
