/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A base module that holds a shared object for the configuration of the package
 * and exports some package utilities for the 2 systems to use.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
	type ConfigValue,
	resolveConfigArgument,
	applyConfigArguments,
} from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/discounts::house';
export const DiscountHouse = new MoveStruct({
	name: `${$moduleName}::DiscountHouse`,
	fields: {
		id: bcs.Address,
		version: bcs.u8(),
	},
});
export interface SetVersionArguments {
	self?: RawTransactionArgument<string>;
	_: RawTransactionArgument<string>;
	version: RawTransactionArgument<number>;
}
export interface SetVersionOptions {
	package?: string;
	arguments:
		| SetVersionArguments
		| [
				self: RawTransactionArgument<string> | undefined,
				_: RawTransactionArgument<string>,
				version: RawTransactionArgument<number>,
		  ];
	config?: {
		discountHouseId: ConfigValue;
		packageId?: string;
	};
}
export function setVersion(options: SetVersionOptions) {
	const packageAddress = options.package ?? options.config?.packageId ?? '@suins/discounts';
	const argumentsTypes = [null, null, 'u8'] satisfies (string | null)[];
	const parameterNames = ['self', '_', 'version'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'house',
			function: 'set_version',
			arguments: normalizeMoveArguments(
				applyConfigArguments(options.arguments, [
					{
						index: 0,
						name: 'self',
						resolve: () =>
							resolveConfigArgument(
								options.config?.discountHouseId,
								{
									typeArguments: [],
									packageAddress,
									moduleName: 'house',
									functionName: 'set_version',
									parameterIndex: 0,
									parameterName: 'self',
								},
								'discountHouseId',
							),
					},
				]),
				argumentsTypes,
				parameterNames,
			),
		});
}
