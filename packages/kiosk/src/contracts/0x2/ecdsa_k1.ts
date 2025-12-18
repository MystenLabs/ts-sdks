/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface Secp256k1EcrecoverOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number>,
	];
}
export function secp256k1Ecrecover(options: Secp256k1EcrecoverOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'u8'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecdsa_k1',
			function: 'secp256k1_ecrecover',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DecompressPubkeyOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function decompressPubkey(options: DecompressPubkeyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecdsa_k1',
			function: 'decompress_pubkey',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface Secp256k1VerifyOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number>,
	];
}
export function secp256k1Verify(options: Secp256k1VerifyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>', 'u8'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecdsa_k1',
			function: 'secp256k1_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
