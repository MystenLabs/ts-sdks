/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * A variable-sized container that can hold any type. Indexing is 0-based, and
 * vectors are growable. This module has many native functions.
 */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type BcsType } from '@mysten/sui/bcs';
export interface EmptyOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
/** Create an empty vector. */
export function empty(options: EmptyOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'empty',
			typeArguments: options.typeArguments,
		});
}
export interface LengthArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
}
export interface LengthOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: LengthArguments<Element> | [v: RawTransactionArgument<Element[]>];
	typeArguments: [string];
}
/** Return the length of the vector. */
export function length<Element extends BcsType<any>>(options: LengthOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`] satisfies (string | null)[];
	const parameterNames = ['v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
	i: RawTransactionArgument<number | bigint>;
}
export interface BorrowOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| BorrowArguments<Element>
		| [v: RawTransactionArgument<Element[]>, i: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Acquire an immutable reference to the `i`th element of the vector `v`. Aborts if
 * `i` is out of bounds.
 */
export function borrow<Element extends BcsType<any>>(options: BorrowOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`, 'u64'] satisfies (string | null)[];
	const parameterNames = ['v', 'i'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PushBackArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
	e: RawTransactionArgument<Element>;
}
export interface PushBackOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| PushBackArguments<Element>
		| [v: RawTransactionArgument<Element[]>, e: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/** Add element `e` to the end of the vector `v`. */
export function pushBack<Element extends BcsType<any>>(options: PushBackOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`vector<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies (string | null)[];
	const parameterNames = ['v', 'e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'push_back',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowMutArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
	i: RawTransactionArgument<number | bigint>;
}
export interface BorrowMutOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| BorrowMutArguments<Element>
		| [v: RawTransactionArgument<Element[]>, i: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Return a mutable reference to the `i`th element in the vector `v`. Aborts if `i`
 * is out of bounds.
 */
export function borrowMut<Element extends BcsType<any>>(options: BorrowMutOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`, 'u64'] satisfies (string | null)[];
	const parameterNames = ['v', 'i'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PopBackArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
}
export interface PopBackOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: PopBackArguments<Element> | [v: RawTransactionArgument<Element[]>];
	typeArguments: [string];
}
/** Pop an element from the end of vector `v`. Aborts if `v` is empty. */
export function popBack<Element extends BcsType<any>>(options: PopBackOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`] satisfies (string | null)[];
	const parameterNames = ['v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'pop_back',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyEmptyArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
}
export interface DestroyEmptyOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: DestroyEmptyArguments<Element> | [v: RawTransactionArgument<Element[]>];
	typeArguments: [string];
}
/** Destroy the vector `v`. Aborts if `v` is not empty. */
export function destroyEmpty<Element extends BcsType<any>>(options: DestroyEmptyOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`] satisfies (string | null)[];
	const parameterNames = ['v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'destroy_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
	i: RawTransactionArgument<number | bigint>;
	j: RawTransactionArgument<number | bigint>;
}
export interface SwapOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| SwapArguments<Element>
		| [
				v: RawTransactionArgument<Element[]>,
				i: RawTransactionArgument<number | bigint>,
				j: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Swaps the elements at the `i`th and `j`th indices in the vector `v`. Aborts if
 * `i` or `j` is out of bounds.
 */
export function swap<Element extends BcsType<any>>(options: SwapOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`, 'u64', 'u64'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['v', 'i', 'j'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'swap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SingletonArguments<Element extends BcsType<any>> {
	e: RawTransactionArgument<Element>;
}
export interface SingletonOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: SingletonArguments<Element> | [e: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/** Return an vector of size one containing element `e`. */
export function singleton<Element extends BcsType<any>>(options: SingletonOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'singleton',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReverseArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
}
export interface ReverseOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: ReverseArguments<Element> | [v: RawTransactionArgument<Element[]>];
	typeArguments: [string];
}
/** Reverses the order of the elements in the vector `v` in place. */
export function reverse<Element extends BcsType<any>>(options: ReverseOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`] satisfies (string | null)[];
	const parameterNames = ['v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'reverse',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AppendArguments<Element extends BcsType<any>> {
	lhs: RawTransactionArgument<Element[]>;
	other: RawTransactionArgument<Element[]>;
}
export interface AppendOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| AppendArguments<Element>
		| [lhs: RawTransactionArgument<Element[]>, other: RawTransactionArgument<Element[]>];
	typeArguments: [string];
}
/** Pushes all of the elements of the `other` vector into the `lhs` vector. */
export function append<Element extends BcsType<any>>(options: AppendOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`vector<${options.typeArguments[0]}>`,
		`vector<${options.typeArguments[0]}>`,
	] satisfies (string | null)[];
	const parameterNames = ['lhs', 'other'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'append',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsEmptyArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
}
export interface IsEmptyOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: IsEmptyArguments<Element> | [v: RawTransactionArgument<Element[]>];
	typeArguments: [string];
}
/** Return `true` if the vector `v` has no elements and `false` otherwise. */
export function isEmpty<Element extends BcsType<any>>(options: IsEmptyOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`] satisfies (string | null)[];
	const parameterNames = ['v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ContainsArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
	e: RawTransactionArgument<Element>;
}
export interface ContainsOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| ContainsArguments<Element>
		| [v: RawTransactionArgument<Element[]>, e: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/** Return true if `e` is in the vector `v`. Otherwise, returns false. */
export function contains<Element extends BcsType<any>>(options: ContainsOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`vector<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies (string | null)[];
	const parameterNames = ['v', 'e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IndexOfArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
	e: RawTransactionArgument<Element>;
}
export interface IndexOfOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| IndexOfArguments<Element>
		| [v: RawTransactionArgument<Element[]>, e: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/**
 * Return `(true, i)` if `e` is in the vector `v` at index `i`. Otherwise, returns
 * `(false, 0)`.
 */
export function indexOf<Element extends BcsType<any>>(options: IndexOfOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`vector<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies (string | null)[];
	const parameterNames = ['v', 'e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'index_of',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RemoveArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
	i: RawTransactionArgument<number | bigint>;
}
export interface RemoveOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| RemoveArguments<Element>
		| [v: RawTransactionArgument<Element[]>, i: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Remove the `i`th element of the vector `v`, shifting all subsequent elements.
 * This is O(n) and preserves ordering of elements in the vector. Aborts if `i` is
 * out of bounds.
 */
export function remove<Element extends BcsType<any>>(options: RemoveOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`, 'u64'] satisfies (string | null)[];
	const parameterNames = ['v', 'i'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface InsertArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
	e: RawTransactionArgument<Element>;
	i: RawTransactionArgument<number | bigint>;
}
export interface InsertOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| InsertArguments<Element>
		| [
				v: RawTransactionArgument<Element[]>,
				e: RawTransactionArgument<Element>,
				i: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string];
}
/**
 * Insert `e` at position `i` in the vector `v`. If `i` is in bounds, this shifts
 * the old `v[i]` and all subsequent elements to the right. If `i == v.length()`,
 * this adds `e` to the end of the vector. This is O(n) and preserves ordering of
 * elements in the vector. Aborts if `i > v.length()`
 */
export function insert<Element extends BcsType<any>>(options: InsertOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`vector<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
		'u64',
	] satisfies (string | null)[];
	const parameterNames = ['v', 'e', 'i'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'insert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapRemoveArguments<Element extends BcsType<any>> {
	v: RawTransactionArgument<Element[]>;
	i: RawTransactionArgument<number | bigint>;
}
export interface SwapRemoveOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| SwapRemoveArguments<Element>
		| [v: RawTransactionArgument<Element[]>, i: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Swap the `i`th element of the vector `v` with the last element and then pop the
 * vector. This is O(1), but does not preserve ordering of elements in the vector.
 * Aborts if `i` is out of bounds.
 */
export function swapRemove<Element extends BcsType<any>>(options: SwapRemoveOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`, 'u64'] satisfies (string | null)[];
	const parameterNames = ['v', 'i'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'swap_remove',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SkipArguments<T extends BcsType<any>> {
	v: RawTransactionArgument<T[]>;
	n: RawTransactionArgument<number | bigint>;
}
export interface SkipOptions<T extends BcsType<any>> {
	package?: string;
	arguments:
		| SkipArguments<T>
		| [v: RawTransactionArgument<T[]>, n: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Return a new vector containing the elements of `v` except the first `n`
 * elements. If `n > length`, returns an empty vector.
 */
export function skip<T extends BcsType<any>>(options: SkipOptions<T>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`, 'u64'] satisfies (string | null)[];
	const parameterNames = ['v', 'n'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'skip',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface TakeArguments<T extends BcsType<any>> {
	v: RawTransactionArgument<T[]>;
	n: RawTransactionArgument<number | bigint>;
}
export interface TakeOptions<T extends BcsType<any>> {
	package?: string;
	arguments:
		| TakeArguments<T>
		| [v: RawTransactionArgument<T[]>, n: RawTransactionArgument<number | bigint>];
	typeArguments: [string];
}
/**
 * Take the first `n` elements of the vector `v` and drop the rest. Aborts if `n`
 * is greater than the length of `v`.
 */
export function take<T extends BcsType<any>>(options: TakeOptions<T>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<${options.typeArguments[0]}>`, 'u64'] satisfies (string | null)[];
	const parameterNames = ['v', 'n'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'take',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FlattenArguments<T extends BcsType<any>> {
	v: RawTransactionArgument<T[][]>;
}
export interface FlattenOptions<T extends BcsType<any>> {
	package?: string;
	arguments: FlattenArguments<T> | [v: RawTransactionArgument<T[][]>];
	typeArguments: [string];
}
/**
 * Concatenate the vectors of `v` into a single vector, keeping the order of the
 * elements.
 */
export function flatten<T extends BcsType<any>>(options: FlattenOptions<T>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`vector<vector<${options.typeArguments[0]}>>`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vector',
			function: 'flatten',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
