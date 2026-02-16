/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** A basic scalable vector library implemented using `Table`. */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
import { type BcsType } from '@mysten/sui/bcs';
import * as table from './table.js';
const $moduleName = '0x2::table_vec';
export const TableVec = new MoveStruct({
	name: `${$moduleName}::TableVec<phantom Element>`,
	fields: {
		/** The contents of the table vector. */
		contents: table.Table,
	},
});
export interface EmptyOptions {
	package: string;
	arguments?: [];
	typeArguments: [string];
}
/** Create an empty TableVec. */
export function empty(options: EmptyOptions) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'empty',
			typeArguments: options.typeArguments,
		});
}
export interface SingletonArguments<Element extends BcsType<any>> {
	e: RawTransactionArgument<Element>;
}
export interface SingletonOptions<Element extends BcsType<any>> {
	package: string;
	arguments: SingletonArguments<Element> | [e: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/** Return a TableVec of size one containing element `e`. */
export function singleton<Element extends BcsType<any>>(options: SingletonOptions<Element>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'singleton',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LengthArguments {
	t: RawTransactionArgument<string>;
}
export interface LengthOptions {
	package: string;
	arguments: LengthArguments | [t: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return the length of the TableVec. */
export function length(options: LengthOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsEmptyArguments {
	t: RawTransactionArgument<string>;
}
export interface IsEmptyOptions {
	package: string;
	arguments: IsEmptyArguments | [t: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Return if the TableVec is empty or not. */
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowArguments {
	t: RawTransactionArgument<string>;
	i: RawTransactionArgument<number | bigint>;
}
export interface BorrowOptions {
	package: string;
	arguments:
		| BorrowArguments
		| [t: RawTransactionArgument<string>, i: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Acquire an immutable reference to the `i`th element of the TableVec `t`. Aborts
 * if `i` is out of bounds.
 */
export function borrow(options: BorrowOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['t', 'i'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PushBackArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<string>;
	e: RawTransactionArgument<Element>;
}
export interface PushBackOptions<Element extends BcsType<any>> {
	package: string;
	arguments:
		| PushBackArguments<Element>
		| [t: RawTransactionArgument<string>, e: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/** Add element `e` to the end of the TableVec `t`. */
export function pushBack<Element extends BcsType<any>>(options: PushBackOptions<Element>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['t', 'e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'push_back',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowMutArguments {
	t: RawTransactionArgument<string>;
	i: RawTransactionArgument<number | bigint>;
}
export interface BorrowMutOptions {
	package: string;
	arguments:
		| BorrowMutArguments
		| [t: RawTransactionArgument<string>, i: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Return a mutable reference to the `i`th element in the TableVec `t`. Aborts if
 * `i` is out of bounds.
 */
export function borrowMut(options: BorrowMutOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['t', 'i'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PopBackArguments {
	t: RawTransactionArgument<string>;
}
export interface PopBackOptions {
	package: string;
	arguments: PopBackArguments | [t: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Pop an element from the end of TableVec `t`. Aborts if `t` is empty. */
export function popBack(options: PopBackOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'pop_back',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyEmptyArguments {
	t: RawTransactionArgument<string>;
}
export interface DestroyEmptyOptions {
	package: string;
	arguments: DestroyEmptyArguments | [t: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Destroy the TableVec `t`. Aborts if `t` is not empty. */
export function destroyEmpty(options: DestroyEmptyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'destroy_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DropArguments {
	t: RawTransactionArgument<string>;
}
export interface DropOptions {
	package: string;
	arguments: DropArguments | [t: RawTransactionArgument<string>];
	typeArguments: [string];
}
/**
 * Drop a possibly non-empty TableVec `t`. Usable only if the value type `Element`
 * has the `drop` ability
 */
export function drop(options: DropOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'drop',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapArguments {
	t: RawTransactionArgument<string>;
	i: RawTransactionArgument<number | bigint>;
	j: RawTransactionArgument<number | bigint>;
}
export interface SwapOptions {
	package: string;
	arguments:
		| SwapArguments
		| [
				t: RawTransactionArgument<string>,
				i: RawTransactionArgument<number | bigint>,
				j: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Swaps the elements at the `i`th and `j`th indices in the TableVec `t`. Aborts if
 * `i` or `j` is out of bounds.
 */
export function swap(options: SwapOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['t', 'i', 'j'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'swap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapRemoveArguments {
	t: RawTransactionArgument<string>;
	i: RawTransactionArgument<number | bigint>;
}
export interface SwapRemoveOptions {
	package: string;
	arguments:
		| SwapRemoveArguments
		| [t: RawTransactionArgument<string>, i: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Swap the `i`th element of the TableVec `t` with the last element and then pop
 * the TableVec. This is O(1), but does not preserve ordering of elements in the
 * TableVec. Aborts if `i` is out of bounds.
 */
export function swapRemove(options: SwapRemoveOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['t', 'i'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'table_vec',
			function: 'swap_remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
