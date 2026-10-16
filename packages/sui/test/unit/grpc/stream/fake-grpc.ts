// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A scripted gRPC transport for ledger stream tests.
 *
 * `ledger.list('ListEvents', page, page, ...)` queues one response stream per List call, and
 * `ledger.subscribe('SubscribeEvents', connection, ...)` one per Subscribe call. The transport
 * serves both paths ledger streams use: the internal on-demand pull method, and push
 * `serverStreaming`. `delivery: 'push'` configures a no-op interceptor, which makes streams fall
 * back to push the way a user's interceptor would.
 */

import {
	RpcError,
	RpcOutputStreamController,
	ServerStreamingCall,
	UnaryCall,
} from '@protobuf-ts/runtime-rpc';
import type {
	MethodInfo,
	RpcOptions,
	RpcTransport,
	ServerStreamingCall as ServerStreamingCallType,
} from '@protobuf-ts/runtime-rpc';

import { SuiGrpcClient } from '../../../../src/grpc/client.js';
import { GrpcTypes } from '../../../../src/grpc/index.js';
import { PULL_SERVER_STREAMING } from '../../../../src/grpc/pull-call.js';
import type { ServerStreamingIterableCall } from '../../../../src/grpc/pull-call.js';

export type Delivery = 'pull' | 'push';
export const DELIVERIES: [string, Delivery][] = [
	['pull', 'pull'],
	['push (interceptor)', 'push'],
];

type Frame = object;

/**
 * One response stream: its frames, then how it ends. `open` stays open until cancelled.
 * `delay` holds the first frame back for that many milliseconds.
 */
export interface Script {
	frames: Frame[];
	end?: 'complete' | 'open' | RpcError;
	delay?: number;
}

/** A script, or a function of the request that returns one. */
type Scripted = Frame[] | Script | ((input: GrpcTypes.ListEventsRequest) => Script);

type ListMethod = 'ListCheckpoints' | 'ListTransactions' | 'ListEvents';
type SubscribeMethod = 'SubscribeCheckpoints' | 'SubscribeTransactions' | 'SubscribeEvents';

export interface Request {
	method: string;
	input: GrpcTypes.ListEventsRequest & GrpcTypes.SubscribeEventsRequest;
}

export class FakeLedger implements RpcTransport {
	readonly delivery: Delivery;
	readonly requests: Request[] = [];
	/** Frames handed to the consumer, per method. */
	readonly reads: Record<string, number> = {};
	/** Calls cancelled by the client, per method. */
	readonly cancelled: Record<string, number> = {};
	readonly #scripts = new Map<
		string,
		(Script | ((input: GrpcTypes.ListEventsRequest) => Script))[]
	>();

	constructor(delivery: Delivery = 'pull') {
		this.delivery = delivery;
		// A fixed indexed tip unless a test scripts ListCheckpoints itself.
		this.tip(100);
	}

	/** Pages are frame lists that complete, or full scripts. */
	list(method: ListMethod, ...pages: Scripted[]): this {
		this.#queue(method).push(
			...pages.map((page) => (Array.isArray(page) ? { frames: page } : page)),
		);
		return this;
	}

	/** Connections stay open after their frames unless the script ends them. */
	subscribe(method: SubscribeMethod, ...connections: Scripted[]): this {
		this.#queue(method).push(
			...connections.map((c) => (Array.isArray(c) ? { frames: c, end: 'open' as const } : c)),
		);
		return this;
	}

	/** Answers every indexed-tip read (a descending ListCheckpoints with limit 1). */
	tip(checkpoint: number | (() => number)) {
		this.#tip = typeof checkpoint === 'number' ? () => checkpoint : checkpoint;
		return this;
	}
	#tip: () => number = () => 0;
	tipReads = 0;

	requestsTo(method: string) {
		return this.requests.filter((request) => request.method === method).map((r) => r.input);
	}

	client(): SuiGrpcClient {
		return new SuiGrpcClient({ network: 'testnet', transport: this });
	}

	#queue(method: string) {
		let queue = this.#scripts.get(method);
		if (!queue) this.#scripts.set(method, (queue = []));
		return queue;
	}

	#script(method: MethodInfo, input: object): Script {
		if (method.name === 'ListCheckpoints' && isTipRead(input)) {
			this.tipReads++;
			const tip = BigInt(this.#tip());
			return {
				frames: [
					{
						checkpoint: { sequenceNumber: tip },
						watermark: { cursor: at(Number(tip)), checkpoint: tip },
						end: { reason: GrpcTypes.QueryEndReason.ITEM_LIMIT },
					},
				],
			};
		}
		this.requests.push({ method: method.name, input: input as Request['input'] });
		const next = this.#scripts.get(method.name)?.shift();
		if (next) return typeof next === 'function' ? next(input as GrpcTypes.ListEventsRequest) : next;
		if (method.name.startsWith('Subscribe')) return { frames: [], end: 'open' };
		return { frames: [], end: new RpcError(`No scripted ${method.name} page`, 'INTERNAL') };
	}

	// --- RpcTransport ---

	mergeOptions(options?: Partial<RpcOptions>): RpcOptions {
		const interceptors =
			this.delivery === 'push'
				? [{ interceptServerStreaming: (next: any, ...args: any[]) => next(...args) }]
				: [];
		return { ...options, interceptors: [...interceptors, ...(options?.interceptors ?? [])] };
	}

	[PULL_SERVER_STREAMING]<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions = {},
	): ServerStreamingIterableCall<I, O> {
		const script = this.#script(method, input);
		const reads = this.reads;
		const cancelled = this.cancelled;
		const signal = options.abort;
		async function* responses() {
			let finished = false;
			try {
				if (script.delay) await new Promise((resolve) => setTimeout(resolve, script.delay));
				for (const frame of script.frames) {
					if (signal?.aborted) throw new RpcError('cancelled', 'CANCELLED');
					reads[method.name] = (reads[method.name] ?? 0) + 1;
					yield frame as O;
				}
				if (script.end instanceof RpcError) throw script.end;
				if (script.end === 'open') await untilAborted(signal);
				finished = true;
			} finally {
				if (!finished) cancelled[method.name] = (cancelled[method.name] ?? 0) + 1;
			}
		}
		return {
			method,
			requestHeaders: {},
			request: input,
			responses: responses(),
			headers: Promise.resolve({}),
			status: Promise.resolve({ code: 'OK', detail: '' }),
			trailers: Promise.resolve({}),
		};
	}

	serverStreaming<I extends object, O extends object>(
		method: MethodInfo<I, O>,
		input: I,
		options: RpcOptions,
	): ServerStreamingCallType<I, O> {
		const script = this.#script(method, input);
		const responses = new RpcOutputStreamController<O>();
		const signal = options.abort;
		const cancel = () => {
			if (responses.closed) return;
			this.cancelled[method.name] = (this.cancelled[method.name] ?? 0) + 1;
			responses.notifyError(new RpcError('cancelled', 'CANCELLED'));
		};
		signal?.addEventListener('abort', cancel, { once: true });
		const deliver = () => {
			for (const frame of script.frames) {
				if (responses.closed) return;
				this.reads[method.name] = (this.reads[method.name] ?? 0) + 1;
				responses.notifyMessage(frame as O);
			}
			if (responses.closed) return;
			if (script.end instanceof RpcError) responses.notifyError(script.end);
			else if (script.end !== 'open') responses.notifyComplete();
		};
		if (script.delay) setTimeout(deliver, script.delay);
		else queueMicrotask(deliver);
		return new ServerStreamingCall(
			method,
			{},
			input,
			Promise.resolve({}),
			responses,
			Promise.resolve({ code: 'OK', detail: '' }),
			Promise.resolve({}),
		);
	}

	unary<I extends object, O extends object>(method: MethodInfo<I, O>, input: I): UnaryCall<I, O> {
		if (method.name !== 'GetServiceInfo') throw new Error(`Unexpected unary ${method.name}`);
		return new UnaryCall(
			method,
			{},
			input,
			Promise.resolve({}),
			Promise.resolve({ chainId: 'chain' } as O),
			Promise.resolve({ code: 'OK', detail: '' }),
			Promise.resolve({}),
		);
	}

	clientStreaming(): never {
		throw new Error('unsupported');
	}

	duplex(): never {
		throw new Error('unsupported');
	}
}

function isTipRead(input: object) {
	const request = input as GrpcTypes.ListCheckpointsRequest;
	return request.options?.limit === 1 && request.options.ordering === GrpcTypes.Ordering.DESCENDING;
}

function untilAborted(signal: AbortSignal | undefined) {
	return new Promise<never>((_, reject) => {
		const fail = () => reject(new RpcError('cancelled', 'CANCELLED'));
		if (signal?.aborted) fail();
		signal?.addEventListener('abort', fail, { once: true });
	});
}

// --- Frames ---
// Cursors are opaque bytes deliberately unrelated to any server encoding.

const encoder = new TextEncoder();
/** The cursor of the item at `checkpoint`/`index`. */
export const at = (checkpoint: number, index = 0) => encoder.encode(`item/${checkpoint}/${index}`);
/** A progress cursor; `label` makes it unique. */
export const mark = (label: string | number) => encoder.encode(`mark/${label}`);

const { QueryEndReason } = GrpcTypes;
export type Reason = keyof typeof QueryEndReason;

/** An event item; its watermark covers the checkpoint before it unless `covered` says otherwise. */
export function event(
	checkpoint: number,
	index = 0,
	options: { covered?: number | null; end?: Reason; transactionIndex?: number } = {},
): GrpcTypes.ListEventsResponse {
	const covered = options.covered === undefined ? checkpoint - 1 : options.covered;
	return {
		event: {
			packageId: '0x2',
			module: 'test',
			sender: '0x1',
			eventType: '0x2::test::Event',
			checkpoint: BigInt(checkpoint),
			transactionIndex: BigInt(options.transactionIndex ?? 0),
			eventIndex: index,
			transactionDigest: `tx-${checkpoint}`,
		},
		watermark: {
			cursor: at(checkpoint, index),
			checkpoint: covered === null || covered < 0 ? undefined : BigInt(covered),
		},
		end: options.end ? { reason: QueryEndReason[options.end] } : undefined,
	};
}

/** A progress frame; `covered` is its watermark checkpoint. */
export function progress(
	cursor: Uint8Array,
	covered?: number,
	end?: Reason,
): GrpcTypes.ListEventsResponse {
	return {
		watermark: { cursor, checkpoint: covered === undefined ? undefined : BigInt(covered) },
		end: end ? { reason: QueryEndReason[end] } : undefined,
	};
}

/** A terminal frame whose watermark covers through `covered`. */
export function ended(reason: Reason, covered: number): GrpcTypes.ListEventsResponse {
	return progress(mark(`end-${covered}`), covered, reason);
}

/** A checkpoint item as ListCheckpoints returns it. */
export function checkpointFrame(
	checkpoint: number,
	end?: Reason,
): GrpcTypes.ListCheckpointsResponse {
	return {
		checkpoint: checkpointMessage(checkpoint),
		watermark: { cursor: at(checkpoint), checkpoint: BigInt(checkpoint) },
		end: end ? { reason: QueryEndReason[end] } : undefined,
	};
}

export function checkpointMessage(checkpoint: number): GrpcTypes.Checkpoint {
	return {
		sequenceNumber: BigInt(checkpoint),
		digest: `digest-${checkpoint}`,
		summary: { epoch: 2n, timestamp: { seconds: 123n, nanos: 456_000_000 }, commitments: [] },
		transactions: [],
	};
}

/** Reads `count` frames, then closes the stream. */
export async function take<T>(stream: AsyncGenerator<T>, count: number): Promise<T[]> {
	const frames: T[] = [];
	while (frames.length < count) {
		const next = await stream.next();
		if (next.done) break;
		frames.push(next.value);
	}
	await stream.return(undefined);
	return frames;
}

export async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
	const frames: T[] = [];
	for await (const frame of stream) frames.push(frame);
	return frames;
}

/** `checkpoint:eventIndex` of every event frame. */
export function eventIds(frames: object[]): string[] {
	return frames.flatMap((frame) => {
		if (!('event' in frame)) return [];
		const { event } = frame as { event: { checkpoint: string; eventIndex: number } };
		return [`${event.checkpoint}:${event.eventIndex}`];
	});
}

export const noDelay = { initialDelay: 0, maxDelay: 0, jitter: 0 };

/** Statuses as compact strings, e.g. `Page(history,limit)`. */
export function statusLog() {
	const log: string[] = [];
	const onStatus = (
		status: import('../../../../src/client/types.js').SuiClientTypes.StreamStatus,
	) => {
		switch (status.$kind) {
			case 'Connecting':
				return log.push(`Connecting(${status.attempt})`);
			case 'Page':
				return log.push(`Page(${status.stage},${status.end})`);
			case 'Retrying':
				return log.push(`Retrying(${status.attempt},${status.delay})`);
			default:
				return log.push(status.$kind);
		}
	};
	return { log, onStatus };
}
