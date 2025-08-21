// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getOrCreateUiWalletForStandardWallet } from '@wallet-standard/ui-registry';

import type { DAppKitStores } from '../src/core/store.js';
import type { UiWallet } from '@wallet-standard/ui';
import type { Wallet } from '@mysten/wallet-standard';

export const TEST_DEFAULT_NETWORK = 'localnet' as const;
export const TEST_NETWORKS = ['devnet', 'testnet', 'localnet', 'mainnet'] as const;

export type TestWalletInitializeResult = {
	unregister: () => void;
};

export function createTestUiWallets(wallets: Wallet[]): UiWallet[] {
	return wallets.map((wallet) => getOrCreateUiWalletForStandardWallet(wallet));
}

export function unbindStoreListeners(stores: DAppKitStores | undefined) {
	if (stores === undefined) {
		return;
	}
	Object.values(stores).forEach((store) => store.off());
}

export function excludeUiWalletsByName(
	uiWallets: UiWallet[],
	...excludedWallets: { name: string }[]
) {
	return uiWallets.filter((wallet) =>
		excludedWallets.every((excludedWallet) => excludedWallet.name !== wallet.name),
	);
}
