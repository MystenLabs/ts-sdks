// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	extractStatusFromEffectsBcs,
	parseTransactionDataBcs,
	parseTransactionEffectsBcs,
	type SuiClientTypes,
} from '@mysten/sui/client';

export type TransactionResultWithEffects = SuiClientTypes.TransactionResult<{
	effects: true;
	transaction: true;
	bcs: true;
}>;

export function buildTransactionResult(
	digest: string,
	signature: string,
	transactionBytes: Uint8Array,
	effectsBytes: Uint8Array,
): TransactionResultWithEffects {
	const status = extractStatusFromEffectsBcs(effectsBytes);

	let effects: SuiClientTypes.TransactionEffects | null = null;
	try {
		effects = parseTransactionEffectsBcs(effectsBytes);
	} catch {
		console.warn(
			'Parsing transaction effects failed, you may need to update the SDK to pickup the latest bcs types',
		);
	}

	let transaction: SuiClientTypes.TransactionData;
	try {
		transaction = parseTransactionDataBcs(transactionBytes);
	} catch (error) {
		throw new Error(
			'Failed to parse the transaction data returned by the wallet, you may need to update the SDK to pick up the latest bcs types',
			{ cause: error },
		);
	}

	if (!transaction.sender) {
		throw new Error('The transaction data returned by the wallet has no sender');
	}

	const txResult: SuiClientTypes.Transaction<{ effects: true; transaction: true; bcs: true }> = {
		digest,
		sender: transaction.sender,
		signatures: [signature],
		epoch: null,
		timestampMs: null,
		checkpoint: null,
		status,
		effects: effects as SuiClientTypes.TransactionEffects,
		transaction,
		balanceChanges: undefined,
		events: undefined,
		objectTypes: undefined,
		bcs: transactionBytes,
	};

	return status.success
		? { $kind: 'Transaction', Transaction: txResult }
		: { $kind: 'FailedTransaction', FailedTransaction: txResult };
}
