// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeEach, vi, MockInstance } from 'vitest';
import { MockWallet } from '../../mocks/mock-wallet';
import { createMockAccount } from '../../mocks/mock-account';
import { createTestUiWallets } from '../../test-utils';
import { disconnectWalletCreator } from '../../../src/core/actions/disconnect-wallet';
import { WalletNotConnectedError } from '../../../src/utils/errors';
import { WalletStandardError } from '@mysten/wallet-standard';
import { createMockInternalStores, MockInternalStores } from '../../mocks/mock-stores';
import { UiWallet } from '@wallet-standard/ui';
import {
	setDefaultUnitTestEnv,
	setMockInternalStoresConnected,
	setMockInternalStoresDisconnected,
} from '../unit-test-utils';

describe('[Unit] disconnectWallet action', () => {
	let consoleWarnSpy: MockInstance<(typeof console)['warn']> | undefined;

	let wallets: MockWallet[];
	let uiWallets: UiWallet[];
	let stores: MockInternalStores;
	let disconnectWallet: ReturnType<typeof disconnectWalletCreator>;

	beforeEach(() => {
		consoleWarnSpy?.mockReset();

		({ wallets, uiWallets, stores } = setDefaultUnitTestEnv({ stores }));
		disconnectWallet = disconnectWalletCreator(stores);
	});

	it('Should disconnect wallet successfully', async () => {
		const wallet = wallets[0];
		const uiWallet = uiWallets[0];
		setMockInternalStoresConnected({
			stores,
			currentAccount: uiWallet.accounts[0],
			wallet: uiWallet,
		});

		expect(await disconnectWallet()).toBeUndefined();

		const baseConnection = stores.$baseConnection.get();
		expect(baseConnection.status).toBe('disconnected');
		expect(baseConnection.currentAccount).toBeNull();
		expect(wallet.mocks.disconnect).toHaveBeenCalledOnce();
	});

	it('Should throw error on disconnect when no wallet is connected', async () => {
		const wallet = wallets[0];
		setMockInternalStoresDisconnected({ stores });

		await expect(disconnectWallet()).rejects.toThrowError(
			new WalletNotConnectedError('No wallet is connected.'),
		);

		expect(stores.$connection.get().status).toBe('disconnected');
		expect(wallet.mocks.disconnect).not.toHaveBeenCalled();
	});

	it('Should handle disconnect errors gracefully', async () => {
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const wallet = wallets[0];
		const uiWallet = uiWallets[0];
		setMockInternalStoresConnected({
			stores,
			currentAccount: uiWallet.accounts[0],
			wallet: uiWallet,
		});

		const disconnectError = new Error('Some disconnect error');
		wallet.mocks.disconnect.mockRejectedValue(disconnectError);

		let baseConnection = stores.$baseConnection.get();
		expect(baseConnection.status).toBe('connected');
		expect(baseConnection.currentAccount).toBe(uiWallet.accounts[0]);

		expect(await disconnectWallet()).toBeUndefined();

		// should still clear state
		baseConnection = stores.$baseConnection.get();
		expect(baseConnection.status).toBe('disconnected');
		expect(baseConnection.currentAccount).toBeNull();
		expect(wallet.mocks.disconnect).toHaveBeenCalledOnce();

		expect(consoleWarnSpy).toHaveBeenCalledOnce();
		expect(consoleWarnSpy.mock.calls[0][0]).toContain(
			'Failed to disconnect the current wallet from the application.',
		);
		expect(consoleWarnSpy.mock.calls[0][1]).toBe(disconnectError);
	});

	it('Should handle wallet without disconnect feature', async () => {
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		const walletWithoutDisconnect = new MockWallet({
			name: 'Mock Wallet 3',
			accounts: [createMockAccount()],
			skippedFeatures: ['standard:disconnect'],
		});
		wallets.push(walletWithoutDisconnect);
		uiWallets = createTestUiWallets(wallets);
		stores = createMockInternalStores({
			currentNetwork: 'localnet',
			registeredWallets: uiWallets,
			compatibleWallets: uiWallets,
		});

		const wallet = wallets[2];
		const uiWallet = uiWallets[2];
		setMockInternalStoresConnected({
			stores,
			currentAccount: uiWallet.accounts[0],
			wallet: uiWallet,
		});
		disconnectWallet = disconnectWalletCreator(stores);

		expect(await disconnectWallet()).toBeUndefined();

		const baseConnection = stores.$baseConnection.get();
		expect(baseConnection.status).toBe('disconnected');
		expect(baseConnection.currentAccount).toBeNull();

		expect(consoleWarnSpy).toHaveBeenCalledOnce();
		expect(consoleWarnSpy.mock.calls[0][0]).toContain(
			'Failed to disconnect the current wallet from the application.',
		);
		expect(consoleWarnSpy.mock.calls[0][1]).toStrictEqual(
			new WalletStandardError(6160002, {
				featureName: 'standard:disconnect',
				supportedChains: [...wallet.chains],
				supportedFeatures: Object.keys(wallet.features),
				walletName: wallet.name,
			}),
		);
	});
});
