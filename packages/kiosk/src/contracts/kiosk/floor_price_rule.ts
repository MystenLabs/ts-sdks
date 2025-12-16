/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Description: This module defines a Rule which sets the floor price for items of
 * type T.
 *
 * Configuration:
 *
 * - floor_price - the floor price in MIST.
 *
 * Use cases:
 *
 * - Defining a floor price for all trades of type T.
 * - Prevent trading of locked items with low amounts (e.g. by using purchase_cap).
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/kiosk::floor_price_rule';
export const Rule = new MoveStruct({
	name: `${$moduleName}::Rule`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const Config = new MoveStruct({
	name: `${$moduleName}::Config`,
	fields: {
		floor_price: bcs.u64(),
	},
});
export interface AddArguments {
	policy: RawTransactionArgument<string>;
	cap: RawTransactionArgument<string>;
	floorPrice: RawTransactionArgument<number | bigint>;
}
export interface AddOptions {
	package?: string;
	arguments:
		| AddArguments
		| [
				policy: RawTransactionArgument<string>,
				cap: RawTransactionArgument<string>,
				floorPrice: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Creator action: Add the Floor Price Rule for the `T`. Pass in the
 * `TransferPolicy`, `TransferPolicyCap` and `floor_price`.
 */
export function add(options: AddOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferPolicy<${options.typeArguments[0]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferPolicyCap<${options.typeArguments[0]}>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['policy', 'cap', 'floorPrice'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'floor_price_rule',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ProveArguments {
	policy: RawTransactionArgument<string>;
	request: RawTransactionArgument<string>;
}
export interface ProveOptions {
	package?: string;
	arguments:
		| ProveArguments
		| [policy: RawTransactionArgument<string>, request: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Buyer action: Prove that the amount is higher or equal to the floor_price. */
export function prove(options: ProveOptions) {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferPolicy<${options.typeArguments[0]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::transfer_policy::TransferRequest<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['policy', 'request'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'floor_price_rule',
			function: 'prove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
