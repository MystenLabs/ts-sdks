/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::sui';
export const SUI = new MoveStruct({
	name: `${$moduleName}::SUI`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface TransferOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function transfer(options: TransferOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::coin::Coin<${packageAddress}::sui::SUI>`,
		'address',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'sui',
			function: 'transfer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
