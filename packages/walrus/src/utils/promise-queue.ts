// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export class PromiseQueue<T> {
	#queue: (() => Promise<void>)[] = [];
	#pending: number = 0;
	#maxConcurrency: number;

	constructor({ maxConcurrency }: { maxConcurrency: number }) {
		this.#maxConcurrency = maxConcurrency;
	}

	async add(fn: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.#queue.push(() => {
				this.#pending += 1;

				return fn()
					.then(resolve, reject)
					.finally(() => {
						this.#pending -= 1;
						this.#processQueue();
					});
			});

			this.#processQueue();
		});
	}

	#processQueue() {
		while (this.#pending < this.#maxConcurrency && this.#queue.length > 0) {
			const task = this.#queue.shift()!;
			task();
		}
	}
}
