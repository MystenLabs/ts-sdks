// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readonlyType } from 'nanostores';
import { syncRegisteredWallets } from './initializers/registered-wallets.js';
import { createState } from './state.js';

export type DAppKitStore = ReturnType<typeof createDAppKitStore>;

type CreateDAppKitStoreOptions = void;

export function createDAppKitStore(_: CreateDAppKitStoreOptions) {
	const state = createState();

	syncRegisteredWallets(state);

	return {
		$wallets: readonlyType(state.$wallets),
	};
}

let defaultStore: DAppKitStore | undefined;

export function getDefaultStore() {
	if (!defaultStore) {
		defaultStore = createDAppKitStore();

		(globalThis as any).__DAPP_KIT_DEFAULT_STORE__ ||= defaultStore;
		if ((globalThis as any).__DAPP_KIT_DEFAULT_STORE__ !== defaultStore) {
			console.warn(
				'Detected multiple dApp-kit store instances. This may cause un-expected behavior.',
			);
		}
	}

	return defaultStore;
}
