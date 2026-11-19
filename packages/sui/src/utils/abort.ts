// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * `abortableAsyncGenerator` owns one controller per iteration and aborts it whenever the generator
 * ends. That signals cancellation to the work below it and unblocks a pending step; releasing
 * resources, such as cancelling a response body that arrives late, stays with that work.
 */

/** A controller that aborts when `signal` aborts. Call `dispose` to detach from `signal`. */
export function linkedAbortController(signal?: AbortSignal) {
	const controller = new AbortController();
	const abort = () => controller.abort(signal?.reason);
	if (signal?.aborted) abort();
	else signal?.addEventListener('abort', abort, { once: true });
	return { controller, dispose: () => signal?.removeEventListener('abort', abort) };
}

// The listener lives only as long as one wait, so a long stream does not accumulate them.
function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const abort = () => reject(signal.reason);
		// Attached first so a rejection of `promise` is handled even when the abort wins.
		promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
		if (signal.aborted) abort();
		else signal.addEventListener('abort', abort, { once: true });
	});
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
	let thrown: { error: unknown } | undefined;
	async function* generate(): AsyncGenerator<T> {
		const linked = linkedAbortController(signal);
		const childSignal = linked.controller.signal;
		controller = linked.controller;
		let inner: AsyncGenerator<T> | undefined;
		try {
			childSignal.throwIfAborted();
			inner = run(childSignal);
			while (true) {
				// `run` can wait on work that ignores the signal, such as a custom `fetch`, so every wait
				// is raced against the abort.
				const result = await raceAbort(inner.next(), childSignal);
				if (result.done) return;
				yield result.value;
			}
		} catch (error) {
			// A `next()` pending when the consumer calls `return()` or `throw()` ends the iteration
			// instead; the queued call then settles on the finished generator.
			if (returning || (thrown && error !== thrown.error)) return;
			throw error;
		} finally {
			linked.controller.abort();
			linked.dispose();
			// Not awaited: it queues behind an inner `next()` that may never settle.
			inner?.return(undefined).catch(() => {});
		}
	}
	const iterator = generate();
	// A generator suspended in `await` queues `return()` and `throw()` behind the pending `next()`.
	// Aborting first makes that pending read (or timer) reject, so the call cannot deadlock.
	const originalReturn = iterator.return.bind(iterator);
	iterator.return = (value) => {
		returning = true;
		controller?.abort();
		return originalReturn(value);
	};
	const originalThrow = iterator.throw.bind(iterator);
	iterator.throw = (error) => {
		thrown = { error };
		controller?.abort();
		return originalThrow(error);
	};
	return iterator;
}
