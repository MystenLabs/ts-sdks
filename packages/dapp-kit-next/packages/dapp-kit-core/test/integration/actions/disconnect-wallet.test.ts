// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment happy-dom

import { suppressFetchErrorsDuringTeardown } from '../setup';
import { describe, expect, test, beforeEach, vi, MockInstance } from 'vitest';
import { TEST_DEFAULT_NETWORK, TEST_NETWORKS } from '../../test-utils';
import { createMockWallets, MockWallet } from '../../mocks/mock-wallet';
import { createDAppKit, DAppKit } from '../../../src';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getWallets } from '@mysten/wallet-standard';
import { createMockAccount } from '../../mocks/mock-account';
import { UiWallet } from '@wallet-standard/ui';
import { TestWalletInitializeResult } from '../integration-test-utils';

suppressFetchErrorsDuringTeardown();

describe('[Integration] disconnectWallet action', () => {
	let consoleWarnSpy: MockInstance<(typeof console)['warn']> | undefined;

	let dAppKit: DAppKit<typeof TEST_NETWORKS>;
	let wallets: MockWallet[];
	let uiWallets: UiWallet[];

	beforeEach(() => {
		consoleWarnSpy?.mockReset();

		dAppKit = createDAppKit({
			networks: TEST_NETWORKS,
			defaultNetwork: TEST_DEFAULT_NETWORK,
			createClient(network) {
				return new SuiClient({ network, url: getFullnodeUrl(network) });
			},
			walletInitializers: [
				{
					id: 'Test Wallets',
					initialize(): TestWalletInitializeResult {
						wallets = createMockWallets(
							{ name: 'Mock Wallet 1' },
							{ name: 'Mock Wallet 2', accounts: [createMockAccount(), createMockAccount()] },
						);
						const walletsApi = getWallets();
						return { unregister: walletsApi.register(...wallets) };
					},
				},
			],
		});
		uiWallets = dAppKit.stores.$wallets.get();
	});

	test('Should disconnect from a connected state successfully', async () => {
		const wallet = wallets[0];
		const uiWallet = uiWallets[0];

		await dAppKit.connectWallet({ wallet: uiWallet });

		const connectionStatesSeen: NonNullable<
			DAppKit<typeof TEST_NETWORKS>['stores']['$connection']['value']
		>[] = [];
		dAppKit.stores.$connection.subscribe((val) => connectionStatesSeen.push(val));

		await dAppKit.disconnectWallet();

		const connection = dAppKit.stores.$connection.get();
		expect(connection.status).toBe('disconnected');
		expect(connection.wallet).toBeNull();
		expect(connection.account).toBeNull();
		expect(wallet.mocks.disconnect).toHaveBeenCalledOnce();
		expect(connectionStatesSeen).toStrictEqual([
			{
				wallet: uiWallet,
				account: uiWallet.accounts[0],
				status: 'connected',
				isConnected: true,
				isConnecting: false,
				isReconnecting: false,
				isDisconnected: false,
			},
			{
				wallet: null,
				account: null,
				status: 'disconnected',
				isConnected: false,
				isConnecting: false,
				isReconnecting: false,
				isDisconnected: true,
			},
		]);
	});

	test('Should handle disconnect errors', async () => {
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const wallet = wallets[0];
		const uiWallet = uiWallets[0];

		await dAppKit.connectWallet({ wallet: uiWallet });

		const disconnectError = new Error('Some disconnect error');
		wallet.mocks.disconnect.mockRejectedValue(disconnectError);
		await dAppKit.disconnectWallet();

		const connection = dAppKit.stores.$connection.get();
		expect(connection.status).toBe('disconnected');
		expect(connection.wallet).toBeNull();
		expect(connection.account).toBeNull();
		expect(wallet.mocks.disconnect).toHaveBeenCalledOnce();

		expect(consoleWarnSpy).toHaveBeenCalledOnce();
		expect(consoleWarnSpy.mock.calls[0][0]).toContain(
			'Failed to disconnect the current wallet from the application.',
		);
		expect(consoleWarnSpy.mock.calls[0][1]).toBe(disconnectError);
	});

	test('Should throw error when disconnecting while already disconnected', async () => {
		await expect(dAppKit.disconnectWallet()).rejects.toThrow('No wallet is connected.');

		const connection = dAppKit.stores.$connection.get();
		expect(connection.status).toBe('disconnected');
		expect(connection.wallet).toBeNull();
		expect(connection.account).toBeNull();
	});
});
