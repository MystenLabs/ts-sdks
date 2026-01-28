// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	extractStatusFromEffectsBcs,
	parseTransactionBcs,
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

	const txResult: SuiClientTypes.Transaction<{ effects: true; transaction: true; bcs: true }> = {
		digest,
		signatures: [signature],
		epoch: null,
		status,
		effects: effects as SuiClientTypes.TransactionEffects,
		transaction: parseTransactionBcs(transactionBytes),
		balanceChanges: undefined,
		events: undefined,
		objectTypes: undefined,
		bcs: transactionBytes,
	};

	return status.success
		? { $kind: 'Transaction', Transaction: txResult }
		: { $kind: 'FailedTransaction', FailedTransaction: txResult };
}
