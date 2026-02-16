/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Priority queue implemented using a max heap. */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::priority_queue';
export function Entry<T extends BcsType<any>>(...typeParameters: [T]) {
	return new MoveStruct({
		name: `${$moduleName}::Entry<${typeParameters[0].name as T['name']}>`,
		fields: {
			priority: bcs.u64(),
			value: typeParameters[0],
		},
	});
}
/**
 * Struct representing a priority queue. The `entries` vector represents a max heap
 * structure, where entries[0] is the root, entries[1] and entries[2] are the left
 * child and right child of the root, etc. More generally, the children of
 * entries[i] are at i _ 2 + 1 and i _ 2 + 2. The max heap should have the
 * invariant that the parent node's priority is always higher than its child nodes'
 * priorities.
 */
export function PriorityQueue<T extends BcsType<any>>(...typeParameters: [T]) {
	return new MoveStruct({
		name: `${$moduleName}::PriorityQueue<${typeParameters[0].name as T['name']}>`,
		fields: {
			entries: bcs.vector(Entry(typeParameters[0])),
		},
	});
}
export interface NewArguments {
	entries: RawTransactionArgument<string[]>;
}
export interface NewOptions {
	package: string;
	arguments: NewArguments | [entries: RawTransactionArgument<string[]>];
	typeArguments: [string];
}
/** Create a new priority queue from the input entry vectors. */
export function _new(options: NewOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<null>'] satisfies (string | null)[];
	const parameterNames = ['entries'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PopMaxArguments {
	pq: RawTransactionArgument<string>;
}
export interface PopMaxOptions {
	package: string;
	arguments: PopMaxArguments | [pq: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Pop the entry with the highest priority value. */
export function popMax(options: PopMaxOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pq'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'pop_max',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface InsertArguments<T extends BcsType<any>> {
	pq: RawTransactionArgument<string>;
	priority: RawTransactionArgument<number | bigint>;
	value: RawTransactionArgument<T>;
}
export interface InsertOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| InsertArguments<T>
		| [
				pq: RawTransactionArgument<string>,
				priority: RawTransactionArgument<number | bigint>,
				value: RawTransactionArgument<T>,
		  ];
	typeArguments: [string];
}
/** Insert a new entry into the queue. */
export function insert<T extends BcsType<any>>(options: InsertOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64', `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['pq', 'priority', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'insert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewEntryArguments<T extends BcsType<any>> {
	priority: RawTransactionArgument<number | bigint>;
	value: RawTransactionArgument<T>;
}
export interface NewEntryOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| NewEntryArguments<T>
		| [priority: RawTransactionArgument<number | bigint>, value: RawTransactionArgument<T>];
	typeArguments: [string];
}
export function newEntry<T extends BcsType<any>>(options: NewEntryOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = ['u64', `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['priority', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'new_entry',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreateEntriesArguments<T extends BcsType<any>> {
	p: RawTransactionArgument<number | bigint[]>;
	v: RawTransactionArgument<T[]>;
}
export interface CreateEntriesOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| CreateEntriesArguments<T>
		| [p: RawTransactionArgument<number | bigint[]>, v: RawTransactionArgument<T[]>];
	typeArguments: [string];
}
export function createEntries<T extends BcsType<any>>(options: CreateEntriesOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u64>', `vector<${options.typeArguments[0]}>`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['p', 'v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'create_entries',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PrioritiesArguments {
	pq: RawTransactionArgument<string>;
}
export interface PrioritiesOptions {
	package: string;
	arguments: PrioritiesArguments | [pq: RawTransactionArgument<string>];
	typeArguments: [string];
}
export function priorities(options: PrioritiesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pq'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'priority_queue',
			function: 'priorities',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
