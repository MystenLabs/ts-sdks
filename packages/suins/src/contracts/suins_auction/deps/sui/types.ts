/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Sui types helpers and utilities */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
import { type BcsType } from '@mysten/sui/bcs';
export interface IsOneTimeWitnessArguments<T extends BcsType<any>> {
	_: RawTransactionArgument<T>;
}
export interface IsOneTimeWitnessOptions<T extends BcsType<any>> {
	package: string;
	arguments: IsOneTimeWitnessArguments<T> | [_: RawTransactionArgument<T>];
	typeArguments: [string];
}
/**
 * Tests if the argument type is a one-time witness, that is a type with only one
 * instantiation across the entire code base.
 */
export function isOneTimeWitness<T extends BcsType<any>>(options: IsOneTimeWitnessOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['_'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'types',
			function: 'is_one_time_witness',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
