/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type BcsType, bcs } from '@mysten/sui/bcs';
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::vec_set';
/**
 * A set data structure backed by a vector. The set is guaranteed not to contain
 * duplicate keys. All operations are O(N) in the size of the set
 *
 * - the intention of this data structure is only to provide the convenience of
 *   programming against a set API. Sets that need sorted iteration rather than
 *   insertion order iteration should be handwritten.
 */
export function VecSet<K extends BcsType<any>>(...typeParameters: [K]) {
	return new MoveStruct({
		name: `${$moduleName}::VecSet<${typeParameters[0].name as K['name']}>`,
		fields: {
			contents: bcs.vector(typeParameters[0]),
		},
	});
}
export interface EmptyOptions {
	package: string;
	arguments?: [];
	typeArguments: [string];
}
/** Create an empty `VecSet` */
export function empty(options: EmptyOptions) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'empty',
			typeArguments: options.typeArguments,
		});
}
export interface SingletonArguments<K extends BcsType<any>> {
	key: RawTransactionArgument<K>;
}
export interface SingletonOptions<K extends BcsType<any>> {
	package: string;
	arguments: SingletonArguments<K> | [key: RawTransactionArgument<K>];
	typeArguments: [string];
}
/** Create a singleton `VecSet` that only contains one element. */
export function singleton<K extends BcsType<any>>(options: SingletonOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'singleton',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface InsertArguments<K extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface InsertOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| InsertArguments<K>
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string];
}
/** Insert a `key` into self. Aborts if `key` is already present in `self`. */
export function insert<K extends BcsType<any>>(options: InsertOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'insert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveArguments<K extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface RemoveOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| RemoveArguments<K>
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string];
}
/** Remove the entry `key` from self. Aborts if `key` is not present in `self`. */
export function remove<K extends BcsType<any>>(options: RemoveOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ContainsArguments<K extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface ContainsOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| ContainsArguments<K>
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string];
}
/** Return true if `self` contains an entry for `key`, false otherwise */
export function contains<K extends BcsType<any>>(options: ContainsOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LengthArguments {
	self: RawTransactionArgument<string>;
}
export interface LengthOptions {
	package: string;
	arguments: LengthArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the number of entries in `self` */
export function length(options: LengthOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsEmptyArguments {
	self: RawTransactionArgument<string>;
}
export interface IsEmptyOptions {
	package: string;
	arguments: IsEmptyArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return true if `self` has 0 elements, false otherwise */
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IntoKeysArguments {
	self: RawTransactionArgument<string>;
}
export interface IntoKeysOptions {
	package: string;
	arguments: IntoKeysArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Unpack `self` into vectors of keys. The output keys are stored in insertion
 * order, _not_ sorted.
 */
export function intoKeys(options: IntoKeysOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'into_keys',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FromKeysArguments<K extends BcsType<any>> {
	keys: RawTransactionArgument<K[]>;
}
export interface FromKeysOptions<K extends BcsType<any>> {
	package: string;
	arguments: FromKeysArguments<K> | [keys: RawTransactionArgument<K[]>];
	typeArguments: [string];
}
/**
 * Construct a new `VecSet` from a vector of keys. The keys are stored in insertion
 * order (the original `keys` ordering) and are _not_ sorted.
 */
export function fromKeys<K extends BcsType<any>>(options: FromKeysOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`] satisfies (string | null)[];
	const parameterNames = ['keys'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'from_keys',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface KeysArguments {
	self: RawTransactionArgument<string>;
}
export interface KeysOptions {
	package: string;
	arguments: KeysArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Borrow the `contents` of the `VecSet` to access content by index without
 * unpacking. The contents are stored in insertion order, _not_ sorted.
 */
export function keys(options: KeysOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'keys',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SizeArguments {
	self: RawTransactionArgument<string>;
}
export interface SizeOptions {
	package: string;
	arguments: SizeArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the number of entries in `self` */
export function size(options: SizeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
