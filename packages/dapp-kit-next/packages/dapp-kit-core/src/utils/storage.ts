// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWalletAccount } from '@wallet-standard/ui';
import { getWalletUniqueIdentifier } from './wallets.js';

export type StateStorage = {
	getItem: (name: string) => string | null | Promise<string | null>;
	setItem: (name: string, value: string) => unknown | Promise<unknown>;
	removeItem: (name: string) => unknown | Promise<unknown>;
};

export const DEFAULT_STORAGE_KEY = 'mysten-dapp-kit:selected-wallet-and-address';

export function getDefaultStorage() {
	return isLocalStorageAvailable() ? localStorage : createInMemoryStorage();
}

export function createInMemoryStorage(): StateStorage {
	const store = new Map<string, string>();
	return {
		getItem(key: string) {
			return store.get(key) ?? null;
		},
		setItem(key: string, value: string) {
			store.set(key, value);
		},
		removeItem(key: string) {
			store.delete(key);
		},
	};
}

export function saveAccountToStorage(
	storage: StateStorage,
	storageKey: string,
	account: UiWalletAccount,
	supportedIntents: string[],
) {
	const walletId = getWalletUniqueIdentifier(account).replace(':', '_');
	const intents = supportedIntents.join(',');
	const value = [walletId, account.address, intents].join(':');
	storage.setItem(storageKey, value);
}

function isLocalStorageAvailable() {
	try {
		const testKey = '__storage_test__';
		localStorage.setItem(testKey, 'test');
		localStorage.removeItem(testKey);
		return true;
	} catch {
		return false;
	}
}
