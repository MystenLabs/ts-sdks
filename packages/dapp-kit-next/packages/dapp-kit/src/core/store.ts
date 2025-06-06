// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import { atom, computed, map } from 'nanostores';
import { getChain } from '../utils/networks.js';
import type { Networks } from '../utils/networks.js';
import { getAssociatedWalletOrThrow, requiredWalletFeatures } from '../utils/wallets.js';
import { publicKeyFromSuiBytes } from '@mysten/sui/verify';
import type { Experimental_BaseClient } from '@mysten/sui/experimental';

type WalletConnection =
	| {
			status: 'disconnected' | 'connecting';
			currentAccount: null;
	  }
	| {
			status: 'reconnecting' | 'connected';
			currentAccount: UiWalletAccount;
	  };

export type DAppKitStores<TNetworks extends Networks = Networks> = ReturnType<
	typeof createStores<TNetworks>
>;

export function createStores<TNetworks extends Networks>({
	defaultNetwork,
	getClient,
}: {
	defaultNetwork: TNetworks[number];
	getClient: (network: TNetworks[number]) => Experimental_BaseClient;
}) {
	const $baseConnection = map<WalletConnection>({
		status: 'disconnected',
		currentAccount: null,
	});

	const $currentNetwork = atom<TNetworks[number]>(defaultNetwork);
	const $registeredWallets = atom<UiWallet[]>([]);

	const $compatibleWallets = computed(
		[$registeredWallets, $currentNetwork],
		(wallets, currentNetwork) => {
			return wallets.filter((wallet) => {
				const areChainsCompatible = wallet.chains.some(
					(chain) => getChain(currentNetwork) === chain,
				);

				const areFeaturesCompatible = requiredWalletFeatures.every((featureName) =>
					wallet.features.includes(featureName),
				);

				return areChainsCompatible && areFeaturesCompatible;
			});
		},
	);

	return {
		$currentNetwork,
		$registeredWallets,
		$compatibleWallets,
		$baseConnection,
		$publicKey: computed($baseConnection, ({ currentAccount }) =>
			currentAccount
				? publicKeyFromSuiBytes(new Uint8Array(currentAccount.publicKey), {
						address: currentAccount.address,
					})
				: null,
		),
		$currentClient: computed($currentNetwork, getClient),
		$connection: computed([$baseConnection, $compatibleWallets], (connection, wallets) => {
			switch (connection.status) {
				case 'connected':
					return {
						wallet: getAssociatedWalletOrThrow(connection.currentAccount, wallets),
						account: connection.currentAccount,
						status: connection.status,
						isConnected: true,
						isConnecting: false,
						isReconnecting: false,
						isDisconnected: false,
					} as const;
				case 'connecting':
					return {
						wallet: null,
						account: connection.currentAccount,
						status: connection.status,
						isConnected: false,
						isConnecting: true,
						isReconnecting: false,
						isDisconnected: false,
					} as const;
				case 'reconnecting':
					return {
						wallet: getAssociatedWalletOrThrow(connection.currentAccount, wallets),
						account: connection.currentAccount,
						status: connection.status,
						isConnected: false,
						isConnecting: false,
						isReconnecting: true,
						isDisconnected: false,
					} as const;
				case 'disconnected':
					return {
						wallet: null,
						account: connection.currentAccount,
						status: connection.status,
						isConnected: false,
						isConnecting: false,
						isReconnecting: false,
						isDisconnected: true,
					} as const;
				default:
					throw new Error(`Encountered unknown connection status: ${connection}`);
			}
		}),
	};
}
