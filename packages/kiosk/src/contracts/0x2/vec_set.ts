/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::vec_set';
export function VecSet<T0 extends BcsType<any>>(...typeParameters: [T0]) {
	return new MoveStruct({
		name: `${$moduleName}::VecSet<${typeParameters[0].name as T0['name']}>`,
		fields: {
			contents: bcs.vector(typeParameters[0]),
		},
	});
}
export interface EmptyOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
export function empty(options: EmptyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'empty',
			typeArguments: options.typeArguments,
		});
}
export interface SingletonOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function singleton<T0 extends BcsType<any>>(options: SingletonOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'singleton',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface InsertOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function insert<T0 extends BcsType<any>>(options: InsertOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'insert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function remove<T0 extends BcsType<any>>(options: RemoveOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ContainsOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function contains<T0 extends BcsType<any>>(options: ContainsOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface LengthOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function length(options: LengthOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IsEmptyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface IntoKeysOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function intoKeys(options: IntoKeysOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'into_keys',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface FromKeysOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0[]>];
	typeArguments: [string];
}
export function fromKeys<T0 extends BcsType<any>>(options: FromKeysOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'from_keys',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface KeysOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function keys(options: KeysOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'keys',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface SizeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function size(options: SizeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vec_set',
			function: 'size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
