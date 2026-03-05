// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Minimal IndexedDB key-value store replacing the `idb-keyval` package.
 *
 * The database connection is opened lazily on first use and reused for all
 * subsequent operations.
 */
export class IDBStore {
	#dbName: string;
	#storeName: string;
	#db: Promise<IDBDatabase> | null = null;

	constructor(dbName: string, storeName: string) {
		this.#dbName = dbName;
		this.#storeName = storeName;
	}

	get<T>(key: IDBValidKey): Promise<T | undefined> {
		return this.#withTx('readonly', (s) => s.get(key) as IDBRequest<T | undefined>);
	}

	async set(key: IDBValidKey, value: unknown): Promise<void> {
		await this.#withTx('readwrite', (s) => s.put(value, key));
	}

	del(key: IDBValidKey): Promise<void> {
		return this.#withTx('readwrite', (s) => s.delete(key) as IDBRequest<void>);
	}

	entries<K extends IDBValidKey, V>(): Promise<[K, V][]> {
		return this.#open().then(
			(db) =>
				new Promise((resolve, reject) => {
					const tx = db.transaction(this.#storeName, 'readonly');
					const objectStore = tx.objectStore(this.#storeName);
					const results: [K, V][] = [];
					const cursor = objectStore.openCursor();
					cursor.onsuccess = () => {
						const c = cursor.result;
						if (c) {
							results.push([c.key as K, c.value as V]);
							c.continue();
						}
					};
					tx.oncomplete = () => resolve(results);
					tx.onerror = () => reject(tx.error);
				}),
		);
	}

	#open(): Promise<IDBDatabase> {
		if (!this.#db) {
			this.#db = new Promise((resolve, reject) => {
				const request = indexedDB.open(this.#dbName);
				request.onupgradeneeded = () => {
					if (!request.result.objectStoreNames.contains(this.#storeName)) {
						request.result.createObjectStore(this.#storeName);
					}
				};
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => {
					this.#db = null;
					reject(request.error);
				};
			});
		}
		return this.#db;
	}

	#withTx<T>(
		mode: IDBTransactionMode,
		fn: (objectStore: IDBObjectStore) => IDBRequest<T>,
	): Promise<T> {
		return this.#open().then(
			(db) =>
				new Promise((resolve, reject) => {
					const tx = db.transaction(this.#storeName, mode);
					const req = fn(tx.objectStore(this.#storeName));
					tx.oncomplete = () => resolve(req.result);
					tx.onerror = () => reject(tx.error);
					tx.onabort = () => reject(tx.error);
				}),
		);
	}
}
