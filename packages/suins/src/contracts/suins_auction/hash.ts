/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Module which defines SHA hashes for byte vectors.
 *
 * The functions in this module are natively declared both in the Move runtime as
 * in the Move prover's prelude.
 */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface Sha2_256Arguments {
	data: RawTransactionArgument<number[]>;
}
export interface Sha2_256Options {
	package?: string;
	arguments: Sha2_256Arguments | [data: RawTransactionArgument<number[]>];
}
export function sha2_256(options: Sha2_256Options) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['data'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hash',
			function: 'sha2_256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface Sha3_256Arguments {
	data: RawTransactionArgument<number[]>;
}
export interface Sha3_256Options {
	package?: string;
	arguments: Sha3_256Arguments | [data: RawTransactionArgument<number[]>];
}
export function sha3_256(options: Sha3_256Options) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['data'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hash',
			function: 'sha3_256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
