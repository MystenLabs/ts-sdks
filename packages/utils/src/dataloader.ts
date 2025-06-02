// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Copied from https://github.com/graphql/dataloader/blob/a10773043d41a56bde4219c155fcf5633e6c9bcb/src/index.js */

/**
 * A `DataLoader` creates a public API for loading data from a particular
 * data back-end with unique keys such as the `id` column of a SQL table or
 * document name in a MongoDB database, given a batch loading function.
 *
 * Each `DataLoader` instance contains a unique memoized cache. Use caution when
 * used in long-lived applications or those which serve many users with
 * different access permissions and consider creating a new instance per
 * web request.
 */
export class DataLoader<K, V, C = K> {
	constructor(batchLoadFn: DataLoader.BatchLoadFn<K, V>, options?: DataLoader.Options<K, V, C>) {
		if (typeof batchLoadFn !== 'function') {
			throw new TypeError(
				'DataLoader must be constructed with a function which accepts ' +
					`Array<key> and returns Promise<Array<value>>, but got: ${batchLoadFn}.`,
			);
		}
		this._batchLoadFn = batchLoadFn;
		this._maxBatchSize = getValidMaxBatchSize(options);
		this._batchScheduleFn = getValidBatchScheduleFn(options);
		this._cacheKeyFn = getValidCacheKeyFn(options);
		this._cacheMap = getValidCacheMap(options);
		this._batch = null;
		this.name = getValidName(options);
	}

	// Private
	_batchLoadFn: DataLoader.BatchLoadFn<K, V>;
	_maxBatchSize: number;
	_batchScheduleFn: (cb: () => void) => void;
	_cacheKeyFn: (key: K) => C;
	_cacheMap: DataLoader.CacheMap<C, Promise<V>> | null;
	_batch: Batch<K, V> | null;

	/**
	 * Loads a key, returning a `Promise` for the value represented by that key.
	 */
	load(key: K): Promise<V> {
		if (key === null || key === undefined) {
			throw new TypeError(
				`The loader.load() function must be called with a value, but got: ${String(key)}.`,
			);
		}

		const batch = getCurrentBatch(this);
		const cacheMap = this._cacheMap;
		let cacheKey: C;

		// If caching and there is a cache-hit, return cached Promise.
		if (cacheMap) {
			cacheKey = this._cacheKeyFn(key);
			const cachedPromise = cacheMap.get(cacheKey);
			if (cachedPromise) {
				const cacheHits = batch.cacheHits || (batch.cacheHits = []);
				return new Promise((resolve) => {
					cacheHits.push(() => {
						resolve(cachedPromise);
					});
				});
			}
		}

		// Otherwise, produce a new Promise for this key, and enqueue it to be
		// dispatched along with the current batch.
		batch.keys.push(key);
		const promise = new Promise<V>((resolve, reject) => {
			batch.callbacks.push({ resolve, reject });
		});

		// If caching, cache this promise.
		if (cacheMap) {
			cacheMap.set(cacheKey!, promise);
		}

		return promise;
	}

	/**
	 * Loads multiple keys, promising an array of values:
	 *
	 *     var [ a, b ] = await myLoader.loadMany([ 'a', 'b' ]);
	 *
	 * This is similar to the more verbose:
	 *
	 *     var [ a, b ] = await Promise.all([
	 *       myLoader.load('a'),
	 *       myLoader.load('b')
	 *     ]);
	 *
	 * However it is different in the case where any load fails. Where
	 * Promise.all() would reject, loadMany() always resolves, however each result
	 * is either a value or an Error instance.
	 *
	 *     var [ a, b, c ] = await myLoader.loadMany([ 'a', 'b', 'badkey' ]);
	 *     // c instanceof Error
	 *
	 */
	loadMany(keys: ReadonlyArray<K>): Promise<Array<V | Error>> {
		if (!isArrayLike(keys)) {
			throw new TypeError(
				`The loader.loadMany() function must be called with Array<key>, but got: ${keys}.`,
			);
		}
		// Support ArrayLike by using only minimal property access
		const loadPromises = [];
		for (let i = 0; i < keys.length; i++) {
			loadPromises.push(this.load(keys[i]).catch((error) => error));
		}
		return Promise.all(loadPromises);
	}

	/**
	 * Clears the value at `key` from the cache, if it exists. Returns itself for
	 * method chaining.
	 */
	clear(key: K): this {
		const cacheMap = this._cacheMap;
		if (cacheMap) {
			const cacheKey = this._cacheKeyFn(key);
			cacheMap.delete(cacheKey);
		}
		return this;
	}

	/**
	 * Clears the entire cache. To be used when some event results in unknown
	 * invalidations across this particular `DataLoader`. Returns itself for
	 * method chaining.
	 */
	clearAll(): this {
		const cacheMap = this._cacheMap;
		if (cacheMap) {
			cacheMap.clear();
		}
		return this;
	}

	/**
	 * Adds the provided key and value to the cache. If the key already
	 * exists, no change is made. Returns itself for method chaining.
	 *
	 * To prime the cache with an error at a key, provide an Error instance.
	 */
	prime(key: K, value: V | Promise<V> | Error): this {
		const cacheMap = this._cacheMap;
		if (cacheMap) {
			const cacheKey = this._cacheKeyFn(key);

			// Only add the key if it does not already exist.
			if (cacheMap.get(cacheKey) === undefined) {
				// Cache a rejected promise if the value is an Error, in order to match
				// the behavior of load(key).
				let promise;
				if (value instanceof Error) {
					promise = Promise.reject(value);
					// Since this is a case where an Error is intentionally being primed
					// for a given key, we want to disable unhandled promise rejection.
					promise.catch(() => {});
				} else {
					promise = Promise.resolve(value);
				}
				cacheMap.set(cacheKey, promise);
			}
		}
		return this;
	}

	/**
	 * The name given to this `DataLoader` instance. Useful for APM tools.
	 *
	 * Is `null` if not set in the constructor.
	 */
	name: string | null;
}

// Private: Enqueue a Job to be executed after all "PromiseJobs" Jobs.
//
// ES6 JavaScript uses the concepts Job and JobQueue to schedule work to occur
// after the current execution context has completed:
// http://www.ecma-international.org/ecma-262/6.0/#sec-jobs-and-job-queues
//
// Node.js uses the `process.nextTick` mechanism to implement the concept of a
// Job, maintaining a global FIFO JobQueue for all Jobs, which is flushed after
// the current call stack ends.
//
// When calling `then` on a Promise, it enqueues a Job on a specific
// "PromiseJobs" JobQueue which is flushed in Node as a single Job on the
// global JobQueue.
//
// DataLoader batches all loads which occur in a single frame of execution, but
// should include in the batch all loads which occur during the flushing of the
// "PromiseJobs" JobQueue after that same execution frame.
//
// In order to avoid the DataLoader dispatch Job occuring before "PromiseJobs",
// A Promise Job is created with the sole purpose of enqueuing a global Job,
// ensuring that it always occurs after "PromiseJobs" ends.
//
// Node.js's job queue is unique. Browsers do not have an equivalent mechanism
// for enqueuing a job to be performed after promise microtasks and before the
// next macrotask. For browser environments, a macrotask is used (via
// setImmediate or setTimeout) at a potential performance penalty.
const enqueuePostPromiseJob: (fn: () => void) => void =
	/** @ts-ignore */
	typeof process === 'object' && typeof process.nextTick === 'function'
		? function (fn) {
				if (!resolvedPromise) {
					resolvedPromise = Promise.resolve();
				}
				resolvedPromise.then(() => {
					// @ts-ignore
					process.nextTick(fn);
				});
			}
		: // @ts-ignore
			typeof setImmediate === 'function'
			? function (fn) {
					// @ts-ignore
					setImmediate(fn);
				}
			: function (fn) {
					setTimeout(fn);
				};

// Private: cached resolved Promise instance
let resolvedPromise: Promise<void> | undefined;

// Private: Describes a batch of requests
type Batch<K, V> = {
	hasDispatched: boolean;
	keys: Array<K>;
	callbacks: Array<{
		resolve: (value: V) => void;
		reject: (error: Error) => void;
	}>;
	cacheHits?: Array<() => void>;
};

// Private: Either returns the current batch, or creates and schedules a
// dispatch of a new batch for the given loader.
function getCurrentBatch<K, V>(loader: DataLoader<K, V, any>): Batch<K, V> {
	// If there is an existing batch which has not yet dispatched and is within
	// the limit of the batch size, then return it.
	const existingBatch = loader._batch;
	if (
		existingBatch !== null &&
		!existingBatch.hasDispatched &&
		existingBatch.keys.length < loader._maxBatchSize
	) {
		return existingBatch;
	}

	// Otherwise, create a new batch for this loader.
	const newBatch = { hasDispatched: false, keys: [], callbacks: [] };

	// Store it on the loader so it may be reused.
	loader._batch = newBatch;

	// Then schedule a task to dispatch this batch of requests.
	loader._batchScheduleFn(() => {
		dispatchBatch(loader, newBatch);
	});

	return newBatch;
}

function dispatchBatch<K, V>(loader: DataLoader<K, V, any>, batch: Batch<K, V>) {
	// Mark this batch as having been dispatched.
	batch.hasDispatched = true;

	// If there's nothing to load, resolve any cache hits and return early.
	if (batch.keys.length === 0) {
		resolveCacheHits(batch);
		return;
	}

	// Call the provided batchLoadFn for this loader with the batch's keys and
	// with the loader as the `this` context.
	let batchPromise;
	try {
		batchPromise = loader._batchLoadFn(batch.keys);
	} catch (e) {
		return failedDispatch(
			loader,
			batch,
			new TypeError(
				'DataLoader must be constructed with a function which accepts ' +
					'Array<key> and returns Promise<Array<value>>, but the function ' +
					`errored synchronously: ${String(e)}.`,
			),
		);
	}

	// Assert the expected response from batchLoadFn
	if (!batchPromise || typeof batchPromise.then !== 'function') {
		return failedDispatch(
			loader,
			batch,
			new TypeError(
				'DataLoader must be constructed with a function which accepts ' +
					'Array<key> and returns Promise<Array<value>>, but the function did ' +
					`not return a Promise: ${String(batchPromise)}.`,
			),
		);
	}

	// Await the resolution of the call to batchLoadFn.
	Promise.resolve(batchPromise)
		.then((values) => {
			// Assert the expected resolution from batchLoadFn.
			if (!isArrayLike(values)) {
				throw new TypeError(
					'DataLoader must be constructed with a function which accepts ' +
						'Array<key> and returns Promise<Array<value>>, but the function did ' +
						`not return a Promise of an Array: ${String(values)}.`,
				);
			}
			if (values.length !== batch.keys.length) {
				throw new TypeError(
					'DataLoader must be constructed with a function which accepts ' +
						'Array<key> and returns Promise<Array<value>>, but the function did ' +
						'not return a Promise of an Array of the same length as the Array ' +
						'of keys.' +
						`\n\nKeys:\n${String(batch.keys)}` +
						`\n\nValues:\n${String(values)}`,
				);
			}

			// Resolve all cache hits in the same micro-task as freshly loaded values.
			resolveCacheHits(batch);

			// Step through values, resolving or rejecting each Promise in the batch.
			for (let i = 0; i < batch.callbacks.length; i++) {
				const value = values[i];
				if (value instanceof Error) {
					batch.callbacks[i].reject(value);
				} else {
					batch.callbacks[i].resolve(value);
				}
			}
		})
		.catch((error: unknown) => {
			failedDispatch(loader, batch, error as Error);
		});
}

// Private: do not cache individual loads if the entire batch dispatch fails,
// but still reject each request so they do not hang.
function failedDispatch<K, V>(loader: DataLoader<K, V, any>, batch: Batch<K, V>, error: Error) {
	// Cache hits are resolved, even though the batch failed.
	resolveCacheHits(batch);
	for (let i = 0; i < batch.keys.length; i++) {
		loader.clear(batch.keys[i]);
		batch.callbacks[i].reject(error);
	}
}

// Private: Resolves the Promises for any cache hits in this batch.
function resolveCacheHits(batch: Batch<any, any>) {
	if (batch.cacheHits) {
		for (let i = 0; i < batch.cacheHits.length; i++) {
			batch.cacheHits[i]();
		}
	}
}

// Private: given the DataLoader's options, produce a valid max batch size.
function getValidMaxBatchSize<K, V, C>(options?: DataLoader.Options<K, V, C>): number {
	const shouldBatch = !options || options.batch !== false;
	if (!shouldBatch) {
		return 1;
	}
	const maxBatchSize = options && options.maxBatchSize;
	if (maxBatchSize === undefined) {
		return Infinity;
	}
	if (typeof maxBatchSize !== 'number' || maxBatchSize < 1) {
		throw new TypeError(`maxBatchSize must be a positive number: ${maxBatchSize}`);
	}
	return maxBatchSize;
}

// Private
function getValidBatchScheduleFn<K, V, C>(
	options?: DataLoader.Options<K, V, C>,
): (cb: () => void) => void {
	const batchScheduleFn = options && options.batchScheduleFn;
	if (batchScheduleFn === undefined) {
		return enqueuePostPromiseJob;
	}
	if (typeof batchScheduleFn !== 'function') {
		throw new TypeError(`batchScheduleFn must be a function: ${batchScheduleFn}`);
	}
	return batchScheduleFn;
}

// Private: given the DataLoader's options, produce a cache key function.
function getValidCacheKeyFn<K, V, C>(options?: DataLoader.Options<K, V, C>): (key: K) => C {
	const cacheKeyFn = options && options.cacheKeyFn;
	if (cacheKeyFn === undefined) {
		return (key: K) => key as unknown as C;
	}
	if (typeof cacheKeyFn !== 'function') {
		throw new TypeError(`cacheKeyFn must be a function: ${cacheKeyFn}`);
	}
	return cacheKeyFn;
}

// Private: given the DataLoader's options, produce a CacheMap to be used.
function getValidCacheMap<K, V, C>(
	options?: DataLoader.Options<K, V, C>,
): DataLoader.CacheMap<C, Promise<V>> | null {
	const shouldCache = !options || options.cache !== false;
	if (!shouldCache) {
		return null;
	}
	const cacheMap = options && options.cacheMap;
	if (cacheMap === undefined) {
		return new Map();
	}
	if (cacheMap !== null) {
		const cacheFunctions = ['get', 'set', 'delete', 'clear'] as const;
		const missingFunctions = cacheFunctions.filter(
			(fnName) => cacheMap && typeof cacheMap[fnName] !== 'function',
		);
		if (missingFunctions.length !== 0) {
			throw new TypeError('Custom cacheMap missing methods: ' + missingFunctions.join(', '));
		}
	}
	return cacheMap;
}

function getValidName<K, V, C>(options?: DataLoader.Options<K, V, C>): string | null {
	if (options && options.name) {
		return options.name;
	}

	return null;
}

function isArrayLike(x: unknown): x is ArrayLike<unknown> {
	return (
		typeof x === 'object' &&
		x !== null &&
		'length' in x &&
		typeof x.length === 'number' &&
		(x.length === 0 || (x.length > 0 && Object.prototype.hasOwnProperty.call(x, x.length - 1)))
	);
}

export declare namespace DataLoader {
	// If a custom cache is provided, it must be of this type (a subset of ES6 Map).
	export type CacheMap<K, V> = {
		get(key: K): V | void;
		set(key: K, value: V): any;
		delete(key: K): any;
		clear(): any;
	};

	// A Function, which when given an Array of keys, returns a Promise of an Array
	// of values or Errors.
	export type BatchLoadFn<K, V> = (keys: ReadonlyArray<K>) => PromiseLike<ArrayLike<V | Error>>;

	// Optionally turn off batching or caching or provide a cache key function or a
	// custom cache instance.
	export type Options<K, V, C = K> = {
		/**
		 * Default `true`. Set to `false` to disable batching, invoking
		 * `batchLoadFn` with a single load key. This is equivalent to setting
		 * `maxBatchSize` to `1`.
		 */
		batch?: boolean;

		/**
		 * Default `Infinity`. Limits the number of items that get passed in to the
		 * `batchLoadFn`. May be set to `1` to disable batching.
		 */
		maxBatchSize?: number;

		/**
		 * Default see https://github.com/graphql/dataloader#batch-scheduling.
		 * A function to schedule the later execution of a batch. The function is
		 * expected to call the provided callback in the immediate future.
		 */
		batchScheduleFn?: (callback: () => void) => void;

		/**
		 * Default `true`. Set to `false` to disable memoization caching, creating a
		 * new Promise and new key in the `batchLoadFn` for every load of the same
		 * key. This is equivalent to setting `cacheMap` to `null`.
		 */
		cache?: boolean;

		/**
		 * Default `key => key`. Produces cache key for a given load key. Useful
		 * when keys are objects and two objects should be considered equivalent.
		 */
		cacheKeyFn?: (key: K) => C;

		/**
		 * Default `new Map()`. Instance of `Map` (or an object with a similar API)
		 * to be used as cache. May be set to `null` to disable caching.
		 */
		cacheMap?: CacheMap<C, Promise<V>> | null;

		/**
		 * The name given to this `DataLoader` instance. Useful for APM tools.
		 *
		 * Is `null` if not set in the constructor.
		 */
		name?: string | null;
	};
}
