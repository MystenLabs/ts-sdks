/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A bag is a heterogeneous map-like collection. The collection is similar to
 * `sui::table` in that its keys and values are not stored within the `Bag` value,
 * but instead are stored using Sui's object system. The `Bag` struct acts only as
 * a handle into the object system to retrieve those keys and values. Note that
 * this means that `Bag` values with exactly the same key-value mapping will not be
 * equal, with `==`, at runtime. For example
 *
 * ```
 * let bag1 = bag::new();
 * let bag2 = bag::new();
 * bag::add(&mut bag1, 0, false);
 * bag::add(&mut bag1, 1, true);
 * bag::add(&mut bag2, 0, false);
 * bag::add(&mut bag2, 1, true);
 * // bag1 does not equal bag2, despite having the same entries
 * assert!(&bag1 != &bag2);
 * ```
 *
 * At it's core, `sui::bag` is a wrapper around `UID` that allows for access to
 * `sui::dynamic_field` while preventing accidentally stranding field values. A
 * `UID` can be deleted, even if it has dynamic fields associated with it, but a
 * bag, on the other hand, must be empty to be destroyed.
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::bag';
export const Bag = new MoveStruct({
	name: `${$moduleName}::Bag`,
	fields: {
		/** the ID of this bag */
		id: bcs.Address,
		/** the number of key-value pairs in the bag */
		size: bcs.u64(),
	},
});
export interface NewOptions {
	package: string;
	arguments?: [];
}
/** Creates a new, empty bag */
export function _new(options: NewOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'new',
		});
}
export interface AddArguments<K extends BcsType<any>, V extends BcsType<any>> {
	bag: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
	v: RawTransactionArgument<V>;
}
export interface AddOptions<K extends BcsType<any>, V extends BcsType<any>> {
	package: string;
	arguments:
		| AddArguments<K, V>
		| [
				bag: RawTransactionArgument<string>,
				k: RawTransactionArgument<K>,
				v: RawTransactionArgument<V>,
		  ];
	typeArguments: [string, string];
}
/**
 * Adds a key-value pair to the bag `bag: &mut Bag` Aborts with
 * `sui::dynamic_field::EFieldAlreadyExists` if the bag already has an entry with
 * that key `k: K`.
 */
export function add<K extends BcsType<any>, V extends BcsType<any>>(options: AddOptions<K, V>) {
	const packageAddress = options.package;
	const argumentsTypes = [
		null,
		`${options.typeArguments[0]}`,
		`${options.typeArguments[1]}`,
	] satisfies (string | null)[];
	const parameterNames = ['bag', 'k', 'v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowArguments<K extends BcsType<any>> {
	bag: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface BorrowOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| BorrowArguments<K>
		| [bag: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Immutable borrows the value associated with the key in the bag `bag: &Bag`.
 * Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the bag does not have an
 * entry with that key `k: K`. Aborts with `sui::dynamic_field::EFieldTypeMismatch`
 * if the bag has an entry for the key, but the value does not have the specified
 * type.
 */
export function borrow<K extends BcsType<any>>(options: BorrowOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['bag', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowMutArguments<K extends BcsType<any>> {
	bag: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface BorrowMutOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| BorrowMutArguments<K>
		| [bag: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Mutably borrows the value associated with the key in the bag `bag: &mut Bag`.
 * Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the bag does not have an
 * entry with that key `k: K`. Aborts with `sui::dynamic_field::EFieldTypeMismatch`
 * if the bag has an entry for the key, but the value does not have the specified
 * type.
 */
export function borrowMut<K extends BcsType<any>>(options: BorrowMutOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['bag', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveArguments<K extends BcsType<any>> {
	bag: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface RemoveOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| RemoveArguments<K>
		| [bag: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Mutably borrows the key-value pair in the bag `bag: &mut Bag` and returns the
 * value. Aborts with `sui::dynamic_field::EFieldDoesNotExist` if the bag does not
 * have an entry with that key `k: K`. Aborts with
 * `sui::dynamic_field::EFieldTypeMismatch` if the bag has an entry for the key,
 * but the value does not have the specified type.
 */
export function remove<K extends BcsType<any>>(options: RemoveOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['bag', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ContainsArguments<K extends BcsType<any>> {
	bag: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface ContainsOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| ContainsArguments<K>
		| [bag: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string];
}
/**
 * Returns true iff there is an value associated with the key `k: K` in the bag
 * `bag: &Bag`
 */
export function contains<K extends BcsType<any>>(options: ContainsOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['bag', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ContainsWithTypeArguments<K extends BcsType<any>> {
	bag: RawTransactionArgument<string>;
	k: RawTransactionArgument<K>;
}
export interface ContainsWithTypeOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| ContainsWithTypeArguments<K>
		| [bag: RawTransactionArgument<string>, k: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Returns true iff there is an value associated with the key `k: K` in the bag
 * `bag: &Bag` with an assigned value of type `V`
 */
export function containsWithType<K extends BcsType<any>>(options: ContainsWithTypeOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['bag', 'k'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'contains_with_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LengthArguments {
	bag: RawTransactionArgument<string>;
}
export interface LengthOptions {
	package: string;
	arguments: LengthArguments | [bag: RawTransactionArgument<string>];
}
/** Returns the size of the bag, the number of key-value pairs */
export function length(options: LengthOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bag'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsEmptyArguments {
	bag: RawTransactionArgument<string>;
}
export interface IsEmptyOptions {
	package: string;
	arguments: IsEmptyArguments | [bag: RawTransactionArgument<string>];
}
/** Returns true iff the bag is empty (if `length` returns `0`) */
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bag'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DestroyEmptyArguments {
	bag: RawTransactionArgument<string>;
}
export interface DestroyEmptyOptions {
	package: string;
	arguments: DestroyEmptyArguments | [bag: RawTransactionArgument<string>];
}
/**
 * Destroys an empty bag Aborts with `EBagNotEmpty` if the bag still contains
 * values
 */
export function destroyEmpty(options: DestroyEmptyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bag'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'destroy_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
