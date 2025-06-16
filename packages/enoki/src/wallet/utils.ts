// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Wallet } from '@mysten/wallet-standard';
import type { UiWallet } from '@wallet-standard/ui';
import { getWalletFeature } from '@wallet-standard/ui';
import type { EnokiWallet } from './index.js';
import type { EnokiGetMetadataFeature } from './feature.js';
import { EnokiGetMetadata } from './feature.js';

export function isEnokiWallet(wallet: UiWallet): boolean;
export function isEnokiWallet(wallet: Wallet): wallet is EnokiWallet;
export function isEnokiWallet(wallet: Wallet | UiWallet) {
	if (Array.isArray(wallet.features)) {
		return wallet.features.includes(EnokiGetMetadata);
	}
	return EnokiGetMetadata in wallet.features;
}

export function getWalletMetadata(enokiWallet: UiWallet) {
	try {
		const { getMetadata } = getWalletFeature(
			enokiWallet,
			EnokiGetMetadata,
		) as EnokiGetMetadataFeature[typeof EnokiGetMetadata];

		return getMetadata();
	} catch (error) {
		return null;
	}
}

export function isGoogleWallet(wallet: UiWallet) {
	return getWalletMetadata(wallet)?.provider === 'google';
}

export function isTwitchWallet(wallet: UiWallet) {
	return getWalletMetadata(wallet)?.provider === 'twitch';
}

export function isFacebookWallet(wallet: UiWallet) {
	return getWalletMetadata(wallet)?.provider === 'facebook';
}
