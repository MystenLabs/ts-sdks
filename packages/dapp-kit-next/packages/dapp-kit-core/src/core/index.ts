// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readonlyType } from 'nanostores';
import { createStores } from './store.js';
import { syncRegisteredWallets } from './initializers/registered-wallets.js';
import { autoConnectWallet } from './initializers/autoconnect-wallet.js';
import { createInMemoryStorage, DEFAULT_STORAGE_KEY, getDefaultStorage } from '../utils/storage.js';
import { syncStateToStorage } from './initializers/sync-state-to-storage.js';
import { manageWalletConnection } from './initializers/manage-connection.js';
import { createNetworkConfig } from '../utils/networks.js';
import type { Networks } from '../utils/networks.js';
import type { CreateDAppKitOptions } from './types.js';
import { switchNetworkCreator } from './actions/switch-network.js';
import { connectWalletCreator } from './actions/connect-wallet.js';
import { disconnectWalletCreator } from './actions/disconnect-wallet.js';
import { switchAccountCreator } from './actions/switch-account.js';
import { signPersonalMessageCreator } from './actions/sign-personal-message.js';
import { signAndExecuteTransactionCreator } from './actions/sign-and-execute-transaction.js';
import { signTransactionCreator } from './actions/sign-transaction.js';
import { slushWebWalletInitializer } from '../wallets/slush-web.js';
import { registerAdditionalWallets } from '../wallets/index.js';
import { unsafeBurnerWalletInitializer } from '../wallets/unsafe-burner.js';
import { walletConnectWalletInitializer } from '../wallets/walletconnect.js';

export type DAppKit<TNetworks extends Networks = Networks> = ReturnType<
	typeof createDAppKit<TNetworks>
>;

export function createDAppKit<TNetworks extends Networks>({
	autoConnect = true,
	networks,
	createClient,
	defaultNetwork = networks[0],
	enableBurnerWallet = false,
	slushWalletConfig,
	storage = getDefaultStorage(),
	storageKey = DEFAULT_STORAGE_KEY,
	walletInitializers = [],
	walletConnectProjectId,
}: CreateDAppKitOptions<TNetworks>) {
	const networkConfig = createNetworkConfig(networks, createClient);
	const stores = createStores({ defaultNetwork, getClient: networkConfig.getClient });

	function getClient<T extends TNetworks[number]>(network?: TNetworks[number] | T) {
		return network ? networkConfig.getClient(network) : stores.$currentClient.get();
	}

	storage ||= createInMemoryStorage();
	syncStateToStorage({ stores, storageKey, storage });

	syncRegisteredWallets(stores);
	manageWalletConnection(stores);

	if (autoConnect) {
		autoConnectWallet({ stores, storageKey, storage });
	}

	registerAdditionalWallets(
		[
			...walletInitializers,
			...(enableBurnerWallet ? [unsafeBurnerWalletInitializer()] : []),
			...(slushWalletConfig !== null ? [slushWebWalletInitializer(slushWalletConfig)] : []),
			...(walletConnectProjectId !== undefined
				? [walletConnectWalletInitializer(walletConnectProjectId)]
				: []),
		],
		{ networks, getClient },
	);

	return {
		networks,
		getClient,
		signTransaction: signTransactionCreator(stores),
		signAndExecuteTransaction: signAndExecuteTransactionCreator(stores),
		signPersonalMessage: signPersonalMessageCreator(stores),
		connectWallet: connectWalletCreator(stores, networks),
		disconnectWallet: disconnectWalletCreator(stores),
		switchAccount: switchAccountCreator(stores),
		switchNetwork: switchNetworkCreator(stores),
		stores: {
			$wallets: stores.$compatibleWallets,
			$connection: stores.$connection,
			$currentNetwork: readonlyType(stores.$currentNetwork),
			$currentClient: stores.$currentClient,
		},
	};
}
