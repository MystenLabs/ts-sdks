// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, beforeEach } from 'vitest';
import { connectWalletCreator } from '../../../src/core/actions/connect-wallet';
import { getAssociatedCompatibleUiWallet, TEST_NETWORKS } from '../../test-utils';
import { MockWallet } from '../../mocks/mock-wallet';
import { MockInternalStores } from '../../mocks/mock-stores';
import { UiWallet } from '@wallet-standard/ui';
import { setDefaultUnitTestEnv } from '../unit-test-utils';

describe('[Unit] connectWallet action', () => {
	let wallets: MockWallet[];
	let uiWallets: UiWallet[];
	let stores: MockInternalStores;

	let connectWallet: ReturnType<typeof connectWalletCreator>;

	beforeEach(() => {
		({ wallets, uiWallets, stores } = setDefaultUnitTestEnv({ stores }));

		connectWallet = connectWalletCreator(stores, TEST_NETWORKS);
	});

	test('should connect to a wallet successfully', async () => {
		const wallet = wallets[0];
		const uiWallet = uiWallets[0];

		expect(await connectWallet({ wallet: uiWallet })).toStrictEqual({
			accounts: uiWallet.accounts,
		});

		const baseConnection = stores.$baseConnection.get();
		expect(baseConnection.status).toBe('connected');
		expect(baseConnection.currentAccount).toBeDefined();
		expect(baseConnection.currentAccount?.address).toBe(wallets[0].accounts[0].address);
		expect(
			getAssociatedCompatibleUiWallet(
				baseConnection.currentAccount!,
				stores.$compatibleWallets.get(),
			),
		).toBe(uiWallet);
		expect(wallet.mocks.connect).toHaveBeenCalledOnce();
	});

	test('should handle connection errors', async () => {
		const wallet = wallets[0];
		const uiWallet = uiWallets[0];

		const connectionError = new Error('Some connection error');
		wallet.mocks.connect.mockRejectedValue(connectionError);
		await expect(connectWallet({ wallet: uiWallet })).rejects.toThrow(connectionError);

		const baseConnection = stores.$baseConnection.get();
		expect(baseConnection.status).toBe('disconnected');
		expect(baseConnection.currentAccount).toBeNull();
		expect(wallet.mocks.connect).toHaveBeenCalledOnce();
	});

	test('should select correct account when provided', async () => {
		const wallet = wallets[1];
		const uiWallet = uiWallets[1];
		const targetAccount = uiWallet.accounts[1];

		expect(await connectWallet({ wallet: uiWallet, account: targetAccount })).toStrictEqual({
			accounts: uiWallet.accounts,
		});

		const baseConnection = stores.$baseConnection.get();
		expect(baseConnection.status).toBe('connected');
		expect(baseConnection.currentAccount).toBe(targetAccount);
		expect(wallet.mocks.connect).toHaveBeenCalledOnce();
	});

	test('should set connection status to connecting during connection', async () => {
		const wallet = wallets[1];
		const uiWallet = uiWallets[1];

		let connectingStatusSeen = false;
		stores.$baseConnection.subscribe((connection) => {
			if (connection.status === 'connecting') {
				connectingStatusSeen = true;
			}
		});

		wallet.mocks.connect.mockImplementation(() => {
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve({ accounts: wallet.accounts });
				}, 10);
			});
		});

		expect(await connectWallet({ wallet: uiWallet })).toStrictEqual({
			accounts: uiWallet.accounts,
		});

		expect(connectingStatusSeen).toBe(true);
		expect(stores.$baseConnection.get().status).toBe('connected');
		expect(wallet.mocks.connect).toHaveBeenCalledOnce();
	});

	// TODO check connecting when already connected behavior

	// TODO check connecting to wrong wallet/account
});
