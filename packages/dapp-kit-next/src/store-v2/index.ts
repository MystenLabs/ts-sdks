// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { computed, readonlyType } from 'nanostores';
import { createWalletConnectionState } from './state/wallet-connection.js';
import { createRegisteredWalletsState } from './state/registered-wallets.js';

export type DAppKitStore = ReturnType<typeof createDAppKitStore>;

type CreateDAppKitStoreOptions = object;

export function createDAppKitStore(options: CreateDAppKitStoreOptions) {
	const $registeredWallets = createRegisteredWalletsState();
	const $walletConnection = createWalletConnectionState({ storageKey: 'abc' });

	return {
		state: {
			$wallets: readonlyType($registeredWallets),
			$connection: readonlyType($walletConnection),
			$currentAccount: computed($walletConnection, (state) => state.selectedAccount),
			$accounts: computed($walletConnection, (state) => state.connectedWallet?.accounts ?? []),
		},
	};
}

let defaultStore: DAppKitStore | undefined;

export function getDefaultStore() {
	if (!defaultStore) {
		defaultStore = createDAppKitStore({});

		// TODO: How to only log this in dev? or just keep it?
		(globalThis as any).__DAPP_KIT_DEFAULT_STORE__ ||= defaultStore;
		if ((globalThis as any).__DAPP_KIT_DEFAULT_STORE__ !== defaultStore) {
			console.warn(
				'Detected multiple dApp-kit store instances. This may cause un-expected behavior.',
			);
		}
	}

	return defaultStore;
}
