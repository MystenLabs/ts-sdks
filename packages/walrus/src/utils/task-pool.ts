// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

interface Task<T = unknown> {
	run: (abortSignal: AbortSignal) => Promise<T>;
	promise: PromiseWithResolvers<T>;
}

export class TaskPool {
	#maxConcurrency: number;
	#concurrency = 0;
	#queue: Task<unknown>[] = [];
	#onEmpty: (() => void)[] = [];
	#abortController = new AbortController();

	constructor(maxConcurrency: number) {
		this.#maxConcurrency = maxConcurrency;
	}

	#enqueue(task: Task) {
		this.#queue.push(task);
		if (this.#concurrency < this.#maxConcurrency) {
			this.#runNext();
		}
	}

	#runNext() {
		const task = this.#queue.shift();
		if (task) {
			this.#concurrency++;
			task
				.run(this.#abortController.signal)
				.then(task.promise.resolve, task.promise.reject)
				.finally(() => {
					this.#concurrency--;
					this.#runNext();
				});
		} else if (this.#concurrency === 0) {
			this.#onEmpty.forEach((fn) => fn());
		}
	}

	async runTask<T>(asyncFn: (abortSignal: AbortSignal) => Promise<T>) {
		const promise = Promise.withResolvers<T>();

		this.#enqueue({
			run: asyncFn,
			promise,
		} as Task);

		return promise.promise;
	}

	abortPendingTasks() {
		// this.#abortController.abort();
		// this.#queue = [];
	}

	async awaitAll() {
		if (this.#concurrency > 0) {
			const promise = Promise.withResolvers<void>();
			this.#onEmpty.push(() => promise.resolve());
			await promise.promise;
		}
	}
}
