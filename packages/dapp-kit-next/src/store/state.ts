// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { UiWallet, UiWalletAccount } from '@wallet-standard/ui';
import { deepMap } from 'nanostores';

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

export type DAppKitState = ReturnType<typeof createState>;

export function createState() {
	return deepMap<DAppKitStateValues>({
		wallets: [],
		connection: {
			status: 'disconnected',
			currentAccount: null,
		},
	});
}
