// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import type { StoreValue } from 'nanostores';
import { atom, computed, map } from 'nanostores';
import { getChain } from '../utils/networks.js';
import type { Networks } from '../utils/networks.js';
import {
	getAssociatedWalletOrThrow,
	requiredWalletFeatures,
	signingFeatures,
} from '../utils/wallets.js';
import type { DAppKitCompatibleClient } from './types.js';

type InternalWalletConnection =
	| {
			status: 'disconnected' | 'connecting';
			currentAccount: null;
			supportedIntents: string[];
	  }
	| {
			status: 'reconnecting' | 'connected';
			currentAccount: UiWalletAccount;
			supportedIntents: string[];
	  };

export type DAppKitStores<
	TNetworks extends Networks = Networks,
	Client extends DAppKitCompatibleClient = DAppKitCompatibleClient,
> = ReturnType<typeof createStores<TNetworks, Client>>;

export type WalletConnection = StoreValue<DAppKitStores['$connection']>;

export function createStores<
	TNetworks extends Networks = [],
	Client extends DAppKitCompatibleClient = DAppKitCompatibleClient,
>({
	defaultNetwork,
	getClient,
}: {
	defaultNetwork: TNetworks[number];
	getClient: (network: TNetworks[number]) => Client;
}) {
	const $baseConnection = map<InternalWalletConnection>({
		status: 'disconnected',
		currentAccount: null,
		supportedIntents: [],
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

				const hasRequiredFeatures = requiredWalletFeatures.every((featureName) =>
					wallet.features.includes(featureName),
				);

				const canSignTransactions = signingFeatures.some((featureName) =>
					wallet.features.includes(featureName),
				);

				return areChainsCompatible && hasRequiredFeatures && canSignTransactions;
			});
		},
	);

	return {
		$currentNetwork,
		$registeredWallets,
		$compatibleWallets,
		$baseConnection,
		$currentClient: computed($currentNetwork, getClient),
		$connection: computed([$baseConnection, $compatibleWallets], (connection, wallets) => {
			switch (connection.status) {
				case 'connected':
					return {
						wallet: getAssociatedWalletOrThrow(connection.currentAccount, wallets),
						account: connection.currentAccount,
						status: connection.status,
						supportedIntents: connection.supportedIntents,
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
						supportedIntents: connection.supportedIntents,
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
						supportedIntents: connection.supportedIntents,
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
						supportedIntents: connection.supportedIntents,
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
