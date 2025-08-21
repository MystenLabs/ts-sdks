// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

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
