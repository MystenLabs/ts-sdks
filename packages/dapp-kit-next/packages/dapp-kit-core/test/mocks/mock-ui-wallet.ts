// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWallet } from '@wallet-standard/ui';
import { TEST_NETWORKS } from '../test-utils.js';

export type MockUiWalletAccountOptions = Partial<
	Pick<UiWallet['accounts'][number], 'address' | 'publicKey' | 'chains' | 'features'>
>;

export type MockUiWalletOptions = Partial<
	Pick<UiWallet, 'name' | 'icon' | 'accounts' | 'features' | 'chains'>
>;

function generateRandomSuiAddress(): string {
	// Sui addresses are 32 bytes (64 hex chars) with 0x prefix
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return '0x' + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createMockUiWalletAccount(
	options: MockUiWalletAccountOptions = {},
): UiWallet['accounts'][number] {
	const {
		address = generateRandomSuiAddress(),
		publicKey = new Uint8Array(32).fill(1),
		chains = TEST_NETWORKS.map((network) => `sui:${network}` as const),
		features = ['sui:signAndExecuteTransaction', 'sui:signTransaction', 'sui:signPersonalMessage'],
	} = options;

	return {
		address,
		publicKey,
		chains,
		features,
	} as UiWallet['accounts'][number];
}

export function createMockUiWallet(options: MockUiWalletOptions = {}): UiWallet {
	const {
		name = 'Mock Ui Wallet',
		icon = 'data:image/svg+xml;base64,mock',
		accounts = [
			createMockUiWalletAccount({
				address: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
			}),
			createMockUiWalletAccount({
				address: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
			}),
		] as const as UiWallet['accounts'],
		features = ['standard:connect', 'standard:disconnect', 'standard:events'],
		chains = TEST_NETWORKS.map((network) => `sui:${network}` as const),
	} = options;

	return {
		'~uiWalletHandle': Symbol(),
		name,
		icon,
		accounts,
		chains,
		version: '1.0.0',
		features,
	} as UiWallet;
}
