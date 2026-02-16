/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * This module defines the Option type and its methods to represent and handle an
 * optional value.
 */

import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/auction::option';
/**
 * Abstraction of a value that may or may not be present. Implemented with a vector
 * of size zero or one because Move bytecode does not have ADTs.
 */
export function Option<Element extends BcsType<any>>(...typeParameters: [Element]) {
	return new MoveStruct({
		name: `${$moduleName}::Option<${typeParameters[0].name as Element['name']}>`,
		fields: {
			vec: bcs.vector(typeParameters[0]),
		},
	});
}
export interface NoneOptions {
	package?: string;
	arguments?: [];
	typeArguments: [string];
}
/** Return an empty `Option` */
export function none(options: NoneOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'none',
			typeArguments: options.typeArguments,
		});
}
export interface SomeArguments<Element extends BcsType<any>> {
	e: RawTransactionArgument<Element>;
}
export interface SomeOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: SomeArguments<Element> | [e: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/** Return an `Option` containing `e` */
export function some<Element extends BcsType<any>>(options: SomeOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'some',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsNoneArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
}
export interface IsNoneOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: IsNoneArguments<Element> | [t: RawTransactionArgument<Element | null>];
	typeArguments: [string];
}
/** Return true if `t` does not hold a value */
export function isNone<Element extends BcsType<any>>(options: IsNoneOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`0x1::option::Option<${options.typeArguments[0]}>`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'is_none',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IsSomeArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
}
export interface IsSomeOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: IsSomeArguments<Element> | [t: RawTransactionArgument<Element | null>];
	typeArguments: [string];
}
/** Return true if `t` holds a value */
export function isSome<Element extends BcsType<any>>(options: IsSomeOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`0x1::option::Option<${options.typeArguments[0]}>`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'is_some',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ContainsArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
	eRef: RawTransactionArgument<Element>;
}
export interface ContainsOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| ContainsArguments<Element>
		| [t: RawTransactionArgument<Element | null>, eRef: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/**
 * Return true if the value in `t` is equal to `e_ref` Always returns `false` if
 * `t` does not hold a value
 */
export function contains<Element extends BcsType<any>>(options: ContainsOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`0x1::option::Option<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies (string | null)[];
	const parameterNames = ['t', 'eRef'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
}
export interface BorrowOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: BorrowArguments<Element> | [t: RawTransactionArgument<Element | null>];
	typeArguments: [string];
}
/**
 * Return an immutable reference to the value inside `t` Aborts if `t` does not
 * hold a value
 */
export function borrow<Element extends BcsType<any>>(options: BorrowOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`0x1::option::Option<${options.typeArguments[0]}>`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'borrow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowWithDefaultArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
	defaultRef: RawTransactionArgument<Element>;
}
export interface BorrowWithDefaultOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| BorrowWithDefaultArguments<Element>
		| [t: RawTransactionArgument<Element | null>, defaultRef: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/**
 * Return a reference to the value inside `t` if it holds one Return `default_ref`
 * if `t` does not hold a value
 */
export function borrowWithDefault<Element extends BcsType<any>>(
	options: BorrowWithDefaultOptions<Element>,
) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`0x1::option::Option<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies (string | null)[];
	const parameterNames = ['t', 'defaultRef'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'borrow_with_default',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetWithDefaultArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
	default: RawTransactionArgument<Element>;
}
export interface GetWithDefaultOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: GetWithDefaultArguments<Element> | [t: RawTransactionArgument<Element | null>];
	default: RawTransactionArgument<Element>;
	typeArguments: [string];
}
/**
 * Return the value inside `t` if it holds one Return `default` if `t` does not
 * hold a value
 */
export function getWithDefault<Element extends BcsType<any>>(
	options: GetWithDefaultOptions<Element>,
) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`0x1::option::Option<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies (string | null)[];
	const parameterNames = ['t', 'default'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'get_with_default',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface FillArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
	e: RawTransactionArgument<Element>;
}
export interface FillOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| FillArguments<Element>
		| [t: RawTransactionArgument<Element | null>, e: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/**
 * Convert the none option `t` to a some option by adding `e`. Aborts if `t`
 * already holds a value
 */
export function fill<Element extends BcsType<any>>(options: FillOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`0x1::option::Option<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies (string | null)[];
	const parameterNames = ['t', 'e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'fill',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ExtractArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
}
export interface ExtractOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: ExtractArguments<Element> | [t: RawTransactionArgument<Element | null>];
	typeArguments: [string];
}
/**
 * Convert a `some` option to a `none` by removing and returning the value stored
 * inside `t` Aborts if `t` does not hold a value
 */
export function extract<Element extends BcsType<any>>(options: ExtractOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`0x1::option::Option<${options.typeArguments[0]}>`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'extract',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowMutArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
}
export interface BorrowMutOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: BorrowMutArguments<Element> | [t: RawTransactionArgument<Element | null>];
	typeArguments: [string];
}
/**
 * Return a mutable reference to the value inside `t` Aborts if `t` does not hold a
 * value
 */
export function borrowMut<Element extends BcsType<any>>(options: BorrowMutOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`0x1::option::Option<${options.typeArguments[0]}>`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'borrow_mut',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
	e: RawTransactionArgument<Element>;
}
export interface SwapOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| SwapArguments<Element>
		| [t: RawTransactionArgument<Element | null>, e: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/**
 * Swap the old value inside `t` with `e` and return the old value Aborts if `t`
 * does not hold a value
 */
export function swap<Element extends BcsType<any>>(options: SwapOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`0x1::option::Option<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies (string | null)[];
	const parameterNames = ['t', 'e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'swap',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapOrFillArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
	e: RawTransactionArgument<Element>;
}
export interface SwapOrFillOptions<Element extends BcsType<any>> {
	package?: string;
	arguments:
		| SwapOrFillArguments<Element>
		| [t: RawTransactionArgument<Element | null>, e: RawTransactionArgument<Element>];
	typeArguments: [string];
}
/**
 * Swap the old value inside `t` with `e` and return the old value; or if there is
 * no old value, fill it with `e`. Different from swap(), swap_or_fill() allows for
 * `t` not holding a value.
 */
export function swapOrFill<Element extends BcsType<any>>(options: SwapOrFillOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`0x1::option::Option<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies (string | null)[];
	const parameterNames = ['t', 'e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'swap_or_fill',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyWithDefaultArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
	default: RawTransactionArgument<Element>;
}
export interface DestroyWithDefaultOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: DestroyWithDefaultArguments<Element> | [t: RawTransactionArgument<Element | null>];
	default: RawTransactionArgument<Element>;
	typeArguments: [string];
}
/** Destroys `t.` If `t` holds a value, return it. Returns `default` otherwise */
export function destroyWithDefault<Element extends BcsType<any>>(
	options: DestroyWithDefaultOptions<Element>,
) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [
		`0x1::option::Option<${options.typeArguments[0]}>`,
		`${options.typeArguments[0]}`,
	] satisfies (string | null)[];
	const parameterNames = ['t', 'default'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'destroy_with_default',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DestroySomeArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
}
export interface DestroySomeOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: DestroySomeArguments<Element> | [t: RawTransactionArgument<Element | null>];
	typeArguments: [string];
}
/** Unpack `t` and return its contents Aborts if `t` does not hold a value */
export function destroySome<Element extends BcsType<any>>(options: DestroySomeOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`0x1::option::Option<${options.typeArguments[0]}>`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'destroy_some',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DestroyNoneArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
}
export interface DestroyNoneOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: DestroyNoneArguments<Element> | [t: RawTransactionArgument<Element | null>];
	typeArguments: [string];
}
/** Unpack `t` Aborts if `t` holds a value */
export function destroyNone<Element extends BcsType<any>>(options: DestroyNoneOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`0x1::option::Option<${options.typeArguments[0]}>`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'destroy_none',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ToVecArguments<Element extends BcsType<any>> {
	t: RawTransactionArgument<Element | null>;
}
export interface ToVecOptions<Element extends BcsType<any>> {
	package?: string;
	arguments: ToVecArguments<Element> | [t: RawTransactionArgument<Element | null>];
	typeArguments: [string];
}
/**
 * Convert `t` into a vector of length 1 if it is `Some`, and an empty vector
 * otherwise
 */
export function toVec<Element extends BcsType<any>>(options: ToVecOptions<Element>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`0x1::option::Option<${options.typeArguments[0]}>`] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['t'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'option',
			function: 'to_vec',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
