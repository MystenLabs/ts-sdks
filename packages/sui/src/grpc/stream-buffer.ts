// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from '@protobuf-ts/runtime-rpc';
import type { ServerStreamingCall } from '@protobuf-ts/runtime-rpc';

/** A bounded queue at the protobuf response boundary, including its otherwise unbounded queue. */
export function bufferedGrpcCall<T extends object>(
	call: ServerStreamingCall<object, T>,
	controller: AbortController,
	options: {
		limit: number;
		isItem(frame: T): boolean;
		coalesceProgress?: boolean;
	},
): AsyncIterableIterator<T> {
	const queue: T[] = [];
	let items = 0;
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
		} else if (message) {
			const item = options.isItem(message);
			if (
				(item && items >= options.limit) ||
				(!options.coalesceProgress && queue.length >= options.limit * 2 + 1)
			) {
				ended = true;
				failure = new RpcError('Ledger stream buffer limit reached', 'RESOURCE_EXHAUSTED');
				controller.abort(failure);
			} else {
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
			}
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
		async next() {
			while (!queue.length && !ended) {
				await new Promise<void>((resolve) => (wake = resolve));
				wake = undefined;
			}
			const value = queue.shift();
			if (value) {
				if (options.isItem(value)) items--;
				return { done: false, value };
			}
			if (failure) throw failure;
			return { done: true, value: undefined };
		},
		async return() {
			ended = true;
			queue.length = 0;
			controller.abort();
			remove();
			controller.signal.removeEventListener('abort', abort);
			wake?.();
			return { done: true, value: undefined };
		},
	};
}
