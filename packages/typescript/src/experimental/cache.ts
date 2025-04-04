// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export interface ClientCacheOptions {
	prefix?: string[];
	cache?: Map<string, unknown>;
}

export class ClientCache {
	#prefix: string[];
	#cache: Map<string, unknown>;

	constructor({ prefix, cache }: ClientCacheOptions = {}) {
		this.#prefix = prefix ?? [];
		this.#cache = cache ?? new Map();
	}

	read<T>(key: [string, ...string[]], load: () => T | Promise<T>): T | Promise<T> {
		const cacheKey = [this.#prefix, ...key].join(':');

		if (this.#cache.has(cacheKey)) {
			return this.#cache.get(cacheKey) as T;
		}

		const result = load();

		this.#cache.set(cacheKey, result);

		if (typeof result === 'object' && result !== null && 'then' in result) {
			return Promise.resolve(result)
				.then((v) => {
					this.#cache.set(cacheKey, v);
					return v as T;
				})
				.catch((err) => {
					this.#cache.delete(cacheKey);
					throw err;
				});
		}

		return result as T;
	}

	clear(prefix?: string[]) {
		const prefixKey = [...this.#prefix, ...(prefix ?? [])].join(':');
		if (!prefixKey) {
			this.#cache.clear();
			return;
		}

		for (const key of this.#cache.keys()) {
			if (key.startsWith(prefixKey)) {
				this.#cache.delete(key);
			}
		}
	}

	scope(prefix: string | string[]) {
		return new ClientCache({
			prefix: [...this.#prefix, ...(Array.isArray(prefix) ? prefix : [prefix])],
			cache: this.#cache,
		});
	}
}
