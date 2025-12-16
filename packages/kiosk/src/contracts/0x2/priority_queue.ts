/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::priority_queue';
export function Entry<T0 extends BcsType<any>>(...typeParameters: [T0]) {
	return new MoveStruct({
		name: `${$moduleName}::Entry<${typeParameters[0].name as T0['name']}>`,
		fields: {
			priority: bcs.u64(),
			value: typeParameters[0],
		},
	});
}
export function PriorityQueue<T0 extends BcsType<any>>(...typeParameters: [T0]) {
	return new MoveStruct({
		name: `${$moduleName}::PriorityQueue<${typeParameters[0].name as T0['name']}>`,
		fields: {
			entries: bcs.vector(Entry(typeParameters[0])),
		},
	});
}
export interface NewOptions {
	package?: string;
	arguments: [RawTransactionArgument<string[]>];
	typeArguments: [string];
}
export function _new(options: NewOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`vector<${packageAddress}::priority_queue::Entry<${options.typeArguments[0]}>>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PopMaxOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function popMax(options: PopMaxOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::priority_queue::PriorityQueue<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'pop_max',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface InsertOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<T0>,
	];
	typeArguments: [string];
}
export function insert<T0 extends BcsType<any>>(options: InsertOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::priority_queue::PriorityQueue<${options.typeArguments[0]}>`,
		'u64',
		`${options.typeArguments[0]}`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'insert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface NewEntryOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function newEntry<T0 extends BcsType<any>>(options: NewEntryOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u64', `${options.typeArguments[0]}`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'new_entry',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface CreateEntriesOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint[]>, RawTransactionArgument<T0[]>];
	typeArguments: [string];
}
export function createEntries<T0 extends BcsType<any>>(options: CreateEntriesOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u64>', `vector<${options.typeArguments[0]}>`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'create_entries',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface PrioritiesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
	typeArguments: [string];
}
export function priorities(options: PrioritiesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::priority_queue::PriorityQueue<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'priorities',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
