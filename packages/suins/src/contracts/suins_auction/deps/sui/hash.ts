/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Module which defines hash functions. Note that Sha-256 and Sha3-256 is available
 * in the std::hash module in the standard library.
 */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface Blake2b256Arguments {
	data: RawTransactionArgument<number[]>;
}
export interface Blake2b256Options {
	package: string;
	arguments: Blake2b256Arguments | [data: RawTransactionArgument<number[]>];
}
/**
 * @param data: Arbitrary binary data to hash Hash the input bytes using
 * Blake2b-256 and returns 32 bytes.
 */
export function blake2b256(options: Blake2b256Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['data'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hash',
			function: 'blake2b256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface Keccak256Arguments {
	data: RawTransactionArgument<number[]>;
}
export interface Keccak256Options {
	package: string;
	arguments: Keccak256Arguments | [data: RawTransactionArgument<number[]>];
}
/**
 * @param data: Arbitrary binary data to hash Hash the input bytes using keccak256
 * and returns 32 bytes.
 */
export function keccak256(options: Keccak256Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['data'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hash',
			function: 'keccak256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
