/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Description: This module defines a Rule which forces buyers to put the purchased
 * item into the Kiosk and lock it. The most common use case for the Rule is making
 * sure an item never leaves Kiosks and has policies enforced on every transfer.
 *
 * Configuration:
 *
 * - None
 *
 * Use cases:
 *
 * - Enforcing policies on every trade
 * - Making sure an item never leaves the Kiosk / certain ecosystem
 *
 * Notes:
 *
 * - "locking" mechanic disallows the `kiosk::take` function and forces the owner
 *   to use `list` or `list_with_purchase_cap` methods if they wish to move the
 *   item somewhere else.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/kiosk::kiosk_lock_rule';
export const Rule = new MoveStruct({
	name: `${$moduleName}::Rule`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const Config = new MoveStruct({
	name: `${$moduleName}::Config`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface AddArguments {
	policy: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
}
export interface AddOptions {
	package?: string;
	arguments:
		| AddArguments
		| [policy: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Creator: Adds a `kiosk_lock_rule` Rule to the `TransferPolicy` forcing buyers to
 * lock the item in a Kiosk on purchase.
 */
export function add(options: AddOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['policy', 'cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_lock_rule',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ProveArguments {
	request: RawTransactionArgument<string>;
	kiosk: RawTransactionArgument<string>;
}
export interface ProveOptions {
	package?: string;
	arguments:
		| ProveArguments
		| [request: RawTransactionArgument<string>, kiosk: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Buyer: Prove the item was locked in the Kiosk to get the receipt and unblock the
 * transfer request confirmation.
 */
export function prove(options: ProveOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['request', 'kiosk'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'kiosk_lock_rule',
			function: 'prove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
