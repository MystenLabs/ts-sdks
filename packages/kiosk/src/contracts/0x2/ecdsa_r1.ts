/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface Secp256r1EcrecoverOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number>,
	];
}
export function secp256r1Ecrecover(options: Secp256r1EcrecoverOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'u8'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecdsa_r1',
			function: 'secp256r1_ecrecover',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface Secp256r1VerifyOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number>,
	];
}
export function secp256r1Verify(options: Secp256r1VerifyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>', 'u8'] satisfies (
		| string
		| null
	)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecdsa_r1',
			function: 'secp256r1_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
