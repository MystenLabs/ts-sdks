// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Abort ownership for streams: `abortableAsyncGenerator` owns one controller per iteration. It
 * links the caller's signal to that controller and aborts it when the generator finishes, throws,
 * or is returned. Everything below the generator (requests, sleeps, nested iterators) uses that
 * signal and never needs its own cleanup for cancellation.
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
	async function* generate(): AsyncGenerator<T> {
		const linked = linkedAbortController(signal);
		controller = linked.controller;
		try {
			controller.signal.throwIfAborted();
			yield* run(controller.signal);
		} finally {
			controller.abort();
			linked.dispose();
		}
	}
	const iterator = generate();
	// A generator suspended in `await` queues `return()`/`throw()` behind the pending `next()`.
	// Aborting first makes that pending read (or timer) reject, so the call cannot deadlock.
	const originalReturn = iterator.return.bind(iterator);
	iterator.return = (value) => {
		controller?.abort();
		return originalReturn(value);
	};
	const originalThrow = iterator.throw.bind(iterator);
	iterator.throw = (error) => {
		controller?.abort(error);
		return originalThrow(error);
	};
	return iterator;
}

/** Resolves after `delay` ms or rejects with the abort reason. Removes its timer and listener. */
export function sleep(delay: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) return reject(signal.reason);
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal.reason);
		};
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort);
			resolve();
		}, delay);
		signal.addEventListener('abort', onAbort, { once: true });
	});
}
