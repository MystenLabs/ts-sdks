// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, vi } from 'vitest';
import { TEST_DEFAULT_NETWORK, TEST_NETWORKS, TestWalletInitializeResult } from '../test-utils.js';
import { createMockWallets, MockWallet } from '../mocks/mock-wallet.js';
import { createDAppKit, DAppKit } from '../../src/index.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Wallet } from '@mysten/wallet-standard';
import { getWallets } from '@mysten/wallet-standard';

const GRPC_URLS = {
	testnet: 'https://fullnode.testnet.sui.io:443',
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	devnet: 'https://fullnode.devnet.sui.io:443',
	localnet: 'http://127.0.0.1:9000',
} as const;

/**
 * Creates a wallet object that simulates a non-compliant wallet extension
 * (like Bybit Wallet) where `accounts` is undefined instead of an array.
 */
function createNonCompliantWallet(name: string): Wallet {
	return {
		version: '1.0.0' as const,
		name,
		icon: 'data:image/png;base64,' as const,
		chains: [],
		// @ts-expect-error - intentionally setting accounts to undefined to simulate non-compliant wallet
		accounts: undefined,
		features: {
			'standard:connect': {
				version: '1.0.0' as const,
				connect: vi.fn(),
			},
			'standard:events': {
				version: '1.0.0' as const,
				on: vi.fn(() => () => {}),
			},
		},
	};
}

describe('[Integration] Non-compliant wallets', () => {
	test('Non-compliant wallet with undefined accounts does not crash the app', () => {
		let compliantWallets: MockWallet[] = [];

		const dAppKit: DAppKit<typeof TEST_NETWORKS> = createDAppKit({
			networks: TEST_NETWORKS,
			defaultNetwork: TEST_DEFAULT_NETWORK,
			createClient(network) {
				return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
			},
			walletInitializers: [
				{
					id: 'Test Wallets',
					initialize(): TestWalletInitializeResult {
						compliantWallets = createMockWallets({ name: 'Good Wallet' });
						const nonCompliantWallet = createNonCompliantWallet('Bad Wallet');
						const walletsApi = getWallets();
						return {
							unregister: walletsApi.register(...compliantWallets, nonCompliantWallet),
						};
					},
				},
			],
			slushWalletConfig: null,
		});

		// The app should still function — the compliant wallet should be available
		const wallets = dAppKit.stores.$wallets.get();
		expect(wallets.length).toBeGreaterThanOrEqual(1);
		expect(wallets.some((w) => w.name === 'Good Wallet')).toBe(true);
		// The non-compliant wallet should have been silently skipped
		expect(wallets.every((w) => w.name !== 'Bad Wallet')).toBe(true);
	});

	test('Non-compliant wallet registered after init does not crash the app', () => {
		let compliantWallets: MockWallet[] = [];

		const dAppKit: DAppKit<typeof TEST_NETWORKS> = createDAppKit({
			networks: TEST_NETWORKS,
			defaultNetwork: TEST_DEFAULT_NETWORK,
			createClient(network) {
				return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
			},
			walletInitializers: [
				{
					id: 'Test Wallets',
					initialize(): TestWalletInitializeResult {
						compliantWallets = createMockWallets({ name: 'Good Wallet' });
						const walletsApi = getWallets();
						return { unregister: walletsApi.register(...compliantWallets) };
					},
				},
			],
			slushWalletConfig: null,
		});

		// Subscribe to trigger the mount
		const wallets = dAppKit.stores.$wallets.get();
		expect(wallets.some((w) => w.name === 'Good Wallet')).toBe(true);

		// Now register a non-compliant wallet — this should not throw
		const nonCompliantWallet = createNonCompliantWallet('Late Bad Wallet');
		const walletsApi = getWallets();
		expect(() => {
			walletsApi.register(nonCompliantWallet);
		}).not.toThrow();

		// The good wallet should still be available
		const updatedWallets = dAppKit.stores.$wallets.get();
		expect(updatedWallets.some((w) => w.name === 'Good Wallet')).toBe(true);
		expect(updatedWallets.every((w) => w.name !== 'Late Bad Wallet')).toBe(true);
	});
});
