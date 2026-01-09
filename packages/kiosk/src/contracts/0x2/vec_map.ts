/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::vec_map';
export function Entry<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	...typeParameters: [T0, T1]
) {
	return new MoveStruct({
		name: `${$moduleName}::Entry<${typeParameters[0].name as T0['name']}, ${typeParameters[1].name as T1['name']}>`,
		fields: {
			key: typeParameters[0],
			value: typeParameters[1],
		},
	});
}
export function VecMap<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	...typeParameters: [T0, T1]
) {
	return new MoveStruct({
		name: `${$moduleName}::VecMap<${typeParameters[0].name as T0['name']}, ${typeParameters[1].name as T1['name']}>`,
		fields: {
			contents: bcs.vector(Entry(typeParameters[0], typeParameters[1])),
		},
	});
}
export interface EmptyOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string, string];
}
export function empty(options: EmptyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'empty',
			typeArguments: options.typeArguments,
		});
}
export interface InsertOptions<T0 extends BcsType<any>, T1 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<T0>,
		RawTransactionArgument<T1>,
	];
	typeArguments: [string, string];
}
export function insert<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	options: InsertOptions<T0, T1>,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${options.typeArguments[0]}`,
		`${options.typeArguments[1]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'insert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function remove<T0 extends BcsType<any>>(options: RemoveOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PopOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function pop(options: PopOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'pop',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetMutOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function getMut<T0 extends BcsType<any>>(options: GetMutOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function get<T0 extends BcsType<any>>(options: GetOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface TryGetOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function tryGet<T0 extends BcsType<any>>(options: TryGetOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'try_get',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ContainsOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function contains<T0 extends BcsType<any>>(options: ContainsOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface LengthOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function length(options: LengthOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsEmptyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyEmptyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function destroyEmpty(options: DestroyEmptyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'destroy_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IntoKeysValuesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function intoKeysValues(options: IntoKeysValuesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'into_keys_values',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FromKeysValuesOptions<T0 extends BcsType<any>, T1 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0[]>, RawTransactionArgument<T1[]>];
	typeArguments: [string, string];
}
export function fromKeysValues<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	options: FromKeysValuesOptions<T0, T1>,
) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`vector<${options.typeArguments[0]}>`,
		`vector<${options.typeArguments[1]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'from_keys_values',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface KeysOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function keys(options: KeysOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'keys',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetIdxOptOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function getIdxOpt<T0 extends BcsType<any>>(options: GetIdxOptOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get_idx_opt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetIdxOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function getIdx<T0 extends BcsType<any>>(options: GetIdxOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${options.typeArguments[0]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get_idx',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetEntryByIdxOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
export function getEntryByIdx(options: GetEntryByIdxOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get_entry_by_idx',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface GetEntryByIdxMutOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
export function getEntryByIdxMut(options: GetEntryByIdxMutOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'get_entry_by_idx_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveEntryByIdxOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
export function removeEntryByIdx(options: RemoveEntryByIdxOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'remove_entry_by_idx',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SizeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function size(options: SizeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::vec_map::VecMap<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_map',
			function: 'size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
