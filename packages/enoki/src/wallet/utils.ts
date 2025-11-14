// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Wallet, WalletWithFeatures } from '@mysten/wallet-standard';
import type { UiWallet } from '@wallet-standard/ui';
import { getWalletFeature } from '@wallet-standard/ui';
import type { EnokiWallet } from './wallet.js';
import type {
	EnokiGetMetadataFeature,
	EnokiGetSessionFeature,
	EnokiGetSessionInput,
} from './features.js';
import { EnokiGetMetadata, EnokiGetSession } from './features.js';

export function isEnokiWallet(wallet: UiWallet): boolean;
export function isEnokiWallet(wallet: Wallet): wallet is EnokiWallet;
export function isEnokiWallet(wallet: Wallet | UiWallet) {
	if (isWalletHandle(wallet)) {
		return wallet.features.includes(EnokiGetMetadata);
	}
	return EnokiGetMetadata in wallet.features;
}

export function getWalletMetadata(wallet: Wallet | UiWallet) {
	if (isWalletHandle(wallet)) {
		try {
			const { getMetadata } = getWalletFeature(
				wallet,
				EnokiGetMetadata,
			) as EnokiGetMetadataFeature[typeof EnokiGetMetadata];

			return getMetadata();
		} catch {
			return null;
		}
	} else if (EnokiGetMetadata in wallet.features) {
		const walletWithFeature = wallet as WalletWithFeatures<EnokiGetMetadataFeature>;
		return walletWithFeature.features[EnokiGetMetadata].getMetadata();
	}
	return null;
}

export async function getSession(wallet: Wallet | UiWallet, input?: EnokiGetSessionInput) {
	if (isWalletHandle(wallet)) {
		try {
			const { getSession } = getWalletFeature(
				wallet,
				EnokiGetSession,
			) as EnokiGetSessionFeature[typeof EnokiGetSession];

			return await getSession(input);
		} catch {
			return null;
		}
	} else if (EnokiGetSession in wallet.features) {
		const walletWithFeature = wallet as WalletWithFeatures<EnokiGetSessionFeature>;
		return await walletWithFeature.features[EnokiGetSession].getSession(input);
	}
	return null;
}

export function isGoogleWallet(wallet: Wallet | UiWallet) {
	return getWalletMetadata(wallet)?.provider === 'google';
}

export function isTwitchWallet(wallet: Wallet | UiWallet) {
	return getWalletMetadata(wallet)?.provider === 'twitch';
}

export function isFacebookWallet(wallet: Wallet | UiWallet) {
	return getWalletMetadata(wallet)?.provider === 'facebook';
}

function isWalletHandle(wallet: UiWallet | Wallet): wallet is UiWallet {
	// TypeScript doesn't properly narrow readonly arrays:
	// https://github.com/microsoft/TypeScript/issues/1700
	return Array.isArray(wallet.features);
}
