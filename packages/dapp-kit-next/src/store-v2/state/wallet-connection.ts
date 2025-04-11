// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletWithRequiredFeatures, WalletAccount } from '@mysten/wallet-standard';
import { map } from 'nanostores';

export type WalletConnectionState = ReturnType<typeof createWalletConnectionState>;

type WalletConnection =
	| {
			status: 'connected';
			error?: never;
			connectedWallet: WalletWithRequiredFeatures;
			selectedAccount: WalletAccount;
	  }
	| {
			status: 'error';
			error: Error;
			connectedWallet?: never;
			selectedAccount?: never;
	  }
	| {
			status: 'disconnected' | 'connecting';
			error?: never;
			connectedWallet?: never;
			selectedAccount?: never;
	  };

export function createWalletConnectionState({ storageKey }: { storageKey?: string }) {
	const $walletConnection = map<WalletConnection>({ status: 'disconnected' });

	// if (autoConnectEnabled) {
	// 	onMount($walletConnection, () => {
	// 		task(async () => {
	// 			if ($walletConnection.get().autoConnectStatus !== 'idle') return;

	// 			const { wallets, connectionStatus } = $state.get();
	// 			const { walletName, accountAddress } = $recentConnection.get();
	// 			const wallet = wallets.find((wallet) => getWalletUniqueIdentifier(wallet) === walletName);

	// 			if (!walletName || !accountAddress || !wallet || connectionStatus === 'connected') {
	// 				$state.setKey('autoConnectStatus', 'attempted');
	// 				return;
	// 			}

	// 			try {
	// 				await methods.connectWallet({
	// 					wallet,
	// 					accountAddress,
	// 					silent: true,
	// 				});
	// 			} catch {
	// 				// Ignore errors:
	// 			} finally {
	// 				$state.setKey('autoConnectStatus', 'attempted');
	// 			}
	// 		});
	// 	});
	// }

	return $walletConnection;
}
