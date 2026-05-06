// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import { uiWalletAccountBelongsToUiWallet } from '@wallet-standard/ui';
import type { MapStore, PreinitializedWritableAtom, ReadableAtom, StoreValue } from 'nanostores';
import { atom, computed, map } from 'nanostores';
import { getChain } from '../utils/networks.js';
import type { Networks } from '../utils/networks.js';
import { requiredWalletFeatures, signingFeatures } from '../utils/wallets.js';
import type { DAppKitCompatibleClient } from './types.js';

type ConnectionState =
	| {
			readonly wallet: null;
			readonly account: null;
			readonly status: 'disconnected';
			readonly supportedIntents: readonly [];
			readonly isConnected: false;
			readonly isConnecting: false;
			readonly isReconnecting: false;
			readonly isDisconnected: true;
	  }
	| {
			readonly wallet: UiWallet;
			readonly account: UiWalletAccount;
			readonly status: 'connected';
			readonly supportedIntents: string[];
			readonly isConnected: true;
			readonly isConnecting: false;
			readonly isReconnecting: false;
			readonly isDisconnected: false;
	  }
	| {
			readonly wallet: null;
			readonly account: null;
			readonly status: 'connecting';
			readonly supportedIntents: readonly [];
			readonly isConnected: false;
			readonly isConnecting: true;
			readonly isReconnecting: false;
			readonly isDisconnected: false;
	  }
	| {
			readonly wallet: UiWallet;
			readonly account: UiWalletAccount;
			readonly status: 'reconnecting';
			readonly supportedIntents: string[];
			readonly isConnected: false;
			readonly isConnecting: false;
			readonly isReconnecting: true;
			readonly isDisconnected: false;
	  };

type InternalWalletConnection =
	| {
			status: 'disconnected' | 'connecting';
			currentAccount: null;
	  }
	| {
			status: 'reconnecting' | 'connected';
			currentAccount: UiWalletAccount;
			supportedIntents: string[];
	  };

export type DAppKitStores<
	TNetworks extends Networks = Networks,
	Client extends DAppKitCompatibleClient = DAppKitCompatibleClient,
> = {
	$currentNetwork: PreinitializedWritableAtom<TNetworks[number]> & object;
	$registeredWallets: PreinitializedWritableAtom<UiWallet[]> & object;
	$compatibleWallets: ReadableAtom<UiWallet[]>;
	$baseConnection: MapStore<InternalWalletConnection>;
	$currentClient: ReadableAtom<Client>;
	$connection: ReadableAtom<ConnectionState>;
};

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
}): DAppKitStores<TNetworks, Client> {
	const $baseConnection = map<InternalWalletConnection>({
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
				case 'connected': {
					const wallet = wallets.find((w) =>
						uiWalletAccountBelongsToUiWallet(connection.currentAccount, w),
					);
					if (!wallet) {
						return {
							wallet: null,
							account: null,
							status: 'disconnected',
							supportedIntents: [],
							isConnected: false,
							isConnecting: false,
							isReconnecting: false,
							isDisconnected: true,
						} as const;
					}
					return {
						wallet,
						account: connection.currentAccount,
						status: connection.status,
						supportedIntents: connection.supportedIntents,
						isConnected: true,
						isConnecting: false,
						isReconnecting: false,
						isDisconnected: false,
					} as const;
				}
				case 'connecting':
					return {
						wallet: null,
						account: connection.currentAccount,
						status: connection.status,
						supportedIntents: [],
						isConnected: false,
						isConnecting: true,
						isReconnecting: false,
						isDisconnected: false,
					} as const;
				case 'reconnecting': {
					const wallet = wallets.find((w) =>
						uiWalletAccountBelongsToUiWallet(connection.currentAccount, w),
					);
					if (!wallet) {
						return {
							wallet: null,
							account: null,
							status: 'disconnected',
							supportedIntents: [],
							isConnected: false,
							isConnecting: false,
							isReconnecting: false,
							isDisconnected: true,
						} as const;
					}
					return {
						wallet,
						account: connection.currentAccount,
						status: connection.status,
						supportedIntents: connection.supportedIntents,
						isConnected: false,
						isConnecting: false,
						isReconnecting: true,
						isDisconnected: false,
					} as const;
				}
				case 'disconnected':
					return {
						wallet: null,
						account: connection.currentAccount,
						status: connection.status,
						supportedIntents: [],
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
