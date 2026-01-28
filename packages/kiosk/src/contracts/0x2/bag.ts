/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::bag';
export const Bag = new MoveStruct({
	name: `${$moduleName}::Bag`,
	fields: {
		id: bcs.Address,
		size: bcs.u64(),
	},
});
export interface NewOptions {
	package?: string;
	arguments?: [];
}
export function _new(options: NewOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'new',
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
			module: 'bag',
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
			module: 'bag',
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
			module: 'bag',
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
			module: 'bag',
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
			module: 'bag',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface ContainsWithTypeOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0>];
	typeArguments: [string, string];
}
export function containsWithType<T0 extends BcsType<any>>(options: ContainsWithTypeOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'contains_with_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface LengthOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function length(options: LengthOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IsEmptyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DestroyEmptyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function destroyEmpty(options: DestroyEmptyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bag',
			function: 'destroy_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
