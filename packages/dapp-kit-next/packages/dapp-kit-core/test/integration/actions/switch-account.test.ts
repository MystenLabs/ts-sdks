// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, beforeEach } from 'vitest';
import {
	GRPC_URLS,
	TEST_DEFAULT_NETWORK,
	TEST_NETWORKS,
	TestWalletInitializeResult,
} from '../../test-utils.js';
import { createMockWallets, MockWallet } from '../../mocks/mock-wallet.js';
import { createDAppKit, DAppKit } from '../../../src/index.js';
import { createInMemoryStorage } from '../../../src/utils/storage.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { getWallets } from '@mysten/wallet-standard';
import { createMockAccount } from '../../mocks/mock-account.js';
import { UiWallet } from '@wallet-standard/ui';

describe('[Integration] switchAccount action', () => {
	let dAppKit: DAppKit<typeof TEST_NETWORKS>;
	let wallets: MockWallet[];
	let uiWallets: UiWallet[];
	let storage: ReturnType<typeof createInMemoryStorage>;
	const storageKey = 'test-storage-key';

	beforeEach(() => {
		storage = createInMemoryStorage();
		dAppKit = createDAppKit({
			networks: TEST_NETWORKS,
			defaultNetwork: TEST_DEFAULT_NETWORK,
			createClient(network) {
				return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
			},
			storage,
			storageKey,
			walletInitializers: [
				{
					id: 'Test Wallets',
					initialize(): TestWalletInitializeResult {
						wallets = createMockWallets({
							name: 'Mock Wallet',
							accounts: [createMockAccount(), createMockAccount()],
						});
						const walletsApi = getWallets();
						return { unregister: walletsApi.register(...wallets) };
					},
				},
			],
			slushWalletConfig: null,
		});
		uiWallets = dAppKit.stores.$wallets.get();
	});

	test('Persists selected account to storage when switching accounts', async () => {
		const uiWallet = uiWallets[0];
		const firstAccount = uiWallet.accounts[0];
		const secondAccount = uiWallet.accounts[1];

		// Subscribe to keep the $connection store mounted so syncStateToStorage fires:
		const unsubscribe = dAppKit.stores.$connection.subscribe(() => {});

		await dAppKit.connectWallet({ wallet: uiWallet });

		// Verify initial connection is to the first account:
		let connection = dAppKit.stores.$connection.get();
		expect(connection.account?.address).toBe(firstAccount.address);

		// The storage should contain the first account's address:
		let savedValue = await storage.getItem(storageKey);
		expect(savedValue).toContain(firstAccount.address);

		// Switch to second account:
		dAppKit.switchAccount({ account: secondAccount });

		connection = dAppKit.stores.$connection.get();
		expect(connection.account?.address).toBe(secondAccount.address);

		// The storage should now contain the second account's address:
		savedValue = await storage.getItem(storageKey);
		expect(savedValue).toContain(secondAccount.address);
		expect(savedValue).not.toContain(firstAccount.address);

		unsubscribe();
	});
});
