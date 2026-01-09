// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitStores } from '../store.js';
import { SuiSignTransaction, SuiSignTransactionBlock } from '@mysten/wallet-standard';
import type {
	SuiSignTransactionBlockFeature,
	SuiSignTransactionFeature,
	SuiSignTransactionInput,
} from '@mysten/wallet-standard';
import { getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getWalletAccountForUiWalletAccount } from '@wallet-standard/ui-registry';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { FeatureNotSupportedError, WalletNotConnectedError } from '../../utils/errors.js';
import { getChain } from '../../utils/networks.js';
import { Transaction } from '@mysten/sui/transactions';
import { tryGetAccountFeature } from '../../utils/wallets.js';

export type SignTransactionArgs<TNetwork = string> = {
	transaction: Transaction | string;
	network?: TNetwork;
	account?: UiWalletAccount;
} & Omit<SuiSignTransactionInput, 'account' | 'chain' | 'transaction'>;

export function signTransactionCreator<TNetwork extends string = string>(
	{ $connection, $currentClient }: DAppKitStores,
	getClient: (
		network: TNetwork,
	) => DAppKitStores['$currentClient'] extends { get: () => infer C } ? C : never,
) {
	/**
	 * Prompts the specified wallet account to sign a transaction.
	 */
	return async function signTransaction({
		transaction,
		network,
		account: accountOverride,
		...standardArgs
	}: SignTransactionArgs<TNetwork>) {
		const connection = $connection.get();
		const account = accountOverride ?? connection.account;
		if (!account) {
			throw new WalletNotConnectedError('No wallet is connected.');
		}

		const underlyingAccount = getWalletAccountForUiWalletAccount(account);
		const suiClient = network ? getClient(network) : $currentClient.get();
		const chain = getChain(suiClient.network);
		const supportedIntents = [...connection.supportedIntents];

		const transactionWrapper = {
			toJSON: async () => {
				if (typeof transaction === 'string') {
					return transaction;
				}

				transaction.setSenderIfNotSet(account.address);
				return await transaction.toJSON({ client: suiClient, supportedIntents });
			},
		};

		const signTransactionFeature = tryGetAccountFeature({
			account,
			chain,
			featureName: SuiSignTransaction,
		}) as SuiSignTransactionFeature[typeof SuiSignTransaction];

		if (signTransactionFeature) {
			return await signTransactionFeature.signTransaction({
				...standardArgs,
				transaction: transactionWrapper,
				account: underlyingAccount,
				chain,
			});
		}

		const signTransactionBlockFeature = tryGetAccountFeature({
			account,
			chain,
			featureName: SuiSignTransactionBlock,
		}) as SuiSignTransactionBlockFeature[typeof SuiSignTransactionBlock];

		if (signTransactionBlockFeature) {
			const transaction = Transaction.from(await transactionWrapper.toJSON());
			const { transactionBlockBytes, signature } =
				await signTransactionBlockFeature.signTransactionBlock({
					transactionBlock: transaction,
					account: underlyingAccount,
					chain,
				});

			return { bytes: transactionBlockBytes, signature };
		}

		throw new FeatureNotSupportedError(
			`The account ${account.address} does not support signing transactions.`,
		);
	};
}
