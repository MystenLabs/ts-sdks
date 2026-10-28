// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import type { ErrorClass } from '../../../../src/client/stream/adapter.js';
import { SuiStreamError } from '../../../../src/client/stream/errors.js';
import { RetryBudget } from '../../../../src/client/stream/retry.js';
import {
	collect,
	fakeAdapter,
	ids,
	Ledger,
	LostConnection,
	NetworkError,
	Overflow,
	statusLog,
	stream,
	take,
	cursorOf,
} from './fake-ledger.js';

describe('retry budget', () => {
	const policy = { initialDelay: 100, maxDelay: 1000, jitter: 0 };

	/** A budget that has already counted `prior` failures without progress. */
	function budget(prior: number, maxAttempts = Infinity) {
		const retry = new RetryBudget({ ...policy, maxAttempts });
		for (let i = 0; i < prior; i++) retry.onFailure(new Error(), 'retry', false);
		return retry;
	}

	it.each<[ErrorClass, boolean, number, number, number, number]>([
		// class, advanced, prior failures, maxAttempts → delay, attempt afterwards
		['retry', false, 0, Infinity, 100, 1],
		['retry', false, 1, Infinity, 200, 2],
		['retry', false, 4, Infinity, 1000, 5],
		['retry', true, 4, Infinity, 0, 1],
		['disconnect', false, 0, Infinity, 100, 1],
		['disconnect', false, 2, Infinity, 400, 3],
		['disconnect', true, 4, Infinity, 0, 0],
		['disconnect', true, 0, 0, 0, 0],
		['retry', false, 2, 3, 400, 3],
	])(
		'%s (advanced: %s) after %i failures with maxAttempts %d waits %d ms',
		(errorClass, advanced, prior, max, delay, attempt) => {
			const retry = budget(prior, max);
			expect(retry.onFailure(new Error(), errorClass, advanced)).toBe(delay);
			expect(retry.attempt).toBe(attempt);
		},
	);

	it.each<[ErrorClass, boolean, number, number]>([
		['fatal', true, 0, Infinity],
		['retry', false, 0, 0],
		['retry', true, 0, 0],
		['retry', false, 3, 3],
	])(
		'rethrows %s (advanced: %s) after %i failures with maxAttempts %d',
		(errorClass, advanced, prior, max) => {
			const error = new Error('original');
			expect(() => budget(prior, max).onFailure(error, errorClass, advanced)).toThrow(error);
		},
	);

	it('reports a disconnect without progress past the budget as Disconnected', () => {
		const cause = new Overflow();
		expect(() => budget(0, 0).onFailure(cause, 'disconnect', false)).toThrow(
			expect.objectContaining({ code: 'Disconnected', cause }),
		);
	});

	it('adds jitter to the exponential delay', () => {
		const retry = new RetryBudget({ ...policy, jitter: 500 }, () => 0.5);
		expect(retry.onFailure(new Error(), 'retry', false)).toBe(350);
	});
});

describe('retries in a stream', () => {
	/** Checkpoints 0..5, one item each. */
	const sixCheckpoints = () => new Ledger(Array(6).fill(1));

	it('restarts a finite read after the last delivered item and keeps the original end', async () => {
		const adapter = fakeAdapter(sixCheckpoints(), {
			pageFaults: [undefined, { error: new NetworkError() }],
		});
		const frames = await collect(stream(adapter, { start: { checkpoint: 0 }, follow: false }));
		expect(ids(frames)).toEqual(['0:0', '1:0', '2:0', '3:0', '4:0', '5:0']);
		expect(adapter.calls.pages[2]).toMatchObject({
			range: { start: 1n, end: 6n },
			after: cursorOf({ checkpoint: 1n, index: 0 }),
		});
		expect(adapter.calls.indexedTip).toBe(1);
	});

	it('backs off when progress repeats the committed position (no zero-delay loop)', async () => {
		const ledger = sixCheckpoints();
		const { log, onStatus } = statusLog();
		const adapter = fakeAdapter(ledger, {
			anchorsAtLiveTip: true,
			// Every connection re-sends the same watermark, then fails.
			live: () => ({ events: [ledger.progress(5)], end: new NetworkError('unavailable') }),
		});
		await expect(
			collect(
				stream(adapter, {
					onStatus,
					retry: { initialDelay: 1, maxDelay: 100, jitter: 0, maxAttempts: 5 },
				}),
			),
		).rejects.toThrow('unavailable');
		// Only the first connection advanced (it committed the watermark). With no item delivered,
		// even that reconnect waits `initialDelay`.
		expect(log.filter((status) => status.startsWith('Retrying'))).toEqual([
			'Retrying(1,1)',
			'Retrying(2,2)',
			'Retrying(3,4)',
			'Retrying(4,8)',
			'Retrying(5,16)',
		]);
	});

	it('waits initialDelay after an attempt that advanced only by progress, not after an item', async () => {
		const ledger = new Ledger(Array(10).fill(1), 6);
		const { log, onStatus } = statusLog();
		const adapter = fakeAdapter(ledger, {
			anchorsAtLiveTip: true,
			afterRead: () => (ledger.indexedTip = 9n),
			live: [
				{ events: [ledger.progress(6)], end: new LostConnection() },
				{ events: [ledger.item(7)], end: new LostConnection() },
				{ events: [ledger.item(8)], end: 'hang' },
			],
		});
		await take(stream(adapter, { onStatus, retry: { initialDelay: 7, jitter: 0 } }), 2);
		expect(log.filter((status) => status.startsWith('Retrying'))).toEqual([
			'Retrying(0,7)',
			'Retrying(0,0)',
		]);
	});

	it('reports why it retries, as the adapter and the core classify it', async () => {
		const ledger = new Ledger(Array(10).fill(1), 6);
		const reasons: string[] = [];
		const adapter = fakeAdapter(ledger, {
			anchorsAtLiveTip: true,
			afterRead: () => (ledger.indexedTip = 9n),
			initializeFaults: [new NetworkError()],
			live: [
				{ events: [ledger.item(6)], end: new Overflow() },
				{ events: [ledger.item(7)], end: 'eof' },
				{ events: [ledger.item(8)], end: new LostConnection() },
				{ events: [ledger.item(9)], end: 'hang' },
			],
		});
		const frames = await take(
			stream(adapter, {
				retry: { initialDelay: 0, jitter: 0 },
				onStatus: (status) => {
					if (status.$kind === 'Retrying') reasons.push(status.reason);
				},
			}),
			4,
		);
		expect(ids(frames)).toEqual(['6:0', '7:0', '8:0', '9:0']);
		expect(reasons).toEqual(['Network', 'SlowConsumer', 'Disconnected', 'Disconnected']);
	});

	it('reconnects for free after a lost connection that followed progress, and counts it otherwise', async () => {
		const ledger = new Ledger(Array(10).fill(1), 6);
		const { log, onStatus } = statusLog();
		const adapter = fakeAdapter(ledger, {
			anchorsAtLiveTip: true,
			afterRead: () => (ledger.indexedTip = 9n),
			live: [
				{ events: [ledger.item(6)], end: new LostConnection() },
				{ events: [], end: new LostConnection() },
				{ events: [ledger.item(7)], end: 'hang' },
			],
		});
		const frames = await take(
			stream(adapter, { onStatus, retry: { initialDelay: 0, jitter: 0, maxAttempts: 1 } }),
			2,
		);
		expect(ids(frames)).toEqual(['6:0', '7:0']);
		// Free after progress; the next one without progress counts against the budget.
		expect(log.filter((status) => status.startsWith('Retrying'))).toEqual([
			'Retrying(0,0)',
			'Retrying(1,0)',
		]);
	});

	it('reconnects for free after a disconnect that followed progress, even with maxAttempts 0', async () => {
		// Checkpoints 0..9; the index starts at 6 and catches up one checkpoint per scan.
		const ledger = new Ledger(Array(10).fill(1), 6);
		const { log, onStatus } = statusLog();
		const adapter = fakeAdapter(ledger, {
			anchorsAtLiveTip: true,
			afterRead: () => (ledger.indexedTip += 1n),
			live: [
				{ events: [ledger.item(6)], end: new Overflow() },
				{ events: [ledger.item(7)], end: 'eof' },
				{ events: [ledger.item(9)], end: 'hang' },
			],
		});
		const frames = await take(stream(adapter, { onStatus, retry: { maxAttempts: 0 } }), 4);
		expect(ids(frames)).toEqual(['6:0', '7:0', '8:0', '9:0']);
		expect(log.filter((status) => /Retrying|Connecting/.test(status))).toEqual([
			'Connecting(0)',
			'Retrying(0,0)',
			'Connecting(0)',
			'Retrying(0,0)',
			'Connecting(0)',
		]);
	});

	it.each([
		['an overflow', new Overflow()],
		['an end of feed', 'eof' as const],
	])('counts %s without progress against the budget', async (_, end) => {
		const ledger = new Ledger(Array(7).fill(1));
		const adapter = fakeAdapter(ledger, {
			anchorsAtLiveTip: true,
			live: [
				{ events: ledger.liveFrom(6), end },
				{ events: [], end },
			],
		});
		const frames: string[] = [];
		const error = await (async () => {
			for await (const frame of stream(adapter, { retry: { maxAttempts: 0 } })) {
				frames.push(...ids([frame]));
			}
		})().catch((error: unknown) => error);
		expect(frames).toEqual(['6:0']);
		expect(error).toBeInstanceOf(SuiStreamError);
		expect(error).toMatchObject({ code: 'Disconnected' });
	});

	it('reconnects immediately, but counted, after a transient failure that followed progress', async () => {
		const { log, onStatus } = statusLog();
		const adapter = fakeAdapter(sixCheckpoints(), {
			pageFaults: [undefined, { error: new NetworkError() }],
		});
		await collect(
			stream(adapter, {
				onStatus,
				start: { checkpoint: 0 },
				follow: false,
				retry: { initialDelay: 50, jitter: 0 },
			}),
		);
		expect(log).toContain('Retrying(1,0)');
	});

	it('retries startup requests through the same budget', async () => {
		const { log, onStatus } = statusLog();
		const adapter = fakeAdapter(sixCheckpoints(), {
			initializeFaults: [new NetworkError()],
			tipFaults: [new NetworkError()],
		});
		const frames = await collect(
			stream(adapter, { onStatus, start: { checkpoint: 4 }, follow: false }),
		);
		expect(ids(frames)).toEqual(['4:0', '5:0']);
		expect(log.slice(0, 3)).toEqual(['Retrying(1,0)', 'Retrying(2,0)', 'Connecting(2)']);
	});

	it('does not retry fatal errors', async () => {
		const adapter = fakeAdapter(sixCheckpoints(), {
			pageFaults: [{ error: new TypeError('malformed response') }],
		});
		await expect(
			collect(stream(adapter, { start: { checkpoint: 0 }, follow: false })),
		).rejects.toThrow('malformed response');
		expect(adapter.calls.pages).toHaveLength(1);
	});
});
