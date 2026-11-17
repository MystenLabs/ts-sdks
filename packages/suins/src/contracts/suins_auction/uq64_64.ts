/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines an unsigned, fixed-point numeric type with a 64-bit integer part and a
 * 64-bit fractional part. The notation `uq64_64` and `UQ64_64` is based on
 * [Q notation](<https://en.wikipedia.org/wiki/Q_(number_format)>). `q` indicates
 * it a fixed-point number. The `u` prefix indicates it is unsigned. The `64_64`
 * suffix indicates the number of bits, where the first number indicates the number
 * of bits in the integer part, and the second the number of bits in the fractional
 * part--in this case 64 bits for each.
 */

import { MoveTuple, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/auction::uq64_64';
export const UQ64_64 = new MoveTuple({ name: `${$moduleName}::UQ64_64`, fields: [bcs.u128()] });
export interface FromQuotientArguments {
	numerator: RawTransactionArgument<number | bigint>;
	denominator: RawTransactionArgument<number | bigint>;
}
export interface FromQuotientOptions {
	package?: string;
	arguments:
		| FromQuotientArguments
		| [
				numerator: RawTransactionArgument<number | bigint>,
				denominator: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Create a fixed-point value from a quotient specified by its numerator and
 * denominator. `from_quotient` and `from_int` should be preferred over using
 * `from_raw`. Unless the denominator is a power of two, fractions can not be
 * represented accurately, so be careful about rounding errors. Aborts if the
 * denominator is zero. Aborts if the input is non-zero but so small that it will
 * be represented as zero, e.g. smaller than 2^{-64}. Aborts if the input is too
 * large, e.g. larger than or equal to 2^64.
 */
export function fromQuotient(options: FromQuotientOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u128', 'u128'] satisfies (string | null)[];
	const parameterNames = ['numerator', 'denominator'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'from_quotient',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FromIntArguments {
	integer: RawTransactionArgument<number | bigint>;
}
export interface FromIntOptions {
	package?: string;
	arguments: FromIntArguments | [integer: RawTransactionArgument<number | bigint>];
}
/**
 * Create a fixed-point value from an integer. `from_int` and `from_quotient`
 * should be preferred over using `from_raw`.
 */
export function fromInt(options: FromIntOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u64'] satisfies (string | null)[];
	const parameterNames = ['integer'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'from_int',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AddArguments {
	a: RawTransactionArgument<string>;
	b: RawTransactionArgument<string>;
}
export interface AddOptions {
	package?: string;
	arguments: AddArguments | [a: RawTransactionArgument<string>, b: RawTransactionArgument<string>];
}
/** Add two fixed-point numbers, `a + b`. Aborts if the sum overflows. */
export function add(options: AddOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['a', 'b'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SubArguments {
	a: RawTransactionArgument<string>;
	b: RawTransactionArgument<string>;
}
export interface SubOptions {
	package?: string;
	arguments: SubArguments | [a: RawTransactionArgument<string>, b: RawTransactionArgument<string>];
}
/** Subtract two fixed-point numbers, `a - b`. Aborts if `a < b`. */
export function sub(options: SubOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['a', 'b'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'sub',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MulArguments {
	a: RawTransactionArgument<string>;
	b: RawTransactionArgument<string>;
}
export interface MulOptions {
	package?: string;
	arguments: MulArguments | [a: RawTransactionArgument<string>, b: RawTransactionArgument<string>];
}
/**
 * Multiply two fixed-point numbers, truncating any fractional part of the product.
 * Aborts if the product overflows.
 */
export function mul(options: MulOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['a', 'b'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DivArguments {
	a: RawTransactionArgument<string>;
	b: RawTransactionArgument<string>;
}
export interface DivOptions {
	package?: string;
	arguments: DivArguments | [a: RawTransactionArgument<string>, b: RawTransactionArgument<string>];
}
/**
 * Divide two fixed-point numbers, truncating any fractional part of the quotient.
 * Aborts if the divisor is zero. Aborts if the quotient overflows.
 */
export function div(options: DivOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['a', 'b'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToIntArguments {
	a: RawTransactionArgument<string>;
}
export interface ToIntOptions {
	package?: string;
	arguments: ToIntArguments | [a: RawTransactionArgument<string>];
}
/** Convert a fixed-point number to an integer, truncating any fractional part. */
export function toInt(options: ToIntOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['a'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'to_int',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IntMulArguments {
	val: RawTransactionArgument<number | bigint>;
	multiplier: RawTransactionArgument<string>;
}
export interface IntMulOptions {
	package?: string;
	arguments:
		| IntMulArguments
		| [val: RawTransactionArgument<number | bigint>, multiplier: RawTransactionArgument<string>];
}
/**
 * Multiply a `u128` integer by a fixed-point number, truncating any fractional
 * part of the product. Aborts if the product overflows.
 */
export function intMul(options: IntMulOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u128', null] satisfies (string | null)[];
	const parameterNames = ['val', 'multiplier'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'int_mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IntDivArguments {
	val: RawTransactionArgument<number | bigint>;
	divisor: RawTransactionArgument<string>;
}
export interface IntDivOptions {
	package?: string;
	arguments:
		| IntDivArguments
		| [val: RawTransactionArgument<number | bigint>, divisor: RawTransactionArgument<string>];
}
/**
 * Divide a `u128` integer by a fixed-point number, truncating any fractional part
 * of the quotient. Aborts if the divisor is zero. Aborts if the quotient
 * overflows.
 */
export function intDiv(options: IntDivOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u128', null] satisfies (string | null)[];
	const parameterNames = ['val', 'divisor'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'int_div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LeArguments {
	a: RawTransactionArgument<string>;
	b: RawTransactionArgument<string>;
}
export interface LeOptions {
	package?: string;
	arguments: LeArguments | [a: RawTransactionArgument<string>, b: RawTransactionArgument<string>];
}
/** Less than or equal to. Returns `true` if and only if `a <= a`. */
export function le(options: LeOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['a', 'b'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'le',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LtArguments {
	a: RawTransactionArgument<string>;
	b: RawTransactionArgument<string>;
}
export interface LtOptions {
	package?: string;
	arguments: LtArguments | [a: RawTransactionArgument<string>, b: RawTransactionArgument<string>];
}
/** Less than. Returns `true` if and only if `a < b`. */
export function lt(options: LtOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['a', 'b'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'lt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GeArguments {
	a: RawTransactionArgument<string>;
	b: RawTransactionArgument<string>;
}
export interface GeOptions {
	package?: string;
	arguments: GeArguments | [a: RawTransactionArgument<string>, b: RawTransactionArgument<string>];
}
/** Greater than or equal to. Returns `true` if and only if `a >= b`. */
export function ge(options: GeOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['a', 'b'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'ge',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GtArguments {
	a: RawTransactionArgument<string>;
	b: RawTransactionArgument<string>;
}
export interface GtOptions {
	package?: string;
	arguments: GtArguments | [a: RawTransactionArgument<string>, b: RawTransactionArgument<string>];
}
/** Greater than. Returns `true` if and only if `a > b`. */
export function gt(options: GtOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['a', 'b'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'gt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToRawArguments {
	a: RawTransactionArgument<string>;
}
export interface ToRawOptions {
	package?: string;
	arguments: ToRawArguments | [a: RawTransactionArgument<string>];
}
/**
 * Accessor for the raw u128 value. Can be paired with `from_raw` to perform less
 * common operations on the raw values directly.
 */
export function toRaw(options: ToRawOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['a'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'to_raw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FromRawArguments {
	rawValue: RawTransactionArgument<number | bigint>;
}
export interface FromRawOptions {
	package?: string;
	arguments: FromRawArguments | [rawValue: RawTransactionArgument<number | bigint>];
}
/**
 * Accessor for the raw u128 value. Can be paired with `to_raw` to perform less
 * common operations on the raw values directly.
 */
export function fromRaw(options: FromRawOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u128'] satisfies (string | null)[];
	const parameterNames = ['rawValue'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'uq64_64',
			function: 'from_raw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
