// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import type { StoreValue } from 'nanostores';
import { atom, map } from 'nanostores';
import type { UiWallet } from '@wallet-standard/ui';

import type { DAppKit, DAppKitCompatibleClient } from '../../src/index.js';
import type { DAppKitStores, WalletConnection } from '../../src/core/store.js';

type KnownNetwork = Parameters<typeof getFullnodeUrl>[0];

export type CreateMockInternalStoresOptions<TNetwork extends KnownNetwork> = {
	currentNetwork: TNetwork;
	registeredWallets: UiWallet[];
	compatibleWallets: UiWallet[];
	baseConnection?: StoreValue<DAppKitStores['$baseConnection']>;
	currentClient?: DAppKitCompatibleClient;
	connection?: WalletConnection;
};

export type CreateMockPublicStoresOptions<TNetwork extends KnownNetwork> = {
	wallets: UiWallet[];
	connection?: WalletConnection;
	currentNetwork: TNetwork;
	currentClient?: DAppKitCompatibleClient;
};

export type MockInternalStores = ReturnType<typeof createMockInternalStores>;
export type MockPublicStores = ReturnType<typeof createMockPublicStores>;

export function createMockInternalStores<TNetwork extends KnownNetwork>({
	currentNetwork,
	registeredWallets = [],
	compatibleWallets = [],
	baseConnection = {
		status: 'disconnected' as const,
		currentAccount: null,
	},
	currentClient = new SuiClient({
		network: currentNetwork as string,
		url: getFullnodeUrl(currentNetwork as Parameters<typeof getFullnodeUrl>[0]),
	}),
	connection = {
		status: 'disconnected' as const,
		wallet: null,
		account: null,
		isConnected: false,
		isConnecting: false,
		isReconnecting: false,
		isDisconnected: true,
	} as const,
}: CreateMockInternalStoresOptions<TNetwork>) {
	return {
		$currentNetwork: atom<TNetwork>(currentNetwork),
		$registeredWallets: atom<UiWallet[]>(registeredWallets),
		$compatibleWallets: atom<UiWallet[]>(compatibleWallets),
		$baseConnection: map<StoreValue<DAppKitStores['$baseConnection']>>(baseConnection),
		$currentClient: atom<DAppKitCompatibleClient>(currentClient),
		$connection: atom<WalletConnection>(connection),
	} satisfies DAppKitStores<readonly [TNetwork, ...TNetwork[]]>;
}

export function createMockPublicStores<TNetwork extends KnownNetwork>({
	wallets,
	connection = {
		status: 'disconnected' as const,
		wallet: null,
		account: null,
		isConnected: false,
		isConnecting: false,
		isReconnecting: false,
		isDisconnected: true,
	} as const,
	currentNetwork,
	currentClient = new SuiClient({
		network: currentNetwork as string,
		url: getFullnodeUrl(currentNetwork as Parameters<typeof getFullnodeUrl>[0]),
	}),
}: CreateMockPublicStoresOptions<TNetwork>) {
	return {
		$wallets: atom<UiWallet[]>(wallets),
		$connection: atom<WalletConnection>(connection),
		$currentNetwork: atom<TNetwork>(currentNetwork),
		$currentClient: atom<DAppKitCompatibleClient>(currentClient),
	} satisfies DAppKit<readonly [TNetwork, ...TNetwork[]]>['stores'];
}
