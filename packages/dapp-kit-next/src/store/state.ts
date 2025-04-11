// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Wallet, WalletAccount, WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { map, mapCreator, MapStore } from 'nanostores';

import { getRegisteredWallets } from '../utils/walletUtils.js';

export type DappKitStateOptions = {
	preferredWallets: string[];
	walletFilter: (wallet: WalletWithRequiredFeatures) => boolean;
	storageKey: string;
};

export type DappKitStoreState = {
	wallets: WalletWithRequiredFeatures[];
	currentWallet: WalletWithRequiredFeatures | null;
};

const DAppKitStore = mapCreator<DappKitStoreState>((store, id) => {
	store.set({ id, wallets: [], currentWallet: null });
});

const GlobalStore = DAppKitStore('global-dapp-kit-store');

export function createState({ preferredWallets, walletFilter, storageKey }: DappKitStateOptions) {
	const $state = map<DappKitStoreState>({
		wallets: getRegisteredWallets(preferredWallets, walletFilter),
		currentWallet: null,
	});

	const actions = {
		setWalletRegistered(updatedWallets: WalletWithRequiredFeatures[]) {
			$state.setKey('wallets', updatedWallets);
		},
		setWalletUnregistered(
			updatedWallets: WalletWithRequiredFeatures[],
			unregisteredWallet: Wallet,
		) {
			if (unregisteredWallet === $state.get().currentWallet) {
				$state.set({
					...$state.get(),
					wallets: updatedWallets,
					accounts: [],
					currentWallet: null,
					currentAccount: null,
					connectionStatus: 'disconnected',
					supportedIntents: [],
				});
			} else {
				$state.setKey('wallets', updatedWallets);
			}
		},
	};

	return {
		$state,
		actions,
	};
}
