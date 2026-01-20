/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface IsProofValidOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<number[]>,
	];
}
export function isProofValid(options: IsProofValidOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, null, 'vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'merkle_tree',
			function: 'is_proof_valid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ConstructProofsOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[][]>, RawTransactionArgument<number>];
}
export function constructProofs(options: ConstructProofsOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = ['vector<vector<u8>>', 'u8'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'merkle_tree',
			function: 'construct_proofs',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
