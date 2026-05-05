/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A base module that holds a shared object for the configuration of the package
 * and exports some package utilities for the 2 systems to use.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionResult } from '@mysten/sui/transactions';
const $moduleName = '@suins/discounts::house';
export const DiscountHouse: MoveStruct<{
	id: typeof bcs.Address;
	version: ReturnType<typeof bcs.u8>;
}> = new MoveStruct({
	name: `${$moduleName}::DiscountHouse`,
	fields: {
		id: bcs.Address,
		version: bcs.u8(),
	},
});
export interface SetVersionArguments {
	self: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
	version: RawTransactionArgument<number>;
}
export interface SetVersionOptions {
	package?: string;
	arguments:
		| SetVersionArguments
		| [
				self: RawTransactionArgument<string>,
				_: RawTransactionArgument<string>,
				version: RawTransactionArgument<number>,
		  ];
}
export function setVersion(options: SetVersionOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [null, null, 'u8'] satisfies (string | null)[];
	const parameterNames = ['self', '_', 'version'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'house',
			function: 'set_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
