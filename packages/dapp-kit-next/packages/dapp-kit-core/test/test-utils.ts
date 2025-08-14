// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getOrCreateUiWalletForStandardWallet } from '@wallet-standard/ui-registry';

import type { DAppKitStores } from '../src/core/store.js';
import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import { uiWalletAccountBelongsToUiWallet } from '@wallet-standard/ui';
import type { Wallet } from '@mysten/wallet-standard';

export const TEST_DEFAULT_NETWORK = 'localnet' as const;
export const TEST_NETWORKS = ['devnet', 'testnet', 'localnet', 'mainnet'] as const;

export function createTestUiWallets(wallets: Wallet[]): UiWallet[] {
	return wallets.map((wallet) => getOrCreateUiWalletForStandardWallet(wallet));
}

export function getAssociatedCompatibleUiWallet(account: UiWalletAccount, wallets: UiWallet[]) {
	return wallets.find((wallet) => uiWalletAccountBelongsToUiWallet(account, wallet));
}

export function unbindStoreListeners(stores: DAppKitStores | undefined) {
	if (stores === undefined) {
		return;
	}
	Object.values(stores).forEach((store) => store.off());
}

export async function waitFor(
	condition: () => boolean,
	timeout = 1000,
	interval = 10,
): Promise<void> {
	const startTime = Date.now();

	while (!condition()) {
		if (Date.now() - startTime > timeout) {
			throw new Error('Timeout waiting for condition');
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
}

export function collectStoreValues<T>(store: {
	subscribe: (fn: (value: T) => void) => () => void;
}): { values: T[]; unsubscribe: () => void } {
	const values: T[] = [];
	const unsubscribe = store.subscribe((value) => {
		values.push(value);
	});

	return { values, unsubscribe };
}

export function excludeUiWalletsByName(
	uiWallets: UiWallet[],
	...excludedWallets: { name: string }[]
) {
	return uiWallets.filter((wallet) =>
		excludedWallets.every((excludedWallet) => excludedWallet.name !== wallet.name),
	);
}
