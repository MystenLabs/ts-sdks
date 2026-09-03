// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { TransactionDataBuilder } from './TransactionData.js';
import type { BuildTransactionOptions } from './resolve.js';

// An inferred empty payment is indistinguishable from an explicit one in transaction data. Keep
// non-serialized provenance so repeated preparation of the same transaction remains idempotent.
const assumedGasPayments = new WeakSet<TransactionDataBuilder>();

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
		assumedGasPayments.add(transactionData);
		return true;
	}

	return false;
}

export function hasAssumedGasPayment(transactionData: TransactionDataBuilder) {
	const hasAssumedPayment =
		assumedGasPayments.has(transactionData) && transactionData.gasData.payment?.length === 0;
	if (!hasAssumedPayment) {
		assumedGasPayments.delete(transactionData);
	}
	return hasAssumedPayment;
}

export function clearAssumedGasPayment(transactionData: TransactionDataBuilder) {
	assumedGasPayments.delete(transactionData);
}
