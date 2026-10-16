// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

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
	cursorOf,
} from './fake-ledger.js';

/** Checkpoints 0..`last`, one item each, indexed through `tip`. */
const ledgerOf = (last: number, tip = last) => new Ledger(Array(last + 1).fill(1), tip);

describe('deduplication', () => {
	it.each([false, true])(
		'drops a page item that repeats the resume cursor (unknown order: %s)',
		async (opaqueOrder) => {
			const ledger = ledgerOf(5);
			const token = tokenOf(
				(
					await take(
						stream(fakeAdapter(ledger, { opaqueOrder }), {
							start: { checkpoint: 0 },
							follow: false,
						}),
						2,
					)
				)[1],
			);
			const adapter = fakeAdapter(ledger, {
				opaqueOrder,
				pageFaults: [{ repeatCursor: true }],
			});
			const frames = await collect(stream(adapter, { start: { resumeToken: token } }));
			expect(ids(frames)).toEqual(['2:0', '3:0', '4:0', '5:0']);
		},
	);

	it('drops live items the history already delivered', async () => {
		const ledger = ledgerOf(11, 10);
		const adapter = fakeAdapter(ledger, {
			afterRead: () => (ledger.indexedTip = 11n),
			live: [{ events: ledger.liveFrom(5), end: 'hang' }],
		});
		const frames = await take(stream(adapter, { start: { checkpoint: 8 } }), 4);
		expect(ids(frames)).toEqual(['8:0', '9:0', '10:0', '11:0']);
	});

	it('drops live items at or before the last delivered item', async () => {
		const ledger = ledgerOf(9, 6);
		const [i7, i8, i9] = [ledger.item(7), ledger.item(8), ledger.item(9)];
		const adapter = fakeAdapter(ledger, {
			afterRead: () => (ledger.indexedTip = 9n),
			live: [{ events: [i7, i8, i7, i8, i9], end: 'hang' }],
		});
		const frames = await take(stream(adapter, { start: { checkpoint: 7 } }), 3);
		expect(ids(frames)).toEqual(['7:0', '8:0', '9:0']);
	});

	it.each([
		[false, ['3:0', '3:1', '4:0']],
		[true, ['3:0', '3:1', '3:0', '4:0']],
	])(
		'with unknown order (%s), delivers a repeat rather than risk losing an item',
		async (opaqueOrder, expected) => {
			// The live feed repeats an item of a checkpoint it has not finished.
			const ledger = new Ledger([0, 0, 0, 3, 1], 3);
			ledger.opaque = opaqueOrder;
			const adapter = fakeAdapter(ledger, {
				opaqueOrder,
				anchorsAtLiveTip: true,
				live: [
					{
						events: [ledger.item(3, 0), ledger.item(3, 1), ledger.item(3, 0), ledger.item(4, 0)],
						end: 'hang',
					},
				],
			});
			const frames = await take(stream(adapter), expected.length);
			expect(ids(frames)).toEqual(expected);
		},
	);

	it('drops progress that repeats or regresses the committed position', async () => {
		const ledger = ledgerOf(9, 7);
		const adapter = fakeAdapter(ledger, {
			anchorsAtLiveTip: true,
			live: [
				{
					events: [ledger.progress(7), ledger.progress(6), ledger.progress(7), ledger.item(8)],
					end: 'hang',
				},
			],
			afterRead: () => (ledger.indexedTip = 9n),
		});
		const frames = await take(stream(adapter, { frames: { progress: true } }), 2);
		expect(frames).toMatchObject([
			{ $kind: 'Progress', coveredCheckpoint: '7' },
			{ $kind: 'Item', id: '8:0' },
		]);
	});
});

describe('history replay', () => {
	it('waits through empty scans until the index reaches an explicit future end', async () => {
		const ledger = ledgerOf(13, 10);
		let scans = 0;
		const adapter = fakeAdapter(ledger, {
			afterRead: () => {
				if (++scans === 2) ledger.indexedTip = 13n;
			},
		});
		const frames = await collect(
			stream(adapter, {
				start: { checkpoint: 11 },
				end: { checkpoint: 13 },
				frames: { completion: true },
			}),
		);
		expect(ids(frames)).toEqual(['11:0', '12:0']);
		expect(frames.at(-1)?.$kind).toBe('Complete');
		expect(adapter.calls.pages).toHaveLength(3);
	});

	it('waits for a descending start above the indexed tip to be indexed', async () => {
		const ledger = ledgerOf(6, 3);
		const adapter = fakeAdapter(ledger, { afterRead: () => (ledger.indexedTip += 1n) });
		const frames = await collect(
			stream(adapter, { order: 'descending', start: { checkpoint: 5 }, end: { checkpoint: 2 } }),
		);
		expect(ids(frames)).toEqual(['5:0', '4:0', '3:0']);
		// Tip reads find the start unindexed until it is; then one pass reads two pages.
		expect(adapter.calls.indexedTip).toBe(3);
		expect(adapter.calls.pages).toHaveLength(2);
	});

	it('resumes polling from scan progress, without emitting it by default', async () => {
		const ledger = ledgerOf(12, 9);
		const adapter = fakeAdapter(ledger, { afterRead: () => (ledger.indexedTip = 12n) });
		const frames = await take(stream(adapter, { start: { checkpoint: 9 }, delivery: 'poll' }), 4);
		expect(ids(frames)).toEqual(['9:0', '10:0', '11:0', '12:0']);
		expect(frames.every((frame) => frame.$kind === 'Item')).toBe(true);
		expect(adapter.calls.pages[1].range).toEqual({ start: 10n });
		expect(adapter.calls.pages[1].after).toBeUndefined();
	});

	it('emits scan progress when requested', async () => {
		const ledger = ledgerOf(5, 3);
		const adapter = fakeAdapter(ledger);
		const frames = await take(
			stream(adapter, { start: { checkpoint: 2 }, delivery: 'poll', frames: { progress: true } }),
			3,
		);
		expect(frames).toMatchObject([
			{ $kind: 'Item', id: '2:0' },
			{ $kind: 'Item', id: '3:0' },
			{ $kind: 'Progress', coveredCheckpoint: '3' },
		]);
		// The progress token resumes after checkpoint 3.
		const resumed = fakeAdapter(ledgerOf(5));
		const rest = await collect(
			stream(resumed, { start: { resumeToken: tokenOf(frames[2]) }, follow: false }),
		);
		expect(ids(rest)).toEqual(['4:0', '5:0']);
	});

	it('reports pages as statuses that carry no resume token', async () => {
		const statuses: SuiClientTypes.StreamStatus[] = [];
		await collect(
			stream(fakeAdapter(ledgerOf(5)), {
				start: { checkpoint: 0 },
				follow: false,
				onStatus: (status) => statuses.push(status),
			}),
		);
		const pages = statuses.filter((status) => status.$kind === 'Page');
		expect(pages).toEqual([
			{ $kind: 'Page', stage: 'history', end: 'limit', coveredCheckpoint: '0' },
			{ $kind: 'Page', stage: 'history', end: 'limit', coveredCheckpoint: '2' },
			{ $kind: 'Page', stage: 'history', end: 'bound', coveredCheckpoint: '5' },
		]);
	});
});

describe('live delivery', () => {
	it('exposes live items only after the gap through the first live position is replayed', async () => {
		const ledger = ledgerOf(14, 10);
		const adapter = fakeAdapter(ledger, {
			afterRead: () => (ledger.indexedTip = 14n),
			live: [{ events: ledger.liveFrom(13), end: 'hang' }],
		});
		const frames = await take(stream(adapter, { start: { checkpoint: 9 } }), 6);
		expect(ids(frames)).toEqual(['9:0', '10:0', '11:0', '12:0', '13:0', '14:0']);
		// The gap ends at the first live item's checkpoint; its coordinates stop the replay.
		expect(adapter.calls.pages[1]).toMatchObject({ range: { start: 11n, end: 14n } });
	});

	it('commits a baseline on a fresh follow so the first token exists before the first match', async () => {
		const ledger = ledgerOf(8);
		const adapter = fakeAdapter(ledger, {
			anchorsAtLiveTip: true,
			live: [{ events: ledger.liveFrom(7), end: 'hang' }],
		});
		const [baseline, first] = await take(stream(adapter, { frames: { progress: true } }), 2);
		expect(baseline).toMatchObject({ $kind: 'Progress', coveredCheckpoint: '6' });
		expect(first).toMatchObject({ $kind: 'Item', id: '7:0' });
		const resumed = await collect(
			stream(fakeAdapter(ledger), { start: { resumeToken: tokenOf(baseline) }, follow: false }),
		);
		expect(ids(resumed)).toEqual(['7:0', '8:0']);
	});

	it('reconnects from the last delivered item after a live failure', async () => {
		const ledger = ledgerOf(8, 6);
		const adapter = fakeAdapter(ledger, {
			anchorsAtLiveTip: true,
			afterRead: () => (ledger.indexedTip = 8n),
			live: [
				{ events: [ledger.item(6)], end: new NetworkError() },
				{ events: [ledger.item(8)], end: 'hang' },
			],
		});
		const frames = await take(stream(adapter), 3);
		expect(ids(frames)).toEqual(['6:0', '7:0', '8:0']);
		expect(adapter.calls.pages[0]).toMatchObject({
			range: { start: 6n },
			after: cursorOf({ checkpoint: 6n, index: 0 }),
		});
	});
});

describe('status sequences', () => {
	const ledger = () => ledgerOf(6, 4);
	/** Runs `effect` once, after the history pass's last page. */
	const afterReads = (count: number, effect: (ledger: Ledger) => void) => {
		let reads = 0;
		return (ledger: Ledger) => ++reads === count && effect(ledger);
	};
	const pages = (log: string[]) =>
		log.map((status) => (status.startsWith('Page') ? 'Page' : status));
	/** Collapses runs of Page into one entry. */
	const compact = (log: string[]) =>
		pages(log).filter((status, i, all) => status !== 'Page' || all[i - 1] !== 'Page');

	it.each<
		[string, Parameters<typeof fakeAdapter>[1], SuiClientTypes.StreamOptions, number, string[]]
	>([
		[
			'a finite read',
			{},
			{ start: { checkpoint: 0 }, follow: false },
			Infinity,
			['Connecting(0)', 'Connected', 'Page'],
		],
		[
			'polling',
			{ pageSize: 1, afterRead: afterReads(5, (l) => (l.indexedTip = 6n)) },
			{ start: { checkpoint: 0 }, delivery: 'poll' },
			7,
			['Connecting(0)', 'Connected', 'Page', 'Live', 'Page'],
		],
		[
			'a fresh follow at the live tip',
			{ anchorsAtLiveTip: true, live: [{ events: [ledger().progress(4)], end: 'hang' }] },
			{},
			0,
			['Connecting(0)', 'Connected', 'Live'],
		],
		[
			'a follow with a start',
			{ afterRead: afterReads(3, (l) => (l.indexedTip = 6n)) },
			{ start: { checkpoint: 0 } },
			7,
			['Connecting(0)', 'Connected', 'Page', 'Recovering', 'Page', 'Live'],
		],
	])('reports %s', async (_, fake, options, count, expected) => {
		const source = ledger();
		const adapter = fakeAdapter(source, {
			live: [{ events: source.liveFrom(5), end: 'hang' }],
			...fake,
		});
		const { log, onStatus } = statusLog();
		const frames = stream(adapter, { ...options, onStatus });
		if (count === Infinity) await collect(frames);
		else if (count === 0) {
			const pending = frames.next();
			await new Promise((resolve) => setTimeout(resolve, 10));
			await frames.return(undefined);
			await pending.catch(() => {});
		} else await take(frames, count);
		expect(compact(log)).toEqual(expected);
	});

	it('reports an immediate reconnect after live progress as attempt 0, without a history pass', async () => {
		const source = ledgerOf(8, 7);
		const adapter = fakeAdapter(source, {
			anchorsAtLiveTip: true,
			afterRead: () => (source.indexedTip = 8n),
			live: [
				{ events: [source.item(7)], end: 'eof' },
				{ events: [source.item(8)], end: 'hang' },
			],
		});
		const { log, onStatus } = statusLog();
		await take(stream(adapter, { onStatus }), 2);
		expect(compact(log)).toEqual([
			'Connecting(0)',
			'Connected',
			'Live',
			'Retrying(0,0)',
			'Connecting(0)',
			'Connected',
			'Recovering',
			'Page',
			'Live',
		]);
	});
});
