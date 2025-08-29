// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type {
	Transaction,
	TransactionArgument,
	TransactionObjectArgument,
} from '@mysten/sui/transactions';

import type { ObjectArgument } from '../types/index.js';
import { TRANSFER_POLICY_MODULE, TRANSFER_POLICY_TYPE } from '../types/index.js';

export interface CreateTransferPolicyParams {
	itemType: string;
	publisher: ObjectArgument;
}

/**
 * Call the `transfer_policy::new` function to create a new transfer policy.
 * Returns `transferPolicyCap`
 */
export function createTransferPolicy({ itemType, publisher }: CreateTransferPolicyParams) {
	return (tx: Transaction) => {
		const [transferPolicy, transferPolicyCap] = tx.add(
			createTransferPolicyWithoutSharing({
				itemType,
				publisher,
			}),
		);

		tx.add(
			shareTransferPolicy({
				itemType,
				transferPolicy,
			}),
		);

		return transferPolicyCap;
	};
}

export interface CreateTransferPolicyWithoutSharingParams {
	itemType: string;
	publisher: ObjectArgument;
}

/**
 * Creates a transfer Policy and returns both the Policy and the Cap.
 * Used if we want to use the policy before making it a shared object.
 */
export function createTransferPolicyWithoutSharing({
	itemType,
	publisher,
}: CreateTransferPolicyWithoutSharingParams) {
	return (tx: Transaction) => {
		const [transferPolicy, transferPolicyCap] = tx.moveCall({
			target: `${TRANSFER_POLICY_MODULE}::new`,
			typeArguments: [itemType],
			arguments: [tx.object(publisher)],
		});

		return [transferPolicy, transferPolicyCap] as const;
	};
}

export interface ShareTransferPolicyParams {
	itemType: string;
	transferPolicy: TransactionObjectArgument;
}

/**
 * Converts Transfer Policy to a shared object.
 */
export function shareTransferPolicy({ itemType, transferPolicy }: ShareTransferPolicyParams) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: `0x2::transfer::public_share_object`,
			typeArguments: [`${TRANSFER_POLICY_TYPE}<${itemType}>`],
			arguments: [tx.object(transferPolicy)],
		});
	};
}

export interface WithdrawFromPolicyParams {
	itemType: string;
	policy: ObjectArgument;
	policyCap: ObjectArgument;
	amount?: string | bigint | null;
}

/**
 * Call the `transfer_policy::withdraw` function to withdraw profits from a transfer policy.
 */
export function withdrawFromPolicy({
	itemType,
	policy,
	policyCap,
	amount,
}: WithdrawFromPolicyParams) {
	return (tx: Transaction) => {
		const amountArg = bcs.option(bcs.u64()).serialize(amount);

		const [profits] = tx.moveCall({
			target: `${TRANSFER_POLICY_MODULE}::withdraw`,
			typeArguments: [itemType],
			arguments: [tx.object(policy), tx.object(policyCap), amountArg],
		});

		return profits;
	};
}

export interface ConfirmRequestParams {
	itemType: string;
	policy: ObjectArgument;
	request: TransactionArgument;
}

/**
 * Call the `transfer_policy::confirm_request` function to unblock the
 * transaction.
 */
export function confirmRequest({ itemType, policy, request }: ConfirmRequestParams) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: `${TRANSFER_POLICY_MODULE}::confirm_request`,
			typeArguments: [itemType],
			arguments: [tx.object(policy), request],
		});
	};
}

export interface RemoveTransferPolicyRuleParams {
	itemType: string;
	ruleType: string;
	configType: string;
	policy: ObjectArgument;
	policyCap: ObjectArgument;
}

/**
 * Calls the `transfer_policy::remove_rule` function to remove a Rule from the transfer policy's ruleset.
 */
export function removeTransferPolicyRule({
	itemType,
	ruleType,
	configType,
	policy,
	policyCap,
}: RemoveTransferPolicyRuleParams) {
	return (tx: Transaction) => {
		tx.moveCall({
			target: `${TRANSFER_POLICY_MODULE}::remove_rule`,
			typeArguments: [itemType, ruleType, configType],
			arguments: [tx.object(policy), tx.object(policyCap)],
		});
	};
}
