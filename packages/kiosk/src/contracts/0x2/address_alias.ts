/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_set from './vec_set.js';
const $moduleName = '0x2::address_alias';
export const AddressAliasState = new MoveStruct({
	name: `${$moduleName}::AddressAliasState`,
	fields: {
		id: bcs.Address,
		version: bcs.u64(),
	},
});
export const AddressAliases = new MoveStruct({
	name: `${$moduleName}::AddressAliases`,
	fields: {
		id: bcs.Address,
		aliases: vec_set.VecSet(bcs.Address),
	},
});
export const AliasKey = new MoveStruct({
	name: `${$moduleName}::AliasKey`,
	fields: {
		pos0: bcs.Address,
	},
});
export interface EnableOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function enable(options: EnableOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address_alias',
			function: 'enable',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface AddOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function add(options: AddOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address_alias',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ReplaceAllOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string[]>];
}
export function replaceAll(options: ReplaceAllOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, 'vector<address>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address_alias',
			function: 'replace_all',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface RemoveOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function remove(options: RemoveOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, 'address'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address_alias',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
