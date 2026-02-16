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
const $moduleName = '0x2::vec_map';
/** An entry in the map */
export function Entry<K extends BcsType<any>, V extends BcsType<any>>(...typeParameters: [K, V]) {
	return new MoveStruct({
		name: `${$moduleName}::Entry<${typeParameters[0].name as K['name']}, ${typeParameters[1].name as V['name']}>`,
		fields: {
			key: typeParameters[0],
			value: typeParameters[1],
		},
	});
}
/**
 * A map data structure backed by a vector. The map is guaranteed not to contain
 * duplicate keys, but entries are _not_ sorted by key--entries are included in
 * insertion order. All operations are O(N) in the size of the map--the intention
 * of this data structure is only to provide the convenience of programming against
 * a map API. Large maps should use handwritten parent/child relationships instead.
 * Maps that need sorted iteration rather than insertion order iteration should
 * also be handwritten.
 */
export function VecMap<K extends BcsType<any>, V extends BcsType<any>>(...typeParameters: [K, V]) {
	return new MoveStruct({
		name: `${$moduleName}::VecMap<${typeParameters[0].name as K['name']}, ${typeParameters[1].name as V['name']}>`,
		fields: {
			contents: bcs.vector(Entry(typeParameters[0], typeParameters[1])),
		},
	});
}
export interface EmptyOptions {
	package: string;
	arguments?: [];
	typeArguments: [string, string];
}
/** Create an empty `VecMap` */
export function empty(options: EmptyOptions) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'empty',
			typeArguments: options.typeArguments,
		});
}
export interface InsertArguments<K extends BcsType<any>, V extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
	value: RawTransactionArgument<V>;
}
export interface InsertOptions<K extends BcsType<any>, V extends BcsType<any>> {
	package: string;
	arguments:
		| InsertArguments<K, V>
		| [
				self: RawTransactionArgument<string>,
				key: RawTransactionArgument<K>,
				value: RawTransactionArgument<V>,
		  ];
	typeArguments: [string, string];
}
/**
 * Insert the entry `key` |-> `value` into `self`. Aborts if `key` is already bound
 * in `self`.
 */
export function insert<K extends BcsType<any>, V extends BcsType<any>>(
	options: InsertOptions<K, V>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		null,
		`${options.typeArguments[0]}`,
		`${options.typeArguments[1]}`,
	] satisfies (string | null)[];
	const parameterNames = ['self', 'key', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
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
	typeArguments: [string, string];
}
/**
 * Remove the entry `key` |-> `value` from self. Aborts if `key` is not bound in
 * `self`.
 */
export function remove<K extends BcsType<any>>(options: RemoveOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PopArguments {
	self: RawTransactionArgument<string>;
}
export interface PopOptions {
	package: string;
	arguments: PopArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Pop the most recently inserted entry from the map. Aborts if the map is empty. */
export function pop(options: PopOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'pop',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetMutArguments<K extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface GetMutOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| GetMutArguments<K>
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Get a mutable reference to the value bound to `key` in `self`. Aborts if `key`
 * is not bound in `self`.
 */
export function getMut<K extends BcsType<any>>(options: GetMutOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetArguments<K extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface GetOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| GetArguments<K>
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Get a reference to the value bound to `key` in `self`. Aborts if `key` is not
 * bound in `self`.
 */
export function get<K extends BcsType<any>>(options: GetOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TryGetArguments<K extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface TryGetOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| TryGetArguments<K>
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Safely try borrow a value bound to `key` in `self`. Return Some(V) if the value
 * exists, None otherwise. Only works for a "copyable" value as references cannot
 * be stored in `vector`.
 */
export function tryGet<K extends BcsType<any>>(options: TryGetOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'try_get',
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
	typeArguments: [string, string];
}
/** Return true if `self` contains an entry for `key`, false otherwise */
export function contains<K extends BcsType<any>>(options: ContainsOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
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
	typeArguments: [string, string];
}
/** Return the number of entries in `self` */
export function length(options: LengthOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
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
	typeArguments: [string, string];
}
/** Return true if `self` has 0 elements, false otherwise */
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyEmptyArguments {
	self: RawTransactionArgument<string>;
}
export interface DestroyEmptyOptions {
	package: string;
	arguments: DestroyEmptyArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Destroy an empty map. Aborts if `self` is not empty */
export function destroyEmpty(options: DestroyEmptyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'destroy_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IntoKeysValuesArguments {
	self: RawTransactionArgument<string>;
}
export interface IntoKeysValuesOptions {
	package: string;
	arguments: IntoKeysValuesArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Unpack `self` into vectors of its keys and values. The output keys and values
 * are stored in insertion order, _not_ sorted by key.
 */
export function intoKeysValues(options: IntoKeysValuesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'into_keys_values',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FromKeysValuesArguments<K extends BcsType<any>, V extends BcsType<any>> {
	keys: RawTransactionArgument<K[]>;
	values: RawTransactionArgument<V[]>;
}
export interface FromKeysValuesOptions<K extends BcsType<any>, V extends BcsType<any>> {
	package: string;
	arguments:
		| FromKeysValuesArguments<K, V>
		| [keys: RawTransactionArgument<K[]>, values: RawTransactionArgument<V[]>];
	typeArguments: [string, string];
}
/**
 * Construct a new `VecMap` from two vectors, one for keys and one for values. The
 * key value pairs are associated via their indices in the vectors, e.g. the key at
 * index i in `keys` is associated with the value at index i in `values`. The key
 * value pairs are stored in insertion order (the original vectors ordering) and
 * are _not_ sorted.
 */
export function fromKeysValues<K extends BcsType<any>, V extends BcsType<any>>(
	options: FromKeysValuesOptions<K, V>,
) {
	const packageAddress = options.package;
	const argumentsTypes = [
		`vector<${options.typeArguments[0]}>`,
		`vector<${options.typeArguments[1]}>`,
	] satisfies (string | null)[];
	const parameterNames = ['keys', 'values'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'from_keys_values',
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
	typeArguments: [string, string];
}
/** Returns a list of keys in the map. Do not assume any particular ordering. */
export function keys(options: KeysOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'keys',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetIdxOptArguments<K extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface GetIdxOptOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| GetIdxOptArguments<K>
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Find the index of `key` in `self`. Return `None` if `key` is not in `self`. Note
 * that map entries are stored in insertion order, _not_ sorted by key.
 */
export function getIdxOpt<K extends BcsType<any>>(options: GetIdxOptOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get_idx_opt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetIdxArguments<K extends BcsType<any>> {
	self: RawTransactionArgument<string>;
	key: RawTransactionArgument<K>;
}
export interface GetIdxOptions<K extends BcsType<any>> {
	package: string;
	arguments:
		| GetIdxArguments<K>
		| [self: RawTransactionArgument<string>, key: RawTransactionArgument<K>];
	typeArguments: [string, string];
}
/**
 * Find the index of `key` in `self`. Aborts if `key` is not in `self`. Note that
 * map entries are stored in insertion order, _not_ sorted by key.
 */
export function getIdx<K extends BcsType<any>>(options: GetIdxOptions<K>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['self', 'key'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get_idx',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetEntryByIdxArguments {
	self: RawTransactionArgument<string>;
	idx: RawTransactionArgument<number | bigint>;
}
export interface GetEntryByIdxOptions {
	package: string;
	arguments:
		| GetEntryByIdxArguments
		| [self: RawTransactionArgument<string>, idx: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/**
 * Return a reference to the `idx`th entry of `self`. This gives direct access into
 * the backing array of the map--use with caution. Note that map entries are stored
 * in insertion order, _not_ sorted by key. Aborts if `idx` is greater than or
 * equal to `self.length()`
 */
export function getEntryByIdx(options: GetEntryByIdxOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'idx'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get_entry_by_idx',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetEntryByIdxMutArguments {
	self: RawTransactionArgument<string>;
	idx: RawTransactionArgument<number | bigint>;
}
export interface GetEntryByIdxMutOptions {
	package: string;
	arguments:
		| GetEntryByIdxMutArguments
		| [self: RawTransactionArgument<string>, idx: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/**
 * Return a mutable reference to the `idx`th entry of `self`. This gives direct
 * access into the backing array of the map--use with caution. Note that map
 * entries are stored in insertion order, _not_ sorted by key. Aborts if `idx` is
 * greater than or equal to `self.length()`
 */
export function getEntryByIdxMut(options: GetEntryByIdxMutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'idx'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get_entry_by_idx_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveEntryByIdxArguments {
	self: RawTransactionArgument<string>;
	idx: RawTransactionArgument<number | bigint>;
}
export interface RemoveEntryByIdxOptions {
	package: string;
	arguments:
		| RemoveEntryByIdxArguments
		| [self: RawTransactionArgument<string>, idx: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/**
 * Remove the entry at index `idx` from self. Aborts if `idx` is greater than or
 * equal to `self.length()`
 */
export function removeEntryByIdx(options: RemoveEntryByIdxOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'idx'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'remove_entry_by_idx',
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
	typeArguments: [string, string];
}
/** Return the number of entries in `self` */
export function size(options: SizeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
