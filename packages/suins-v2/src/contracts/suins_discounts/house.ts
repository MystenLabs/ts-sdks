// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A base module that holds a shared object for the configuration of the package
 * and exports some package utilities for the 2 systems to use.
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
const $moduleName = '@suins/discounts::house';
export const DiscountHouse = new MoveStruct(`${$moduleName}::DiscountHouse`, {
	id: object.UID,
	version: bcs.u8(),
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
export function setVersion(options: SetVersionOptions) {
	const packageAddress = options.package ?? '@suins/discounts';
	const argumentsTypes = [
		`${packageAddress}::house::DiscountHouse`,
		`${packageAddress}::suins::AdminCap`,
		'u8',
	] satisfies string[];
	const parameterNames = ['self', '_', 'version'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'house',
			function: 'set_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
