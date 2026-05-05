/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import {
	type Transaction,
	type TransactionResult,
	type TransactionArgument,
} from '@mysten/sui/transactions';
const $moduleName = '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::migrate';
export const MigrateComplete: MoveStruct<{
	package: typeof bcs.Address;
}> = new MoveStruct({
	name: `${$moduleName}::MigrateComplete`,
	fields: {
		package: bcs.Address,
	},
});
export interface MigrateOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, TransactionArgument];
}
export function migrate(options: MigrateOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'migrate',
			function: 'migrate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
