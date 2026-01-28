/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface Blake2b256Options {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function blake2b256(options: Blake2b256Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hash',
			function: 'blake2b256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface Keccak256Options {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function keccak256(options: Keccak256Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hash',
			function: 'keccak256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
