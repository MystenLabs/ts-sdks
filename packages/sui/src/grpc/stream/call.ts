// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Server-streaming calls for ledger streams, read through a bounded queue.
 *
 * - pull: `GrpcWebFetchTransport` without interceptors reads a response only when asked, unless
 *   `readAhead(true)`.
 * - push: any other transport, called through `stackIntercept` so interceptors run. Responses
 *   arrive unasked; the bounded queue caps what is held.
 *
 * Once the stream signal aborts, queued responses are dropped and `next()` rejects with the abort
 * reason. An overflow is not a cancellation: responses queued before it are delivered first.
 */

import { RpcError, stackIntercept } from '@protobuf-ts/runtime-rpc';
import type { MethodInfo, RpcTransport, ServerStreamingCall } from '@protobuf-ts/runtime-rpc';

import { linkedAbortController } from '../../utils/abort.js';
import { pullServerStreaming } from '../pull-call.js';

/**
 * The estimated message bytes a call may hold before it overflows and the stream reconnects.
 * Mutable for tests.
 */
export const liveBuffer = { maxBytes: 512 * 1024 * 1024 };

export interface LedgerCall<T> extends AsyncIterableIterator<T> {
	/**
	 * While enabled, responses are read ahead of the consumer into the bounded queue; past its
	 * limit the call fails with a buffer overflow. Push transports always read ahead.
	 */
	readAhead(enabled: boolean): void;
	/** Cancels the call. */
	return(): Promise<IteratorReturnResult<undefined>>;
}

export interface LedgerCallOptions<T> {
	signal: AbortSignal;
	/** Whether a response carries a ledger item. */
	isItem(response: T): boolean;
	/** Keep only the newest of consecutive queued progress responses. */
	coalesceProgress?: boolean;
	/** Defaults to `liveBuffer.maxBytes`. */
	maxBytes?: number;
}

const overflows = new WeakSet<object>();

/** The error a call fails with when its queue is full. The stream treats it as a disconnect. */
export function isBufferOverflow(error: unknown): boolean {
	return typeof error === 'object' && error !== null && overflows.has(error);
}

export function openLedgerCall<I extends object, O extends object>(
	transport: RpcTransport,
	method: MethodInfo<I, O>,
	request: I,
	options: LedgerCallOptions<O>,
): LedgerCall<O> {
	const linked = { ...linkedAbortController(options.signal), stream: options.signal };
	const queue = new BoundedQueue(options);
	const pull = pullServerStreaming(transport);
	if (pull) {
		const call = pull(method, request, { abort: linked.controller.signal });
		ignoreRejections([call.headers, call.status, call.trailers]);
		return new PullLedgerCall(call.responses, queue, linked);
	}
	const call = stackIntercept(
		'serverStreaming',
		transport,
		method,
		transport.mergeOptions({ abort: linked.controller.signal }),
		request,
	);
	ignoreRejections([call.headers, call.status, call.trailers]);
	return new PushLedgerCall(call, queue, linked);
}

/** Holds responses up to a budget of estimated bytes; a response always fits an empty queue. */
class BoundedQueue<T> {
	readonly #isItem: (response: T) => boolean;
	readonly #maxBytes: number;
	readonly #coalesceProgress: boolean;
	#responses: { response: T; bytes: number }[] = [];
	#head = 0;
	#bytes = 0;

	constructor(options: LedgerCallOptions<T>) {
		this.#isItem = options.isItem;
		this.#maxBytes = options.maxBytes ?? liveBuffer.maxBytes;
		this.#coalesceProgress = options.coalesceProgress ?? false;
	}

	get length() {
		return this.#responses.length - this.#head;
	}

	/** Returns false when `response` does not fit. */
	push(response: T): boolean {
		const item = this.#isItem(response);
		const last = this.length > 0 ? this.#responses.at(-1)! : undefined;
		if (!item && this.#coalesceProgress && last && !this.#isItem(last.response)) {
			this.#bytes -= last.bytes;
			last.response = response;
			last.bytes = estimateBytes(response);
			this.#bytes += last.bytes;
			return true;
		}
		const bytes = estimateBytes(response);
		if (this.length > 0 && this.#bytes + bytes > this.#maxBytes) return false;
		this.#responses.push({ response, bytes });
		this.#bytes += bytes;
		return true;
	}

	shift(): T | undefined {
		if (this.length === 0) return undefined;
		const entry = this.#responses[this.#head];
		this.#responses[this.#head++] = undefined!;
		this.#bytes -= entry.bytes;
		// Compact once the consumed prefix is half the array, so shifting stays O(1) amortized.
		if (this.#head >= 1024 && this.#head * 2 >= this.#responses.length) {
			this.#responses = this.#responses.slice(this.#head);
			this.#head = 0;
		}
		return entry.response;
	}

	clear() {
		this.#responses = [];
		this.#head = 0;
		this.#bytes = 0;
	}
}

/**
 * Roughly the encoded size of a decoded message: bytes and strings by length, other fields by 8.
 * Cheap next to decoding, which visits the same fields.
 */
export function estimateBytes(value: unknown): number {
	switch (typeof value) {
		case 'string':
			return value.length;
		case 'object': {
			if (value === null) return 0;
			if (value instanceof Uint8Array) return value.byteLength;
			let bytes = 8;
			if (Array.isArray(value)) {
				for (const element of value) bytes += estimateBytes(element);
			} else {
				for (const key in value) bytes += estimateBytes((value as Record<string, unknown>)[key]);
			}
			return bytes;
		}
		default:
			return 8;
	}
}

/** The shared half: a queue, a sticky end state, and cancellation. */
abstract class QueuedLedgerCall<T> implements LedgerCall<T> {
	protected readonly queue: BoundedQueue<T>;
	readonly #linked: CallAbort;
	readonly #onStreamAbort = () => this.#cancel(this.#linked.stream.reason);
	#ended = false;
	#returned = false;
	#failure: unknown;
	#wake: (() => void) | undefined;

	constructor(queue: BoundedQueue<T>, linked: CallAbort) {
		this.queue = queue;
		this.#linked = linked;
		// Listen to the stream signal itself: an overflow has already aborted the call's own
		// controller, and a later stream abort must still cancel the call.
		const { stream } = linked;
		if (stream.aborted) this.#cancel(stream.reason);
		else stream.addEventListener('abort', this.#onStreamAbort, { once: true });
	}

	[Symbol.asyncIterator]() {
		return this;
	}

	abstract readAhead(enabled: boolean): void;
	/** Resolves once a response is queued or the call has ended. */
	protected abstract fill(): Promise<void>;
	/** Releases the transport's response stream after cancellation. */
	protected abstract release(): Promise<void>;

	protected get ended() {
		return this.#ended;
	}

	/** The first end wins. Once aborted, the abort reason replaces the transport's cancel error. */
	protected end(error?: unknown) {
		if (this.#ended) return;
		this.#ended = true;
		const signal = this.#linked.controller.signal;
		this.#failure = signal.aborted ? signal.reason : error;
		this.wake();
	}

	/** Drops queued responses and fails later `next()` calls, even after the call has ended. */
	#cancel(reason: unknown) {
		if (this.#returned) return;
		this.#ended = true;
		this.#failure = reason;
		this.queue.clear();
		this.wake();
	}

	protected wake() {
		this.#wake?.();
		this.#wake = undefined;
	}

	protected waitForWake(): Promise<void> {
		return new Promise((resolve) => (this.#wake = resolve));
	}

	protected enqueue(response: T) {
		if (this.queue.push(response)) return;
		const error = new RpcError('Ledger stream buffer limit reached', 'RESOURCE_EXHAUSTED');
		overflows.add(error);
		this.end(error);
		this.#linked.controller.abort(error);
	}

	async next(): Promise<IteratorResult<T, undefined>> {
		while (!this.queue.length && !this.#ended) await this.fill();
		const value = this.queue.shift();
		if (value !== undefined) return { done: false, value };
		if (this.#failure !== undefined) throw this.#failure;
		return { done: true, value: undefined };
	}

	async return(): Promise<IteratorReturnResult<undefined>> {
		this.end();
		this.#returned = true;
		this.queue.clear();
		this.#linked.controller.abort();
		this.#linked.dispose();
		this.#linked.stream.removeEventListener('abort', this.#onStreamAbort);
		await this.release();
		return { done: true, value: undefined };
	}
}

/** Reads on demand; while `readAhead` is on, a pump reads into the queue in the background. */
class PullLedgerCall<T> extends QueuedLedgerCall<T> {
	readonly #responses: AsyncIterator<T>;
	#readingAhead = false;
	#pumping = false;
	#inflight: Promise<void> | undefined;

	constructor(responses: AsyncIterator<T>, queue: BoundedQueue<T>, linked: CallAbort) {
		super(queue, linked);
		this.#responses = responses;
	}

	readAhead(enabled: boolean) {
		this.#readingAhead = enabled;
		if (enabled) void this.#pump();
	}

	protected fill() {
		return this.#readOne();
	}

	protected async release() {
		this.#readingAhead = false;
		await this.#responses.return?.();
	}

	// The transport serializes reads, so the consumer and the pump share one in-flight read.
	#readOne(): Promise<void> {
		this.#inflight ??= this.#responses.next().then(
			(result) => {
				this.#inflight = undefined;
				if (this.ended) return;
				if (result.done) this.end();
				else this.enqueue(result.value);
			},
			(error: unknown) => {
				this.#inflight = undefined;
				this.end(error);
			},
		);
		return this.#inflight;
	}

	async #pump() {
		if (this.#pumping) return;
		this.#pumping = true;
		try {
			while (this.#readingAhead && !this.ended) await this.#readOne();
		} finally {
			this.#pumping = false;
		}
	}
}

/** The transport pushes responses as they arrive; they go straight into the bounded queue. */
class PushLedgerCall<T extends object> extends QueuedLedgerCall<T> {
	constructor(call: ServerStreamingCall<object, T>, queue: BoundedQueue<T>, linked: CallAbort) {
		super(queue, linked);
		// protobuf-ts's iterator, unlike `onNext`, replays responses delivered before the call was
		// returned (for example by a caching interceptor).
		void this.#drain(call.responses[Symbol.asyncIterator]());
	}

	readAhead() {}

	protected fill() {
		return this.waitForWake();
	}

	protected async release() {}

	async #drain(responses: AsyncIterator<T>) {
		try {
			while (!this.ended) {
				const result = await responses.next();
				if (this.ended) return;
				if (result.done) return this.end();
				this.enqueue(result.value);
				this.wake();
			}
		} catch (error) {
			this.end(error);
		}
	}
}

/** The call's own controller, plus the stream signal it is linked to. */
type CallAbort = ReturnType<typeof linkedAbortController> & { stream: AbortSignal };

function ignoreRejections(promises: Promise<unknown>[]) {
	for (const promise of promises) void promise.catch(() => {});
}
