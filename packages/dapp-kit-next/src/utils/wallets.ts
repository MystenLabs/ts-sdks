// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Wallet, WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { isSuiChain, isWalletWithRequiredFeatureSet } from '@mysten/wallet-standard';

export function isSuiWallet(wallet: Wallet): wallet is WalletWithRequiredFeatures {
	return wallet.chains.some(isSuiChain) && isWalletWithRequiredFeatureSet(wallet);
}

export function getWalletUniqueIdentifier(wallet: Wallet) {
	return wallet.id ?? wallet.name;
}
