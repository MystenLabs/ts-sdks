// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getWallets, StandardEvents } from '@mysten/wallet-standard';
import { onMount } from 'nanostores';
import type { DAppKitStores } from '../store.js';

import { getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getOrCreateUiWalletForStandardWallet } from '@wallet-standard/ui-registry';
import type { StandardEventsFeature, Wallet, WalletWithFeatures } from '@mysten/wallet-standard';

/**
 * Handles updating the store in response to wallets being added, removed, and their properties changing.
 */
export function syncRegisteredWallets({ $registeredWallets }: DAppKitStores) {
	onMount($registeredWallets, () => {
		const walletsApi = getWallets();
		const unsubscribeCallbacksByWallet = new Map<Wallet, () => void>();

		const onWalletsChanged = () => {
			const wallets = walletsApi.get();
			$registeredWallets.set(wallets.map(getOrCreateUiWalletForStandardWallet));
		};

		const subscribeToWalletEvents = (wallet: WalletWithFeatures<StandardEventsFeature>) => {
			const unsubscribeFromChange = wallet.features[StandardEvents].on('change', () => {
				onWalletsChanged();
			});

			// NOTE: The underlying wallet entities returned from the Wallet Standard are
			// referentially equal even when the properties of a wallet change. Thus, it is
			// safe to use the wallet object itself as the key for the unsubscribe mapping.
			unsubscribeCallbacksByWallet.set(wallet, unsubscribeFromChange);
		};

		const unsubscribeFromRegister = walletsApi.on('register', (...addedWallets) => {
			addedWallets.filter(hasStandardEvents).forEach(subscribeToWalletEvents);
			onWalletsChanged();
		});

		const unsubscribeFromUnregister = walletsApi.on('unregister', (...removedWallets) => {
			removedWallets.filter(hasStandardEvents).forEach((wallet) => {
				const unsubscribeFromChange = unsubscribeCallbacksByWallet.get(wallet);
				if (unsubscribeFromChange) {
					unsubscribeCallbacksByWallet.delete(wallet);
					unsubscribeFromChange();
				}
			});

			onWalletsChanged();
		});

		const wallets = walletsApi.get();
		wallets.filter(hasStandardEvents).forEach(subscribeToWalletEvents);
		onWalletsChanged();

		return () => {
			unsubscribeFromRegister();
			unsubscribeFromUnregister();

			unsubscribeCallbacksByWallet.forEach((unsubscribe) => unsubscribe());
			unsubscribeCallbacksByWallet.clear();
		};
	});
}

function hasStandardEvents(wallet: Wallet): wallet is WalletWithFeatures<StandardEventsFeature> {
	return StandardEvents in wallet.features;
}
