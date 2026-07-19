// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitStores } from '../store.js';
import { SuiSignTransaction, SuiSignTransactionBlock } from '@mysten/wallet-standard';
import type {
	SuiSignTransactionBlockFeature,
	SuiSignTransactionFeature,
	SuiSignTransactionInput,
} from '@mysten/wallet-standard';
import { getWalletAccountForUiWalletAccount } from '@wallet-standard/ui-registry';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { FeatureNotSupportedError } from '../../utils/errors.js';
import { getChain } from '../../utils/networks.js';
import type { Networks } from '../../utils/networks.js';
import { Transaction } from '@mysten/sui/transactions';
import { resolveSigningAccount, tryGetAccountFeature } from '../../utils/wallets.js';
import type { DAppKitCompatibleClient } from '../types.js';

export type SignTransactionArgs<TNetworks extends Networks = Networks> = {
	transaction: Transaction | string;
	/** The account to sign with. Defaults to the currently connected account. */
	account?: UiWalletAccount;
	/** The network to sign against. Defaults to the dApp kit's current network. */
	network?: TNetworks[number];
} & Omit<SuiSignTransactionInput, 'account' | 'chain' | 'transaction'>;

export function signTransactionCreator<TNetworks extends Networks>(
	{ $connection, $currentNetwork }: DAppKitStores<TNetworks>,
	getClient: (network: TNetworks[number]) => DAppKitCompatibleClient,
) {
	/**
	 * Prompts the specified wallet account to sign a transaction.
	 */
	return async function signTransaction({
		transaction,
		account: accountOverride,
		network,
		...standardArgs
	}: SignTransactionArgs<TNetworks>) {
		const connection = $connection.get();
		const account = resolveSigningAccount(connection, accountOverride);
		const supportedIntents = [...connection.supportedIntents];

		const underlyingAccount = getWalletAccountForUiWalletAccount(account);
		const resolvedNetwork = network ?? $currentNetwork.get();
		const suiClient = getClient(resolvedNetwork);
		const chain = getChain(resolvedNetwork);

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
