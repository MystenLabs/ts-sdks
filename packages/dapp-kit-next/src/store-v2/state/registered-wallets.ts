// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { getWallets, StandardEvents } from '@mysten/wallet-standard';
import { atom, onMount } from 'nanostores';
import { isSuiWallet, getWalletUniqueIdentifier } from '../../utils/wallets.js';

export type RegisteredWalletsState = ReturnType<typeof createRegisteredWalletsState>;

export function createRegisteredWalletsState() {
	const $registeredWallets = atom<readonly WalletWithRequiredFeatures[]>([]);

	onMount($registeredWallets, () => {
		const { get, on } = getWallets();
		const unsubscribeCallbacksByWalletId = new Map<string, () => void>();

		const updateWallets = () => {
			const suiWallets = get().filter(isSuiWallet);
			$registeredWallets.set(suiWallets);
			return suiWallets;
		};

		const subscribeToWalletEvents = (wallet: WalletWithRequiredFeatures) => {
			const unsubscribeFromChange = wallet.features[StandardEvents].on('change', () => {
				updateWallets();
			});

			const walletId = getWalletUniqueIdentifier(wallet);
			unsubscribeCallbacksByWalletId.set(walletId, unsubscribeFromChange);
		};

		const unsubscribeFromRegister = on('register', (...addedWallets) => {
			addedWallets.filter(isSuiWallet).forEach(subscribeToWalletEvents);
			updateWallets();
		});

		const unsubscribeFromUnregister = on('unregister', (...removedWallets) => {
			removedWallets.filter(isSuiWallet).forEach((wallet) => {
				const walletId = getWalletUniqueIdentifier(wallet);
				const unsubscribeFromChange = unsubscribeCallbacksByWalletId.get(walletId);

				if (unsubscribeFromChange) {
					unsubscribeCallbacksByWalletId.delete(walletId);
					unsubscribeFromChange();
				}
			});

			updateWallets();
		});

		const suiWallets = updateWallets();
		suiWallets.forEach(subscribeToWalletEvents);

		return () => {
			unsubscribeFromRegister();
			unsubscribeFromUnregister();

			unsubscribeCallbacksByWalletId.forEach((unsubscribe) => unsubscribe());
			unsubscribeCallbacksByWalletId.clear();
		};
	});

	return $registeredWallets;
}
