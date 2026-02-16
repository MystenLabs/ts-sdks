/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Similar to `sui::table`, an `ObjectTable<K, V>` is a map-like collection. But
 * unlike `sui::table`, the values bound to these dynamic fields _must_ be objects
 * themselves. This allows for the objects to still exist within in storage, which
 * may be important for external tools. The difference is otherwise not observable
 * from within Move.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::object_table';
export const ObjectTable = new MoveStruct({
	name: `${$moduleName}::ObjectTable<phantom K, phantom V>`,
	fields: {
		/** the ID of this table */
		id: bcs.Address,
		/** the number of key-value pairs in the table */
		size: bcs.u64(),
	},
});
export interface NewOptions {
	package: string;
	arguments?: [];
	typeArguments: [string, string];
}
/** Creates a new, empty table */
export function _new(options: NewOptions) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'new',
			typeArguments: options.typeArguments,
		});
}
export interface AddArguments<K extends BcsType<any>, V extends BcsType<any>> {
	table: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
	v: RawTransactionArgument<V>;
}
export interface AddOptions<K extends BcsType<any>, V extends BcsType<any>> {
	package: string;
	arguments:
		| AddArguments<K, V>
		| [
				table: RawTransactionArgument<string>,
				k: RawTransactionArgument<K>,
				v: RawTransactionArgument<V>,
		  ];
	typeArguments: [string, string];
}
/**
 * Adds a key-value pair to the table `table: &mut ObjectTable<K, V>` Aborts with
 * `sui::dynamic_field::EFieldAlreadyExists` if the table already has an entry with
 * that key `k: K`.
 */
export function add<K extends BcsType<any>, V extends BcsType<any>>(options: AddOptions<K, V>) {
	const packageAddress = options.package;
	const argumentsTypes = [
		null,
		`${options.typeArguments[0]}`,
		`${options.typeArguments[1]}`,
	] satisfies (string | null)[];
	const parameterNames = ['table', 'k', 'v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowArguments<K extends BcsType<any>> {
	table: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface BorrowOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| BorrowArguments<K>
		| [table: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Immutable borrows the value associated with the key in the table
 * `table: &ObjectTable<K, V>`. Aborts with
 * `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry
 * with that key `k: K`.
 */
export function borrow<K extends BcsType<any>>(options: BorrowOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowMutArguments<K extends BcsType<any>> {
	table: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface BorrowMutOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| BorrowMutArguments<K>
		| [table: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Mutably borrows the value associated with the key in the table
 * `table: &mut ObjectTable<K, V>`. Aborts with
 * `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry
 * with that key `k: K`.
 */
export function borrowMut<K extends BcsType<any>>(options: BorrowMutOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveArguments<K extends BcsType<any>> {
	table: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface RemoveOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| RemoveArguments<K>
		| [table: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Removes the key-value pair in the table `table: &mut ObjectTable<K, V>` and
 * returns the value. Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the
 * table does not have an entry with that key `k: K`.
 */
export function remove<K extends BcsType<any>>(options: RemoveOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ContainsArguments<K extends BcsType<any>> {
	table: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface ContainsOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| ContainsArguments<K>
		| [table: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Returns true if there is a value associated with the key `k: K` in table
 * `table: &ObjectTable<K, V>`
 */
export function contains<K extends BcsType<any>>(options: ContainsOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LengthArguments {
	table: RawTransactionArgument<string>;
}
export interface LengthOptions {
	package: string;
	arguments: LengthArguments | [table: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Returns the size of the table, the number of key-value pairs */
export function length(options: LengthOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['table'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsEmptyArguments {
	table: RawTransactionArgument<string>;
}
export interface IsEmptyOptions {
	package: string;
	arguments: IsEmptyArguments | [table: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Returns true if the table is empty (if `length` returns `0`) */
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['table'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyEmptyArguments {
	table: RawTransactionArgument<string>;
}
export interface DestroyEmptyOptions {
	package: string;
	arguments: DestroyEmptyArguments | [table: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Destroys an empty table Aborts with `ETableNotEmpty` if the table still contains
 * values
 */
export function destroyEmpty(options: DestroyEmptyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['table'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'destroy_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ValueIdArguments<K extends BcsType<any>> {
	table: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface ValueIdOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| ValueIdArguments<K>
		| [table: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Returns the ID of the object associated with the key if the table has an entry
 * with key `k: K` Returns none otherwise
 */
export function valueId<K extends BcsType<any>>(options: ValueIdOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'value_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
