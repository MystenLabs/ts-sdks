// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionDataBuilder } from './TransactionData.js';
import type { BuildTransactionOptions } from './resolve.js';

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
	// ImmOrOwnedObject does not encode whether the object is immutable. The caller can still build
	// offline with a fully resolved reference, but execution will reject the transaction unless at
	// least one of these inputs is actually address-owned.
	return transactionData.inputs.some((input) => input.Object?.ImmOrOwnedObject);
}

export function setAssumedGasPayment(
	transactionData: TransactionDataBuilder,
	options: BuildTransactionOptions,
) {
	if (
		!options.onlyTransactionKind &&
		options.assumeSufficientAddressBalances &&
		transactionData.gasData.payment == null &&
		!transactionUsesGasCoin(transactionData)
	) {
		transactionData.gasData.payment = [];
		return true;
	}

	return false;
}
