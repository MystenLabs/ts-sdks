// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { computed, readonlyType } from 'nanostores';
import { createState } from './state.js';
import { syncRegisteredWallets } from './initializers/registered-wallets.js';
import { createActions } from './actions/index.js';
import { DAppKitError } from '../utils/errors.js';
import { autoConnectWallet } from './initializers/autoconnect-wallet.js';
import { createInMemoryStorage, DEFAULT_STORAGE_KEY, getDefaultStorage } from '../utils/storage.js';
import type { StateStorage } from '../utils/storage.js';
import { syncStateToStorage } from './initializers/sync-state-to-storage.js';
import { getAssociatedWalletOrThrow } from '../utils/wallets.js';
import { manageWalletConnection } from './initializers/manage-connection.js';

export type DAppKit = ReturnType<typeof createDAppKit>;

type CreateDAppKitOptions = {
	/**
	 * Enables automatically connecting to the most recently used wallet account.
	 * @defaultValue `true`
	 */
	autoConnect?: boolean;

	/**
	 * Configures how the most recently connected to wallet account is stored. Set to `null` to disable persisting state entirely.
	 * @defaultValue `localStorage` if available
	 */
	storage?: StateStorage | null;

	/**
	 * The key to use to store the most recently connected wallet account.
	 * @defaultValue `mysten-dapp-kit:selected-wallet-and-address`
	 */
	storageKey?: string;
};

let defaultInstance: DAppKit | undefined;

export function createDAppKit(options: CreateDAppKitOptions) {
	const dAppKit = createDAppKitInstance(options);

	if (!defaultInstance) {
		defaultInstance = dAppKit;

		globalThis.__DEFAULT_DAPP_KIT_INSTANCE__ ||= defaultInstance;
		if (globalThis.__DEFAULT_DAPP_KIT_INSTANCE__ !== defaultInstance) {
			console.warn('Detected multiple dApp-kit instances. This may cause un-expected behavior.');
		}
	}

	return dAppKit;
}

export function getDefaultInstance() {
	if (!defaultInstance) {
		throw new DAppKitError('dApp-kit has not been initialized yet.');
	}
	return defaultInstance;
}

export function createDAppKitInstance({
	autoConnect = true,
	storage = getDefaultStorage(),
	storageKey = DEFAULT_STORAGE_KEY,
}: CreateDAppKitOptions = {}) {
	const $state = createState();
	const actions = createActions($state);

	storage ||= createInMemoryStorage();
	syncStateToStorage({ $state, storageKey, storage });

	syncRegisteredWallets($state);
	manageWalletConnection($state);

	if (autoConnect) {
		autoConnectWallet({ $state, storageKey, storage });
	}

	return {
		...actions,
		$state: readonlyType($state),
		$wallets: computed($state, (state) => state.wallets),
		$connection: computed([$state], ({ connection, wallets }) => {
			switch (connection.status) {
				case 'connected':
					return {
						wallet: getAssociatedWalletOrThrow(connection.currentAccount, wallets),
						account: connection.currentAccount,
						status: connection.status,
						isConnected: true,
						isConnecting: false,
						isReconnecting: false,
						isDisconnected: false,
					} as const;
				case 'connecting':
					return {
						wallet: null,
						account: connection.currentAccount,
						status: connection.status,
						isConnected: false,
						isConnecting: true,
						isReconnecting: false,
						isDisconnected: false,
					} as const;
				case 'reconnecting':
					return {
						wallet: getAssociatedWalletOrThrow(connection.currentAccount, wallets),
						account: connection.currentAccount,
						status: connection.status,
						isConnected: false,
						isConnecting: false,
						isReconnecting: true,
						isDisconnected: false,
					} as const;
				case 'disconnected':
					return {
						wallet: null,
						account: connection.currentAccount,
						status: connection.status,
						isConnected: false,
						isConnecting: false,
						isReconnecting: false,
						isDisconnected: true,
					} as const;
				default:
					throw new Error(`Encountered unknown connection status: ${connection}`);
			}
		}),
	};
}
