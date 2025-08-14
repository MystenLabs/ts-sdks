// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import type { MockInternalStores } from '../mocks/mock-stores.js';
import { createMockInternalStores } from '../mocks/mock-stores.js';
import type { DAppKitStores } from '../../src/core/store.js';
import { createStores } from '../../src/core/store.js';
import {
	createTestUiWallets,
	TEST_DEFAULT_NETWORK,
	TEST_NETWORKS,
	unbindStoreListeners,
} from '../test-utils.js';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import type { MockWalletOptions } from '../mocks/mock-wallet.js';
import { createMockWallets } from '../mocks/mock-wallet.js';
import { createMockAccount } from '../mocks/mock-account.js';
import type { Networks } from '../../src/utils/networks.js';

export function setMockInternalStoresConnected({
	stores,
	currentAccount,
	wallet,
}: {
	stores: MockInternalStores;
	currentAccount: UiWalletAccount;
	wallet: UiWallet;
}) {
	stores.$baseConnection.set({
		status: 'connected',
		currentAccount,
	});
	stores.$connection.set({
		wallet,
		account: currentAccount,
		status: 'connected',
		isConnected: true,
		isConnecting: false,
		isReconnecting: false,
		isDisconnected: false,
	});
}

export function setMockInternalStoresDisconnected({ stores }: { stores: MockInternalStores }) {
	stores.$baseConnection.set({ status: 'disconnected', currentAccount: null });
	stores.$connection.set({
		wallet: null,
		account: null,
		status: 'disconnected',
		isConnected: false,
		isConnecting: false,
		isReconnecting: false,
		isDisconnected: true,
	});
}

export function createTestStores({
	currentNetwork = TEST_DEFAULT_NETWORK,
}: {
	currentNetwork?: Networks[number];
} = {}): ReturnType<typeof createStores> {
	const clients = Object.fromEntries(
		TEST_NETWORKS.map((network) => [
			network,
			new SuiClient({ network, url: getFullnodeUrl(network) }),
		]),
	);

	return createStores({
		defaultNetwork: currentNetwork,
		getClient: (network) => clients[network],
	});
}

export function setDefaultUnitTestEnv({
	stores,
	additionalWallets = [],
}: {
	stores: MockInternalStores | undefined;

	additionalWallets?: MockWalletOptions[];
}) {
	unbindStoreListeners(stores);

	const wallets = createMockWallets(
		{ name: 'Mock Wallet 1' },
		{ name: 'Mock Wallet 2', accounts: [createMockAccount(), createMockAccount()] },
		...additionalWallets,
	);
	const uiWallets = createTestUiWallets(wallets);
	stores = createMockInternalStores({
		currentNetwork: 'localnet',
		registeredWallets: uiWallets,
		compatibleWallets: uiWallets,
	});
	return { wallets, uiWallets, stores };
}

export function setDefaultUnitTestEnvWithUnmockedStores({
	stores,
	additionalWallets = [],
}: {
	stores?: DAppKitStores;
	additionalWallets?: MockWalletOptions[];
} = {}) {
	unbindStoreListeners(stores);

	const wallets = createMockWallets(
		{ name: 'Mock Wallet 1' },
		{ name: 'Mock Wallet 2', accounts: [createMockAccount(), createMockAccount()] },
		...additionalWallets,
	);
	const uiWallets = createTestUiWallets(wallets);
	stores = createTestStores();
	return { wallets, uiWallets, stores };
}
