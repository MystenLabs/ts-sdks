/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface EcvrfVerifyOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
	];
}
export function ecvrfVerify(options: EcvrfVerifyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
		'vector<u8>',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecvrf',
			function: 'ecvrf_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
