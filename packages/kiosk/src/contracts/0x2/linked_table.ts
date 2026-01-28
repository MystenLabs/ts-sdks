/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::linked_table';
export function LinkedTable<T0 extends BcsType<any>>(...typeParameters: [T0]) {
	return new MoveStruct({
		name: `${$moduleName}::LinkedTable<${typeParameters[0].name as T0['name']}>`,
		fields: {
			id: bcs.Address,
			size: bcs.u64(),
			head: bcs.option(typeParameters[0]),
			tail: bcs.option(typeParameters[0]),
		},
	});
}
export function Node<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	...typeParameters: [T0, T1]
) {
	return new MoveStruct({
		name: `${$moduleName}::Node<${typeParameters[0].name as T0['name']}, ${typeParameters[1].name as T1['name']}>`,
		fields: {
			prev: bcs.option(typeParameters[0]),
			next: bcs.option(typeParameters[0]),
			value: typeParameters[1],
		},
	});
}
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
			module: 'linked_table',
			function: 'new',
			typeArguments: options.typeArguments,
		});
}
export interface FrontOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function front(options: FrontOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'front',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface BackOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function back(options: BackOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'back',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PushFrontOptions<T0 extends BcsType<any>, T1 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<T0>,
		RawTransactionArgument<T1>,
	];
	typeArguments: [string, string];
}
export function pushFront<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	options: PushFrontOptions<T0, T1>,
) {
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
			module: 'linked_table',
			function: 'push_front',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PushBackOptions<T0 extends BcsType<any>, T1 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<T0>,
		RawTransactionArgument<T1>,
	];
	typeArguments: [string, string];
}
export function pushBack<T0 extends BcsType<any>, T1 extends BcsType<any>>(
	options: PushBackOptions<T0, T1>,
) {
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
			module: 'linked_table',
			function: 'push_back',
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
			module: 'linked_table',
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
			module: 'linked_table',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PrevOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function prev<T0 extends BcsType<any>>(options: PrevOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'prev',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface NextOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function next<T0 extends BcsType<any>>(options: NextOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'next',
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
			module: 'linked_table',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PopFrontOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function popFront(options: PopFrontOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'pop_front',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PopBackOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function popBack(options: PopBackOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'pop_back',
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
			module: 'linked_table',
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
			module: 'linked_table',
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
			module: 'linked_table',
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
			module: 'linked_table',
			function: 'destroy_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface DropOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function drop(options: DropOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'linked_table',
			function: 'drop',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
