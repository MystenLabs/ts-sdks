/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface PoseidonBn254Options {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint[]>];
}
export function poseidonBn254(options: PoseidonBn254Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u256>'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'poseidon',
			function: 'poseidon_bn254',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
