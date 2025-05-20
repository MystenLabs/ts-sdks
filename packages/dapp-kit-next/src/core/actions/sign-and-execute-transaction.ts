// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitStores } from '../store.js';
import { SuiSignAndExecuteTransaction } from '@mysten/wallet-standard';
import type {
	SuiSignAndExecuteTransactionFeature,
	SuiSignAndExecuteTransactionInput,
} from '@mysten/wallet-standard';
import { getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED as getWalletAccountForUiWalletAccount } from '@wallet-standard/ui-registry';
import { WalletNotConnectedError } from '../../utils/errors.js';
import { getChain } from '../../utils/networks.js';
import type { Transaction } from '@mysten/sui/transactions';
import { getAccountFeature } from '../../utils/wallets.js';

export type signAndExecuteTransactionArgs = {
	transaction: Transaction | string;
} & Omit<SuiSignAndExecuteTransactionInput, 'account' | 'chain' | 'transaction'>;

export function signAndExecuteTransactionCreator({ $connection, $currentClient }: DAppKitStores) {
	/**
	 * Prompts the specified wallet account to sign and execute a transaction.
	 */
	return async function signAndExecuteTransaction({
		transaction,
		...standardArgs
	}: signAndExecuteTransactionArgs) {
		const { account } = $connection.get();
		if (!account) {
			throw new WalletNotConnectedError('No wallet is connected.');
		}

		const suiClient = $currentClient.get();
		const chain = getChain(suiClient.network);

		const signAndExecuteTransactionFeature = getAccountFeature({
			account,
			chain,
			featureName: SuiSignAndExecuteTransaction,
		}) as SuiSignAndExecuteTransactionFeature[typeof SuiSignAndExecuteTransaction];

		return await signAndExecuteTransactionFeature.signAndExecuteTransaction({
			...standardArgs,
			transaction: {
				toJSON: async () => {
					if (typeof transaction === 'string') {
						return transaction;
					}

					// TODO: Fix passing through the client and supported intents for plugins.
					transaction.setSenderIfNotSet(account.address);
					return await transaction.toJSON();
				},
			},
			account: getWalletAccountForUiWalletAccount(account),
			chain,
		});
	};
}
