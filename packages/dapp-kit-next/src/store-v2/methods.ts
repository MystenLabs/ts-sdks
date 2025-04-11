// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClient } from '@mysten/sui/client';
import { isSuiChain, StandardConnect } from '@mysten/wallet-standard';
import type {
	StandardConnectInput,
	StandardConnectOutput,
	WalletAccount,
	WalletWithRequiredFeatures,
} from '@mysten/wallet-standard';
import type { ReadableAtom } from 'nanostores';
import { task } from 'nanostores';

import { WalletNotConnectedError } from '../utils/walletErrors.js';
import type { createState } from './state.js';

export type Methods = {
	connectWallet: (
		input: {
			/** The wallet to connect to. */
			wallet: WalletWithRequiredFeatures;

			/** An optional account address to connect to. Defaults to the first authorized account. */
			accountAddress?: string;
		} & StandardConnectInput,
	) => Promise<StandardConnectOutput>;

	/**
	 *
	 */
	disconnectWallet: () => void;
};

export type MethodTypes = {
	[p in keyof Methods]: {
		input: Parameters<Methods[p]>[0];
		output: ReturnType<Methods[p]>;
	};
};

export function createMethods({
	$state,
	actions,
	$client,
}: Pick<ReturnType<typeof createState>, '$state' | 'actions'> & {
	$client: ReadableAtom<SuiClient>;
}) {
	return {
		connectWallet({ wallet, accountAddress, ...connectArgs }) {
			return task(async () => {
				try {
					actions.setConnectionStatus('connecting');

					const connectResult = await wallet.features[StandardConnect].connect(connectArgs);
					const connectedSuiAccounts = connectResult.accounts.filter((account) => {
						return account.chains.some(isSuiChain);
					});
					const selectedAccount = getSelectedAccount(connectedSuiAccounts, accountAddress);

					actions.setWalletConnected(
						wallet,
						connectedSuiAccounts,
						selectedAccount,
						connectResult.supportedIntents,
					);

					return { accounts: connectedSuiAccounts };
				} catch (error) {
					actions.setConnectionStatus('disconnected');
					throw error;
				}
			});
		},
		disconnectWallet() {
			return task(async () => {
				const { currentWallet } = $state.get();

				if (!currentWallet) {
					throw new WalletNotConnectedError('No wallet is connected.');
				}

				try {
					// Wallets aren't required to implement the disconnect feature, so we'll
					// optionally call the disconnect feature if it exists and reset the UI
					// state on the frontend at a minimum.
					await currentWallet.features['standard:disconnect']?.disconnect();
				} catch (error) {
					console.error('Failed to disconnect the application from the current wallet.', error);
				}

				actions.setWalletDisconnected();
			});
		},
	} satisfies Methods;
}

function getSelectedAccount(connectedAccounts: readonly WalletAccount[], accountAddress?: string) {
	if (connectedAccounts.length === 0) {
		return null;
	}

	if (accountAddress) {
		const selectedAccount = connectedAccounts.find((account) => account.address === accountAddress);
		return selectedAccount ?? connectedAccounts[0];
	}

	return connectedAccounts[0];
}
