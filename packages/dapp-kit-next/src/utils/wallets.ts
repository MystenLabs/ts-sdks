// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Wallet, WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { getWallets, isSuiChain, isWalletWithRequiredFeatureSet } from '@mysten/wallet-standard';
import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import { uiWalletAccountBelongsToUiWallet } from '@wallet-standard/ui';
import { getWalletForHandle_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getWalletForHandle } from '@wallet-standard/ui-registry';
import { DAppKitError } from './errors.js';

export function getSuiWallets() {
	const { get } = getWallets();
	return get().filter(isSuiWallet);
}

export function isSuiWallet(wallet: Wallet): wallet is WalletWithRequiredFeatures {
	return wallet.chains.some(isSuiChain) && isWalletWithRequiredFeatureSet(wallet);
}

export function getAssociatedWallet(account: UiWalletAccount, wallets: UiWallet[]) {
	return wallets.find((wallet) => uiWalletAccountBelongsToUiWallet(account, wallet)) ?? null;
}

export function getAssociatedWalletOrThrow(account: UiWalletAccount, wallets: UiWallet[]) {
	const wallet = getAssociatedWallet(account, wallets);
	if (!wallet) {
		throw new DAppKitError(`Wallet not found for account ${account.address}.`);
	}
	return wallet;
}

export function getWalletUniqueIdentifier(wallet: UiWallet | Wallet) {
	const underlyingWallet = '~uiWalletHandle' in wallet ? getWalletForHandle(wallet) : wallet;
	return underlyingWallet.id ?? underlyingWallet.name;
}
