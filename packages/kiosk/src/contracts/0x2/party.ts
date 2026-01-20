/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_map from './vec_map.js';
const $moduleName = '0x2::party';
export const Permissions = new MoveStruct({
	name: `${$moduleName}::Permissions`,
	fields: {
		pos0: bcs.u64(),
	},
});
export const Party = new MoveStruct({
	name: `${$moduleName}::Party`,
	fields: {
		default: Permissions,
		members: vec_map.VecMap(bcs.Address, Permissions),
	},
});
export interface SingleOwnerOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function singleOwner(options: SingleOwnerOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['address'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'party',
			function: 'single_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
