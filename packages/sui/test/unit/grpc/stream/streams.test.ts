// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * The gRPC ledger stream adapter: how List and Subscribe responses map to frames and positions,
 * and gRPC-specific errors. Core stream behaviour is tested in `test/unit/client/stream`.
 */

import { RpcError } from '@protobuf-ts/runtime-rpc';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { itemPosition } from '../../../../src/client/stream/position.js';
import { decodeToken, filterHash } from '../../../../src/client/stream/token.js';
import type { SuiClientTypes } from '../../../../src/client/types.js';
import { SuiGrpcClient } from '../../../../src/grpc/client.js';
import { GrpcTypes } from '../../../../src/grpc/index.js';
import { markNonRetryable } from '../../../../src/grpc/pull-call.js';
import { GrpcLedgerStreamAdapter } from '../../../../src/grpc/stream/index.js';
import { readIndexedTip } from '../../../../src/grpc/stream/page.js';
import { collect, noDelay, statusLog, take } from '../../client/stream/fake-ledger.js';
import {
	at,
	belowEarliest,
	checkpointFrame,
	checkpointMessage,
	DELIVERIES,
	ended,
	event,
	eventIds,
	FakeLedger,
	frontier,
	LOCALNET_ABOVE_LATEST,
	mark,
	progress,
	servingFloor,
	type Delivery,
} from './fake-grpc.js';

const kinds = (frames: { $kind: string }[]) => frames.map((frame) => frame.$kind);
const positionOf = (frame: object) =>
	decodeToken((frame as { resumeToken: string }).resumeToken).position;
/** A subscription's first frame: a watermark at the start of `checkpoint`. */
const entry = (checkpoint: number) => progress(mark(`entry-${checkpoint}`), checkpoint - 1);

describe.each(DELIVERIES)('gRPC ledger streams over %s', (_, delivery: Delivery) => {
	const ledger = () => new FakeLedger(delivery);

	it('continues each page after its watermark cursor and positions items by it', async () => {
		const l = ledger().list(
			'ListEvents',
			[ended('SCAN_LIMIT', 1)],
			[event(2, 0, { end: 'ITEM_LIMIT' })],
			[ended('CHECKPOINT_BOUND', 2)],
		);
		const frames = await collect(
			l.client().streamEvents({
				start: { checkpoint: 1 },
				end: { checkpoint: 3 },
				frames: { completion: true },
			}),
		);
		expect(kinds(frames)).toEqual(['Event', 'Complete']);
		expect(positionOf(frames[0])).toEqual(
			itemPosition(2n, {
				cursor: at(2),
				transactionIndex: 0n,
				eventIndex: 0,
				nextUncovered: 2n,
			}),
		);
		const requests = l.requestsTo('ListEvents');
		expect(requests.map((r) => [r.startCheckpoint, r.endCheckpoint, r.options?.after])).toEqual([
			[1n, 3n, undefined],
			[1n, 3n, mark('end-1')],
			// The item-limit item ends its own page: the next page continues after it.
			[1n, 3n, at(2)],
		]);
	});

	it('replays history, then the gap up to the subscription’s entry watermark, then live items', async () => {
		const l = ledger()
			.list(
				'ListEvents',
				[event(1), ended('LEDGER_TIP', 1)],
				[event(2), ended('CHECKPOINT_BOUND', 2)],
			)
			.subscribe('SubscribeEvents', [entry(3), event(3), event(4)]);
		const { log, onStatus } = statusLog();
		const frames = await take(l.client().streamEvents({ start: { checkpoint: 1 }, onStatus }), 4);
		expect(eventIds(frames)).toEqual(['1:0', '2:0', '3:0', '4:0']);
		const [history, gap] = l.requestsTo('ListEvents');
		expect([history.startCheckpoint, history.endCheckpoint]).toEqual([1n, undefined]);
		expect([gap.startCheckpoint, gap.endCheckpoint, gap.options?.after]).toEqual([
			2n,
			3n,
			undefined,
		]);
		expect(l.calls).toEqual(['GetServiceInfo', 'ListEvents', 'SubscribeEvents', 'ListEvents']);
		expect(log).toEqual(['Connecting(0)', 'Connected']);
	});

	it('makes one request per history page and none per live item', async () => {
		const l = ledger()
			.list('ListEvents', [event(1, 0, { end: 'ITEM_LIMIT' })], [event(2), ended('LEDGER_TIP', 2)])
			.subscribe('SubscribeEvents', [
				entry(3),
				...Array.from({ length: 10 }, (_, n) => event(n + 3)),
			]);
		await take(l.client().streamEvents({ start: { checkpoint: 1 } }), 12);
		// History already covers the entry checkpoint, so there is no gap to replay.
		expect(l.calls).toEqual(['GetServiceInfo', 'ListEvents', 'ListEvents', 'SubscribeEvents']);
	});

	it('reconnects when the live buffer overflows during the gap, without losing items', async () => {
		let tip = 1;
		const l = ledger();
		const page = (input: object) => listUpTo(input as GrpcTypes.ListEventsRequest, tip);
		l.list('ListEvents', ...Array.from({ length: 4 }, () => page));
		l.subscribe(
			'SubscribeEvents',
			() => {
				tip = 1101;
				return { frames: range(2, 1100).map((n) => event(n)), end: 'open' };
			},
			() => {
				tip = 1102;
				return { frames: [event(1102)], end: 'open' };
			},
		);
		const retries: SuiClientTypes.StreamStatus[] = [];
		const frames = await take(
			l.client().streamEvents({
				start: { checkpoint: 1 },
				retry: { ...noDelay, maxAttempts: 1 },
				onStatus: (status) => status.$kind === 'Retrying' && retries.push(status),
			}),
			1102,
		);
		expect(eventIds(frames)).toEqual(range(1, 1102).map((n) => `${n}:0`));
		expect(l.requestsTo('SubscribeEvents')).toHaveLength(2);
		expect(retries).toMatchObject([
			{ attempt: 1, reason: 'Unavailable', error: { code: 'ABORTED' } },
		]);
	});
});

describe('gRPC ledger stream responses', () => {
	const ledger = () => new FakeLedger();

	it('positions a transaction by its checkpoint and transaction index', async () => {
		const l = ledger().list('ListTransactions', [
			{
				transaction: executedTransaction(5, 2),
				watermark: {
					cursor: at(5, 2),
					checkpoint: 4n,
					cursorPosition: { checkpoint: 5n, transactionIndex: 3n },
				},
			},
			ended('CHECKPOINT_BOUND', 5),
		]);
		const [frame] = await collect(
			l.client().streamTransactions({ start: { checkpoint: 5 }, end: { checkpoint: 6 } }),
		);
		expect(frame.transaction.Transaction?.digest).toBe('tx-5-2');
		expect(positionOf(frame)).toEqual(
			itemPosition(5n, { cursor: at(5, 2), transactionIndex: 2n, nextUncovered: 5n }),
		);
	});

	const withoutField = (field: 'checkpoint' | 'transactionIndex' | 'eventIndex') => {
		const frame = event(1);
		delete frame.event![field];
		return frame;
	};
	it.each([
		['no QueryEnd', [event(1)], 'without QueryEnd'],
		['an unknown QueryEnd reason', [{ ...ended('LEDGER_TIP', 1), end: { reason: 0 } }], 'Unknown'],
		['no watermark cursor', [{ event: event(1).event }], 'watermark cursor'],
		['no cursor position', [{ ...event(1), watermark: { cursor: at(1) } }], 'cursor position'],
		['an item without a checkpoint', [withoutField('checkpoint')], 'checkpoint'],
		[
			'an item without a transaction index',
			[withoutField('transactionIndex')],
			'transaction index',
		],
		['an event without an event index', [withoutField('eventIndex')], 'event index'],
	])('fails on %s as a protocol error, without retrying', async (_, page, message) => {
		const l = ledger().list('ListEvents', page);
		await expect(
			collect(l.client().streamEvents({ start: { checkpoint: 1 }, end: { checkpoint: 2 } })),
		).rejects.toMatchObject({ code: 'Protocol', message: expect.stringContaining(message) });
		expect(l.requestsTo('ListEvents')).toHaveLength(1);
	});

	it('waits on ABOVE_LATEST_AVAILABLE and reads the same page again', async () => {
		const l = ledger().list(
			'ListEvents',
			[event(90, 0, { end: 'ITEM_LIMIT' })],
			{
				frames: [],
				// The marker bytes a localnet server sent.
				end: new RpcError('above latest', 'OUT_OF_RANGE', {
					'grpc-status-details-bin': LOCALNET_ABOVE_LATEST,
				}),
			},
			[event(91), ended('CHECKPOINT_BOUND', 99)],
		);
		const frames = await collect(
			l
				.client()
				.streamEvents({ start: { checkpoint: 1 }, end: { checkpoint: 100 }, pollInterval: 1 }),
		);
		expect(eventIds(frames)).toEqual(['90:0', '91:0']);
		const [, lagging, again] = l.requestsTo('ListEvents');
		expect(lagging.options?.after).toEqual(at(90));
		expect(again.options?.after).toEqual(at(90));
	});

	it('completes a descending read without a low end at BELOW_EARLIEST_AVAILABLE', async () => {
		const l = ledger().list(
			'ListEvents',
			servingFloor(89, event(90, 0, { covered: null }), event(89, 0, { covered: null })),
		);
		const frames = await collect(
			l.client().streamEvents({
				order: 'descending',
				start: { checkpoint: 90 },
				frames: { completion: true },
			}),
		);
		expect(eventIds(frames)).toEqual(['90:0', '89:0']);
		expect(frames.at(-1)).toMatchObject({ $kind: 'Complete', reason: 'retentionLimit' });
		expect(l.requestsTo('ListEvents')).toHaveLength(1);
	});

	it.each([
		[
			'BELOW_EARLIEST_AVAILABLE on a read with a low end',
			belowEarliest(87),
			{ order: 'descending', start: { checkpoint: 90 }, end: { checkpoint: 85 } },
		],
		[
			'an unmarked OUT_OF_RANGE',
			new RpcError('pruned', 'OUT_OF_RANGE'),
			{ start: { checkpoint: 1 }, end: { checkpoint: 100 } },
		],
	] as const)('fails %s as HistoryUnavailable, without retrying', async (_, error, options) => {
		const l = ledger().list('ListEvents', { frames: [], end: error });
		await expect(
			collect(l.client().streamEvents({ ...options, retry: noDelay })),
		).rejects.toMatchObject({ code: 'HistoryUnavailable' });
		expect(l.requestsTo('ListEvents')).toHaveLength(1);
	});

	it('waits when an ascending scan with an end reaches the tip without a checkpoint', async () => {
		const l = ledger().list(
			'ListEvents',
			[progress(mark('tip'), undefined, 'LEDGER_TIP', 100)],
			[event(100), ended('CHECKPOINT_BOUND', 109)],
		);
		const frames = await collect(
			l.client().streamEvents({
				start: { checkpoint: 100 },
				end: { checkpoint: 110 },
				pollInterval: 1,
				frames: { completion: true },
			}),
		);
		expect(kinds(frames)).toEqual(['Event', 'Complete']);
		const [, again] = l.requestsTo('ListEvents');
		expect([again.startCheckpoint, again.options?.after]).toEqual([100n, undefined]);
	});

	it('resumes from the unchanged opaque cursor bytes', async () => {
		const frame = event(1, 0, { end: 'ITEM_LIMIT' });
		const odd = {
			...frame,
			watermark: { ...frame.watermark, cursor: new Uint8Array([255, 0, 7]) },
		};
		const l = ledger().list('ListEvents', [odd]);
		const range = { end: { checkpoint: 2 } };
		const [saved] = await take(l.client().streamEvents({ start: { checkpoint: 1 }, ...range }), 1);
		l.list('ListEvents', [event(1, 1), ended('CHECKPOINT_BOUND', 1)]);
		const resumed = await collect(
			l.client().streamEvents({ start: { resumeToken: saved.resumeToken }, ...range }),
		);
		expect(l.requestsTo('ListEvents')[1].options?.after).toEqual(new Uint8Array([255, 0, 7]));
		expect(eventIds(resumed)).toEqual(['1:1']);
	});

	it('maps checkpoint headers and resumes after a live checkpoint by its number', async () => {
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

		l.list('ListCheckpoints', [checkpointFrame(6), ended('CHECKPOINT_BOUND', 6)]);
		const frames = await collect(
			l.client().streamCheckpoints({
				start: { resumeToken: first.resumeToken },
				end: { checkpoint: 7 },
			}),
		);
		expect(frames.map((frame) => frame.checkpoint.sequenceNumber)).toEqual(['6']);
		const [request] = l.requestsTo('ListCheckpoints');
		expect([request.startCheckpoint, request.options?.after]).toEqual([6n, undefined]);
	});

	it('applies the native filter and read mask to history, gap and subscription alike', async () => {
		const filter = { terms: [] };
		const l = ledger()
			.list(
				'ListEvents',
				[event(2), ended('LEDGER_TIP', 2)],
				[event(3), ended('CHECKPOINT_BOUND', 3)],
			)
			.subscribe('SubscribeEvents', [entry(4), event(4)]);
		const frames = await take(
			l.client().streamEvents({ start: { checkpoint: 2 }, grpcFilter: filter }),
			3,
		);
		expect(eventIds(frames)).toEqual(['2:0', '3:0', '4:0']);
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

	it('resolves the shared filter into the native one, and binds tokens to the shared one', async () => {
		const sender = `0x${'1'.repeat(64)}`;
		const l = ledger().list('ListEvents', [ended('CHECKPOINT_BOUND', 1)]);
		const [complete] = await collect(
			l.client().streamEvents({
				start: { checkpoint: 1 },
				end: { checkpoint: 2 },
				filter: { sender },
				frames: { completion: true },
			}),
		);
		expect(JSON.stringify(l.requestsTo('ListEvents')[0].filter)).toContain(sender);
		expect(decodeToken(complete.resumeToken!).filter).toEqual(filterHash({ sender }));
	});

	it('rejects a shared and a native filter together', async () => {
		const options = { filter: { sender: '0x1' }, grpcFilter: { terms: [] } } as never;
		await expect(collect(ledger().client().streamEvents(options))).rejects.toMatchObject({
			code: 'InvalidOptions',
		});
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

	describe('checkpoints with transactions', () => {
		const objectId = `0x${'ab'.repeat(32)}`;
		const objectType = '0x2::coin::Coin<0x2::sui::SUI>';
		const include = { transactions: { effects: true, objectTypes: true } } as const;

		/** A checkpoint with a successful and a failed transaction. */
		function withTransactions(checkpoint: number): GrpcTypes.Checkpoint {
			const transaction = (index: number, success: boolean) => {
				const tx = executedTransaction(checkpoint, index, success);
				tx.effects!.changedObjects = [
					{ objectId, inputVersion: 1n, outputVersion: BigInt(checkpoint), objectType },
				];
				return tx;
			};
			return {
				...checkpointMessage(checkpoint),
				transactions: [transaction(0, true), transaction(1, false)],
			};
		}

		function expectTransactions(frame: SuiClientTypes.StreamCheckpoint<typeof include>) {
			const { sequenceNumber, transactions } = frame.checkpoint;
			expect(
				transactions.map((result) => {
					const tx = result.Transaction ?? result.FailedTransaction;
					return [result.$kind, tx.digest, tx.objectTypes];
				}),
			).toEqual([
				['Transaction', `tx-${sequenceNumber}-0`, { [objectId]: objectType }],
				['FailedTransaction', `tx-${sequenceNumber}-1`, { [objectId]: objectType }],
			]);
		}

		it('reads every transaction with its checkpoint, in the same requests as headers alone', async () => {
			const pages = () => [
				{ ...checkpointFrame(5), checkpoint: withTransactions(5) },
				{ ...checkpointFrame(6), checkpoint: withTransactions(6) },
				ended('CHECKPOINT_BOUND', 6),
			];
			const l = ledger().list('ListCheckpoints', pages(), pages());
			const range = { start: { checkpoint: 5 }, end: { checkpoint: 7 } };
			const frames = await collect(l.client().streamCheckpoints({ ...range, include }));
			expect(frames.map((frame) => frame.checkpoint.sequenceNumber)).toEqual(['5', '6']);
			frames.forEach(expectTransactions);

			const [header] = await collect(l.client().streamCheckpoints(range));
			expect(header.checkpoint).not.toHaveProperty('transactions');
			const [withTxs, headers] = l.requestsTo('ListCheckpoints');
			expect(withTxs.readMask?.paths).toEqual(
				expect.arrayContaining([
					'sequence_number',
					'transactions.digest',
					'transactions.effects',
					'transactions.effects.changed_objects.object_type',
				]),
			);
			expect(headers.readMask?.paths).not.toContain('transactions.digest');
			expect(l.calls).toEqual([
				'GetServiceInfo',
				'ListCheckpoints',
				'GetServiceInfo',
				'ListCheckpoints',
			]);
		});

		it('delivers live checkpoints with their transactions', async () => {
			const l = ledger().subscribe('SubscribeCheckpoints', [
				{ cursor: 5n, checkpoint: withTransactions(5) },
				{ cursor: 6n, checkpoint: withTransactions(6) },
			]);
			const frames = await take(l.client().core.streamCheckpoints({ include }), 2);
			frames.forEach(expectTransactions);
			expect(l.calls).toEqual(['GetServiceInfo', 'SubscribeCheckpoints']);
		});
	});
});

describe('gRPC List scan progress', () => {
	const range = { start: { checkpoint: 1 }, end: { checkpoint: 8 }, retry: noDelay };

	it('resumes a cut List call from its last mid-call watermark', async () => {
		const l = new FakeLedger().list(
			'ListEvents',
			{
				frames: [event(1), frontier('frontier', 4, [5, 2])],
				end: new RpcError('reset', 'UNAVAILABLE'),
			},
			[event(6), ended('CHECKPOINT_BOUND', 7)],
		);
		const frames = await collect(l.client().streamEvents(range));
		expect(eventIds(frames)).toEqual(['1:0', '6:0']);
		const resumed = l.requestsTo('ListEvents')[1];
		expect([resumed.startCheckpoint, resumed.options?.after]).toEqual([5n, mark('frontier')]);
	});

	it('fails at once on a non-retryable INTERNAL from the pull reader', async () => {
		const l = new FakeLedger().list('ListEvents', {
			frames: [event(1)],
			end: markNonRetryable(new RpcError('unexpected response content type', 'INTERNAL')),
		});
		const statuses: string[] = [];
		await expect(
			collect(
				l.client().streamEvents({ ...range, onStatus: (status) => statuses.push(status.$kind) }),
			),
		).rejects.toMatchObject({ code: 'INTERNAL' });
		expect(statuses).not.toContain('Retrying');
		expect(l.requestsTo('ListEvents')).toHaveLength(1);
	});

	it('fails a mid-call watermark without a cursor position as a protocol error', async () => {
		const l = new FakeLedger().list('ListEvents', [
			event(1),
			{ watermark: { cursor: mark('frontier'), checkpoint: 4n } },
			ended('CHECKPOINT_BOUND', 7),
		]);
		await expect(collect(l.client().streamEvents(range))).rejects.toMatchObject({
			code: 'Protocol',
		});
	});

	it('adds no Progress after a full page of items', async () => {
		const l = new FakeLedger().list(
			'ListEvents',
			[event(1), event(2, 0, { end: 'ITEM_LIMIT' })],
			[ended('CHECKPOINT_BOUND', 7)],
		);
		const frames = await collect(l.client().streamEvents({ ...range, frames: { progress: true } }));
		expect(kinds(frames)).toEqual(['Event', 'Event', 'Progress']);
	});

	it('commits where a page with items stopped scanning', async () => {
		const l = new FakeLedger().list('ListEvents', [event(1), ended('SCAN_LIMIT', 4)]);
		const frames = await take(l.client().streamEvents({ ...range, frames: { progress: true } }), 2);
		expect(kinds(frames)).toEqual(['Event', 'Progress']);

		const resumed = new FakeLedger().list('ListEvents', [ended('CHECKPOINT_BOUND', 7)]);
		await collect(
			resumed.client().streamEvents({ ...range, start: { resumeToken: frames[1].resumeToken } }),
		);
		expect(resumed.requestsTo('ListEvents')[0].startCheckpoint).toBe(5n);
	});
});

describe('gRPC ledger stream retry reasons', () => {
	const adapter = new GrpcLedgerStreamAdapter(
		{ transport: new FakeLedger(), mvr: {} as never, chainIdentifier: async () => 'chain' },
		{ family: 'events', options: {} },
	);

	it.each([
		['UNAVAILABLE', 'Unavailable'],
		['DATA_LOSS', 'Unavailable'],
		['CANCELLED', 'Unavailable'],
		['ABORTED', 'Unavailable'],
		['RESOURCE_EXHAUSTED', 'RateLimited'],
		['DEADLINE_EXCEEDED', 'ServerError'],
		['UNKNOWN', 'ServerError'],
		['INTERNAL', 'ServerError'],
		['NOT_FOUND', undefined],
		['INVALID_ARGUMENT', undefined],
		['OUT_OF_RANGE', undefined],
	])('maps %s to %s', (code, reason) => {
		expect(adapter.retryReason(new RpcError('failed', code))).toBe(reason);
	});

	it('never retries a non-retryable RpcError or a non-gRPC error', () => {
		const oversized = markNonRetryable(new RpcError('too big', 'RESOURCE_EXHAUSTED'));
		expect(adapter.retryReason(oversized)).toBeUndefined();
		expect(adapter.retryReason(new TypeError('bug'))).toBeUndefined();
	});

	it('retries a network with nothing indexed yet', async () => {
		const empty = new FakeLedger().tip(null);
		const error = await readIndexedTip(empty, new AbortController().signal).catch(
			(e: unknown) => e,
		);
		expect(adapter.retryReason(error)).toBe('Unavailable');
	});

	/** A stream whose filter names an MVR package, with `fetch` answering MVR requests. */
	function mvrStream(...answers: (() => Response)[]) {
		const fetch = vi.fn(async () => answers.shift()!());
		vi.stubGlobal('fetch', fetch);
		onTestFinished(() => {
			vi.unstubAllGlobals();
		});
		const l = new FakeLedger().list('ListEvents', [ended('CHECKPOINT_BOUND', 1)]);
		const client = new SuiGrpcClient({
			network: 'testnet',
			transport: l,
			mvr: { url: 'https://mvr.example' },
		});
		const stream = client.streamEvents({
			start: { checkpoint: 1 },
			end: { checkpoint: 2 },
			filter: { emitModule: '@mysten/test::module' },
			retry: noDelay,
		});
		return { l, fetch, stream };
	}

	it('retries a failed MVR request, then streams with the resolved filter', async () => {
		const packageId = `0x${'2'.repeat(64)}`;
		const { l, fetch, stream } = mvrStream(
			() => {
				throw new TypeError('fetch failed');
			},
			() => Response.json({ resolution: { '@mysten/test': { package_id: packageId } } }),
		);
		await collect(stream);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(JSON.stringify(l.requestsTo('ListEvents')[0].filter)).toContain(packageId.slice(2));
	});

	it('fails on a name MVR cannot resolve, without retrying', async () => {
		const { l, fetch, stream } = mvrStream(() => Response.json({ resolution: {} }));
		await expect(collect(stream)).rejects.toThrow('Failed to resolve package: @mysten/test');
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(l.calls).toEqual([]);
	});
});

/** An executed transaction as List and Subscribe responses carry it. */
function executedTransaction(
	checkpoint: number,
	index: number,
	success = true,
): GrpcTypes.ExecutedTransaction {
	return {
		digest: `tx-${checkpoint}-${index}`,
		transaction: { sender: '0x1' },
		checkpoint: BigInt(checkpoint),
		transactionIndex: BigInt(index),
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
			changedObjects: [],
		},
	};
}

function range(from: number, to: number) {
	return Array.from({ length: to - from + 1 }, (_, n) => from + n);
}

/** A ledger with one event per checkpoint, read from the request's bounds up to `tip`. */
function listUpTo(request: GrpcTypes.ListEventsRequest, tip: number) {
	const checkpointOf = (cursor: Uint8Array) =>
		Number(/\d+/.exec(new TextDecoder().decode(cursor))![0]);
	const after = request.options?.after;
	const end = request.endCheckpoint === undefined ? undefined : Number(request.endCheckpoint);
	const from = after ? checkpointOf(after) + 1 : Number(request.startCheckpoint ?? 0);
	const to = Math.min(tip, end === undefined ? tip : end - 1);
	const frames: object[] = range(from, to).map((n) => event(n));
	frames.push(
		end !== undefined && to === end - 1 ? ended('CHECKPOINT_BOUND', to) : ended('LEDGER_TIP', to),
	);
	// A slow gap lets the live call read ahead until its buffer overflows.
	return { frames, delay: end !== undefined ? 20 : 0 };
}
