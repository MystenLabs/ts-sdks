// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import type {
	MethodInfo,
	RpcOptions,
	RpcTransport,
	ServerStreamingCall,
	ServiceInfo,
} from '@protobuf-ts/runtime-rpc';

import { supportsServerStreamingIterable } from './pull.js';

export interface BufferOptions<T> {
	/** Maximum buffered frames that carry a ledger item. */
	limit: number;
	isItem(frame: T): boolean;
	/** Replace a buffered progress frame with a newer one instead of queueing both. */
	coalesceProgress?: boolean;
}

export interface LedgerCallIterator<T> extends AsyncIterableIterator<T> {
	/**
	 * While enabled, frames are read ahead of the consumer into the bounded buffer; past its limit
	 * the call fails with `RESOURCE_EXHAUSTED`. Disabled, frames are read only on demand. Always
	 * enabled for transports without `serverStreamingIterable`.
	 */
	prefetch(enabled: boolean): void;
}

function boundedQueue<T>(options: BufferOptions<T>) {
	const queue: T[] = [];
	let items = 0;
	return {
		get length() {
			return queue.length;
		},
		/** Returns `false` when the frame would exceed the limit. */
		push(message: T): boolean {
			const item = options.isItem(message);
			if (
				(item && items >= options.limit) ||
				(!options.coalesceProgress && queue.length >= options.limit * 2 + 1)
			) {
				return false;
			}
			if (
				options.coalesceProgress &&
				!item &&
				queue.length &&
				!options.isItem(queue[queue.length - 1])
			) {
				queue[queue.length - 1] = message;
			} else {
				queue.push(message);
				if (item) items++;
			}
			return true;
		},
		shift(): T | undefined {
			const value = queue.shift();
			if (value && options.isItem(value)) items--;
			return value;
		},
		clear() {
			queue.length = 0;
			items = 0;
		},
	};
}

const OVERFLOWS = new WeakSet<RpcError>();

/** True for the error a buffered call fails with when its item limit is reached. */
export function isBufferOverflow(error: unknown): boolean {
	return error instanceof RpcError && OVERFLOWS.has(error);
}

function overflow() {
	const error = new RpcError('Ledger stream buffer limit reached', 'RESOURCE_EXHAUSTED');
	OVERFLOWS.add(error);
	return error;
}

/** A bounded queue at the protobuf response boundary, including its otherwise unbounded queue. */
export function bufferedGrpcCall<T extends object>(
	call: ServerStreamingCall<object, T>,
	controller: AbortController,
	options: BufferOptions<T>,
): LedgerCallIterator<T> {
	const queue = boundedQueue(options);
	let ended = false;
	let failure: unknown;
	let wake: (() => void) | undefined;
	const iterator = call.responses[Symbol.asyncIterator]();
	// protobuf-ts queues even when using callbacks. Drain that queue synchronously on every
	// callback, before another response can arrive; only our bounded queue retains payloads.
	const remove = call.responses.onNext((message, error, complete) => {
		void iterator.next().catch(() => {});
		if (ended) return;
		if (error || complete) {
			ended = true;
			failure = error;
		} else if (message && !queue.push(message)) {
			ended = true;
			failure = overflow();
			controller.abort(failure);
		}
		wake?.();
	});
	for (const promise of [call.headers, call.status, call.trailers]) {
		void promise.catch(() => {});
	}
	const abort = () => {
		ended = true;
		failure ??= controller.signal.reason;
		wake?.();
	};
	controller.signal.addEventListener('abort', abort, { once: true });
	return {
		[Symbol.asyncIterator]() {
			return this;
		},
		prefetch() {},
		async next() {
			while (!queue.length && !ended) {
				await new Promise<void>((resolve) => (wake = resolve));
				wake = undefined;
			}
			const value = queue.shift();
			if (value) return { done: false, value };
			if (failure) throw failure;
			return { done: true, value: undefined };
		},
		async return() {
			ended = true;
			queue.clear();
			controller.abort();
			remove();
			controller.signal.removeEventListener('abort', abort);
			wake?.();
			return { done: true, value: undefined };
		},
	};
}

/** Reads a pull-based call on demand, or ahead into a bounded queue while prefetching. */
export function bufferedPullCall<T extends object>(
	responses: AsyncIterator<T>,
	controller: AbortController,
	options: BufferOptions<T>,
): LedgerCallIterator<T> {
	const queue = boundedQueue(options);
	let ended = false;
	let failure: unknown;
	let prefetching = false;
	let pumping = false;
	let inflight: Promise<void> | undefined;

	const end = (error?: unknown) => {
		if (ended) return;
		ended = true;
		failure = error;
	};
	const abort = () => end(controller.signal.reason);
	controller.signal.addEventListener('abort', abort, { once: true });

	// The source serializes reads, so the consumer and the prefetch loop share one.
	const readOne = () =>
		(inflight ??= responses.next().then(
			(result) => {
				inflight = undefined;
				if (ended) return;
				if (result.done) end();
				else if (!queue.push(result.value)) {
					const error = overflow();
					end(error);
					controller.abort(error);
				}
			},
			(error: unknown) => {
				inflight = undefined;
				end(error);
			},
		));

	const pump = async () => {
		if (pumping) return;
		pumping = true;
		try {
			while (prefetching && !ended) await readOne();
		} finally {
			pumping = false;
		}
	};

	return {
		[Symbol.asyncIterator]() {
			return this;
		},
		prefetch(enabled) {
			prefetching = enabled;
			if (enabled) void pump();
		},
		async next() {
			while (!queue.length && !ended) await readOne();
			const value = queue.shift();
			if (value) return { done: false, value };
			if (failure) throw failure;
			return { done: true, value: undefined };
		},
		async return() {
			end();
			prefetching = false;
			queue.clear();
			controller.signal.removeEventListener('abort', abort);
			controller.abort();
			await responses.return?.();
			return { done: true, value: undefined };
		},
	};
}

/**
 * Starts a server-streaming call of a generated service client built with `transport`. The
 * transport's `serverStreamingIterable` is used when it has one and no interceptors are
 * configured; otherwise the generated method runs and its responses are read into the bounded
 * buffer.
 */
export function openLedgerCall<T extends object>(
	transport: RpcTransport,
	service: ServiceInfo,
	methodName: string,
	request: object,
	controller: AbortController,
	options: BufferOptions<T>,
): LedgerCallIterator<T> {
	const { methods } = service;
	const method = methods.find((m) => m.localName === methodName);
	const callOptions: RpcOptions = { abort: controller.signal };
	if (method && supportsServerStreamingIterable(transport)) {
		const merged = transport.mergeOptions(callOptions);
		if (!merged.interceptors?.length) {
			const call = transport.serverStreamingIterable(
				method as MethodInfo<object, T>,
				request,
				merged,
			);
			for (const promise of [call.headers, call.status, call.trailers]) {
				void promise.catch(() => {});
			}
			return bufferedPullCall(call.responses, controller, options);
		}
	}
	const call = (
		service as unknown as Record<
			string,
			(request: object, options: RpcOptions) => ServerStreamingCall<object, T>
		>
	)[methodName](request, callOptions);
	return bufferedGrpcCall(call, controller, options);
}
