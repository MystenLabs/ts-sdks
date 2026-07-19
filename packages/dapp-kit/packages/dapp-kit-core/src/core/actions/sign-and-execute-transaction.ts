// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DAppKitStores } from '../store.js';
import {
	SuiSignAndExecuteTransaction,
	SuiSignAndExecuteTransactionBlock,
} from '@mysten/wallet-standard';
import type {
	SuiSignAndExecuteTransactionBlockFeature,
	SuiSignAndExecuteTransactionFeature,
	SuiSignAndExecuteTransactionInput,
} from '@mysten/wallet-standard';
import { getWalletAccountForUiWalletAccount } from '@wallet-standard/ui-registry';
import type { UiWalletAccount } from '@wallet-standard/ui';
import { FeatureNotSupportedError } from '../../utils/errors.js';
import { getChain } from '../../utils/networks.js';
import type { Networks } from '../../utils/networks.js';
import { Transaction } from '@mysten/sui/transactions';
import { resolveSigningAccount, tryGetAccountFeature } from '../../utils/wallets.js';
import { bcs } from '@mysten/sui/bcs';
import { fromBase64 } from '@mysten/utils';
import {
	buildTransactionResult,
	type TransactionResultWithEffects,
} from '../../utils/transaction-result.js';
import type { DAppKitCompatibleClient } from '../types.js';

export type SignAndExecuteTransactionArgs<TNetworks extends Networks = Networks> = {
	transaction: Transaction | string;
	/** The account to sign with. Defaults to the currently connected account. */
	account?: UiWalletAccount;
	/** The network to sign and execute against. Defaults to the dApp kit's current network. */
	network?: TNetworks[number];
} & Omit<SuiSignAndExecuteTransactionInput, 'account' | 'chain' | 'transaction'>;

export type SignAndExecuteTransactionResult = TransactionResultWithEffects;

export function signAndExecuteTransactionCreator<TNetworks extends Networks>(
	{ $connection, $currentNetwork }: DAppKitStores<TNetworks>,
	getClient: (network: TNetworks[number]) => DAppKitCompatibleClient,
) {
	/**
	 * Prompts the specified wallet account to sign and execute a transaction.
	 */
	return async function signAndExecuteTransaction({
		transaction,
		account: accountOverride,
		network,
		...standardArgs
	}: SignAndExecuteTransactionArgs<TNetworks>): Promise<SignAndExecuteTransactionResult> {
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

		const signAndExecuteTransactionFeature = tryGetAccountFeature({
			account,
			chain,
			featureName: SuiSignAndExecuteTransaction,
		}) as SuiSignAndExecuteTransactionFeature[typeof SuiSignAndExecuteTransaction];

		if (signAndExecuteTransactionFeature) {
			const result = await signAndExecuteTransactionFeature.signAndExecuteTransaction({
				...standardArgs,
				account: underlyingAccount,
				transaction: transactionWrapper,
				chain,
			});

			const transactionBytes = fromBase64(result.bytes);
			const effectsBytes = fromBase64(result.effects);
			return buildTransactionResult(
				result.digest,
				result.signature,
				transactionBytes,
				effectsBytes,
			);
		}

		const signAndExecuteTransactionBlockFeature = tryGetAccountFeature({
			account,
			chain,
			featureName: SuiSignAndExecuteTransactionBlock,
		}) as SuiSignAndExecuteTransactionBlockFeature[typeof SuiSignAndExecuteTransactionBlock];

		if (signAndExecuteTransactionBlockFeature) {
			const transactionBlock = Transaction.from(await transactionWrapper.toJSON());
			const { digest, rawEffects, rawTransaction } =
				await signAndExecuteTransactionBlockFeature.signAndExecuteTransactionBlock({
					account: underlyingAccount,
					chain,
					transactionBlock,
					options: {
						showRawEffects: true,
						showRawInput: true,
					},
				});

			const [
				{
					txSignatures: [signature],
					intentMessage: { value: bcsTransaction },
				},
			] = bcs.SenderSignedData.parse(fromBase64(rawTransaction!));

			const transactionBytes = bcs.TransactionData.serialize(bcsTransaction).toBytes();
			const effectsBytes = new Uint8Array(rawEffects!);
			return buildTransactionResult(digest, signature, transactionBytes, effectsBytes);
		}

		throw new FeatureNotSupportedError(
			`The account ${account.address} does not support signing and executing transactions.`,
		);
	};
}
