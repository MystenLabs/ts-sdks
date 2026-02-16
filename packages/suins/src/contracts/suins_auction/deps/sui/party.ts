/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveTuple,
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_map from './vec_map.js';
const $moduleName = '0x2::party';
export const Permissions = new MoveTuple({
	name: `${$moduleName}::Permissions`,
	fields: [bcs.u64()],
});
export const Party = new MoveStruct({
	name: `${$moduleName}::Party`,
	fields: {
		/**
		 * The permissions that apply if no specific permissions are set in the `members`
		 * map.
		 */
		default: Permissions,
		/** The permissions per transaction sender. */
		members: vec_map.VecMap(bcs.Address, Permissions),
	},
});
export interface SingleOwnerArguments {
	owner: RawTransactionArgument<string>;
}
export interface SingleOwnerOptions {
	package: string;
	arguments: SingleOwnerArguments | [owner: RawTransactionArgument<string>];
}
/**
 * Creates a `Party` value with a single "owner" that has all permissions. No other
 * party has any permissions. And there are no default permissions.
 */
export function singleOwner(options: SingleOwnerOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['address'] satisfies (string | null)[];
	const parameterNames = ['owner'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'party',
			function: 'single_owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
