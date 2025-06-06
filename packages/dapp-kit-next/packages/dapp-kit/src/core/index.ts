// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readonlyType } from 'nanostores';
import { createStores } from './store.js';
import { syncRegisteredWallets } from './initializers/registered-wallets.js';
import { DAppKitError } from '../utils/errors.js';
import { autoConnectWallet } from './initializers/autoconnect-wallet.js';
import { createInMemoryStorage, DEFAULT_STORAGE_KEY, getDefaultStorage } from '../utils/storage.js';
import { syncStateToStorage } from './initializers/sync-state-to-storage.js';
import { manageWalletConnection } from './initializers/manage-connection.js';
import type { Networks } from '../utils/networks.js';
import type { CreateDAppKitOptions } from './types.js';
import type { Experimental_BaseClient } from '@mysten/sui/experimental';
import { switchNetworkCreator } from './actions/switch-network.js';
import { connectWalletCreator } from './actions/connect-wallet.js';
import { disconnectWalletCreator } from './actions/disconnect-wallet.js';
import { switchAccountCreator } from './actions/switch-account.js';
import { createSignerActions } from './actions/signer.js';
import { signPersonalMessageCreator } from './actions/sign-personal-message.js';

export type DAppKit<TNetworks extends Networks = Networks> = ReturnType<
	typeof createDAppKitInstance<TNetworks>
>;

export function createDAppKit<TNetworks extends Networks>(
	options: CreateDAppKitOptions<TNetworks>,
) {
	const instance = createDAppKitInstance(options);

	globalThis.__DEFAULT_DAPP_KIT_INSTANCE__ ||= instance as DAppKit;
	if (globalThis.__DEFAULT_DAPP_KIT_INSTANCE__ !== instance) {
		console.warn('Detected multiple dApp-kit instances. This may cause un-expected behavior.');
	}

	return instance;
}

export function getDefaultInstance() {
	if (!globalThis.__DEFAULT_DAPP_KIT_INSTANCE__) {
		throw new DAppKitError('dApp-kit has not been initialized yet.');
	}
	return globalThis.__DEFAULT_DAPP_KIT_INSTANCE__;
}

export function createDAppKitInstance<TNetworks extends Networks>({
	autoConnect = true,
	networks,
	createClient,
	defaultNetwork = networks[0],
	storage = getDefaultStorage(),
	storageKey = DEFAULT_STORAGE_KEY,
}: CreateDAppKitOptions<TNetworks>) {
	if (networks.length === 0) {
		throw new DAppKitError('You must specify at least one Sui network for your application.');
	}

	const networkConfig = new Map<TNetworks[number], Experimental_BaseClient>();
	const getClient = (network: TNetworks[number]) => {
		if (networkConfig.has(network)) {
			return networkConfig.get(network)!;
		}

		const client = createClient(network);
		networkConfig.set(network, client);
		return client;
	};

	const stores = createStores({ defaultNetwork, getClient });

	storage ||= createInMemoryStorage();
	syncStateToStorage({ stores, storageKey, storage });

	syncRegisteredWallets(stores);
	manageWalletConnection(stores);

	if (autoConnect) {
		autoConnectWallet({ stores, storageKey, storage });
	}

	return {
		getClient,
		...createSignerActions(),
		signPersonalMessage: signPersonalMessageCreator(stores),
		connectWallet: connectWalletCreator(stores, networks),
		disconnectWallet: disconnectWalletCreator(stores),
		switchAccount: switchAccountCreator(stores),
		switchNetwork: switchNetworkCreator(stores),
		stores: {
			$publicKey: stores.$publicKey,
			$wallets: stores.$compatibleWallets,
			$connection: stores.$connection,
			$currentNetwork: readonlyType(stores.$currentNetwork),
			$currentClient: stores.$currentClient,
		},
	};
}
