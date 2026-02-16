/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Similar to `sui::table` but the values are linked together, allowing for ordered
 * insertion and removal
 */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::linked_table';
export function LinkedTable<K extends BcsType<any>>(...typeParameters: [K]) {
	return new MoveStruct({
		name: `${$moduleName}::LinkedTable<${typeParameters[0].name as K['name']}, phantom V>`,
		fields: {
			/** the ID of this table */
			id: bcs.Address,
			/** the number of key-value pairs in the table */
			size: bcs.u64(),
			/** the front of the table, i.e. the key of the first entry */
			head: bcs.option(typeParameters[0]),
			/** the back of the table, i.e. the key of the last entry */
			tail: bcs.option(typeParameters[0]),
		},
	});
}
export function Node<K extends BcsType<any>, V extends BcsType<any>>(...typeParameters: [K, V]) {
	return new MoveStruct({
		name: `${$moduleName}::Node<${typeParameters[0].name as K['name']}, ${typeParameters[1].name as V['name']}>`,
		fields: {
			/** the previous key */
			prev: bcs.option(typeParameters[0]),
			/** the next key */
			next: bcs.option(typeParameters[0]),
			/** the value being stored */
			value: typeParameters[1],
		},
	});
}
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
			module: 'linked_table',
			function: 'new',
			typeArguments: options.typeArguments,
		});
}
export interface FrontArguments {
	table: RawTransactionArgument<string>;
}
export interface FrontOptions {
	package: string;
	arguments: FrontArguments | [table: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Returns the key for the first element in the table, or None if the table is
 * empty
 */
export function front(options: FrontOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['table'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'front',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BackArguments {
	table: RawTransactionArgument<string>;
}
export interface BackOptions {
	package: string;
	arguments: BackArguments | [table: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Returns the key for the last element in the table, or None if the table is empty */
export function back(options: BackOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['table'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'back',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PushFrontArguments<K extends BcsType<any>, V extends BcsType<any>> {
	table: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
	value: RawTransactionArgument<V>;
}
export interface PushFrontOptions<K extends BcsType<any>, V extends BcsType<any>> {
	package: string;
	arguments:
		| PushFrontArguments<K, V>
		| [
				table: RawTransactionArgument<string>,
				k: RawTransactionArgument<K>,
				value: RawTransactionArgument<V>,
		  ];
	typeArguments: [string, string];
}
/**
 * Inserts a key-value pair at the front of the table, i.e. the newly inserted pair
 * will be the first element in the table Aborts with
 * `sui::dynamic_field::EFieldAlreadyExists` if the table already has an entry with
 * that key `k: K`.
 */
export function pushFront<K extends BcsType<any>, V extends BcsType<any>>(
	options: PushFrontOptions<K, V>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		null,
		`${options.typeArguments[0]}`,
		`${options.typeArguments[1]}`,
	] satisfies (string | null)[];
	const parameterNames = ['table', 'k', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'push_front',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PushBackArguments<K extends BcsType<any>, V extends BcsType<any>> {
	table: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
	value: RawTransactionArgument<V>;
}
export interface PushBackOptions<K extends BcsType<any>, V extends BcsType<any>> {
	package: string;
	arguments:
		| PushBackArguments<K, V>
		| [
				table: RawTransactionArgument<string>,
				k: RawTransactionArgument<K>,
				value: RawTransactionArgument<V>,
		  ];
	typeArguments: [string, string];
}
/**
 * Inserts a key-value pair at the back of the table, i.e. the newly inserted pair
 * will be the last element in the table Aborts with
 * `sui::dynamic_field::EFieldAlreadyExists` if the table already has an entry with
 * that key `k: K`.
 */
export function pushBack<K extends BcsType<any>, V extends BcsType<any>>(
	options: PushBackOptions<K, V>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		null,
		`${options.typeArguments[0]}`,
		`${options.typeArguments[1]}`,
	] satisfies (string | null)[];
	const parameterNames = ['table', 'k', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'push_back',
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
 * `table: &LinkedTable<K, V>`. Aborts with
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
			module: 'linked_table',
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
 * `table: &mut LinkedTable<K, V>`. Aborts with
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
			module: 'linked_table',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PrevArguments<K extends BcsType<any>> {
	table: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface PrevOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| PrevArguments<K>
		| [table: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Borrows the key for the previous entry of the specified key `k: K` in the table
 * `table: &LinkedTable<K, V>`. Returns None if the entry does not have a
 * predecessor. Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table
 * does not have an entry with that key `k: K`
 */
export function prev<K extends BcsType<any>>(options: PrevOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'prev',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NextArguments<K extends BcsType<any>> {
	table: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface NextOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| NextArguments<K>
		| [table: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Borrows the key for the next entry of the specified key `k: K` in the table
 * `table: &LinkedTable<K, V>`. Returns None if the entry does not have a
 * predecessor. Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the table
 * does not have an entry with that key `k: K`
 */
export function next<K extends BcsType<any>>(options: NextOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'next',
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
 * Removes the key-value pair in the table `table: &mut LinkedTable<K, V>` and
 * returns the value. This splices the element out of the ordering. Aborts with
 * `sui::dynamic_field::EFieldDoesNotExist` if the table does not have an entry
 * with that key `k: K`. Note: this is also what happens when the table is empty.
 */
export function remove<K extends BcsType<any>>(options: RemoveOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PopFrontArguments {
	table: RawTransactionArgument<string>;
}
export interface PopFrontOptions {
	package: string;
	arguments: PopFrontArguments | [table: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Removes the front of the table `table: &mut LinkedTable<K, V>`, returns the key
 * and value. Aborts with `ETableIsEmpty` if the table is empty
 */
export function popFront(options: PopFrontOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['table'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'pop_front',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PopBackArguments {
	table: RawTransactionArgument<string>;
}
export interface PopBackOptions {
	package: string;
	arguments: PopBackArguments | [table: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Removes the back of the table `table: &mut LinkedTable<K, V>`, returns the key
 * and value. Aborts with `ETableIsEmpty` if the table is empty
 */
export function popBack(options: PopBackOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['table'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'pop_back',
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
 * Returns true iff there is a value associated with the key `k: K` in table
 * `table: &LinkedTable<K, V>`
 */
export function contains<K extends BcsType<any>>(options: ContainsOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['table', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
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
			module: 'linked_table',
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
/** Returns true iff the table is empty (if `length` returns `0`) */
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['table'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
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
			module: 'linked_table',
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
			module: 'linked_table',
			function: 'drop',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
