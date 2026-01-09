/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface HashToInputOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function hashToInput(options: HashToInputOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vdf',
			function: 'hash_to_input',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface VdfVerifyOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number | bigint>,
	];
}
export function vdfVerify(options: VdfVerifyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>', 'u64'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vdf',
			function: 'vdf_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
