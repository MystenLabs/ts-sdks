/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface EncodeOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function encode(options: EncodeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hex',
			function: 'encode',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DecodeOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function decode(options: DecodeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hex',
			function: 'decode',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
