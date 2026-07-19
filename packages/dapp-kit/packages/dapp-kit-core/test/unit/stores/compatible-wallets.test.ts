// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect } from 'vitest';
import { setDefaultUnitTestEnvWithUnmockedStores } from '../unit-test-utils.js';
import { createMockAccount } from '../../mocks/mock-account.js';
import type { MockWalletOptions } from '../../mocks/mock-wallet.js';
import {
	StandardConnect,
	SuiSignTransaction,
	SuiSignTransactionBlock,
} from '@mysten/wallet-standard';
import { excludeUiWalletsByName } from '../../test-utils.js';

describe('[Unit] $compatibleWallets', () => {
	test('Regular Sui wallets are compatible', () => {
		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores({
			additionalWallets: [
				{
					name: 'Additional Mock Wallet 1',
					accounts: [createMockAccount({ chains: ['sui:testnet', 'sui:localnet'] })],
				},
			],
		});
		stores.$registeredWallets.set(uiWallets);

		const compatibleWallets = stores.$compatibleWallets.get();
		expect(compatibleWallets).toStrictEqual(uiWallets);
	});

	test('Wallets with other chains are not compatible', () => {
		const additionalWallet = {
			name: 'Additional Mock Wallet 1',
			accounts: [createMockAccount({ chains: ['fake:mainnet', 'fake:localnet'] })],
			chains: ['eth:mainnet', 'eth:testnet'],
		} satisfies MockWalletOptions;

		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores({
			additionalWallets: [additionalWallet],
		});
		stores.$registeredWallets.set(uiWallets);

		const compatibleWallets = stores.$compatibleWallets.get();
		expect(compatibleWallets).toStrictEqual(
			excludeUiWalletsByName(compatibleWallets, additionalWallet),
		);
	});

	test('Wallet with missing standard features is not compatible', () => {
		const additionalWallet = {
			name: 'Additional Mock Wallet 1',
			skippedFeatures: [StandardConnect],
		} satisfies MockWalletOptions;

		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores({
			additionalWallets: [additionalWallet],
		});
		stores.$registeredWallets.set(uiWallets);

		const compatibleWallets = stores.$compatibleWallets.get();
		expect(compatibleWallets).toStrictEqual(
			excludeUiWalletsByName(compatibleWallets, additionalWallet),
		);
	});

	test('Wallet with all signing features missing is not compatible', () => {
		const additionalWallet = {
			name: 'Additional Mock Wallet 1',
			accounts: [createMockAccount({ chains: ['sui:testnet', 'sui:localnet'] })],
			skippedFeatures: [SuiSignTransaction, SuiSignTransactionBlock],
		} satisfies MockWalletOptions;

		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores({
			additionalWallets: [additionalWallet],
		});
		stores.$registeredWallets.set(uiWallets);

		const compatibleWallets = stores.$compatibleWallets.get();
		expect(compatibleWallets).toStrictEqual(
			excludeUiWalletsByName(compatibleWallets, additionalWallet),
		);
	});

	test('No wallets registered', () => {
		const { stores } = setDefaultUnitTestEnvWithUnmockedStores();

		const compatibleWallets = stores.$compatibleWallets.get();
		expect(compatibleWallets).toStrictEqual([]);
	});

	test('Notifies subscribers when registered wallets change', () => {
		const { stores, uiWallets } = setDefaultUnitTestEnvWithUnmockedStores();
		let notificationCount = 0;

		stores.$compatibleWallets.subscribe(() => {
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
});
