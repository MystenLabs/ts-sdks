// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect } from 'vitest';
import { setDefaultUnitTestEnvWithUnmockedStores } from '../unit-test-utils';

describe('[Unit] $connection', () => {
	test('Connected', () => {
		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores();
		const uiWallet = uiWallets[0];
		const uiWalletAccount = uiWallet.accounts[0];
		stores.$registeredWallets.set(uiWallets);

		expect(stores.$connection.get()).toStrictEqual({
			wallet: null,
			account: null,
			status: 'disconnected',
			isConnected: false,
			isConnecting: false,
			isReconnecting: false,
			isDisconnected: true,
		});

		stores.$baseConnection.set({
			status: 'connected',
			currentAccount: uiWalletAccount,
		});

		expect(stores.$connection.get()).toStrictEqual({
			wallet: uiWallet,
			account: uiWalletAccount,
			status: 'connected',
			isConnected: true,
			isConnecting: false,
			isReconnecting: false,
			isDisconnected: false,
		});
	});

	test('Disconnected', () => {
		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores();
		const uiWallet = uiWallets[0];
		const uiWalletAccount = uiWallet.accounts[0];
		stores.$registeredWallets.set(uiWallets);

		// start with a non-disconnected state
		stores.$baseConnection.set({
			status: 'connected',
			currentAccount: uiWalletAccount,
		});

		stores.$baseConnection.set({
			status: 'disconnected',
			currentAccount: null,
		});

		expect(stores.$connection.get()).toStrictEqual({
			wallet: null,
			account: null,
			status: 'disconnected',
			isConnected: false,
			isConnecting: false,
			isReconnecting: false,
			isDisconnected: true,
		});
	});

	test('Connecting', () => {
		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores();
		stores.$registeredWallets.set(uiWallets);

		stores.$baseConnection.set({
			status: 'connecting',
			currentAccount: null,
		});

		expect(stores.$connection.get()).toStrictEqual({
			wallet: null,
			account: null,
			status: 'connecting',
			isConnected: false,
			isConnecting: true,
			isReconnecting: false,
			isDisconnected: false,
		});
	});

	test('Reconnecting', () => {
		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores();
		const uiWallet = uiWallets[0];
		const uiWalletAccount = uiWallet.accounts[0];
		stores.$registeredWallets.set(uiWallets);

		stores.$baseConnection.set({
			status: 'reconnecting',
			currentAccount: uiWalletAccount,
		});

		expect(stores.$connection.get()).toStrictEqual({
			wallet: uiWallet,
			account: uiWalletAccount,
			status: 'reconnecting',
			isConnected: false,
			isConnecting: false,
			isReconnecting: true,
			isDisconnected: false,
		});
	});

	test('Notifies subscribers when registered wallets change', () => {
		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores();

		let notificationCount = 0;

		stores.$connection.subscribe(() => {
			notificationCount++;
		});
		expect(notificationCount).toBe(1);

		stores.$registeredWallets.set(uiWallets);
		expect(notificationCount).toBe(2);

		// no change
		stores.$registeredWallets.set(uiWallets);
		expect(notificationCount).toBe(2);

		stores.$registeredWallets.set([...uiWallets]);
		expect(notificationCount).toBe(3);
	});

	test('Notifies subscribers when base connection changes', () => {
		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores();
		stores.$registeredWallets.set(uiWallets);
		const uiWalletAccount = uiWallets[0].accounts[0];
		let notificationCount = 0;

		stores.$connection.subscribe(() => {
			notificationCount++;
		});
		expect(notificationCount).toBe(1);

		// no change
		stores.$baseConnection.set(stores.$baseConnection.get());
		expect(notificationCount).toBe(1);

		stores.$baseConnection.set({
			status: 'connecting',
			currentAccount: null,
		});
		expect(notificationCount).toBe(2);

		stores.$baseConnection.set({
			status: 'connected',
			currentAccount: uiWalletAccount,
		});
		expect(notificationCount).toBe(3);

		stores.$baseConnection.set({
			status: 'reconnecting',
			currentAccount: uiWalletAccount,
		});
		expect(notificationCount).toBe(4);

		stores.$baseConnection.set({
			status: 'disconnected',
			currentAccount: null,
		});
		expect(notificationCount).toBe(5);
	});
});
