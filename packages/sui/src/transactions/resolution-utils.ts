// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionDataBuilder } from './TransactionData.js';

export function transactionUsesGasCoin(transactionData: TransactionDataBuilder) {
	let usesGasCoin = false;

	transactionData.mapArguments((arg) => {
		if (arg.$kind === 'GasCoin') {
			usesGasCoin = true;
		}

		return arg;
	});

	return usesGasCoin;
}

export function hasPotentialReplayProtection(transactionData: TransactionDataBuilder) {
	// ImmOrOwnedObject refs don't say whether the object is owned or immutable, so this is a best
	// guess. Execution rejects the transaction if none of them turn out to be owned.
	return transactionData.inputs.some((input) => input.Object?.ImmOrOwnedObject);
}
