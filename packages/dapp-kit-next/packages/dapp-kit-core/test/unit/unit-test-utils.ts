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
import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { MockWalletOptions } from '../mocks/mock-wallet.js';
import { createMockWallets } from '../mocks/mock-wallet.js';
import { createMockAccount } from '../mocks/mock-account.js';

const GRPC_URLS = {
	devnet: 'https://fullnode.devnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
	localnet: 'http://127.0.0.1:9000',
	mainnet: 'https://fullnode.mainnet.sui.io:443',
};

export function createTestStores({
	currentNetwork = TEST_DEFAULT_NETWORK,
}: {
	currentNetwork?: (typeof TEST_NETWORKS)[number];
} = {}) {
	const clients = Object.fromEntries(
		[...TEST_NETWORKS].map((network) => [
			network,
			new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }),
		]),
	);

	return createStores<typeof TEST_NETWORKS, SuiGrpcClient>({
		defaultNetwork: currentNetwork,
		getClient: (network) => clients[network as keyof typeof clients],
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
