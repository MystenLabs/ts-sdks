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
import {
	type Transaction,
	type TransactionResult,
	type TransactionArgument,
} from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/kiosk::floor_price_rule';
export const Rule: MoveStruct<{
	dummy_field: ReturnType<typeof bcs.bool>;
}> = new MoveStruct({
	name: `${$moduleName}::Rule`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const Config: MoveStruct<{
	floor_price: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
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
export function add(options: AddOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [null, null, 'u64'] satisfies (string | null)[];
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
	request: TransactionArgument;
}
export interface ProveOptions {
	package?: string;
	arguments:
		| ProveArguments
		| [policy: RawTransactionArgument<string>, request: TransactionArgument];
	typeArguments: [string];
}
/** Buyer action: Prove that the amount is higher or equal to the floor_price. */
export function prove(options: ProveOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/kiosk';
	const argumentsTypes = [null, null] satisfies (string | null)[];
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
