/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface BitwiseNotArguments {
	x: RawTransactionArgument<number>;
}
export interface BitwiseNotOptions {
	package?: string;
	arguments: BitwiseNotArguments | [x: RawTransactionArgument<number>];
}
/**
 * Returns the bitwise not of the value. Each bit that is 1 becomes 0. Each bit
 * that is 0 becomes 1.
 */
export function bitwiseNot(options: BitwiseNotOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u32'] satisfies (string | null)[];
	const parameterNames = ['x'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'u32',
			function: 'bitwise_not',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MaxArguments {
	x: RawTransactionArgument<number>;
	y: RawTransactionArgument<number>;
}
export interface MaxOptions {
	package?: string;
	arguments: MaxArguments | [x: RawTransactionArgument<number>, y: RawTransactionArgument<number>];
}
/** Return the larger of `x` and `y` */
export function max(options: MaxOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u32', 'u32'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'u32',
			function: 'max',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinArguments {
	x: RawTransactionArgument<number>;
	y: RawTransactionArgument<number>;
}
export interface MinOptions {
	package?: string;
	arguments: MinArguments | [x: RawTransactionArgument<number>, y: RawTransactionArgument<number>];
}
/** Return the smaller of `x` and `y` */
export function min(options: MinOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u32', 'u32'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'u32',
			function: 'min',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DiffArguments {
	x: RawTransactionArgument<number>;
	y: RawTransactionArgument<number>;
}
export interface DiffOptions {
	package?: string;
	arguments: DiffArguments | [x: RawTransactionArgument<number>, y: RawTransactionArgument<number>];
}
/** Return the absolute value of x - y */
export function diff(options: DiffOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u32', 'u32'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'u32',
			function: 'diff',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DivideAndRoundUpArguments {
	x: RawTransactionArgument<number>;
	y: RawTransactionArgument<number>;
}
export interface DivideAndRoundUpOptions {
	package?: string;
	arguments:
		| DivideAndRoundUpArguments
		| [x: RawTransactionArgument<number>, y: RawTransactionArgument<number>];
}
/** Calculate x / y, but round up the result. */
export function divideAndRoundUp(options: DivideAndRoundUpOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u32', 'u32'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'u32',
			function: 'divide_and_round_up',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PowArguments {
	base: RawTransactionArgument<number>;
	exponent: RawTransactionArgument<number>;
}
export interface PowOptions {
	package?: string;
	arguments:
		| PowArguments
		| [base: RawTransactionArgument<number>, exponent: RawTransactionArgument<number>];
}
/** Return the value of a base raised to a power */
export function pow(options: PowOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u32', 'u8'] satisfies (string | null)[];
	const parameterNames = ['base', 'exponent'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'u32',
			function: 'pow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SqrtArguments {
	x: RawTransactionArgument<number>;
}
export interface SqrtOptions {
	package?: string;
	arguments: SqrtArguments | [x: RawTransactionArgument<number>];
}
/**
 * Get a nearest lower integer Square Root for `x`. Given that this function can
 * only operate with integers, it is impossible to get perfect (or precise) integer
 * square root for some numbers.
 *
 * Example:
 *
 * ```
 * math::sqrt(9) => 3
 * math::sqrt(8) => 2 // the nearest lower square root is 4;
 * ```
 *
 * In integer math, one of the possible ways to get results with more precision is
 * to use higher values or temporarily multiply the value by some bigger number.
 * Ideally if this is a square of 10 or 100.
 *
 * Example:
 *
 * ```
 * math::sqrt(8) => 2;
 * math::sqrt(8 * 10000) => 282;
 * // now we can use this value as if it was 2.82;
 * // but to get the actual result, this value needs
 * // to be divided by 100 (because sqrt(10000)).
 *
 *
 * math::sqrt(8 * 1000000) => 2828; // same as above, 2828 / 1000 (2.828)
 * ```
 */
export function sqrt(options: SqrtOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u32'] satisfies (string | null)[];
	const parameterNames = ['x'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'u32',
			function: 'sqrt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TryAsU8Arguments {
	x: RawTransactionArgument<number>;
}
export interface TryAsU8Options {
	package?: string;
	arguments: TryAsU8Arguments | [x: RawTransactionArgument<number>];
}
/** Try to convert a `u32` to a `u8`. Returns `None` if the value is too large. */
export function tryAsU8(options: TryAsU8Options) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u32'] satisfies (string | null)[];
	const parameterNames = ['x'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'u32',
			function: 'try_as_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TryAsU16Arguments {
	x: RawTransactionArgument<number>;
}
export interface TryAsU16Options {
	package?: string;
	arguments: TryAsU16Arguments | [x: RawTransactionArgument<number>];
}
/** Try to convert a `u32` to a `u16`. Returns `None` if the value is too large. */
export function tryAsU16(options: TryAsU16Options) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u32'] satisfies (string | null)[];
	const parameterNames = ['x'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'u32',
			function: 'try_as_u16',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToStringArguments {
	x: RawTransactionArgument<number>;
}
export interface ToStringOptions {
	package?: string;
	arguments: ToStringArguments | [x: RawTransactionArgument<number>];
}
export function toString(options: ToStringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u32'] satisfies (string | null)[];
	const parameterNames = ['x'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'u32',
			function: 'to_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
