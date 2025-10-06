// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { operationType } from '@mysten/wallet-sdk';
import * as counterContract from '../../contracts/counter/counter.js';

interface CounterTransactionParams {
	senderAddress: string;
}

interface IncrementCounterParams extends CounterTransactionParams {
	counterId: string;
}

interface ResetCounterParams extends CounterTransactionParams {
	counterId: string;
	newValue: number;
}

/**
 * Creates a transaction to create a new counter
 */
export function createCounterTransaction({ senderAddress }: CounterTransactionParams): Transaction {
	const tx = new Transaction();

	// Add auto-approval intent for rule set selection
	tx.add(operationType('counter-operations', 'Create counter'));

	tx.setSenderIfNotSet(senderAddress);

	// Use the generated type-safe create function
	tx.add(counterContract.create());

	return tx;
}

/**
 * Creates a transaction to increment a counter by 1
 */
export function incrementCounterTransaction({
	senderAddress,
	counterId,
}: IncrementCounterParams): Transaction {
	const tx = new Transaction();

	// Add auto-approval intent for rule set selection
	tx.add(operationType('counter-operations', 'Increment counter'));

	tx.setSenderIfNotSet(senderAddress);

	// Use the generated type-safe increment function
	tx.add(
		counterContract.increment({
			arguments: {
				counter: counterId,
			},
		}),
	);

	return tx;
}

/**
 * Creates a transaction to reset a counter to a specific value
 */
export function resetCounterTransaction({
	senderAddress,
	counterId,
	newValue,
}: ResetCounterParams): Transaction {
	const tx = new Transaction();

	// Add auto-approval intent for rule set selection
	tx.add(operationType('counter-operations', 'Reset counter'));

	tx.setSenderIfNotSet(senderAddress);

	// Use the generated type-safe setValue function
	tx.add(
		counterContract.setValue({
			arguments: {
				counter: counterId,
				value: newValue,
			},
		}),
	);

	return tx;
}
