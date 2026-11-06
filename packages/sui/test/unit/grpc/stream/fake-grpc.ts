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

import { base64encode } from '@protobuf-ts/runtime';
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
import { ErrorInfo } from '../../../../src/grpc/proto/google/rpc/error_details.js';
import { Status } from '../../../../src/grpc/proto/google/rpc/status.js';
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
 * `delay` holds the first frame back for that many milliseconds. `gate` releases frames one at a
 * time as the test opens it. `sync` (push only) delivers everything before the call is returned,
 * like a transport or interceptor that answers from a cache.
 */
export interface Script {
	frames: Frame[];
	end?: 'complete' | 'open' | RpcError;
	delay?: number;
	gate?: Gate;
	sync?: boolean;
}

/** Releases frames to a gated script: `open(n)` lets `n` more through. */
export class Gate {
	#permits = 0;
	#waiters: (() => void)[] = [];

	open(count = 1) {
		this.#permits += count;
		while (this.#permits > 0 && this.#waiters.length) {
			this.#permits--;
			this.#waiters.shift()!();
		}
	}

	wait(): Promise<void> {
		if (this.#permits > 0) {
			this.#permits--;
			return Promise.resolve();
		}
		return new Promise((resolve) => this.#waiters.push(resolve));
	}
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
	/** Every call the client made, in order, including tip reads and `GetServiceInfo`. */
	readonly calls: string[] = [];
	/** Frames the transport delivered, per method, whether or not they were consumed. */
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

	/** Answers every indexed-tip read (a descending ListCheckpoints with limit 1); null: none yet. */
	tip(checkpoint: number | null | (() => number | null)) {
		this.#tip = typeof checkpoint === 'function' ? checkpoint : () => checkpoint;
		return this;
	}
	#tip: () => number | null = () => 0;

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
		const edge = method.name === 'ListCheckpoints' && edgeRead(input);
		if (edge) {
			this.calls.push(edge);
			const edgeCheckpoint = this.#tip();
			if (edgeCheckpoint === null) {
				return { frames: [{ end: { reason: GrpcTypes.QueryEndReason.LEDGER_TIP } }] };
			}
			const checkpoint = BigInt(edgeCheckpoint);
			return {
				frames: [
					{
						checkpoint: { sequenceNumber: checkpoint },
						watermark: {
							cursor: at(Number(checkpoint)),
							checkpoint,
							cursorPosition: { checkpoint: checkpoint + 1n },
						},
						end: { reason: GrpcTypes.QueryEndReason.ITEM_LIMIT },
					},
				],
			};
		}
		this.calls.push(method.name);
		this.requests.push({ method: method.name, input: input as Request['input'] });
		const next = this.#scripts.get(method.name)?.shift();
		if (next) return typeof next === 'function' ? next(input as GrpcTypes.ListEventsRequest) : next;
		if (method.name.startsWith('Subscribe')) return { frames: [], end: 'open' };
		return { frames: [], end: new RpcError(`No scripted ${method.name} page`, 'UNIMPLEMENTED') };
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
	): ServerStreamingIterableCall<O> {
		const script = this.#script(method, input);
		const reads = this.reads;
		const cancelled = this.cancelled;
		const signal = options.abort;
		async function* responses() {
			let finished = false;
			try {
				if (script.delay) await new Promise((resolve) => setTimeout(resolve, script.delay));
				for (const frame of script.frames) {
					if (script.gate) await script.gate.wait();
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
		return { responses: responses() };
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
		const deliver = async () => {
			for (const frame of script.frames) {
				if (script.gate) await script.gate.wait();
				if (responses.closed) return;
				this.reads[method.name] = (this.reads[method.name] ?? 0) + 1;
				responses.notifyMessage(frame as O);
			}
			if (responses.closed) return;
			if (script.end instanceof RpcError) responses.notifyError(script.end);
			else if (script.end !== 'open') responses.notifyComplete();
		};
		if (script.sync) void deliver();
		else if (script.delay) setTimeout(deliver, script.delay);
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
		this.calls.push(method.name);
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

/** A one-checkpoint read of the newest or oldest checkpoint the server can list. */
function edgeRead(input: object) {
	const request = input as GrpcTypes.ListCheckpointsRequest;
	if (request.options?.limit !== 1 || request.startCheckpoint !== undefined) return undefined;
	return request.options.ordering === GrpcTypes.Ordering.DESCENDING ? 'tip' : undefined;
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
			// Ascending: just past the item.
			cursorPosition: {
				checkpoint: BigInt(checkpoint),
				transactionIndex: BigInt(options.transactionIndex ?? 0),
				eventIndex: index + 1,
			},
		},
		end: options.end ? { reason: QueryEndReason[options.end] } : undefined,
	};
}

/** A ledger position: a checkpoint, or `[checkpoint, transactionIndex, eventIndex]`. */
export type At = number | [number, number, number?];

export function ledgerPosition(position: At): GrpcTypes.LedgerPosition {
	if (typeof position === 'number') return { checkpoint: BigInt(position) };
	const [checkpoint, transactionIndex, eventIndex] = position;
	return { checkpoint: BigInt(checkpoint), transactionIndex: BigInt(transactionIndex), eventIndex };
}

/**
 * A progress frame at `position`; `covered` is its watermark checkpoint. The position defaults to
 * the boundary after `covered`.
 */
export function progress(
	cursor: Uint8Array,
	covered?: number,
	end?: Reason,
	position: At | undefined = covered === undefined ? undefined : covered + 1,
): GrpcTypes.ListEventsResponse {
	if (position === undefined) throw new Error('A progress frame needs a position');
	return {
		watermark: {
			cursor,
			checkpoint: covered === undefined ? undefined : BigInt(covered),
			cursorPosition: ledgerPosition(position),
		},
		end: end ? { reason: QueryEndReason[end] } : undefined,
	};
}

/** A watermark a filtered List call sends between items, at the scan frontier. */
export function frontier(
	label: string,
	covered: number,
	position: At,
): GrpcTypes.ListEventsResponse {
	return progress(mark(label), covered, undefined, position);
}

/** A terminal frame whose watermark covers through `covered`. */
export function ended(reason: Reason, covered: number): GrpcTypes.ListEventsResponse {
	return progress(mark(`end-${covered}`), covered, reason);
}

/** An OUT_OF_RANGE error with the `ErrorInfo` a server marks it with in `grpc-status-details-bin`. */
export function outOfRange(
	reason: 'BELOW_EARLIEST_AVAILABLE' | 'ABOVE_LATEST_AVAILABLE',
	metadata: Record<string, string>,
): RpcError {
	const info = ErrorInfo.create({ reason, domain: 'sui.io', metadata });
	const status = Status.toBinary({
		code: 11,
		message: reason,
		// As servers pack it: a type URL with no host.
		details: [{ typeUrl: '/google.rpc.ErrorInfo', value: ErrorInfo.toBinary(info) }],
	});
	// Servers encode the header without padding.
	const details = base64encode(status).replace(/=+$/, '');
	return new RpcError(reason, 'OUT_OF_RANGE', { 'grpc-status-details-bin': details });
}

/**
 * `grpc-status-details-bin` as a localnet server sent it, unchanged, for a descending
 * ListCheckpoints with `end_checkpoint` 1000000000 when it had indexed below 161: an
 * ABOVE_LATEST_AVAILABLE `ErrorInfo` with `bound` "end_checkpoint".
 */
export const LOCALNET_ABOVE_LATEST =
	'CAsScXJlcXVlc3RlZCBkYXRhIGFib3ZlIGxhdGVzdCBhdmFpbGFibGU7IGVuZF9jaGVja3BvaW50IGlzIDEwMDAwMDAwMDAsIGFuZCBvbmx5IGNoZWNrcG9pbnRzIGJlbG93IDE2MSBhcmUgYXZhaWxhYmxlGpgBChUvZ29vZ2xlLnJwYy5FcnJvckluZm8SfwoWQUJPVkVfTEFURVNUX0FWQUlMQUJMRRIGc3VpLmlvGhcKBWJvdW5kEg5lbmRfY2hlY2twb2ludBohChpmaXJzdFVuYXZhaWxhYmxlQ2hlY2twb2ludBIDMTYxGiEKE3JlcXVlc3RlZENoZWNrcG9pbnQSCjEwMDAwMDAwMDA';

/** The request reads below the server's lowest available checkpoint, `floor`. */
export function belowEarliest(floor: number): RpcError {
	return outOfRange('BELOW_EARLIEST_AVAILABLE', { lowestAvailableCheckpoint: String(floor) });
}

/**
 * How a server ends a descending read with no lower bound of its own at its floor: the items, a
 * payload-free watermark frame at the floor with no QueryEnd, then BELOW_EARLIEST_AVAILABLE.
 */
export function servingFloor(floor: number, ...items: Frame[]): Script {
	return {
		frames: [
			...items,
			{
				watermark: {
					cursor: mark(`floor-${floor}`),
					checkpoint: BigInt(floor),
					cursorPosition: { checkpoint: BigInt(floor) },
				},
			},
		],
		end: belowEarliest(floor),
	};
}

/** A checkpoint item as ListCheckpoints returns it. */
export function checkpointFrame(
	checkpoint: number,
	end?: Reason,
): GrpcTypes.ListCheckpointsResponse {
	return {
		checkpoint: checkpointMessage(checkpoint),
		watermark: {
			cursor: at(checkpoint),
			checkpoint: BigInt(checkpoint),
			cursorPosition: { checkpoint: BigInt(checkpoint + 1) },
		},
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

/** `checkpoint:eventIndex` of every event frame. */
export function eventIds(frames: object[]): string[] {
	return frames.flatMap((frame) => {
		if (!('event' in frame)) return [];
		const { event } = frame as { event: { checkpoint: string; eventIndex: number } };
		return [`${event.checkpoint}:${event.eventIndex}`];
	});
}
