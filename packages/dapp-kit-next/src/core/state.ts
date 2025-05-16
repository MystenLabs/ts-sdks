// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import { atom, deepMap } from 'nanostores';
import type { Networks } from '../utils/networks.js';

type WalletConnection =
	| {
			status: 'disconnected' | 'connecting';
			currentAccount: null;
	  }
	| {
			status: 'reconnecting' | 'connected';
			currentAccount: UiWalletAccount;
	  };

export type DAppKitStateValues = {
	wallets: UiWallet[];
	connection: WalletConnection;
};

export type DAppKitState<TNetworks extends Networks = Networks> = ReturnType<
	typeof createState<TNetworks>
>;

export function createState<TNetworks extends Networks = Networks>({
	defaultNetwork,
}: {
	defaultNetwork: TNetworks[number];
}) {
	const $currentNetwork = atom<TNetworks[number]>(defaultNetwork);

	const $state = deepMap<DAppKitStateValues>({
		wallets: [],
		connection: {
			status: 'disconnected',
			currentAccount: null,
		},
	});

	return { $state, $currentNetwork };
}
