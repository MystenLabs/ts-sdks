// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';

import type { ObjectArgument } from '../types/index.js';
import * as transferPolicy from '../contracts/0x2/transfer_policy.js';

/**
 * Call the `transfer_policy::new` function to create a new transfer policy.
 * Returns `transferPolicyCap`
 */
export function createTransferPolicy(
	tx: Transaction,
	itemType: string,
	publisher: ObjectArgument,
): TransactionObjectArgument {
	const [policy, policyCap] = tx.add(
		transferPolicy._new({
			arguments: [publisher],
			typeArguments: [itemType],
		}),
	);

	tx.moveCall({
		target: '0x2::transfer::public_share_object',
		arguments: [policy],
		typeArguments: [`0x2::transfer_policy::TransferPolicy<${itemType}>`],
	});

	return policyCap;
}

/**
 * Call the `transfer_policy::withdraw` function to withdraw profits from a transfer policy.
 */
export function withdrawFromPolicy(
	tx: Transaction,
	itemType: string,
	policy: ObjectArgument,
	policyCap: ObjectArgument,
	amount?: string | bigint | null,
): TransactionObjectArgument {
	// Convert string to bigint if needed for the generated function
	const amountArg: bigint | null = amount
		? typeof amount === 'string'
			? BigInt(amount)
			: amount
		: null;

	const [profits] = tx.add(
		transferPolicy.withdraw({
			arguments: [policy, policyCap, amountArg],
			typeArguments: [itemType],
		}),
	);

	return profits;
}

/**
 * Remove a rule from a transfer policy.
 */
export function removeTransferPolicyRule(
	tx: Transaction,
	itemType: string,
	ruleType: string,
	configType: string,
	policy: ObjectArgument,
	policyCap: ObjectArgument,
) {
	tx.add(
		transferPolicy.removeRule({
			arguments: [policy, policyCap],
			typeArguments: [itemType, ruleType, configType],
		}),
	);
}
