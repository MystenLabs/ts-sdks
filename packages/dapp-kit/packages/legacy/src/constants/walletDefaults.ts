// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiWalletFeatures, WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { SLUSH_WALLET_NAME } from '@mysten/slush-wallet';

import { createInMemoryStore } from '../utils/stateStorage.js';

export const SUI_WALLET_NAME = 'Sui Wallet';

export const DEFAULT_STORAGE =
	typeof window !== 'undefined' && window.localStorage ? localStorage : createInMemoryStore();

export const DEFAULT_STORAGE_KEY = 'sui-dapp-kit:wallet-connection-info';

const SIGN_FEATURES = [
	'sui:signTransaction',
	'sui:signTransactionBlock',
] satisfies (keyof SuiWalletFeatures)[];

export const DEFAULT_WALLET_FILTER = (wallet: WalletWithRequiredFeatures) =>
	SIGN_FEATURES.some((feature) => wallet.features[feature]);

export const DEFAULT_PREFERRED_WALLETS = [SUI_WALLET_NAME, SLUSH_WALLET_NAME];
