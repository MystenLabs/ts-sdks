// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Minimal IndexedDB key-value helpers replacing the `idb-keyval` package.
 *
 * The API mirrors the subset used by the WebCrypto and Passkey adapters:
 * `createStore`, `get`, `set`, `del`, and `entries`.
 *
 * The database connection is opened lazily on first use and reused for all
 * subsequent operations on the same store.
 */

export type IDBStore = {
	dbName: string;
	storeName: string;
	/** Cached database connection promise, set on first use. */
	db?: Promise<IDBDatabase>;
};

export function createStore(dbName: string, storeName: string): IDBStore {
	return { dbName, storeName };
}

function getDB(store: IDBStore): Promise<IDBDatabase> {
	if (!store.db) {
		store.db = new Promise((resolve, reject) => {
			const request = indexedDB.open(store.dbName);
			request.onupgradeneeded = () => {
				if (!request.result.objectStoreNames.contains(store.storeName)) {
					request.result.createObjectStore(store.storeName);
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => {
				store.db = undefined;
				reject(request.error);
			};
		});
	}
	return store.db;
}

function withStore<T>(
	store: IDBStore,
	mode: IDBTransactionMode,
	fn: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
	return getDB(store).then(
		(db) =>
			new Promise((resolve, reject) => {
				const tx = db.transaction(store.storeName, mode);
				const req = fn(tx.objectStore(store.storeName));
				tx.oncomplete = () => resolve(req.result);
				tx.onerror = () => reject(tx.error);
				tx.onabort = () => reject(tx.error);
			}),
	);
}

export function get<T>(key: IDBValidKey, store: IDBStore): Promise<T | undefined> {
	return withStore(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);
}

export async function set(key: IDBValidKey, value: unknown, store: IDBStore): Promise<void> {
	await withStore(store, 'readwrite', (s) => s.put(value, key));
}

export function del(key: IDBValidKey, store: IDBStore): Promise<void> {
	return withStore(store, 'readwrite', (s) => s.delete(key) as IDBRequest<void>);
}

export function entries<K extends IDBValidKey, V>(store: IDBStore): Promise<[K, V][]> {
	return getDB(store).then(
		(db) =>
			new Promise((resolve, reject) => {
				const tx = db.transaction(store.storeName, 'readonly');
				const objectStore = tx.objectStore(store.storeName);
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
