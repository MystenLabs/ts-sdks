// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Stream behaviour the model test does not cover: option checks, completion, retries, statuses,
 * cancellation and the live handoff on quiet feeds. Exactly-once delivery and resuming are in
 * `model.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { SuiClientError } from '../../../../src/client/errors.js';
import { MvrRequestError } from '../../../../src/client/mvr.js';
import type { Bound } from '../../../../src/client/stream/adapter.js';
import { SuiStreamError } from '../../../../src/client/stream/errors.js';
import { sleep } from '../../../../src/utils/abort.js';
import {
	collect,
	fakeAdapter,
	ids,
	Ledger,
	NetworkError,
	noDelay,
	ServerError,
	statusLog,
	stream,
	take,
	tokenOf,
	type FakeOptions,
} from './fake-ledger.js';

const finite = { start: { checkpoint: 0 }, follow: false } as const;

function rejectsWith(promise: Promise<unknown>, code: string) {
	return expect(promise).rejects.toMatchObject({ name: 'SuiStreamError', code });
}

describe('options', () => {
	it('does nothing before the first next()', async () => {
		const adapter = fakeAdapter(new Ledger([1]));
		const created = stream(adapter, finite);
		await sleep(5, new AbortController().signal);
		expect(adapter.calls).toMatchObject({ initialize: 0, indexedTip: 0, pages: [] });
		await created.return(undefined);
	});

	it.each([
		['a descending follow', { order: 'descending', follow: true }, 'InvalidOptions'],
		['a follow with an end', { end: { checkpoint: 5 }, follow: true }, 'InvalidOptions'],
		['an ascending finite read without a start', { follow: false }, 'InvalidOptions'],
		['a token as the end', { ...finite, end: { resumeToken: 'x' } }, 'InvalidOptions'],
		[
			'reversed checkpoints',
			{ start: { checkpoint: 5 }, end: { checkpoint: 4 } },
			'InvalidOptions',
		],
		[
			'reversed descending checkpoints',
			{ order: 'descending', start: { checkpoint: 4 }, end: { checkpoint: 5 } },
			'InvalidOptions',
		],
		['a bad checkpoint', { ...finite, start: { checkpoint: -1 } }, 'InvalidOptions'],
		['a bad pollInterval', { pollInterval: 0 }, 'InvalidOptions'],
		['a negative retry option', { retry: { maxAttempts: -1 } }, 'InvalidOptions'],
		['a malformed token', { start: { resumeToken: 'sui-stream:AA' } }, 'InvalidToken'],
	] as const)('rejects %s before any request', async (_, options, code) => {
		const adapter = fakeAdapter(new Ledger([1]));
		await rejectsWith(collect(stream(adapter, options as never)), code);
		expect(adapter.calls.initialize).toBe(0);
	});

	it('rejects a token from another stream', async () => {
		const ledger = new Ledger([1, 1]);
		const frames = await collect(stream(fakeAdapter(ledger), finite));
		const token = tokenOf(frames[0]);
		const resume = (options: FakeOptions, order?: 'descending') =>
			collect(stream(fakeAdapter(ledger, options), { start: { resumeToken: token }, order }));
		await rejectsWith(resume({ transport: 'grpc' }), 'IncompatibleToken');
		await rejectsWith(resume({ family: 'transactions' }), 'IncompatibleToken');
		await rejectsWith(resume({ chain: 'other' }), 'IncompatibleToken');
		await rejectsWith(resume({ filter: { sender: '0x2' } }), 'IncompatibleToken');
		await rejectsWith(resume({}, 'descending'), 'IncompatibleToken');
	});

	it('raises stream errors as SuiClientErrors', () => {
		expect(new SuiStreamError('Protocol', 'x')).toBeInstanceOf(SuiClientError);
	});
});

describe('completion', () => {
	const complete = async (ledger: Ledger, options: object, fake: FakeOptions = {}) =>
		(await collect(stream(fakeAdapter(ledger, fake), { frames: { completion: true }, ...options })))
			.filter((frame) => frame.$kind === 'Complete')
			.map(({ $kind: _, ...rest }) => rest);

	it.each([
		['an end', { ...finite, end: { checkpoint: 2 } }, 'checkpointBound'],
		['the indexed tip', finite, 'indexedTip'],
		['genesis', { order: 'descending' }, 'genesis'],
	] as const)('reports reaching %s', async (_, options, reason) => {
		const [completion] = await complete(new Ledger([1, 1, 1]), options);
		expect(completion).toEqual({ reason, resumeToken: expect.any(String) });
	});

	it('stops a descending read at the oldest retained checkpoint', async () => {
		const ledger = new Ledger([1, 1, 1, 1]);
		const frames = await collect(
			stream(fakeAdapter(ledger, { watermarks: true, retainedFrom: 2n }), {
				order: 'descending',
				frames: { completion: true },
			}),
		);
		expect(ids(frames)).toEqual(['3:0', '2:0']);
		expect(frames.at(-1)).toMatchObject({ $kind: 'Complete', reason: 'retentionLimit' });
	});

	it('fails a read below the retained history', async () => {
		const adapter = fakeAdapter(new Ledger([1, 1, 1]), { watermarks: true, retainedFrom: 2n });
		await rejectsWith(collect(stream(adapter, finite)), 'HistoryUnavailable');
	});

	it('completes an empty range without reading, and a finished job resumed with its end', async () => {
		const ledger = new Ledger([1, 1, 1]);
		const adapter = fakeAdapter(ledger);
		expect(await complete(ledger, { start: { checkpoint: 2 }, end: { checkpoint: 2 } })).toEqual([
			{ reason: 'checkpointBound' },
		]);
		const [done] = await complete(ledger, { ...finite, end: { checkpoint: 2 } });
		const resumed = stream(adapter, {
			start: { resumeToken: done.resumeToken! },
			end: { checkpoint: 2 },
			frames: { completion: true },
		});
		expect(await collect(resumed)).toEqual([
			{ $kind: 'Complete', reason: 'checkpointBound', resumeToken: done.resumeToken },
		]);
		expect(adapter.calls.pages).toEqual([]);
	});

	it('emits no completion unless asked', async () => {
		expect(await collect(stream(fakeAdapter(new Ledger([1])), finite))).toHaveLength(1);
	});
});

describe('retries', () => {
	it('resets the budget on progress and throws past maxAttempts without it', async () => {
		const ledger = new Ledger([1, 1, 1, 1]);
		const fail = { error: new NetworkError() };
		const adapter = fakeAdapter(ledger, {
			pageSize: 1,
			// Two failures, an item, two failures, an item, then three failures in a row.
			pageFaults: [fail, fail, undefined, fail, fail, undefined, fail, fail, fail],
		});
		const { log, onStatus } = statusLog();
		const frames: string[] = [];
		const read = (async () => {
			for await (const frame of stream(adapter, {
				...finite,
				onStatus,
				retry: { ...noDelay, maxAttempts: 2 },
			})) {
				frames.push(ids([frame])[0]);
			}
		})();
		await expect(read).rejects.toBeInstanceOf(NetworkError);
		expect(frames).toEqual(['0:0', '1:0']);
		expect(log.filter((status) => status.startsWith('Retrying'))).toEqual([
			'Retrying(1)',
			'Retrying(2)',
			'Retrying(1)',
			'Retrying(2)',
			'Retrying(1)',
			'Retrying(2)',
		]);
	});

	it('counts a follow attempt as progress only once its live feed opened', async () => {
		const ledger = new Ledger([1, 1]);
		const adapter = fakeAdapter(ledger, {
			live: 'fromTip',
			watermarks: true,
			afterRead: (l) => {
				if (l.indexedTip >= 20n) return;
				l.indexedTip += 1n;
				l.items.push({ checkpoint: l.indexedTip, index: 0 });
			},
			subscriptions: () => {
				throw new NetworkError('subscribe refused');
			},
		});
		const read = collect(
			stream(adapter, { start: { checkpoint: 0 }, retry: { ...noDelay, maxAttempts: 3 } }),
		);
		await expect(read).rejects.toThrow('subscribe refused');
		expect(adapter.calls.subscriptions).toBe(4);

		// A feed that opens and delivers before it drops, like mainnet's periodic resets, keeps going.
		const resetting = fakeAdapter(ledger, {
			subscriptions: (_, from) => ({
				events: ledger
					.after(from)
					.slice(0, 1)
					.map((item) => ledger.item(Number(item.checkpoint))),
				end: new NetworkError(),
			}),
		});
		const frames = await take(
			stream(resetting, { start: { checkpoint: 1 }, retry: { ...noDelay, maxAttempts: 1 } }),
			3,
		);
		expect(ids(frames)).toEqual(['1:0', '2:0', '3:0']);
	});

	it('does not count history paged before the live feed as progress', async () => {
		const ledger = new Ledger([1, 1]);
		const adapter = fakeAdapter(ledger, {
			live: 'fromTip',
			watermarks: true,
			// The chain gains a checkpoint before every subscription, so each attempt pages new history.
			afterRead: (l) => {
				if (l.indexedTip >= 20n) return;
				l.indexedTip += 1n;
				l.items.push({ checkpoint: l.indexedTip, index: 0 });
			},
			subscriptions: () => ({ events: [], end: new ServerError('rate limited') }),
		});
		await expect(
			collect(stream(adapter, { start: { checkpoint: 0 }, retry: { ...noDelay, maxAttempts: 2 } })),
		).rejects.toThrow('rate limited');
		expect(adapter.calls.subscriptions).toBe(3);
	});

	it('counts history paged before subscribing as progress', async () => {
		const ledger = new Ledger([1, 1, 1, 1, 1, 1, 1, 1]);
		const unavailable = { error: new NetworkError() };
		const serverError = { error: new ServerError('busy') };
		const adapter = fakeAdapter(ledger, {
			live: 'fromTip',
			watermarks: true,
			pageSize: 1,
			// A long catch-up: sporadic errors, with progress between them.
			pageFaults: [undefined, unavailable, undefined, serverError, undefined, unavailable],
		});
		const frames = await take(
			stream(adapter, { start: { checkpoint: 0 }, retry: { ...noDelay, maxAttempts: 2 } }),
			8,
		);
		expect(ids(frames)).toEqual(['0:0', '1:0', '2:0', '3:0', '4:0', '5:0', '6:0', '7:0']);
	});

	it('spends the budget on a server error after the live feed opened', async () => {
		const ledger = new Ledger([1, 1]);
		const adapter = fakeAdapter(ledger, {
			subscriptions: () => ({ events: [], end: new ServerError('query too complex') }),
		});
		await expect(
			collect(stream(adapter, { start: { checkpoint: 2 }, retry: { ...noDelay, maxAttempts: 2 } })),
		).rejects.toThrow('query too complex');
		expect(adapter.calls.subscriptions).toBe(3);
	});

	it('gives up after 10 failures without progress by default', async () => {
		const adapter = fakeAdapter(new Ledger([1]), {
			pageFaults: Array.from({ length: 20 }, () => ({ error: new NetworkError() })),
		});
		await expect(collect(stream(adapter, finite))).rejects.toBeInstanceOf(NetworkError);
		expect(adapter.calls.pages).toHaveLength(11);
	});

	it('never retries with maxAttempts 0, not even a live feed that ended', async () => {
		const ledger = new Ledger([1, 1]);
		const adapter = fakeAdapter(ledger, {
			live: 'fromTip',
			subscriptions: [{ events: [ledger.watermark(2)], end: 'eof' }],
		});
		await rejectsWith(
			collect(stream(adapter, { start: { checkpoint: 0 }, retry: { maxAttempts: 0 } })),
			'Disconnected',
		);
	});

	it('retries startup requests and MVR failures, and never fatal errors', async () => {
		const adapter = fakeAdapter(new Ledger([1]), {
			initializeFaults: [
				new NetworkError(),
				new MvrRequestError('MVR request failed', { reason: 'Unavailable' }),
			],
			tipFaults: [new NetworkError()],
		});
		expect(ids(await collect(stream(adapter, finite)))).toEqual(['0:0']);
		expect(adapter.calls).toMatchObject({ initialize: 3, indexedTip: 2 });

		const rejected = new MvrRequestError('Failed to resolve types: bad request');
		const mvr = fakeAdapter(new Ledger([1]), { initializeFaults: [rejected] });
		await expect(collect(stream(mvr, finite))).rejects.toBe(rejected);
		expect(mvr.calls.initialize).toBe(1);

		const fatal = new Error('bug');
		const failing = fakeAdapter(new Ledger([1]), { pageFaults: [{ error: fatal }] });
		await expect(collect(stream(failing, finite))).rejects.toBe(fatal);
		expect(failing.calls.pages).toHaveLength(1);
	});

	it('reports Connecting before a startup retry and after every Retrying', async () => {
		const adapter = fakeAdapter(new Ledger([1]), { initializeFaults: [new NetworkError()] });
		const { log, onStatus } = statusLog();
		await collect(stream(adapter, { ...finite, onStatus, retry: noDelay }));
		expect(log).toEqual(['Connecting(0)', 'Retrying(1)', 'Connecting(1)', 'Connected']);
	});

	it('ends the stream with the error onStatus throws', async () => {
		const error = new Error('callback');
		const adapter = fakeAdapter(new Ledger([1]), { pageFaults: [{ error: new NetworkError() }] });
		const onStatus = (status: { $kind: string }) => {
			if (status.$kind === 'Retrying') throw error;
		};
		await expect(collect(stream(adapter, { ...finite, onStatus }))).rejects.toBe(error);
	});
});

describe('the live handoff', () => {
	it('replays the gap to the first live frame, then advances a quiet feed on heartbeats', async () => {
		const ledger = new Ledger([1, 0, 1, 0, 1, 0, 0, 0, 0], 2);
		const adapter = fakeAdapter(ledger, {
			live: 'fromTip',
			watermarks: true,
			// The subscription opens at 5, past the indexed tip, then only sends heartbeats.
			subscriptions: [{ events: [5, 7, 9].map((at) => ledger.watermark(at)) }],
			afterRead: (l) => {
				if (l.indexedTip < 8n) l.indexedTip += 1n;
			},
		});
		const { log, onStatus } = statusLog();
		const frames = await take(
			stream(adapter, { start: { checkpoint: 0 }, frames: { progress: true }, onStatus }),
			8,
		);
		expect(ids(frames)).toEqual(['0:0', '2:0', '4:0']);
		expect(log).toEqual(['Connecting(0)', 'Connected']);
		expect(adapter.calls.subscriptions).toBe(1);
	});

	it('pages history first when a subscription cannot backfill from the start', async () => {
		const ledger = new Ledger([1, 1, 1]);
		const froms: (Bound | undefined)[] = [];
		const adapter = fakeAdapter(ledger, {
			// Like GraphQL, a subscription cannot start at genesis.
			canResume: (from) => !('checkpoint' in from && from.checkpoint === 0n),
			subscriptions: (_, from) => {
				froms.push(from);
				return {
					events: [...ledger.after(from), { checkpoint: 3n, index: 0 }].map((item) =>
						ledger.item(Number(item.checkpoint), item.index),
					),
				};
			},
		});
		const frames = await take(stream(adapter, { start: { checkpoint: 0 } }), 4);
		expect(ids(frames)).toEqual(['0:0', '1:0', '2:0', '3:0']);
		expect(adapter.calls.pages.length).toBeGreaterThan(0);
		expect(froms).toHaveLength(1);
		// It subscribes from where history ended, not from genesis.
		expect(froms[0]).toMatchObject({ position: { kind: 'Boundary', checkpoint: 3n } });
	});

	it("reports Connected on a quiet follow's first progress frame", async () => {
		const ledger = new Ledger([1]);
		let release!: () => void;
		const released = new Promise<void>((resolve) => (release = resolve));
		const heartbeat = async function* () {
			await released;
			yield ledger.watermark(3);
		};
		const adapter = fakeAdapter(ledger, { subscriptions: [{ events: [], later: heartbeat() }] });
		const { log, onStatus } = statusLog();
		const quiet = stream(adapter, {
			start: { checkpoint: 1 },
			frames: { progress: true },
			onStatus,
		});
		await quiet.next(); // The start baseline, committed before subscribing.
		const next = quiet.next();
		await waitFor(() => adapter.calls.subscriptions === 1);
		expect(log).toEqual(['Connecting(0)']);
		release();
		expect((await next).value).toMatchObject({ $kind: 'Progress' });
		expect(log).toEqual(['Connecting(0)', 'Connected']);
		await quiet.return(undefined);
	});

	it('reconnects from the last delivered item after a live feed ends', async () => {
		const ledger = new Ledger([1, 1, 1, 1]);
		const adapter = fakeAdapter(ledger, {
			subscriptions: (connection, from) => {
				const events = ledger.after(from).map((item) => ledger.item(Number(item.checkpoint)));
				return connection === 0 ? { events: events.slice(0, 1), end: 'eof' } : { events };
			},
		});
		const { log, onStatus } = statusLog();
		const frames = await take(stream(adapter, { start: { checkpoint: 1 }, onStatus }), 3);
		expect(ids(frames)).toEqual(['1:0', '2:0', '3:0']);
		expect(log).toEqual([
			'Connecting(0)',
			'Connected',
			'Retrying(1)',
			'Connecting(1)',
			'Connected',
		]);
	});

	it('ends a quiet pending read on return(), and delivers nothing buffered after an abort', async () => {
		const adapter = fakeAdapter(new Ledger([1]));
		const quiet = stream(adapter, { start: { checkpoint: 1 } });
		const pending = expect(quiet.next()).resolves.toEqual({ value: undefined, done: true });
		await sleep(5, new AbortController().signal);
		await quiet.return(undefined);
		await pending;

		const controller = new AbortController();
		const ledger = new Ledger([2]);
		const aborted = stream(fakeAdapter(ledger), { ...finite, signal: controller.signal });
		await aborted.next();
		controller.abort(new Error('stop'));
		await expect(aborted.next()).rejects.toThrow('stop');
	});
});

async function waitFor(condition: () => boolean) {
	while (!condition()) await sleep(1, new AbortController().signal);
}

describe('pagination guards', () => {
	it.each([
		['more items without a cursor', { more: true }],
		['a cursor that does not advance', { more: true, cursor: new TextEncoder().encode('0:1') }],
	])('fails on %s', async (_, next) => {
		const ledger = new Ledger([2]);
		const adapter = fakeAdapter(ledger, { pageSize: 1 });
		const fetchPage = adapter.fetchPage;
		adapter.fetchPage = async function* (request) {
			const page = fetchPage(request);
			let read = await page.next();
			for (; !read.done; read = await page.next()) yield read.value;
			return request.after ? { ...read.value, next } : read.value;
		};
		await rejectsWith(collect(stream(adapter, finite)), 'Protocol');
	});
});
