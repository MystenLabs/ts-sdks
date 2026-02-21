/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Utility for converting a Move value to its binary representation in BCS (Binary
 * Canonical Serialization). BCS is the binary encoding for Move resources and
 * other non-module values published on-chain. See
 * https://github.com/diem/bcs#binary-canonical-serialization-bcs for more details
 * on BCS.
 */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type BcsType } from '@mysten/sui/bcs';
export interface ToBytesArguments<MoveValue extends BcsType<any>> {
	v: RawTransactionArgument<MoveValue>;
}
export interface ToBytesOptions<MoveValue extends BcsType<any>> {
	package?: string;
	arguments: ToBytesArguments<MoveValue> | [v: RawTransactionArgument<MoveValue>];
	typeArguments: [string];
}
/**
 * Return the binary representation of `v` in BCS (Binary Canonical Serialization)
 * format
 */
export function toBytes<MoveValue extends BcsType<any>>(options: ToBytesOptions<MoveValue>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
