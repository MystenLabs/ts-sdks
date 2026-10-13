// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export function linkedAbortController(signal?: AbortSignal) {
	const controller = new AbortController();
	const abort = () => controller.abort(signal?.reason);
	if (signal?.aborted) abort();
	else signal?.addEventListener('abort', abort, { once: true });
	return { controller, dispose: () => signal?.removeEventListener('abort', abort) };
}

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
	// Abort before queuing return/throw so a pending read or timer can finish.
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
