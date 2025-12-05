// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, beforeEach } from 'vitest';
import { TEST_DEFAULT_NETWORK, TEST_NETWORKS, TestWalletInitializeResult } from '../../test-utils';
import { createMockWallets, MockWallet } from '../../mocks/mock-wallet';
import { createDAppKit, DAppKit } from '../../../src';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { getWallets } from '@mysten/wallet-standard';
import { createMockAccount } from '../../mocks/mock-account';
import { UiWallet } from '@wallet-standard/ui';

describe('[Integration] connectWallet action', () => {
	let dAppKit: DAppKit<typeof TEST_NETWORKS>;

	let wallets: MockWallet[];
	let uiWallets: UiWallet[];

	beforeEach(() => {
		dAppKit = createDAppKit({
			networks: TEST_NETWORKS,
			defaultNetwork: TEST_DEFAULT_NETWORK,
			createClient(network) {
				return new SuiJsonRpcClient({ network, url: getJsonRpcFullnodeUrl(network) });
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
			slushWalletConfig: null,
		});
		uiWallets = dAppKit.stores.$wallets.get();
	});

	test('Connects to a wallet successfully', async () => {
		const wallet = wallets[0];
		const uiWallet = uiWallets[0];

		let connection = dAppKit.stores.$connection.get();
		expect(connection.status).toBe('disconnected');
		expect(connection.wallet).toBeNull();
		expect(connection.account).toBeNull();

		const connectionStatesSeen: NonNullable<
			DAppKit<typeof TEST_NETWORKS>['stores']['$connection']['value']
		>[] = [];
		dAppKit.stores.$connection.subscribe((val) => connectionStatesSeen.push(val));

		expect(await dAppKit.connectWallet({ wallet: uiWallet })).toStrictEqual({
			accounts: [uiWallet.accounts[0]],
		});

		expect(connectionStatesSeen).toStrictEqual([
			{
				wallet: null,
				account: null,
				status: 'disconnected',
				supportedIntents: [],
				isConnected: false,
				isConnecting: false,
				isReconnecting: false,
				isDisconnected: true,
			},
			{
				wallet: null,
				account: null,
				status: 'connecting',
				supportedIntents: [],
				isConnected: false,
				isConnecting: true,
				isReconnecting: false,
				isDisconnected: false,
			},
			{
				wallet: uiWallet,
				account: uiWallet.accounts[0],
				status: 'connected',
				supportedIntents: [],
				isConnected: true,
				isConnecting: false,
				isReconnecting: false,
				isDisconnected: false,
			},
		]);

		connection = dAppKit.stores.$connection.get();
		expect(connection.status).toBe('connected');
		expect(connection.wallet).toBe(uiWallet);
		expect(connection.account).toBeDefined();
		expect(connection.account?.address).toBe(wallets[0].accounts[0].address);
		expect(wallet.mocks.connect).toHaveBeenCalledOnce();
	});

	test('Handles connection errors', async () => {
		const wallet = wallets[0];
		const uiWallet = uiWallets[0];

		const connectionError = new Error('Some connection error');
		wallet.mocks.connect.mockRejectedValue(connectionError);
		await expect(dAppKit.connectWallet({ wallet: uiWallet })).rejects.toThrow(connectionError);

		const connection = dAppKit.stores.$connection.get();
		expect(connection.status).toBe('disconnected');
		expect(connection.wallet).toBeNull();
		expect(connection.account).toBeNull();
		expect(wallet.mocks.connect).toHaveBeenCalledOnce();
	});

	test('Selects correct account when provided', async () => {
		const wallet = wallets[1];
		const uiWallet = uiWallets[1];
		const targetAccount = uiWallet.accounts[1];

		expect(await dAppKit.connectWallet({ wallet: uiWallet, account: targetAccount })).toStrictEqual(
			{
				accounts: uiWallet.accounts,
			},
		);

		const connection = dAppKit.stores.$connection.get();
		expect(connection.account).toBe(targetAccount);
		expect(wallet.mocks.connect).toHaveBeenCalledOnce();
	});
});
