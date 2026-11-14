// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * `abortableAsyncGenerator` owns one controller per iteration and aborts it whenever the generator
 * ends, so work below it needs no cancellation cleanup of its own.
 */

/** A controller that aborts when `signal` aborts. Call `dispose` to detach from `signal`. */
export function linkedAbortController(signal?: AbortSignal) {
	const controller = new AbortController();
	const abort = () => controller.abort(signal?.reason);
	if (signal?.aborted) abort();
	else signal?.addEventListener('abort', abort, { once: true });
	return { controller, dispose: () => signal?.removeEventListener('abort', abort) };
}

/**
 * Runs `run` lazily on the first `next()` with a signal that aborts when the caller's signal
 * aborts or the generator ends for any reason.
 */
export function abortableAsyncGenerator<T>(
	run: (signal: AbortSignal) => AsyncGenerator<T>,
	signal?: AbortSignal,
): AsyncGenerator<T> {
	let controller: AbortController | undefined;
	let returning = false;
	async function* generate(): AsyncGenerator<T> {
		const linked = linkedAbortController(signal);
		controller = linked.controller;
		try {
			controller.signal.throwIfAborted();
			yield* run(controller.signal);
		} catch (error) {
			// A `next()` pending when the consumer calls `return()` ends the iteration instead.
			if (!returning) throw error;
		} finally {
			controller.abort();
			linked.dispose();
		}
	}
	const iterator = generate();
	// A generator suspended in `await` queues `return()` behind the pending `next()`. Aborting first
	// makes that pending read (or timer) reject, so the call cannot deadlock.
	const originalReturn = iterator.return.bind(iterator);
	iterator.return = (value) => {
		returning = true;
		controller?.abort();
		return originalReturn(value);
	};
	return iterator;
}
