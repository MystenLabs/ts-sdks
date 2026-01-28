/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::object_table';
export const ObjectTable = new MoveStruct({
	name: `${$moduleName}::ObjectTable`,
	fields: {
		id: bcs.Address,
		size: bcs.u64(),
	},
});
export interface NewOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string, string];
}
export function _new(options: NewOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'new',
			typeArguments: options.typeArguments,
		});
}
export interface AddOptions<T0 extends BcsType<any>, T1 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<T0>,
		RawTransactionArgument<T1>,
	];
	typeArguments: [string, string];
}
export function add<T0 extends BcsType<any>, T1 extends BcsType<any>>(options: AddOptions<T0, T1>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		null,
		`${options.typeArguments[0]}`,
		`${options.typeArguments[1]}`,
	] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function borrow<T0 extends BcsType<any>>(options: BorrowOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowMutOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function borrowMut<T0 extends BcsType<any>>(options: BorrowMutOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'borrow_mut',
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
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'remove',
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
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
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
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
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
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
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
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'destroy_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ValueIdOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function valueId<T0 extends BcsType<any>>(options: ValueIdOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'object_table',
			function: 'value_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
