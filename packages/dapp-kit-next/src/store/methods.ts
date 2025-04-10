// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClient } from '@mysten/sui/client';
import type { SignatureWithBytes } from '@mysten/sui/cryptography';
import type { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@mysten/sui/utils';
import { isSuiChain, signTransaction } from '@mysten/wallet-standard';
import type {
	SignedTransaction,
	StandardConnectInput,
	StandardConnectOutput,
	SuiSignAndExecuteTransactionOutput,
	SuiSignPersonalMessageInput,
	SuiSignPersonalMessageOutput,
	SuiSignTransactionInput,
	WalletAccount,
	WalletWithRequiredFeatures,
} from '@mysten/wallet-standard';
import type { ReadableAtom } from 'nanostores';
import { task } from 'nanostores';

import {
	WalletAccountNotFoundError,
	WalletFeatureNotSupportedError,
	WalletNoAccountSelectedError,
	WalletNotConnectedError,
} from '../utils/walletErrors.js';
import type { createState } from './state.js';

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<T>;

type SignTransactionOptions = PartialBy<
	Omit<SuiSignTransactionInput, 'transaction'>,
	'account' | 'chain'
> & {
	transaction: Transaction | string;
};

export type Methods = {
	/**
	 *
	 * @param input
	 * @returns
	 */
	switchAccount: (input: { account: WalletAccount }) => void;

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

	/**
	 *
	 */
	signPersonalMessage: (
		input: PartialBy<SuiSignPersonalMessageInput, 'account' | 'chain'>,
	) => Promise<SuiSignPersonalMessageOutput>;

	/**
	 *
	 */
	signTransaction: (input: SignTransactionOptions) => Promise<SignedTransaction>;

	/**
	 *
	 */
	signAndExecuteTransaction: (
		input: SignTransactionOptions & {
			execute?: (input: SignatureWithBytes) => Promise<SuiSignAndExecuteTransactionOutput>;
		},
	) => Promise<SuiSignAndExecuteTransactionOutput>;
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
		switchAccount({ account }) {
			const { currentWallet } = $state.get();
			if (!currentWallet) {
				throw new WalletNotConnectedError('No wallet is connected.');
			}

			const accountToSelect = currentWallet.accounts.find(
				(walletAccount) => walletAccount.address === account.address,
			);

			if (!accountToSelect) {
				throw new WalletAccountNotFoundError(
					`No account with address ${account.address} is connected to ${currentWallet.name}.`,
				);
			}

			actions.setAccountSwitched(accountToSelect);
		},
		connectWallet({ wallet, accountAddress, ...connectArgs }) {
			return task(async () => {
				try {
					actions.setConnectionStatus('connecting');

					const connectResult = await wallet.features['standard:connect'].connect(connectArgs);
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
		signPersonalMessage(signPersonalMessageArgs) {
			return task(async () => {
				const { currentWallet, currentAccount } = $state.get();

				if (!currentWallet) {
					throw new WalletNotConnectedError('No wallet is connected.');
				}

				const signerAccount = signPersonalMessageArgs.account ?? currentAccount;
				if (!signerAccount) {
					throw new WalletNoAccountSelectedError(
						'No wallet account is selected to sign the personal message with.',
					);
				}

				const signPersonalMessageFeature = currentWallet.features['sui:signPersonalMessage'];
				if (signPersonalMessageFeature) {
					return await signPersonalMessageFeature.signPersonalMessage({
						...signPersonalMessageArgs,
						account: signerAccount,
						chain: signPersonalMessageArgs.chain ?? `sui:${'TODO'}`,
					});
				}

				// TODO: Remove this once we officially discontinue sui:signMessage in the wallet standard
				const signMessageFeature = currentWallet.features['sui:signMessage'];
				if (signMessageFeature) {
					console.warn(
						"This wallet doesn't support the `signPersonalMessage` feature... falling back to `signMessage`.",
					);

					const { messageBytes, signature } = await signMessageFeature.signMessage({
						...signPersonalMessageArgs,
						account: signerAccount,
					});
					return { bytes: messageBytes, signature };
				}

				throw new WalletFeatureNotSupportedError(
					"This wallet doesn't support the `signPersonalMessage` feature.",
				);
			});
		},
		signTransaction({ transaction, ...signTransactionArgs }) {
			return task(async () => {
				const client = $client.get();
				const { currentWallet, currentAccount, supportedIntents } = $state.get();
				if (!currentWallet) {
					throw new WalletNotConnectedError('No wallet is connected.');
				}

				const signerAccount = signTransactionArgs.account ?? currentAccount;
				if (!signerAccount) {
					throw new WalletNoAccountSelectedError(
						'No wallet account is selected to sign the transaction with.',
					);
				}

				if (
					!currentWallet.features['sui:signTransaction'] &&
					!currentWallet.features['sui:signTransactionBlock']
				) {
					throw new WalletFeatureNotSupportedError(
						"This wallet doesn't support the `signTransaction` feature.",
					);
				}

				const { bytes, signature } = await signTransaction(currentWallet, {
					...signTransactionArgs,
					transaction: {
						toJSON: async () => {
							return typeof transaction === 'string'
								? transaction
								: await transaction.toJSON({
										supportedIntents,
										client,
									});
						},
					},
					account: signerAccount,
					chain: signTransactionArgs.chain ?? `sui:${'TODO'}`,
				});

				return {
					bytes,
					signature,
				};
			});
		},
		signAndExecuteTransaction({ execute, ...signTransactionArgs }) {
			return task(async () => {
				const client = $client.get();

				const executeTransaction: ({
					bytes,
					signature,
				}: {
					bytes: string;
					signature: string;
				}) => Promise<any> =
					execute ??
					(async ({ bytes, signature }) => {
						const { digest, rawEffects } = await client.executeTransactionBlock({
							transactionBlock: bytes,
							signature,
							options: {
								showRawEffects: true,
							},
						});

						return {
							digest,
							rawEffects,
							effects: toBase64(new Uint8Array(rawEffects!)),
							bytes,
							signature,
						};
					});

				const result = await this.signTransaction(signTransactionArgs);
				return await executeTransaction(result);
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
