/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface Ed25519VerifyOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
	];
}
export function ed25519Verify(options: Ed25519VerifyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ed25519',
			function: 'ed25519_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
