// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import { describe, expect, expectTypeOf, it, onTestFinished } from 'vitest';

import type { SuiClientTypes } from '../../../../src/client/types.js';
import { GrpcTypes } from '../../../../src/grpc/index.js';
import { markNonRetryable } from '../../../../src/grpc/pull-call.js';
import { estimateBytes, liveBuffer } from '../../../../src/grpc/stream/call.js';
import { GrpcLedgerStreamAdapter } from '../../../../src/grpc/stream/index.js';
import { collect, noDelay, statusLog, take } from '../../client/stream/fake-ledger.js';
import {
	at,
	checkpointFrame,
	checkpointMessage,
	DELIVERIES,
	ended,
	event,
	eventIds,
	FakeLedger,
	Gate,
	mark,
	progress,
	type Delivery,
} from './fake-grpc.js';

const { QueryEndReason } = GrpcTypes;
const cursorBound = {
	watermark: { cursor: mark('bound') },
	end: { reason: QueryEndReason.CURSOR_BOUND },
};
const kinds = (frames: { $kind: string }[]) => frames.map((frame) => frame.$kind);
const tokenOf = (frame: object | undefined) => {
	if (!frame || !('resumeToken' in frame)) throw new Error('Frame has no resume token');
	return frame.resumeToken as string;
};

describe.each(DELIVERIES)('gRPC ledger streams over %s', (_, delivery: Delivery) => {
	const ledger = () => new FakeLedger(delivery);

	describe('historical scan', () => {
		it('pages sparse scans from each terminal cursor and reports every page', async () => {
			const l = ledger().list(
				'ListEvents',
				[ended('SCAN_LIMIT', 1)],
				[event(2, 0, { end: 'ITEM_LIMIT' })],
				[ended('CHECKPOINT_BOUND', 2)],
			);
			const { log, onStatus } = statusLog();
			const frames = await collect(
				l.client().streamEvents({
					start: { checkpoint: 1 },
					end: { checkpoint: 3 },
					frames: { completion: true },
					onStatus,
				}),
			);
			expect(kinds(frames)).toEqual(['Event', 'Complete']);
			const requests = l.requestsTo('ListEvents');
			expect(requests.map((r) => [r.startCheckpoint, r.endCheckpoint])).toEqual([
				[1n, 3n],
				[1n, 3n],
				[1n, 3n],
			]);
			expect(requests[1].options?.after).toEqual(mark('end-1'));
			// The item-limit item stays with its own page: the next page continues after it.
			expect(requests[2].options?.after).toEqual(at(2));
			expect(log).toEqual([
				'Connecting(0)',
				'Connected',
				'Page(history,limit)',
				'Page(history,limit)',
				'Page(history,bound)',
			]);
		});

		const withoutField = (field: 'checkpoint' | 'transactionIndex' | 'eventIndex') => {
			const frame = event(1);
			delete frame.event![field];
			return frame;
		};
		it.each([
			['no QueryEnd', [event(1)], 'without QueryEnd'],
			['a frame after QueryEnd', [ended('CHECKPOINT_BOUND', 1), event(2)], 'after QueryEnd'],
			[
				'an item-limit end without its item',
				[progress(mark('x'), 1, 'ITEM_LIMIT')],
				'missing its item',
			],
			['an item on a bound', [event(1, 0, { end: 'CHECKPOINT_BOUND' })], 'Unexpected item'],
			['an unknown reason', [{ watermark: { cursor: mark('x') }, end: { reason: 0 } }], 'Unknown'],
			['no watermark cursor', [{ event: event(1).event }], 'watermark cursor'],
			['an item without a checkpoint', [withoutField('checkpoint')], 'checkpoint'],
			[
				'an item without a transaction index',
				[withoutField('transactionIndex')],
				'transaction index',
			],
			['an event without an event index', [withoutField('eventIndex')], 'event index'],
		])('fails visibly, without retrying, on %s', async (_, page, message) => {
			const l = ledger().list('ListEvents', page);
			await expect(
				collect(l.client().streamEvents({ start: { checkpoint: 1 }, end: { checkpoint: 2 } })),
			).rejects.toMatchObject({ code: 'Protocol', message: expect.stringContaining(message) });
			expect(l.requestsTo('ListEvents')).toHaveLength(1);
		});

		it('delivers only items by default', async () => {
			const l = ledger().list('ListEvents', [event(1), ended('CHECKPOINT_BOUND', 1)]);
			const frames = await collect(
				l.client().streamEvents({ start: { checkpoint: 1 }, end: { checkpoint: 2 } }),
			);
			expect(kinds(frames)).toEqual(['Event']);
		});

		it('waits for an explicit future end while the index lags', async () => {
			const l = ledger().list(
				'ListEvents',
				[ended('LEDGER_TIP', 1)],
				[event(2), ended('CHECKPOINT_BOUND', 2)],
			);
			const frames = await collect(
				l.client().streamEvents({
					start: { checkpoint: 1 },
					end: { checkpoint: 3 },
					pollInterval: 1,
					frames: { completion: true },
				}),
			);
			expect(kinds(frames)).toEqual(['Event', 'Complete']);
			// The next pass resumes at the boundary after what the first page covered.
			const [, second] = l.requestsTo('ListEvents');
			expect(second.startCheckpoint).toBe(2n);
			expect(second.options?.after).toBeUndefined();
		});

		it('keeps a descending checkpoint interval while moving the upper cursor', async () => {
			const l = ledger();
			l.tip(() => (l.tipReads === 1 ? 2 : 3)).list(
				'ListEvents',
				[event(3, 0, { covered: null, end: 'ITEM_LIMIT' })],
				[event(2, 0, { covered: null }), ended('CHECKPOINT_BOUND', 2)],
			);
			const frames = await collect(
				l.client().streamEvents({
					order: 'descending',
					start: { checkpoint: 3 },
					end: { checkpoint: 1 },
					pollInterval: 1,
				}),
			);
			expect(eventIds(frames)).toEqual(['3:0', '2:0']);
			// The start was not indexed on the first read, so nothing was delivered below it.
			expect(l.tipReads).toBe(2);
			const requests = l.requestsTo('ListEvents');
			expect(requests.map((r) => [r.startCheckpoint, r.endCheckpoint])).toEqual([
				[2n, 4n],
				[2n, 4n],
			]);
			expect(requests[1].options?.before).toEqual(at(3));
		});

		it('captures the indexed tip once and keeps it across pages', async () => {
			const l = ledger()
				.tip(4)
				.list(
					'ListEvents',
					[event(1, 0, { end: 'ITEM_LIMIT' })],
					[event(4), ended('CHECKPOINT_BOUND', 4)],
				);
			const frames = await collect(
				l.client().streamEvents({
					start: { checkpoint: 1 },
					follow: false,
					frames: { completion: true },
				}),
			);
			expect(l.tipReads).toBe(1);
			expect(l.requestsTo('ListEvents').map((r) => r.endCheckpoint)).toEqual([5n, 5n]);
			expect(frames.at(-1)).toMatchObject({
				$kind: 'Complete',
				completion: { reason: 'indexedTip', range: { capturedCheckpoint: '4' } },
			});
		});

		it.each([
			[
				'pagination that does not advance',
				[[ended('SCAN_LIMIT', 1)], [ended('SCAN_LIMIT', 1)]],
				'did not advance',
			],
			[
				'a regressing watermark',
				[[ended('SCAN_LIMIT', 3)], [ended('CHECKPOINT_BOUND', 2)]],
				'regressed',
			],
			[
				'a regressing item',
				[[event(3, 0, { end: 'ITEM_LIMIT' })], [event(2), ended('CHECKPOINT_BOUND', 3)]],
				'regressed',
			],
		])('rejects %s', async (_, pages, message) => {
			const l = ledger().list('ListEvents', ...pages);
			await expect(
				collect(l.client().streamEvents({ start: { checkpoint: 1 }, end: { checkpoint: 4 } })),
			).rejects.toMatchObject({ code: 'Protocol', message: expect.stringContaining(message) });
		});

		it('stops before an end token by its coordinates, and completes an empty interval', async () => {
			const l = ledger().subscribe('SubscribeEvents', [event(1), event(2), event(3)]);
			const tokens = (await take(l.client().streamEvents(), 3)).map(tokenOf);

			l.list('ListEvents', [event(2), event(3), ended('CHECKPOINT_BOUND', 3)]);
			const frames = await collect(
				l.client().streamEvents({
					start: { resumeToken: tokens[0] },
					end: { resumeToken: tokens[2] },
					frames: { completion: true, progress: true },
				}),
			);
			expect(kinds(frames)).toEqual(['Event', 'Complete']);
			const [request] = l.requestsTo('ListEvents');
			expect(request.options?.after).toEqual(at(1));
			// The end token bounds the read by its checkpoint; its own item stops it.
			expect(request.options?.before).toBeUndefined();
			expect(request.endCheckpoint).toBe(4n);
			expect(frames[1]).toMatchObject({ completion: { resumeToken: tokenOf(frames[0]) } });

			l.list('ListEvents', [event(2), ended('CHECKPOINT_BOUND', 2)]);
			const empty = await collect(
				l.client().streamEvents({
					start: { resumeToken: tokens[0] },
					end: { resumeToken: tokens[1] },
					frames: { completion: true },
				}),
			);
			expect(kinds(empty)).toEqual(['Complete']);
		});

		it('polls across empty scans without opening a subscription', async () => {
			const l = ledger().list(
				'ListEvents',
				[ended('LEDGER_TIP', 2)],
				[event(3), ended('LEDGER_TIP', 3)],
			);
			const [first] = await take(
				l.client().streamEvents({ start: { checkpoint: 1 }, delivery: 'poll', pollInterval: 1 }),
				1,
			);
			expect(eventIds([first])).toEqual(['3:0']);
			const [, second] = l.requestsTo('ListEvents');
			expect(second.startCheckpoint).toBe(3n);
			expect(second.options?.after).toBeUndefined();
			expect(l.requestsTo('SubscribeEvents')).toEqual([]);
		});

		const ahead = { frames: [], end: new RpcError('ahead', 'OUT_OF_RANGE') };

		it('polls a later page that a lagging server has not indexed, keeping its coverage', async () => {
			// Retention has passed the pass's start, but not the checkpoint it still has to read.
			const l = ledger()
				.retainedFrom(50)
				.list('ListEvents', [event(90, 0, { end: 'ITEM_LIMIT' })], ahead, [
					event(91),
					ended('CHECKPOINT_BOUND', 99),
				]);
			const frames = await collect(
				l.client().streamEvents({
					start: { checkpoint: 1 },
					end: { checkpoint: 100 },
					pollInterval: 1,
				}),
			);
			expect(eventIds(frames)).toEqual(['90:0', '91:0']);
			const [, lagging, poll] = l.requestsTo('ListEvents');
			expect(lagging.options?.after).toEqual(at(90));
			expect(poll.options?.after).toEqual(at(90));
			expect(l.floorReads).toBe(1);
		});

		it.each([
			['polls', 0, 85, ['90:0', '89:0']],
			['fails pruned history', 87, 85, ['90:0']],
			['polls toward genesis', 0, undefined, ['90:0', '89:0']],
			['fails pruned history toward genesis', 95, undefined, ['90:0']],
		])('%s when a descending page is out of range', async (_, floor, end, delivered) => {
			const l = ledger()
				.retainedFrom(floor)
				.list('ListEvents', [event(90, 0, { covered: null, end: 'ITEM_LIMIT' })], ahead, [
					event(89, 0, { covered: null }),
					ended('CHECKPOINT_BOUND', 85),
				]);
			const frames: object[] = [];
			const read = (async () => {
				for await (const frame of l.client().streamEvents({
					order: 'descending',
					start: { checkpoint: 90 },
					end: end === undefined ? undefined : { checkpoint: end },
					pollInterval: 1,
					retry: noDelay,
				})) {
					frames.push(frame);
				}
			})();
			if (floor) await expect(read).rejects.toMatchObject({ code: 'HistoryUnavailable' });
			else await read;
			expect(eventIds(frames)).toEqual(delivered);
			expect(l.requestsTo('ListEvents')[1].options?.before).toEqual(at(90));
			expect(l.floorReads).toBe(1);
		});
	});

	describe('handoff', () => {
		it('replays history, then the gap up to the first live cursor, before any live item', async () => {
			const l = ledger()
				.list(
					'ListEvents',
					[event(1), ended('LEDGER_TIP', 1)],
					[
						event(2, 0),
						{ watermark: { cursor: at(2, 1) }, end: { reason: QueryEndReason.CURSOR_BOUND } },
					],
				)
				.subscribe('SubscribeEvents', [event(2, 1), event(3)]);
			const { log, onStatus } = statusLog();
			const frames = await take(
				l.client().streamEvents({ start: { checkpoint: 1 }, pollInterval: 1, onStatus }),
				4,
			);
			expect(eventIds(frames)).toEqual(['1:0', '2:0', '2:1', '3:0']);
			const [history, gap] = l.requestsTo('ListEvents');
			expect(history.startCheckpoint).toBe(1n);
			// The gap starts after what history covered and ends at the first live item's checkpoint.
			expect([gap.startCheckpoint, gap.endCheckpoint]).toEqual([2n, 3n]);
			expect(gap.options?.after).toBeUndefined();
			expect(gap.options?.before).toBeUndefined();
			expect(log).toEqual([
				'Connecting(0)',
				'Connected',
				'Page(history,indexedTip)',
				'Recovering',
				'Page(gap,bound)',
				'Live',
			]);
			expect(l.cancelled.SubscribeEvents).toBe(1);
		});

		it('replays a checkpoint subscription’s progress-only first checkpoint itself', async () => {
			const filter = { terms: [] };
			const l = ledger()
				.list(
					'ListCheckpoints',
					[checkpointFrame(5), ended('LEDGER_TIP', 5)],
					[checkpointFrame(7), ended('CHECKPOINT_BOUND', 7)],
				)
				.subscribe('SubscribeCheckpoints', [
					{ cursor: 7n },
					{ cursor: 8n, checkpoint: checkpointMessage(8) },
				]);
			const frames = await take(
				l.client().streamCheckpoints({ start: { checkpoint: 5 }, grpcFilter: filter }),
				3,
			);
			expect(frames.map((frame) => frame.checkpoint.sequenceNumber)).toEqual(['5', '7', '8']);
			expect(l.requestsTo('ListCheckpoints')[1].endCheckpoint).toBe(8n);
		});

		it('skips the gap when history is already past the first live position', async () => {
			const l = ledger()
				.list('ListEvents', [event(1), event(2), event(3), ended('LEDGER_TIP', 3)])
				.subscribe('SubscribeEvents', [event(2), event(3), event(4)]);
			const frames = await take(l.client().streamEvents({ start: { checkpoint: 1 } }), 4);
			expect(eventIds(frames)).toEqual(['1:0', '2:0', '3:0', '4:0']);
			expect(l.requestsTo('ListEvents')).toHaveLength(1);
		});

		it('does not deliver subscription frames older than a future checkpoint start', async () => {
			const l = ledger()
				.list('ListEvents', [event(5), ended('LEDGER_TIP', 5)])
				.subscribe('SubscribeEvents', [event(2), event(4), event(5), event(6)]);
			const frames = await take(l.client().streamEvents({ start: { checkpoint: 5 } }), 2);
			expect(eventIds(frames)).toEqual(['5:0', '6:0']);
			expect(l.requestsTo('ListEvents')[0].startCheckpoint).toBe(5n);
		});

		it('gives a fresh follow a resumable baseline, without a tip read', async () => {
			const l = ledger().subscribe('SubscribeEvents', [event(4)]);
			const { log, onStatus } = statusLog();
			const [baseline, first] = await take(
				l.client().streamEvents({ frames: { progress: true }, onStatus }),
				2,
			);
			expect(baseline).toMatchObject({ $kind: 'Progress', coveredCheckpoint: '3' });
			expect(eventIds([first])).toEqual(['4:0']);
			expect(log).toEqual(['Connecting(0)', 'Connected', 'Live']);
			expect(l.tipReads).toBe(0);

			// Resuming it with item-only selection replays the baseline's checkpoint.
			l.list('ListEvents', [event(4), ended('LEDGER_TIP', 4)]);
			const [next] = await take(
				l.client().streamEvents({ start: { resumeToken: tokenOf(baseline) } }),
				1,
			);
			expect(eventIds([next])).toEqual(['4:0']);
			expect(l.requestsTo('ListEvents')[0].startCheckpoint).toBe(4n);
		});

		it('fails unavailable history in the gap without retrying, and cancels the subscription', async () => {
			const l = ledger()
				.list('ListEvents', [ended('LEDGER_TIP', 1)], {
					frames: [],
					end: new RpcError('pruned', 'OUT_OF_RANGE'),
				})
				.subscribe('SubscribeEvents', [event(10)]);
			await expect(
				collect(l.client().streamEvents({ start: { checkpoint: 1 }, retry: noDelay })),
			).rejects.toMatchObject({ code: 'HistoryUnavailable' });
			// The gap starts at a checkpoint with no cursor, which a lagging server does not reject.
			expect(l.requestsTo('ListEvents')[1].options?.after).toBeUndefined();
			expect(l.requestsTo('ListEvents')).toHaveLength(2);
			expect(l.floorReads).toBe(0);
			expect(l.cancelled.SubscribeEvents).toBe(1);
		});

		it('polls a gap whose start is past the index, then recovers it', async () => {
			const l = ledger()
				.retainedFrom(1)
				.subscribe(
					'SubscribeEvents',
					{ frames: [event(5)], end: new RpcError('reset', 'UNAVAILABLE') },
					[event(7), event(8)],
				)
				.list('ListEvents', { frames: [], end: new RpcError('ahead', 'OUT_OF_RANGE') }, [
					event(6),
					cursorBound,
				]);
			const frames = await take(l.client().streamEvents({ retry: noDelay, pollInterval: 1 }), 4);
			expect(eventIds(frames)).toEqual(['5:0', '6:0', '7:0', '8:0']);
			const [ahead, poll] = l.requestsTo('ListEvents');
			for (const request of [ahead, poll]) {
				expect(request.startCheckpoint).toBe(5n);
				expect(request.options?.after).toEqual(at(5));
			}
			expect(l.calls).toEqual([
				'GetServiceInfo',
				'SubscribeEvents',
				'SubscribeEvents',
				'ListEvents',
				'floor',
				'ListEvents',
			]);
		});

		it('bounds a gap after live progress by its coverage, so it can poll past the index', async () => {
			const l = ledger()
				.retainedFrom(1)
				.subscribe(
					'SubscribeEvents',
					{ frames: [progress(mark('a'), 4)], end: new RpcError('reset', 'UNAVAILABLE') },
					[event(6)],
				)
				.list('ListEvents', { frames: [], end: new RpcError('ahead', 'OUT_OF_RANGE') }, [
					event(5),
					cursorBound,
				]);
			const frames = await take(l.client().streamEvents({ retry: noDelay, pollInterval: 1 }), 2);
			expect(eventIds(frames)).toEqual(['5:0', '6:0']);
			// The poll keeps the cursor, which can lie inside the checkpoint after the coverage.
			const [ahead, poll] = l.requestsTo('ListEvents');
			for (const request of [ahead, poll]) {
				expect(request.startCheckpoint).toBe(5n);
				expect(request.options?.after).toEqual(mark('a'));
			}
			expect(l.floorReads).toBe(1);
		});

		it('fails pruned transaction history with HistoryUnavailable, without retrying', async () => {
			const l = ledger()
				.retainedFrom(6)
				.list('ListTransactions', {
					frames: [],
					end: new RpcError('pruned', 'OUT_OF_RANGE'),
				});
			await expect(
				collect(
					l.client().streamTransactions({
						start: { checkpoint: 4 },
						end: { checkpoint: 9 },
						retry: noDelay,
					}),
				),
			).rejects.toMatchObject({ code: 'HistoryUnavailable' });
			expect(l.requestsTo('ListTransactions')).toHaveLength(1);
		});
	});

	describe('live', () => {
		it('reconnects inside a checkpoint without losing its remaining events', async () => {
			const l = ledger()
				.subscribe(
					'SubscribeEvents',
					{ frames: [event(2, 0)], end: new RpcError('lost', 'UNAVAILABLE') },
					[event(2, 2), event(3)],
				)
				.list('ListEvents', [event(2, 1), cursorBound]);
			const frames = await take(l.client().streamEvents({ retry: noDelay }), 4);
			expect(eventIds(frames)).toEqual(['2:0', '2:1', '2:2', '3:0']);
			// After live progress the reconnect subscribes at once and replays only the gap.
			const [gap] = l.requestsTo('ListEvents');
			expect(l.requestsTo('ListEvents')).toHaveLength(1);
			expect(gap.options?.after).toEqual(at(2, 0));
			expect([gap.startCheckpoint, gap.endCheckpoint]).toEqual([2n, 3n]);
		});

		it('reconnects after a sparse initial watermark without losing the first match', async () => {
			const l = ledger()
				.subscribe(
					'SubscribeEvents',
					{ frames: [progress(mark('a'), 2)], end: new RpcError('lost', 'UNAVAILABLE') },
					[progress(mark('b'), 3), event(4)],
				)
				.list('ListEvents', [event(3), ended('LEDGER_TIP', 3)], [cursorBound]);
			const { log, onStatus } = statusLog();
			const retry = { initialDelay: 60_000, jitter: 0 };
			const frames = await take(l.client().streamEvents({ retry, onStatus }), 2);
			expect(eventIds(frames)).toEqual(['3:0', '4:0']);
			// The gap replay polls until the index reaches the first live position.
			const [gap, poll] = l.requestsTo('ListEvents');
			expect(gap.options?.after).toEqual(mark('a'));
			expect(gap.options?.before).toEqual(mark('b'));
			expect(poll.options?.before).toEqual(mark('b'));
			// Progress was committed, so the reconnect is immediate despite the long backoff.
			expect(log).toContain('Retrying(1,0)');
		});

		it('keeps progress inside an unfinished checkpoint apart from item positions', async () => {
			const l = ledger().subscribe('SubscribeEvents', [
				event(10),
				progress(mark('x'), 9),
				event(10, 1),
			]);
			expect(eventIds(await take(l.client().streamEvents(), 2))).toEqual(['10:0', '10:1']);
		});

		it('publishes advancing coverage even when the cursor is unchanged', async () => {
			const l = ledger().subscribe('SubscribeEvents', [
				progress(mark('same'), 1),
				progress(mark('same'), 2),
			]);
			const covered: (string | undefined)[] = [];
			for await (const frame of l.client().streamEvents({ frames: { progress: true } })) {
				if (frame.$kind === 'Progress') covered.push(frame.coveredCheckpoint);
				if (covered.includes('2')) break;
			}
			// A push transport coalesces queued progress, so it may deliver only the newest.
			if (delivery === 'pull') expect(covered).toEqual(['1', '2']);
			else expect([['1', '2'], ['2']]).toContainEqual(covered);
		});

		it('fails when a subscription regresses its watermark', async () => {
			const l = ledger().subscribe('SubscribeEvents', [
				progress(mark('a'), 2),
				event(3, 0, { covered: 1 }),
			]);
			await expect(
				collect(l.client().streamEvents({ frames: { progress: true }, retry: noDelay })),
			).rejects.toMatchObject({ code: 'Protocol', message: expect.stringContaining('regressed') });
		});

		it('maps checkpoint headers and resumes after the numeric live checkpoint', async () => {
			const l = ledger().subscribe('SubscribeCheckpoints', [
				{ cursor: 5n, checkpoint: checkpointMessage(5) },
			]);
			const [first] = await take(l.client().streamCheckpoints(), 1);
			expect(first.checkpoint).toEqual({
				sequenceNumber: '5',
				digest: 'digest-5',
				epoch: '2',
				timestampMs: 123456,
			});

			l.list('ListCheckpoints', [ended('CHECKPOINT_BOUND', 5)]);
			const frames = await collect(
				l.client().streamCheckpoints({
					start: { resumeToken: first.resumeToken },
					end: { checkpoint: 6 },
					frames: { completion: true },
				}),
			);
			expect(l.requestsTo('ListCheckpoints')[0].startCheckpoint).toBe(6n);
			expect(kinds(frames)).toEqual(['Complete']);
		});

		it('applies the native filter and read mask to history, gap and subscription alike', async () => {
			const filter = { terms: [] };
			const l = ledger()
				.list('ListEvents', [event(2), ended('LEDGER_TIP', 2)], [cursorBound])
				.subscribe('SubscribeEvents', [event(3)]);
			await take(l.client().streamEvents({ start: { checkpoint: 2 }, grpcFilter: filter }), 2);
			const [live] = l.requestsTo('SubscribeEvents');
			const lists = l.requestsTo('ListEvents');
			expect(lists).toHaveLength(2);
			for (const request of [live, ...lists]) {
				expect(request.filter).toEqual(filter);
				expect(request.readMask?.paths).toEqual(live.readMask?.paths);
			}
			expect(live.readMask?.paths).toEqual(
				expect.arrayContaining(['transaction_index', 'event_index', 'checkpoint']),
			);
		});

		it('resolves the shared filter into the native one', async () => {
			const sender = `0x${'1'.repeat(64)}`;
			const l = ledger().list('ListEvents', [ended('CHECKPOINT_BOUND', 1)]);
			await collect(
				l
					.client()
					.streamEvents({ start: { checkpoint: 1 }, end: { checkpoint: 2 }, filter: { sender } }),
			);
			expect(JSON.stringify(l.requestsTo('ListEvents')[0].filter)).toContain(sender);
		});

		it('keeps every shared transaction include in the read mask', async () => {
			const l = ledger().list('ListTransactions', [ended('CHECKPOINT_BOUND', 1)]);
			await collect(
				l.client().streamTransactions({
					start: { checkpoint: 1 },
					end: { checkpoint: 2 },
					include: {
						balanceChanges: true,
						effects: true,
						events: true,
						objectTypes: true,
						transaction: true,
						bcs: true,
					},
				}),
			);
			expect(l.requestsTo('ListTransactions')[0].readMask?.paths).toEqual(
				expect.arrayContaining([
					'transaction_index',
					'checkpoint',
					'digest',
					'transaction.bcs',
					'effects',
					'events',
					'balance_changes',
					'effects.changed_objects.object_type',
					'effects.changed_objects.object_id',
				]),
			);
		});
	});

	describe('resume tokens', () => {
		it.each([false, true])(
			'resume a completed checkpoint range from terminal progress (items: %s)',
			async (items) => {
				const l = ledger().list(
					'ListEvents',
					items ? [event(1), ended('CHECKPOINT_BOUND', 1)] : [ended('CHECKPOINT_BOUND', 1)],
				);
				const frames = await collect(
					l.client().streamEvents({
						start: { checkpoint: 1 },
						end: { checkpoint: 2 },
						frames: { progress: true, completion: true },
					}),
				);
				const progressFrame = frames.find((frame) => frame.$kind === 'Progress');
				const complete = frames.find((frame) => frame.$kind === 'Complete');
				expect(complete).toMatchObject({ completion: { resumeToken: tokenOf(progressFrame) } });

				const resumed = await collect(
					l.client().streamEvents({
						start: { resumeToken: tokenOf(progressFrame) },
						frames: { completion: true },
					}),
				);
				expect(resumed).toMatchObject([
					{ $kind: 'Complete', completion: { reason: 'checkpointBound' } },
				]);
				expect(l.requestsTo('ListEvents')).toHaveLength(1);

				// The excluded checkpoint still belongs to the next interval.
				l.list('ListEvents', [event(2), ended('CHECKPOINT_BOUND', 2)]);
				const adjacent = await collect(
					l.client().streamEvents({ start: { checkpoint: 2 }, end: { checkpoint: 3 } }),
				);
				expect(eventIds(adjacent)).toEqual(['2:0']);
			},
		);

		it('resumes a captured-tip completion without a new tip or a scan', async () => {
			const l = ledger()
				.tip(2)
				.list('ListEvents', [event(1), ended('LEDGER_TIP', 2)]);
			const frames = await collect(
				l.client().streamEvents({
					start: { checkpoint: 1 },
					follow: false,
					frames: { completion: true },
				}),
			);
			const complete = frames.at(-1) as SuiClientTypes.StreamCompletionFrame;
			const resumed = await collect(
				l.client().streamEvents({
					start: { resumeToken: complete.completion.resumeToken! },
					frames: { completion: true },
				}),
			);
			expect(resumed).toMatchObject([
				{
					$kind: 'Complete',
					completion: { reason: 'indexedTip', range: { capturedCheckpoint: '2' } },
				},
			]);
			expect(l.tipReads).toBe(1);
			expect(l.requestsTo('ListEvents')).toHaveLength(1);
		});

		it('rejects a live item token as the start of a range that excludes its checkpoint', async () => {
			const l = ledger().subscribe('SubscribeEvents', [event(2)]);
			const [saved] = await take(l.client().streamEvents(), 1);
			await expect(
				collect(
					l.client().streamEvents({
						start: { resumeToken: saved.resumeToken },
						end: { checkpoint: 2 },
					}),
				),
			).rejects.toMatchObject({
				code: 'InvalidOptions',
				message: expect.stringContaining('reversed'),
			});
			expect(l.requestsTo('ListEvents')).toHaveLength(0);
		});

		it('waits for a resumed descending position to be indexed before older items', async () => {
			const l = ledger().list('ListEvents', [
				event(100, 0, { covered: null }),
				ended('CHECKPOINT_BOUND', 99),
			]);
			const [saved] = await take(
				l.client().streamEvents({
					order: 'descending',
					start: { checkpoint: 100 },
					end: { checkpoint: 98 },
				}),
				1,
			);
			const reads = l.tipReads;
			l.tip(() => (l.tipReads === reads + 1 ? 90 : 100)).list('ListEvents', [
				event(99, 0, { covered: null }),
				ended('CHECKPOINT_BOUND', 99),
			]);
			const resumed = await collect(
				l.client().streamEvents({ start: { resumeToken: saved.resumeToken }, pollInterval: 1 }),
			);
			expect(eventIds(resumed)).toEqual(['99:0']);
			expect(l.tipReads - reads).toBe(2);
			expect(l.requestsTo('ListEvents')).toHaveLength(2);
		});

		it('resumes a descending checkpoint-bound terminal token as an empty completed range', async () => {
			const l = ledger().list('ListEvents', [
				event(3, 0, { covered: 3 }),
				ended('CHECKPOINT_BOUND', 3),
			]);
			const frames = await collect(
				l.client().streamEvents({
					order: 'descending',
					start: { checkpoint: 3 },
					end: { checkpoint: 2 },
					frames: { completion: true, progress: true },
				}),
			);
			const complete = frames.at(-1) as SuiClientTypes.StreamCompletionFrame;
			const resumed = await collect(
				l.client().streamEvents({
					start: { resumeToken: complete.completion.resumeToken! },
					frames: { completion: true },
				}),
			);
			expect(resumed).toMatchObject([{ $kind: 'Complete', completion: { order: 'descending' } }]);
			expect(l.requestsTo('ListEvents')).toHaveLength(1);
		});

		it('resumes from the unchanged opaque cursor bytes', async () => {
			const odd = {
				...event(1, 0, { end: 'ITEM_LIMIT' }),
				watermark: { cursor: new Uint8Array([255, 0, 7]) },
			};
			const l = ledger().list('ListEvents', [odd]);
			const [saved] = await take(
				l.client().streamEvents({ start: { checkpoint: 1 }, end: { checkpoint: 2 } }),
				1,
			);
			l.list('ListEvents', [event(1, 1), ended('CHECKPOINT_BOUND', 1)]);
			const resumed = await collect(
				l.client().streamEvents({ start: { resumeToken: saved.resumeToken } }),
			);
			expect(l.requestsTo('ListEvents')[1].options?.after).toEqual(new Uint8Array([255, 0, 7]));
			expect(eventIds(resumed)).toEqual(['1:1']);
		});

		it('resumes after a history item whose watermark omitted coverage', async () => {
			const l = ledger()
				.list(
					'ListEvents',
					[event(100, 0, { covered: null, end: 'ITEM_LIMIT' })],
					{ frames: [], end: new RpcError('lost', 'UNAVAILABLE') },
					[ended('LEDGER_TIP', 100)],
					[cursorBound],
				)
				.subscribe('SubscribeEvents', [event(101)]);
			const frames = await take(
				l.client().streamEvents({ start: { checkpoint: 100 }, retry: noDelay }),
				2,
			);
			expect(eventIds(frames)).toEqual(['100:0', '101:0']);
			const [, , history, gap] = l.requestsTo('ListEvents');
			expect(history.options?.after).toEqual(at(100));
			expect([gap.startCheckpoint, gap.endCheckpoint]).toEqual([101n, 102n]);
			expect(l.requestsTo('SubscribeEvents')).toHaveLength(1);
		});

		it('resumes after progress that followed an item without coverage', async () => {
			const l = ledger()
				.list(
					'ListEvents',
					[event(100, 0, { covered: null, end: 'ITEM_LIMIT' })],
					[progress(mark('p'), undefined, 'SCAN_LIMIT')],
					{ frames: [], end: new RpcError('lost', 'UNAVAILABLE') },
					[ended('LEDGER_TIP', 100)],
					[cursorBound],
				)
				.subscribe('SubscribeEvents', [event(101)]);
			const frames = await take(
				l.client().streamEvents({
					start: { checkpoint: 100 },
					frames: { progress: true },
					retry: noDelay,
				}),
				4,
			);
			expect(
				frames.map((frame) =>
					frame.$kind === 'Event' ? frame.event.checkpoint : `progress ${frame.coveredCheckpoint}`,
				),
			).toEqual(['100', 'progress 99', 'progress 100', '101']);
			expect(l.requestsTo('ListEvents')[3].options?.after).toEqual(mark('p'));
		});

		it('keeps before-genesis coverage in a progress token after a genesis item', async () => {
			const l = ledger().list(
				'ListEvents',
				[event(0, 0, { covered: null, end: 'ITEM_LIMIT' })],
				[progress(mark('g'), undefined, 'SCAN_LIMIT')],
			);
			const frames = await take(
				l.client().streamEvents({
					start: { checkpoint: 0 },
					frames: { progress: true },
					retry: { maxAttempts: 0 },
				}),
				2,
			);
			expect(frames).toMatchObject([{ $kind: 'Event' }, { $kind: 'Progress' }]);
			expect(frames[1]).not.toHaveProperty('coveredCheckpoint');

			const before = l.requestsTo('ListEvents').length;
			l.list('ListEvents', [ended('LEDGER_TIP', 0)], [cursorBound]).subscribe('SubscribeEvents', [
				event(1),
			]);
			const [next] = await take(
				l.client().streamEvents({ start: { resumeToken: tokenOf(frames[1]) } }),
				1,
			);
			expect(eventIds([next])).toEqual(['1:0']);
			expect(l.requestsTo('ListEvents')[before].options?.after).toEqual(mark('g'));
		});
	});

	describe('backpressure', () => {
		it(
			delivery === 'pull'
				? 'reads live frames only as they are consumed'
				: 'bounds what the push transport delivers ahead',
			async () => {
				const l = ledger().subscribe(
					'SubscribeEvents',
					Array.from({ length: 50 }, (_, n) => event(n + 1)),
				);
				await take(l.client().streamEvents(), 3);
				if (delivery === 'pull') expect(l.reads.SubscribeEvents).toBeLessThanOrEqual(4);
				else expect(l.reads.SubscribeEvents).toBe(50);
				expect(l.cancelled.SubscribeEvents).toBe(1);
			},
		);

		it('reconnects after the live buffer overflows during the gap, without losing items', async () => {
			const maxBytes = liveBuffer.maxBytes;
			liveBuffer.maxBytes = 100 * estimateBytes(event(1000));
			onTestFinished(() => {
				liveBuffer.maxBytes = maxBytes;
			});
			let tip = 1;
			const l = ledger().tip(() => tip);
			const page = (input: object) => listUpTo(input as GrpcTypes.ListEventsRequest, tip);
			l.list('ListEvents', ...Array.from({ length: 6 }, () => page));
			l.subscribe(
				'SubscribeEvents',
				() => {
					tip = 1101;
					return { frames: range(2, 1100).map((n) => event(n)), end: 'open' };
				},
				[event(1101)],
			);
			const { log, onStatus } = statusLog();
			const frames = await take(
				l.client().streamEvents({
					start: { checkpoint: 1 },
					retry: { maxAttempts: 0 },
					onStatus,
				}),
				1101,
			);
			expect(eventIds(frames)).toEqual(range(1, 1101).map((n) => `${n}:0`));
			expect(l.requestsTo('SubscribeEvents')).toHaveLength(2);
			expect(log.filter((status) => status.startsWith('Retrying'))).toEqual(['Retrying(0,0)']);
		});
	});

	describe('items within a page', () => {
		it('delivers the first item before the List call completes', async () => {
			const gate = new Gate();
			const l = ledger().list('ListEvents', {
				frames: [event(1), event(2), ended('CHECKPOINT_BOUND', 2)],
				gate,
			});
			const stream = l.client().streamEvents({ start: { checkpoint: 1 }, end: { checkpoint: 3 } });
			gate.open();
			expect(eventIds([(await stream.next()).value!])).toEqual(['1:0']);
			expect(l.reads.ListEvents).toBe(1);
			gate.open(2);
			expect(eventIds(await collect(stream))).toEqual(['2:0']);
		});

		it('keeps items delivered before a page fails and resumes after them', async () => {
			const l = ledger().list(
				'ListEvents',
				{
					frames: [event(1), event(2), event(3)],
					end: new RpcError('reset', 'UNAVAILABLE'),
				},
				[event(4), event(5), ended('CHECKPOINT_BOUND', 5)],
			);
			const frames = await collect(
				l.client().streamEvents({
					start: { checkpoint: 1 },
					end: { checkpoint: 6 },
					retry: noDelay,
				}),
			);
			expect(eventIds(frames)).toEqual(['1:0', '2:0', '3:0', '4:0', '5:0']);
			const requests = l.requestsTo('ListEvents');
			expect(requests).toHaveLength(2);
			expect(requests[1].options?.after).toEqual(at(3));
		});

		if (delivery === 'pull') {
			it('reads page frames only as they are consumed and cancels the rest', async () => {
				const frames = Array.from({ length: 50 }, (_, n) => event(n + 1));
				const l = ledger().list('ListEvents', [...frames, ended('CHECKPOINT_BOUND', 50)]);
				const stream = l.client().streamEvents({
					start: { checkpoint: 1 },
					end: { checkpoint: 51 },
				});
				for (let delivered = 1; delivered <= 10; delivered++) {
					await stream.next();
					expect(l.reads.ListEvents - delivered).toBeLessThanOrEqual(1);
				}
				await stream.return(undefined);
				expect(l.cancelled.ListEvents).toBe(1);
			});
		}
	});

	describe('checkpoints with transactions', () => {
		const objectId = `0x${'ab'.repeat(32)}`;
		const objectType = '0x2::coin::Coin<0x2::sui::SUI>';
		const include = { transactions: { effects: true, objectTypes: true } } as const;

		/** A checkpoint with a successful and a failed transaction; types only in its object set. */
		function withTransactions(checkpoint: number): GrpcTypes.Checkpoint {
			const transaction = (index: number, success: boolean): GrpcTypes.ExecutedTransaction => ({
				digest: `tx-${checkpoint}-${index}`,
				checkpoint: BigInt(checkpoint),
				signatures: [],
				balanceChanges: [],
				effects: {
					status: success
						? { success }
						: {
								success,
								error: {
									description: 'InsufficientGas',
									command: 0n,
									errorDetails: { oneofKind: undefined },
								},
							},
					dependencies: [],
					unchangedConsensusObjects: [],
					unchangedLoadedRuntimeObjects: [],
					changedObjects: [{ objectId, inputVersion: 1n, outputVersion: BigInt(checkpoint) }],
				},
			});
			return {
				...checkpointMessage(checkpoint),
				transactions: [transaction(0, true), transaction(1, false)],
				objects: { objects: [{ objectId, version: BigInt(checkpoint), objectType }] },
			};
		}

		function expectTransactions(frame: SuiClientTypes.StreamCheckpointFrame<typeof include>) {
			const { sequenceNumber, transactions } = frame.checkpoint;
			expect(transactions.map((tx) => [tx.digest, tx.status.success, tx.objectTypes])).toEqual([
				[`tx-${sequenceNumber}-0`, true, { [objectId]: objectType }],
				[`tx-${sequenceNumber}-1`, false, { [objectId]: objectType }],
			]);
			expect(transactions[0].effects.changedObjects[0].objectType).toBe(objectType);
		}

		it('reads every transaction with its checkpoint, in the same requests as headers alone', async () => {
			const pages = () => [
				{ checkpoint: withTransactions(5), watermark: { cursor: mark('5'), checkpoint: 5n } },
				{ checkpoint: withTransactions(6), watermark: { cursor: mark('6'), checkpoint: 6n } },
				ended('CHECKPOINT_BOUND', 6),
			];
			const l = ledger().list('ListCheckpoints', pages(), pages());
			const range = { start: { checkpoint: 5 }, end: { checkpoint: 7 } };
			const frames = await collect(l.client().streamCheckpoints({ ...range, include }));
			expect(frames.map((frame) => frame.checkpoint.sequenceNumber)).toEqual(['5', '6']);
			frames.forEach(expectTransactions);
			const [request] = l.requestsTo('ListCheckpoints');
			expect(request.readMask?.paths).toEqual(
				expect.arrayContaining([
					'sequence_number',
					'transactions.digest',
					'transactions.effects',
					'objects.objects.object_type',
				]),
			);

			const headers = await collect(l.client().streamCheckpoints(range));
			expect(headers[0].checkpoint).not.toHaveProperty('transactions');
			expect(l.requestsTo('ListCheckpoints')[1].readMask?.paths).not.toContain(
				'transactions.digest',
			);
			expect(l.calls).toEqual([
				'GetServiceInfo',
				'ListCheckpoints',
				'GetServiceInfo',
				'ListCheckpoints',
			]);
		});

		it('reads the changed-object versions object types need without effects', async () => {
			const pages = [
				{ checkpoint: withTransactions(5), watermark: { cursor: mark('5'), checkpoint: 5n } },
				ended('CHECKPOINT_BOUND', 5),
			];
			const l = ledger().list('ListCheckpoints', pages);
			const [frame] = await collect(
				l.client().streamCheckpoints({
					start: { checkpoint: 5 },
					end: { checkpoint: 6 },
					include: { transactions: { objectTypes: true } },
				}),
			);
			expect(frame.checkpoint.transactions[0].objectTypes).toEqual({ [objectId]: objectType });
			const paths = l.requestsTo('ListCheckpoints')[0].readMask?.paths ?? [];
			expect(paths).not.toContain('transactions.effects');
			expect(paths).toEqual(
				expect.arrayContaining([
					'objects.objects.object_id',
					'objects.objects.version',
					'objects.objects.object_type',
					'transactions.effects.changed_objects.object_id',
					'transactions.effects.changed_objects.input_version',
					'transactions.effects.changed_objects.output_version',
				]),
			);
		});

		it('delivers live checkpoints with their transactions and no extra request', async () => {
			const l = ledger().subscribe('SubscribeCheckpoints', [
				{ cursor: 5n, checkpoint: withTransactions(5) },
				{ cursor: 6n, checkpoint: withTransactions(6) },
			]);
			const frames = await take(l.client().core.streamCheckpoints({ include }), 2);
			frames.forEach(expectTransactions);
			expect(l.calls).toEqual(['GetServiceInfo', 'SubscribeCheckpoints']);
		});

		it('leaves object types out of the read mask unless they are included', async () => {
			const l = ledger().subscribe('SubscribeCheckpoints', [
				{ cursor: 5n, checkpoint: checkpointMessage(5) },
			]);
			const [frame] = await take(
				l.client().streamCheckpoints({ include: { transactions: { events: true } } }),
				1,
			);
			expect(frame.checkpoint.transactions).toEqual([]);
			const [request] = l.requestsTo('SubscribeCheckpoints');
			expect(request.readMask?.paths).toContain('transactions.events');
			expect(request.readMask?.paths).not.toContain('objects.objects.object_type');
		});
	});

	describe('request counts', () => {
		it('starts a fresh follow with the chain identity and one subscription', async () => {
			const l = ledger().subscribe('SubscribeEvents', [event(4)]);
			await take(l.client().streamEvents(), 1);
			expect(l.calls).toEqual(['GetServiceInfo', 'SubscribeEvents']);
		});

		it('makes exactly one request per history page', async () => {
			const l = ledger().list(
				'ListEvents',
				[event(1, 0, { end: 'ITEM_LIMIT' })],
				[event(2, 0, { end: 'ITEM_LIMIT' })],
				[event(3), ended('CHECKPOINT_BOUND', 9)],
			);
			await collect(l.client().streamEvents({ start: { checkpoint: 1 }, end: { checkpoint: 10 } }));
			expect(l.calls).toEqual(['GetServiceInfo', 'ListEvents', 'ListEvents', 'ListEvents']);
		});

		it('makes no request per live item', async () => {
			const l = ledger().subscribe(
				'SubscribeEvents',
				range(4, 13).map((n) => event(n)),
			);
			await take(l.client().streamEvents(), 10);
			expect(l.calls).toEqual(['GetServiceInfo', 'SubscribeEvents']);
		});

		it('reconnects after live progress with a subscription and one gap page', async () => {
			const l = ledger()
				.subscribe(
					'SubscribeEvents',
					{ frames: [event(5)], end: new RpcError('reset', 'UNAVAILABLE') },
					[event(7), event(8)],
				)
				.list('ListEvents', [event(6), cursorBound]);
			const frames = await take(l.client().streamEvents({ retry: noDelay }), 4);
			expect(eventIds(frames)).toEqual(['5:0', '6:0', '7:0', '8:0']);
			expect(l.calls).toEqual([
				'GetServiceInfo',
				'SubscribeEvents',
				'SubscribeEvents',
				'ListEvents',
			]);
		});

		it('reads descending to the retention limit with one request per page, then completes', async () => {
			const l = ledger().list(
				'ListEvents',
				[event(9, 0, { covered: null, end: 'ITEM_LIMIT' })],
				[event(8, 0, { covered: null }), ended('CHECKPOINT_BOUND', 7)],
			);
			const frames = await collect(
				l.client().streamEvents({ order: 'descending', frames: { completion: true } }),
			);
			expect(eventIds(frames)).toEqual(['9:0', '8:0']);
			expect(frames.at(-1)).toMatchObject({
				$kind: 'Complete',
				completion: { reason: 'retentionLimit' },
			});
			expect(l.calls).toEqual(['GetServiceInfo', 'tip', 'ListEvents', 'ListEvents']);
		});

		it('fails an end below the retention limit with HistoryUnavailable after one request', async () => {
			const l = ledger().list('ListEvents', {
				frames: [],
				end: new RpcError('pruned', 'OUT_OF_RANGE'),
			});
			await expect(
				collect(
					l.client().streamEvents({
						order: 'descending',
						end: { checkpoint: 2 },
						retry: { maxAttempts: 5 },
					}),
				),
			).rejects.toMatchObject({ code: 'HistoryUnavailable' });
			// A descending read has no start for a lagging server to be behind.
			expect(l.calls).toEqual(['GetServiceInfo', 'tip', 'ListEvents']);
		});

		it('makes one request per poll tick', async () => {
			const l = ledger().list(
				'ListEvents',
				[event(1), ended('LEDGER_TIP', 1)],
				[event(2), ended('LEDGER_TIP', 2)],
				[event(3), ended('LEDGER_TIP', 3)],
			);
			await take(
				l.client().streamEvents({ start: { checkpoint: 1 }, delivery: 'poll', pollInterval: 1 }),
				3,
			);
			expect(l.calls).toEqual(['GetServiceInfo', 'ListEvents', 'ListEvents', 'ListEvents']);
		});
	});

	describe('cancellation', () => {
		it('delivers nothing buffered after the signal aborts', async () => {
			const l = ledger().subscribe('SubscribeEvents', [event(1), event(2), event(3)]);
			const controller = new AbortController();
			const stream = l.client().streamEvents({ signal: controller.signal });
			expect(eventIds([(await stream.next()).value!])).toEqual(['1:0']);
			await new Promise((resolve) => setTimeout(resolve, 10));
			controller.abort(new Error('stop'));
			await expect(stream.next()).rejects.toThrow('stop');
		});

		it('cancels a pending live read on abort and on return()', async () => {
			const l = ledger();
			const controller = new AbortController();
			const aborted = l.client().streamEvents({ signal: controller.signal });
			const pending = aborted.next();
			await new Promise((resolve) => setTimeout(resolve, 0));
			controller.abort(new Error('stop'));
			await expect(pending).rejects.toThrow('stop');

			const returned = l.client().streamEvents();
			const next = returned.next();
			await new Promise((resolve) => setTimeout(resolve, 0));
			await returned.return(undefined);
			await next.catch(() => {});
			expect(l.cancelled.SubscribeEvents).toBe(2);
		});
	});

	describe('errors', () => {
		it.each(['history', 'gap'] as const)(
			'does not retry an error thrown by onStatus for a %s page',
			async (stage) => {
				const l = ledger()
					.list('ListEvents', [ended('LEDGER_TIP', 1)], [cursorBound])
					.subscribe('SubscribeEvents', [event(5)]);
				const failure = new RpcError('callback failed', 'UNAVAILABLE');
				await expect(
					collect(
						l.client().streamEvents({
							start: { checkpoint: 1 },
							retry: noDelay,
							onStatus: (status) => {
								if (status.$kind === 'Page' && status.stage === stage) throw failure;
							},
						}),
					),
				).rejects.toBe(failure);
				expect(l.requestsTo('ListEvents')).toHaveLength(stage === 'history' ? 1 : 2);
			},
		);

		it('rejects a shared and a native filter together', async () => {
			const options = { filter: { sender: '0x1' }, grpcFilter: { terms: [] } } as never;
			await expect(collect(ledger().client().streamEvents(options))).rejects.toMatchObject({
				code: 'InvalidOptions',
			});
		});
	});
});

describe('gRPC ledger stream error classes', () => {
	const adapter = new GrpcLedgerStreamAdapter(
		{ transport: new FakeLedger(), mvr: {} as never, chainIdentifier: async () => 'chain' },
		{ family: 'events', options: {} },
	);
	it.each([
		['UNAVAILABLE', 'retry'],
		['DEADLINE_EXCEEDED', 'retry'],
		['RESOURCE_EXHAUSTED', 'retry'],
		['ABORTED', 'retry'],
		['UNKNOWN', 'retry'],
		['CANCELLED', 'retry'],
		['INTERNAL', 'fatal'],
		['NOT_FOUND', 'fatal'],
		['INVALID_ARGUMENT', 'fatal'],
	])('treats %s as %s', (code, expected) => {
		expect(adapter.classify(new RpcError('failed', code))).toBe(expected);
	});

	it('never retries an oversized message or a non-gRPC error', () => {
		expect(adapter.classify(markNonRetryable(new RpcError('too big', 'RESOURCE_EXHAUSTED')))).toBe(
			'fatal',
		);
		expect(adapter.classify(new TypeError('bug'))).toBe('fatal');
	});
});

describe('SuiGrpcClient stream method types', () => {
	it('returns async generators narrowed by the frame options', () => {
		const client = new FakeLedger().client();
		expectTypeOf(client.streamEvents()).toEqualTypeOf<
			AsyncGenerator<SuiClientTypes.StreamEventResult>
		>();
		const enabled = Math.random() > 0.5;
		const stream = client.streamEvents({ frames: { completion: enabled, progress: enabled } });
		type Frame = typeof stream extends AsyncGenerator<infer T> ? T : never;
		expectTypeOf<Frame['$kind']>().toEqualTypeOf<'Event' | 'Progress' | 'Complete'>();
		// @ts-expect-error Native and shared filters are exclusive.
		void client.streamEvents({ filter: { sender: '0x1' }, grpcFilter: { terms: [] } });
		void stream.return(undefined);
	});
});

function range(from: number, to: number) {
	return Array.from({ length: to - from + 1 }, (_, n) => from + n);
}

/** A ledger with one event per checkpoint, read from the request's bounds up to `tip`. */
function listUpTo(request: GrpcTypes.ListEventsRequest, tip: number) {
	const checkpointOf = (cursor: Uint8Array) =>
		Number(/\d+/.exec(new TextDecoder().decode(cursor))![0]);
	const after = request.options?.after;
	const before = request.options?.before;
	const end = request.endCheckpoint === undefined ? undefined : Number(request.endCheckpoint);
	const from = after ? checkpointOf(after) + 1 : Number(request.startCheckpoint ?? 0);
	const to = Math.min(before ? checkpointOf(before) - 1 : tip, end === undefined ? tip : end - 1);
	const frames: object[] = range(from, to).map((n) => event(n));
	frames.push(
		end !== undefined && to === end - 1 ? ended('CHECKPOINT_BOUND', to) : ended('LEDGER_TIP', to),
	);
	// A slow gap lets the live call read ahead until its buffer overflows.
	return { frames, delay: end !== undefined ? 20 : 0 };
}
