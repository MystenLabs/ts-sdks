/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type BcsType } from '@mysten/sui/bcs';
export interface IsOneTimeWitnessOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function isOneTimeWitness<T0 extends BcsType<any>>(options: IsOneTimeWitnessOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'types',
			function: 'is_one_time_witness',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
