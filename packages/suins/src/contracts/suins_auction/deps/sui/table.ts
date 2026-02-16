/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A table is a map-like collection. But unlike a traditional collection, it's keys
 * and values are not stored within the `Table` value, but instead are stored using
 * Sui's object system. The `Table` struct acts only as a handle into the object
 * system to retrieve those keys and values. Note that this means that `Table`
 * values with exactly the same key-value mapping will not be equal, with `==`, at
 * runtime. For example
 *
 * ```
 * let table1 = table::new<u64, bool>();
 * let table2 = table::new<u64, bool>();
 * table::add(&mut table1, 0, false);
 * table::add(&mut table1, 1, true);
 * table::add(&mut table2, 0, false);
 * table::add(&mut table2, 1, true);
 * // table1 does not equal table2, despite having the same entries
 * assert!(&table1 != &table2);
 * ```
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::table';
export const Table = new MoveStruct({
	name: `${$moduleName}::Table<phantom K, phantom V>`,
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
			module: 'table',
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
 * Adds a key-value pair to the table `table: &mut Table<K, V>` Aborts with
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
			module: 'table',
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
 * `table: &Table<K, V>`. Aborts with `sui::dynamic_field::EFieldDoesNotExist` if
 * the table does not have an entry with that key `k: K`.
 */
export function borrow<K extends BcsType<any>>(options: BorrowOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table',
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
 * `table: &mut Table<K, V>`. Aborts with `sui::dynamic_field::EFieldDoesNotExist`
 * if the table does not have an entry with that key `k: K`.
 */
export function borrowMut<K extends BcsType<any>>(options: BorrowMutOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table',
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
 * Removes the key-value pair in the table `table: &mut Table<K, V>` and returns
 * the value. Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table
 * does not have an entry with that key `k: K`.
 */
export function remove<K extends BcsType<any>>(options: RemoveOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table',
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
 * `table: &Table<K, V>`
 */
export function contains<K extends BcsType<any>>(options: ContainsOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table',
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
			module: 'table',
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
			module: 'table',
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
			module: 'table',
			function: 'destroy_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DropArguments {
	table: RawTransactionArgument<string>;
}
export interface DropOptions {
	package: string;
	arguments: DropArguments | [table: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Drop a possibly non-empty table. Usable only if the value type `V` has the
 * `drop` ability
 */
export function drop(options: DropOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['table'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table',
			function: 'drop',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
