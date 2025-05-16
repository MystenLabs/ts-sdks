// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { StandardDisconnectFeature, StandardDisconnectMethod } from '@mysten/wallet-standard';
import { StandardDisconnect } from '@mysten/wallet-standard';
import type { DAppKitState } from '../state.js';
import { task } from 'nanostores';
import { getWalletFeature } from '@wallet-standard/ui';
import { WalletNotConnectedError } from '../../utils/errors.js';
import { getAssociatedWallet } from '../../utils/wallets.js';

export type DisconnectWalletArgs = Parameters<StandardDisconnectMethod>;

export function disconnectWalletCreator({ $state }: DAppKitState) {
	/**
	 * Disconnects the current wallet from the application and prompts the current wallet
	 * to deauthorize accounts from the current domain depending on the wallet's implemetation
	 * of `standard:disconnect`.
	 */
	return async function disconnectWallet(...standardDisconnectArgs: DisconnectWalletArgs) {
		return await task(async () => {
			const { connection, wallets } = $state.get();
			const currentWallet = connection.currentAccount
				? getAssociatedWallet(connection.currentAccount, wallets)
				: null;

			if (!currentWallet) {
				throw new WalletNotConnectedError('No wallet is connected.');
			}

			try {
				const { disconnect } = getWalletFeature(
					currentWallet,
					StandardDisconnect,
				) as StandardDisconnectFeature[typeof StandardDisconnect];

				await disconnect(...standardDisconnectArgs);
			} catch (error) {
				console.warn('Failed to disconnect the current wallet from the application.', error);
			} finally {
				$state.setKey('connection', {
					status: 'disconnected',
					currentAccount: null,
				});
			}
		});
	};
}
