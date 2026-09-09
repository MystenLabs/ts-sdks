// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { BinaryWriter, WireType } from '@protobuf-ts/runtime';
import { RpcError, RpcOutputStreamController } from '@protobuf-ts/runtime-rpc';
import type { RpcOptions } from '@protobuf-ts/runtime-rpc';
import { expect, expectTypeOf, it } from 'vitest';
import { SuiGrpcClient, GrpcTypes } from '../../../src/grpc/index.js';
import type { SuiClientTypes } from '../../../src/client/types.js';
import { bufferedGrpcCall } from '../../../src/grpc/stream-buffer.js';

const { QueryEndReason: End } = GrpcTypes;
function cursor(cp: number, index = 0, kind = 1, family = 8) {
	const inner = new BinaryWriter().tag(1, WireType.Varint).uint64(cp);
	if (family >= 7) inner.tag(2, WireType.Varint).uint64(cp * 100);
	if (family === 8) inner.tag(3, WireType.Varint).uint32(index);
	return new BinaryWriter()
		.tag(5, WireType.Varint)
		.uint32(kind)
		.tag(family, WireType.LengthDelimited)
		.bytes(inner.finish())
		.finish();
}
function item(
	cp: number,
	index = 0,
	reason?: GrpcTypes.QueryEndReason,
): GrpcTypes.ListEventsResponse {
	return GrpcTypes.ListEventsResponse.create({
		event: {
			packageId: '0x2',
			module: 'test',
			sender: '0x1',
			eventType: '0x2::test::Event',
			checkpoint: BigInt(cp),
			transactionIndex: 0n,
			eventIndex: index,
			transactionDigest: `tx-${cp}`,
		},
		watermark: { cursor: cursor(cp, index) },
		end: reason ? { reason } : undefined,
	});
}
function end(cp: number, reason = End.CHECKPOINT_BOUND): GrpcTypes.ListEventsResponse {
	return { watermark: { cursor: cursor(cp, 0, 2), checkpoint: BigInt(cp - 1) }, end: { reason } };
}
function client() {
	const result = new SuiGrpcClient({ baseUrl: 'http://localhost', network: 'testnet' });
	result.getChainIdentifier = async () => ({ chainIdentifier: 'chain' });
	return result;
}
function script<T extends object>(
	frames: T[],
	signal?: AbortSignal,
	failure?: Error,
	keepOpen = false,
) {
	const responses = new RpcOutputStreamController<T>();
	const abort = () => {
		if (!responses.closed) responses.notifyError(new RpcError('aborted', 'CANCELLED'));
	};
	signal?.addEventListener('abort', abort, { once: true });
	queueMicrotask(() => {
		for (const frame of frames) {
			if (responses.closed) break;
			responses.notifyMessage(frame);
		}
		if (!responses.closed) {
			if (failure) responses.notifyError(failure);
			else if (!keepOpen) responses.notifyComplete();
		}
	});
	return {
		responses,
		headers: Promise.resolve({}),
		status: Promise.resolve({ code: 'OK', detail: '' }),
		trailers: Promise.resolve({}),
	};
}
function lists(c: SuiGrpcClient, pages: GrpcTypes.ListEventsResponse[][]) {
	const requests: GrpcTypes.ListEventsRequest[] = [];
	c.ledgerService.listEvents = ((request: GrpcTypes.ListEventsRequest, options: RpcOptions) => {
		requests.push(request);
		return script(pages.shift() ?? [], options.abort);
	}) as never;
	return requests;
}
async function collect<T>(stream: AsyncIterable<T>) {
	const result: T[] = [];
	for await (const frame of stream) result.push(frame);
	return result;
}

it('paginates sparse scans and preserves terminal item association and safe cursor completion', async () => {
	const c = client();
	const requests = lists(c, [[end(2, End.SCAN_LIMIT)], [item(2, 0, End.ITEM_LIMIT)], [end(3)]]);
	const frames = await collect(
		c.streamEvents({
			start: { checkpoint: '1' },
			end: { checkpoint: '3' },
			include: { queryEnd: true, completion: true },
		}),
	);
	expect(requests).toHaveLength(3);
	expect(frames.map((f) => f.$kind)).toEqual(['QueryEnd', 'Event', 'QueryEnd', 'Complete']);
	const transaction = frames[1];
	if (transaction.$kind !== 'Event') throw new Error('missing event');
	expect(transaction.queryEnd?.reason).toBe(End.ITEM_LIMIT);
	expect(requests[2].options?.after).toEqual(cursor(2));
});

it('default results are item-only and malformed terminal frames fail visibly', async () => {
	const c = client();
	lists(c, [[item(1), end(2)]]);
	const result = await collect(
		c.streamEvents({ start: { checkpoint: '1' }, end: { checkpoint: '2' } }),
	);
	expect(result.map((f) => f.$kind)).toEqual(['Event']);
	lists(c, [[item(1)]]);
	await expect(
		collect(c.streamEvents({ start: { checkpoint: '1' }, end: { checkpoint: '2' } })),
	).rejects.toThrow('without QueryEnd');
});

it('waits for an explicit future end when the index lags', async () => {
	const c = client();
	const requests = lists(c, [[end(2, End.LEDGER_TIP)], [item(2), end(3)]]);
	const result = await collect(
		c.streamEvents({
			start: { checkpoint: '1' },
			end: { checkpoint: '3' },
			pollInterval: 1,
			include: { completion: true },
		}),
	);
	expect(requests).toHaveLength(2);
	expect(result.map((f) => f.$kind)).toEqual(['Event', 'Complete']);
});

it('repairs through the first live checkpoint before exposing buffered items', async () => {
	const c = client();
	const requests = lists(c, [
		[item(1), end(2, End.LEDGER_TIP)],
		[item(2, 0), item(2, 1), end(3)],
	]);
	let aborted = false;
	c.subscriptionService.subscribeEvents = ((_request: object, options: RpcOptions) => {
		options.abort?.addEventListener('abort', () => {
			aborted = true;
		});
		return script([item(2, 1), item(3)], options.abort, undefined, true);
	}) as never;
	const received: string[] = [];
	for await (const frame of c.streamEvents({ start: { checkpoint: '1' }, pollInterval: 1 })) {
		received.push(`${frame.event.checkpoint}:${frame.event.eventIndex}`);
		if (received.length === 4) break;
	}
	expect(received).toEqual(['1:0', '2:0', '2:1', '3:0']);
	expect(requests).toHaveLength(2);
	expect(aborted).toBe(true);
});

it('reconnects within the same checkpoint without dropping its remaining events', async () => {
	const c = client();
	lists(c, [[item(2, 1), item(2, 2), end(3)]]);
	let calls = 0;
	c.subscriptionService.subscribeEvents = ((_request: object, options: RpcOptions) => {
		calls++;
		return calls === 1
			? script([item(2, 0)], options.abort, new RpcError('lost', 'UNAVAILABLE'))
			: script([item(2, 2), item(3)], options.abort, undefined, true);
	}) as never;
	const received: number[] = [];
	for await (const frame of c.streamEvents({ retry: { initialDelay: 0, jitter: 0 } })) {
		received.push(frame.event.eventIndex);
		if (received.length === 4) break;
	}
	expect(received).toEqual([0, 1, 2, 0]);
	expect(calls).toBe(2);
});

it('descending scans retain their checkpoint interval while advancing the upper cursor', async () => {
	const c = client();
	let tips = 0;
	c.ledgerService.listCheckpoints = ((_request: object, options: RpcOptions) => {
		const cp = BigInt(++tips === 1 ? 2 : 3);
		return script(
			[
				{
					checkpoint: { sequenceNumber: cp },
					watermark: { cursor: cursor(Number(cp), 0, 1, 6), checkpoint: cp },
					end: { reason: End.ITEM_LIMIT },
				},
			],
			options.abort,
		);
	}) as never;
	const requests = lists(c, [[item(3, 0, End.ITEM_LIMIT)], [item(2), end(1)]]);
	const result = await collect(
		c.streamEvents({
			order: 'descending',
			start: { checkpoint: '3' },
			end: { checkpoint: '1' },
			pollInterval: 1,
		}),
	);
	expect(result).toHaveLength(2);
	expect(tips).toBe(2);
	expect(requests[0].startCheckpoint).toBe(2n);
	expect(requests[0].endCheckpoint).toBe(4n);
	expect(requests[1].startCheckpoint).toBe(2n);
	expect(requests[1].options?.before).toEqual(cursor(3));
});

it('bounds the protobuf runtime queue as well as the application buffer', async () => {
	const controller = new AbortController();
	const call = script(
		Array.from({ length: 100 }, (_, i) => item(i + 1)),
		controller.signal,
		undefined,
		true,
	);
	const buffer = bufferedGrpcCall(call as never, controller, { limit: 2, isItem: () => true });
	await Promise.resolve();
	expect(controller.signal.aborted).toBe(true);
	expect((call.responses as unknown as { _itState: { q: unknown[] } })._itState.q).toHaveLength(0);
	expect((await buffer.next()).done).toBe(false);
	expect((await buffer.next()).done).toBe(false);
	await expect(buffer.next()).rejects.toThrow('buffer limit');
	await buffer.return?.();
});

it('cancels a pending response on AbortSignal and on iterator return', async () => {
	const c = client();
	c.subscriptionService.subscribeEvents = ((_request: object, options: RpcOptions) =>
		script([], options.abort, undefined, true)) as never;
	const signal = new AbortController();
	const stream = c.streamEvents({ signal: signal.signal });
	const pending = stream.next();
	await new Promise((resolve) => setTimeout(resolve, 0));
	signal.abort(new Error('stop'));
	await expect(pending).rejects.toThrow('stop');
	const second = c.streamEvents();
	const next = second.next();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await second.return?.();
	await expect(next).rejects.toThrow();
});

it('preserves shared method signatures and narrows all include combinations', () => {
	const c = client();
	const baseline: <I extends SuiClientTypes.StreamInclude = {}>(
		options?: SuiClientTypes.StreamEventsOptions<I>,
	) => AsyncIterableIterator<SuiClientTypes.StreamEventResult<I>> = c.streamEvents;
	expect(baseline).toBe(c.streamEvents);
	const normal = c.streamEvents();
	expectTypeOf(normal).toEqualTypeOf<AsyncIterableIterator<SuiClientTypes.StreamEventResult>>();
	const enabled: boolean = Math.random() > 0.5;
	const variants = c.streamEvents({
		include: { completion: enabled, progress: enabled, queryEnd: enabled, proto: enabled },
	});
	type Frame = typeof variants extends AsyncIterable<infer T> ? T : never;
	expectTypeOf<Exclude<Frame, undefined>['$kind']>().toEqualTypeOf<
		'Event' | 'Progress' | 'QueryEnd' | 'Complete'
	>();
	// @ts-expect-error Native masks require protobuf payload selection.
	c.streamEvents({ readMask: ['*'] });
	// @ts-expect-error Native and shared filters are exclusive.
	c.streamEvents({ filter: { sender: '0x1' }, grpcFilter: { terms: [] } });
});

it('emits initial live progress and can resume it with item-only selection', async () => {
	const c = client();
	c.subscriptionService.subscribeEvents = ((_request: object, options: RpcOptions) =>
		script([item(4)], options.abort, undefined, true)) as never;
	const initial = c.streamEvents({ include: { progress: true } });
	const baseline = await initial.next();
	expect(baseline.value.$kind).toBe('Progress');
	expect(baseline.value.coveredCheckpoint).toBe('3');
	await initial.return?.();
	const requests = lists(c, [[item(4), end(5)]]);
	const resumed = c.streamEvents({ start: { resumeToken: baseline.value.resumeToken } });
	const next = await resumed.next();
	expect(next.value.$kind).toBe('Event');
	expect(next.value.event.checkpoint).toBe('4');
	expect(requests[0].startCheckpoint).toBe(4n);
	await resumed.return?.();
});

it('does not promote an excluded cursor-bound terminal watermark into a resume token', async () => {
	const c = client();
	c.subscriptionService.subscribeEvents = ((_request: object, options: RpcOptions) =>
		script([item(1), item(2), item(3)], options.abort, undefined, true)) as never;
	const tokens: string[] = [];
	for await (const frame of c.streamEvents()) {
		tokens.push(frame.resumeToken);
		if (tokens.length === 3) break;
	}
	const requests = lists(c, [
		[item(2), { watermark: { cursor: cursor(3) }, end: { reason: End.CURSOR_BOUND } }],
	]);
	const frames = await collect(
		c.streamEvents({
			start: { resumeToken: tokens[0] },
			end: { resumeToken: tokens[2] },
			include: { completion: true, progress: true, queryEnd: true },
		}),
	);
	expect(frames.map((f) => f.$kind)).toEqual(['Event', 'QueryEnd', 'Complete']);
	expect(requests[0].options?.after).toEqual(cursor(1));
	expect(requests[0].options?.before).toEqual(cursor(3));
	expect(frames[1]).not.toHaveProperty('resumeToken');
	if (frames[0].$kind !== 'Event' || frames[2].$kind !== 'Complete')
		throw new Error('unexpected frames');
	expect(frames[2].completion.resumeToken).toBe(frames[0].resumeToken);
});

it('keeps a captured indexed tip fixed across historical pages', async () => {
	const c = client();
	let tips = 0;
	c.ledgerService.listCheckpoints = ((_request: object, options: RpcOptions) => {
		tips++;
		return script(
			[
				{
					checkpoint: { sequenceNumber: 4n },
					watermark: { cursor: cursor(4, 0, 1, 6), checkpoint: 4n },
					end: { reason: End.ITEM_LIMIT },
				},
			],
			options.abort,
		);
	}) as never;
	const requests = lists(c, [[item(1, 0, End.ITEM_LIMIT)], [item(4), end(5)]]);
	const frames = await collect(
		c.streamEvents({
			start: { checkpoint: '1' },
			follow: false,
			include: { completion: true, queryEnd: true },
		}),
	);
	expect(tips).toBe(1);
	expect(requests.map((request) => request.endCheckpoint)).toEqual([5n, 5n]);
	expect(frames[0]).toMatchObject({
		$kind: 'QueryEnd',
		stage: 'tip',
		lastItem: { sequenceNumber: 4n },
	});
	expect(frames.at(-1)).toMatchObject({
		$kind: 'Complete',
		completion: { reason: 'indexedTip', range: { capturedCheckpoint: '4' } },
	});
});

it('waits for a future checkpoint start without delivering older subscription frames', async () => {
	const c = client();
	const requests = lists(c, [[item(5), end(6)]]);
	c.subscriptionService.subscribeEvents = ((_request: object, options: RpcOptions) =>
		script([item(2), item(4), item(5)], options.abort, undefined, true)) as never;
	const stream = c.streamEvents({ start: { checkpoint: '5' } });
	const next = await stream.next();
	expect(next.value.event.checkpoint).toBe('5');
	expect(requests[0].startCheckpoint).toBe(5n);
	await stream.return?.();
});

it('applies native filters and additional masks identically during repair and subscription', async () => {
	const c = client();
	const native = { terms: [] };
	const requests = lists(c, [[item(2), end(3)]]);
	let liveRequest: GrpcTypes.SubscribeEventsRequest | undefined;
	c.subscriptionService.subscribeEvents = ((
		request: GrpcTypes.SubscribeEventsRequest,
		options: RpcOptions,
	) => {
		liveRequest = request;
		return script([item(2)], options.abort, undefined, true);
	}) as never;
	const stream = c.streamEvents({
		start: { checkpoint: '2' },
		grpcFilter: native,
		include: { proto: true },
		readMask: ['*'],
	});
	const next = await stream.next();
	expect(next.value.proto).toMatchObject({ eventIndex: 0 });
	expect(liveRequest?.filter).toEqual(native);
	expect(requests[0].filter).toEqual(native);
	expect(requests[0].readMask?.paths).toEqual(liveRequest?.readMask?.paths);
	expect(liveRequest?.readMask?.paths).toEqual(
		expect.arrayContaining(['*', 'transaction_index', 'event_index', 'checkpoint']),
	);
	await stream.return?.();
});

it('rejects nonadvancing pagination and regressing progress', async () => {
	const c = client();
	lists(c, [[end(2, End.SCAN_LIMIT)], [end(2, End.SCAN_LIMIT)]]);
	await expect(
		collect(c.streamEvents({ start: { checkpoint: '1' }, end: { checkpoint: '4' } })),
	).rejects.toThrow('did not advance');
	lists(c, [[end(3, End.SCAN_LIMIT)], [end(2)]]);
	await expect(
		collect(c.streamEvents({ start: { checkpoint: '1' }, end: { checkpoint: '4' } })),
	).rejects.toThrow('regressed');
});

it('completes with protobuf selection without requiring native fields on completion', () => {
	const c = client();
	const stream = c.streamEvents({ include: { completion: true, proto: true } });
	type Frame = typeof stream extends AsyncIterable<infer T> ? T : never;
	expectTypeOf<
		Extract<Frame, { $kind: 'Complete' }>
	>().toEqualTypeOf<SuiClientTypes.StreamCompletionFrame>();
	expectTypeOf<Extract<Frame, { $kind: 'Event' }>['proto']>().toEqualTypeOf<GrpcTypes.Event>();
	const enabled: boolean = Math.random() > 0.5;
	const optional = c.streamEvents({ include: { proto: enabled } });
	type OptionalFrame = typeof optional extends AsyncIterable<infer T> ? T : never;
	expectTypeOf<OptionalFrame['proto']>().toEqualTypeOf<GrpcTypes.Event | undefined>();
	const checkpoints: <I extends SuiClientTypes.StreamInclude = {}>(
		options?: SuiClientTypes.StreamCheckpointsOptions<I>,
	) => AsyncIterableIterator<SuiClientTypes.StreamCheckpointResult<I>> = c.streamCheckpoints;
	const transactions: <I extends SuiClientTypes.StreamTransactionInclude = {}>(
		options?: SuiClientTypes.StreamTransactionsOptions<I>,
	) => AsyncIterableIterator<SuiClientTypes.StreamTransactionResult<I>> = c.streamTransactions;
	expect(checkpoints).toBe(c.streamCheckpoints);
	expect(transactions).toBe(c.streamTransactions);
});

it('reconnects after a sparse initial watermark without losing the first matching item', async () => {
	const c = client();
	lists(c, [[item(3), end(4)]]);
	let connections = 0;
	c.subscriptionService.subscribeEvents = ((_request: object, options: RpcOptions) => {
		connections++;
		return connections === 1
			? script(
					[{ watermark: { cursor: cursor(3, 0, 2), checkpoint: 2n } }],
					options.abort,
					new RpcError('lost', 'UNAVAILABLE'),
				)
			: script(
					[{ watermark: { cursor: cursor(4, 0, 2), checkpoint: 3n } }, item(4)],
					options.abort,
					undefined,
					true,
				);
	}) as never;
	const items: string[] = [];
	for await (const frame of c.streamEvents({ retry: { initialDelay: 0, jitter: 0 } })) {
		items.push(frame.event.checkpoint!);
		if (items.length === 2) break;
	}
	expect(items).toEqual(['3', '4']);
	expect(connections).toBe(2);
});

it('cancels an overflowing live feed, finishes repair, and reconnects without gaps', async () => {
	const c = client();
	lists(c, [
		[item(1), item(2), end(3)],
		[item(5), item(6), item(7), end(8)],
	]);
	let connections = 0;
	c.subscriptionService.subscribeEvents = ((_request: object, options: RpcOptions) => {
		connections++;
		return script(
			connections === 1 ? [item(2), item(3), item(4), item(5), item(6)] : [item(7)],
			options.abort,
			undefined,
			true,
		);
	}) as never;
	const items: string[] = [];
	for await (const frame of c.streamEvents({
		start: { checkpoint: '1' },
		maxBufferedItems: 3,
		retry: { initialDelay: 0, jitter: 0 },
	})) {
		items.push(frame.event.checkpoint!);
		if (items.length === 7) break;
	}
	expect(items).toEqual(['1', '2', '3', '4', '5', '6', '7']);
	expect(connections).toBe(2);
});

it('polls safely across empty scans without opening a subscription', async () => {
	const c = client();
	const requests = lists(c, [[end(3, End.LEDGER_TIP)], [item(3), end(4, End.LEDGER_TIP)]]);
	c.subscriptionService.subscribeEvents = (() => {
		throw new Error('unexpected subscription');
	}) as never;
	const stream = c.streamEvents({ start: { checkpoint: '1' }, delivery: 'poll', pollInterval: 1 });
	const first = await stream.next();
	expect(first.value.event.checkpoint).toBe('3');
	expect(requests[1].options?.after).toEqual(cursor(3, 0, 2));
	await stream.return?.();
});

it('maps checkpoint headers and resumes after the numeric live checkpoint', async () => {
	const c = client();
	const checkpoint = GrpcTypes.Checkpoint.create({
		sequenceNumber: 5n,
		digest: 'digest',
		summary: { epoch: 2n, timestamp: { seconds: 123n, nanos: 456000000 } },
	});
	c.subscriptionService.subscribeCheckpoints = ((_request: object, options: RpcOptions) =>
		script([{ checkpoint, cursor: 5n }], options.abort, undefined, true)) as never;
	const stream = c.streamCheckpoints();
	const first = await stream.next();
	expect(first.value.checkpoint).toEqual({
		sequenceNumber: '5',
		digest: 'digest',
		epoch: '2',
		timestamp: '123456',
	});
	await stream.return?.();
	let request: GrpcTypes.ListCheckpointsRequest | undefined;
	c.ledgerService.listCheckpoints = ((
		input: GrpcTypes.ListCheckpointsRequest,
		options: RpcOptions,
	) => {
		request = input;
		return script(
			[
				{
					watermark: { cursor: cursor(6, 0, 2, 6), checkpoint: 5n },
					end: { reason: End.CHECKPOINT_BOUND },
				},
			],
			options.abort,
		);
	}) as never;
	const frames = await collect(
		c.streamCheckpoints({
			start: { resumeToken: first.value.resumeToken },
			end: { checkpoint: '6' },
			include: { completion: true },
		}),
	);
	expect(request?.startCheckpoint).toBe(6n);
	expect(frames.at(-1)?.$kind).toBe('Complete');
});

it('preserves every shared transaction include in the mandatory native read mask', async () => {
	const c = client();
	let paths: string[] = [];
	c.ledgerService.listTransactions = ((
		request: GrpcTypes.ListTransactionsRequest,
		options: RpcOptions,
	) => {
		paths = request.readMask!.paths;
		return script(
			[
				{
					watermark: { cursor: cursor(2, 0, 2, 7), checkpoint: 1n },
					end: { reason: End.CHECKPOINT_BOUND },
				},
			],
			options.abort,
		);
	}) as never;
	await collect(
		c.streamTransactions({
			start: { checkpoint: '1' },
			end: { checkpoint: '2' },
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
	expect(paths).toEqual(
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

it('fails unavailable history during repair without retrying it', async () => {
	const c = client();
	let calls = 0;
	let cancelled = false;
	c.subscriptionService.subscribeEvents = ((_request: object, options: RpcOptions) => {
		options.abort?.addEventListener('abort', () => {
			cancelled = true;
		});
		return script([item(10)], options.abort, undefined, true);
	}) as never;
	c.ledgerService.listEvents = ((_request: object, options: RpcOptions) => {
		calls++;
		return script([], options.abort, new RpcError('History pruned', 'NOT_FOUND'));
	}) as never;
	await expect(collect(c.streamEvents({ start: { checkpoint: '1' } }))).rejects.toThrow(
		'History pruned',
	);
	expect(calls).toBe(1);
	expect(cancelled).toBe(true);
});

it.each([false, true])(
	'resumes a completed checkpoint range from safe terminal progress (empty=%s)',
	async (empty) => {
		const c = client();
		lists(c, [empty ? [end(2)] : [item(1), end(2)]]);
		const frames = await collect(
			c.streamEvents({
				start: { checkpoint: '1' },
				end: { checkpoint: '2' },
				include: { progress: true, completion: true },
			}),
		);
		const progress = frames.find((frame) => frame.$kind === 'Progress');
		const complete = frames.find((frame) => frame.$kind === 'Complete');
		if (!progress || !complete) throw new Error('missing terminal progress');
		expect(complete.completion.resumeToken).toBe(progress.resumeToken);
		const resumedRequests = lists(c, []);
		for (const resumeToken of [progress.resumeToken, complete.completion.resumeToken!]) {
			const resumed = await collect(
				c.streamEvents({ start: { resumeToken }, include: { completion: true } }),
			);
			expect(resumed).toMatchObject([
				{ $kind: 'Complete', completion: { reason: 'checkpointBound' } },
			]);
		}
		expect(resumedRequests).toHaveLength(0);
		// The excluded checkpoint is still owned by the following explicit interval.
		lists(c, [[item(2), end(3)]]);
		const adjacent = await collect(
			c.streamEvents({ start: { checkpoint: '2' }, end: { checkpoint: '3' } }),
		);
		expect(adjacent.map((frame) => frame.event.checkpoint)).toEqual(['2']);
	},
);

it('resumes a captured-tip completion without discovering a new tip or replaying the boundary', async () => {
	const c = client();
	let tipReads = 0;
	c.ledgerService.listCheckpoints = ((_request: object, options: RpcOptions) => {
		tipReads++;
		return script(
			[
				{
					checkpoint: { sequenceNumber: 2n },
					watermark: { cursor: cursor(2, 0, 1, 6), checkpoint: 2n },
					end: { reason: End.ITEM_LIMIT },
				},
			],
			options.abort,
		);
	}) as never;
	lists(c, [[item(1), end(3, End.LEDGER_TIP)]]);
	const frames = await collect(
		c.streamEvents({ start: { checkpoint: '1' }, follow: false, include: { completion: true } }),
	);
	const complete = frames.at(-1);
	if (complete?.$kind !== 'Complete') throw new Error('missing completion');
	const requests = lists(c, []);
	const resumed = await collect(
		c.streamEvents({
			start: { resumeToken: complete.completion.resumeToken! },
			include: { completion: true },
		}),
	);
	expect(resumed).toMatchObject([
		{ $kind: 'Complete', completion: { reason: 'indexedTip', range: { capturedCheckpoint: '2' } } },
	]);
	expect(tipReads).toBe(1);
	expect(requests).toHaveLength(0);
});

it('keeps live item tokens inside an excluded checkpoint invalid as reversed ranges', async () => {
	const c = client();
	c.subscriptionService.subscribeEvents = ((_request: object, options: RpcOptions) =>
		script([item(2)], options.abort, undefined, true)) as never;
	const live = c.streamEvents();
	const saved = await live.next();
	await live.return?.();
	const requests = lists(c, []);
	await expect(
		collect(
			c.streamEvents({ start: { resumeToken: saved.value.resumeToken }, end: { checkpoint: '2' } }),
		),
	).rejects.toThrow('reversed');
	expect(requests).toHaveLength(0);
});

it('waits for a resumed descending position to be indexed before delivering older items', async () => {
	const c = client();
	let tip = 100;
	c.ledgerService.listCheckpoints = ((_request: object, options: RpcOptions) =>
		script(
			[
				{
					checkpoint: { sequenceNumber: BigInt(tip) },
					watermark: { cursor: cursor(tip, 0, 1, 6), checkpoint: BigInt(tip) },
					end: { reason: End.ITEM_LIMIT },
				},
			],
			options.abort,
		)) as never;
	lists(c, [[item(100), end(99)]]);
	const initial = c.streamEvents({
		start: { checkpoint: '100' },
		end: { checkpoint: '98' },
		order: 'descending',
	});
	const saved = await initial.next();
	await initial.return?.();
	tip = 90;
	let tipReads = 0;
	c.ledgerService.listCheckpoints = ((_request: object, options: RpcOptions) => {
		const current = ++tipReads === 1 ? 90 : 100;
		return script(
			[
				{
					checkpoint: { sequenceNumber: BigInt(current) },
					watermark: { cursor: cursor(current, 0, 1, 6), checkpoint: BigInt(current) },
					end: { reason: End.ITEM_LIMIT },
				},
			],
			options.abort,
		);
	}) as never;
	const requests = lists(c, [[item(99), end(99)]]);
	const resumed = await collect(
		c.streamEvents({ start: { resumeToken: saved.value.resumeToken }, pollInterval: 1 }),
	);
	expect(tipReads).toBe(2);
	expect(requests).toHaveLength(1);
	expect(resumed.map((frame) => frame.event.checkpoint)).toEqual(['99']);
});

it('rejects an impossible checkpoint-local offset above its global transaction position', async () => {
	const c = client();
	const malformed = item(1);
	malformed.event!.transactionIndex = 999n;
	lists(c, [[malformed, end(2)]]);
	await expect(
		collect(c.streamEvents({ start: { checkpoint: '1' }, end: { checkpoint: '2' } })),
	).rejects.toThrow('Checkpoint-local transaction index exceeds');
});

it('resumes a descending checkpoint-bound terminal token as an empty completed range', async () => {
	const c = client();
	c.ledgerService.listCheckpoints = ((_request: object, options: RpcOptions) =>
		script(
			[
				{
					checkpoint: { sequenceNumber: 4n },
					watermark: { cursor: cursor(4, 0, 1, 6), checkpoint: 4n },
					end: { reason: End.ITEM_LIMIT },
				},
			],
			options.abort,
		)) as never;
	lists(c, [
		[
			item(3),
			{
				watermark: { cursor: cursor(3, 0, 2), checkpoint: 3n },
				end: { reason: End.CHECKPOINT_BOUND },
			},
		],
	]);
	const frames = await collect(
		c.streamEvents({
			start: { checkpoint: '3' },
			end: { checkpoint: '2' },
			order: 'descending',
			include: { completion: true, progress: true },
		}),
	);
	const complete = frames.at(-1);
	if (complete?.$kind !== 'Complete') throw new Error('missing completion');
	const requests = lists(c, []);
	const resumed = await collect(
		c.streamEvents({
			start: { resumeToken: complete.completion.resumeToken! },
			include: { completion: true },
		}),
	);
	expect(resumed).toMatchObject([{ $kind: 'Complete', completion: { order: 'descending' } }]);
	expect(requests).toHaveLength(0);
});

it('accepts different checkpoint-local and global transaction indexes and resumes using the global cursor', async () => {
	const c = client();
	const first = item(1, 0);
	first.event!.transactionIndex = 5n;
	lists(c, [[first, item(1, 1), end(2)]]);
	const stream = c.streamEvents({
		start: { checkpoint: '1' },
		end: { checkpoint: '2' },
		include: { proto: true },
	});
	const saved = await stream.next();
	expect(saved.value.proto.transactionIndex).toBe(5n);
	await stream.return?.();
	const requests = lists(c, [[item(1, 1), end(2)]]);
	const resumed = await collect(
		c.streamEvents({ start: { resumeToken: saved.value.resumeToken } }),
	);
	expect(requests[0].options?.after).toEqual(cursor(1, 0));
	expect(resumed.map((frame) => frame.event.eventIndex)).toEqual([1]);
});

it('rejects a scan-boundary cursor attached to a ledger item', async () => {
	const c = client();
	const malformed = item(1);
	malformed.watermark!.cursor = cursor(1, 0, 2);
	lists(c, [[malformed, end(2)]]);
	await expect(
		collect(c.streamEvents({ start: { checkpoint: '1' }, end: { checkpoint: '2' } })),
	).rejects.toThrow('requires an item watermark');
});
