// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, vi } from 'vitest';
import {
	GRPC_URLS,
	TEST_DEFAULT_NETWORK,
	TEST_NETWORKS,
	TestWalletInitializeResult,
} from '../test-utils.js';
import { createMockWallets } from '../mocks/mock-wallet.js';
import { createDAppKit } from '../../src/index.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Wallet } from '@mysten/wallet-standard';
import { getWallets } from '@mysten/wallet-standard';

/**
 * Creates a wallet object that simulates a non-compliant wallet extension
 * where `accounts` is undefined instead of an array.
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

function createTestDAppKit(initialize: () => TestWalletInitializeResult) {
	return createDAppKit({
		networks: TEST_NETWORKS,
		defaultNetwork: TEST_DEFAULT_NETWORK,
		createClient(network) {
			return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
		},
		walletInitializers: [{ id: 'Test Wallets', initialize }],
		slushWalletConfig: null,
	});
}

describe('[Integration] Non-compliant wallets', () => {
	test('Non-compliant wallet with undefined accounts does not crash the app', () => {
		const dAppKit = createTestDAppKit(() => {
			const walletsApi = getWallets();
			return {
				unregister: walletsApi.register(
					...createMockWallets({ name: 'Good Wallet' }),
					createNonCompliantWallet('Bad Wallet'),
				),
			};
		});

		const walletNames = dAppKit.stores.$wallets.get().map((w) => w.name);
		expect(walletNames).toContain('Good Wallet');
		expect(walletNames).not.toContain('Bad Wallet');
	});

	test('Non-compliant wallet registered after init does not crash the app', () => {
		const dAppKit = createTestDAppKit(() => {
			const walletsApi = getWallets();
			return { unregister: walletsApi.register(...createMockWallets({ name: 'Good Wallet' })) };
		});

		expect(dAppKit.stores.$wallets.get().map((w) => w.name)).toContain('Good Wallet');

		// Register a non-compliant wallet after init — should not throw
		const walletsApi = getWallets();
		expect(() => {
			walletsApi.register(createNonCompliantWallet('Late Bad Wallet'));
		}).not.toThrow();

		const walletNames = dAppKit.stores.$wallets.get().map((w) => w.name);
		expect(walletNames).toContain('Good Wallet');
		expect(walletNames).not.toContain('Late Bad Wallet');
	});
});
