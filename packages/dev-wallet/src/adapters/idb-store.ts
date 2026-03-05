// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Minimal IndexedDB key-value helpers replacing the `idb-keyval` package.
 *
 * The API mirrors the subset used by the WebCrypto and Passkey adapters:
 * `createStore`, `get`, `set`, `del`, and `entries`.
 */

export type IDBStore = {
	dbName: string;
	storeName: string;
};

export function createStore(dbName: string, storeName: string): IDBStore {
	return { dbName, storeName };
}

function openDB(store: IDBStore): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(store.dbName);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(store.storeName)) {
				request.result.createObjectStore(store.storeName);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function withStore<T>(
	store: IDBStore,
	mode: IDBTransactionMode,
	fn: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
	return openDB(store).then(
		(db) =>
			new Promise((resolve, reject) => {
				const tx = db.transaction(store.storeName, mode);
				const req = fn(tx.objectStore(store.storeName));
				tx.oncomplete = () => {
					resolve(req.result);
					db.close();
				};
				tx.onerror = () => {
					reject(tx.error);
					db.close();
				};
				tx.onabort = () => {
					reject(tx.error);
					db.close();
				};
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
	return openDB(store).then(
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
				tx.oncomplete = () => {
					resolve(results);
					db.close();
				};
				tx.onerror = () => {
					reject(tx.error);
					db.close();
				};
			}),
	);
}
