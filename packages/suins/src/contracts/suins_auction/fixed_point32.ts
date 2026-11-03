/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines a fixed-point numeric type with a 32-bit integer part and a 32-bit
 * fractional part.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/auction::fixed_point32';
export const FixedPoint32 = new MoveStruct({
	name: `${$moduleName}::FixedPoint32`,
	fields: {
		value: bcs.u64(),
	},
});
export interface MultiplyU64Arguments {
	val: RawTransactionArgument<number | bigint>;
	multiplier: RawTransactionArgument<string>;
}
export interface MultiplyU64Options {
	package?: string;
	arguments:
		| MultiplyU64Arguments
		| [val: RawTransactionArgument<number | bigint>, multiplier: RawTransactionArgument<string>];
}
/**
 * Multiply a u64 integer by a fixed-point number, truncating any fractional part
 * of the product. This will abort if the product overflows.
 */
export function multiplyU64(options: MultiplyU64Options) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u64', null] satisfies (string | null)[];
	const parameterNames = ['val', 'multiplier'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fixed_point32',
			function: 'multiply_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DivideU64Arguments {
	val: RawTransactionArgument<number | bigint>;
	divisor: RawTransactionArgument<string>;
}
export interface DivideU64Options {
	package?: string;
	arguments:
		| DivideU64Arguments
		| [val: RawTransactionArgument<number | bigint>, divisor: RawTransactionArgument<string>];
}
/**
 * Divide a u64 integer by a fixed-point number, truncating any fractional part of
 * the quotient. This will abort if the divisor is zero or if the quotient
 * overflows.
 */
export function divideU64(options: DivideU64Options) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u64', null] satisfies (string | null)[];
	const parameterNames = ['val', 'divisor'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fixed_point32',
			function: 'divide_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateFromRationalArguments {
	numerator: RawTransactionArgument<number | bigint>;
	denominator: RawTransactionArgument<number | bigint>;
}
export interface CreateFromRationalOptions {
	package?: string;
	arguments:
		| CreateFromRationalArguments
		| [
				numerator: RawTransactionArgument<number | bigint>,
				denominator: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Create a fixed-point value from a rational number specified by its numerator and
 * denominator. Calling this function should be preferred for using
 * `Self::create_from_raw_value` which is also available. This will abort if the
 * denominator is zero. It will also abort if the numerator is nonzero and the
 * ratio is not in the range 2^-32 .. 2^32-1. When specifying decimal fractions, be
 * careful about rounding errors: if you round to display N digits after the
 * decimal point, you can use a denominator of 10^N to avoid numbers where the very
 * small imprecision in the binary representation could change the rounding, e.g.,
 * 0.0125 will round down to 0.012 instead of up to 0.013.
 */
export function createFromRational(options: CreateFromRationalOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['numerator', 'denominator'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fixed_point32',
			function: 'create_from_rational',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CreateFromRawValueArguments {
	value: RawTransactionArgument<number | bigint>;
}
export interface CreateFromRawValueOptions {
	package?: string;
	arguments: CreateFromRawValueArguments | [value: RawTransactionArgument<number | bigint>];
}
/** Create a fixedpoint value from a raw value. */
export function createFromRawValue(options: CreateFromRawValueOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u64'] satisfies (string | null)[];
	const parameterNames = ['value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fixed_point32',
			function: 'create_from_raw_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GetRawValueArguments {
	num: RawTransactionArgument<string>;
}
export interface GetRawValueOptions {
	package?: string;
	arguments: GetRawValueArguments | [num: RawTransactionArgument<string>];
}
/**
 * Accessor for the raw u64 value. Other less common operations, such as adding or
 * subtracting FixedPoint32 values, can be done using the raw values directly.
 */
export function getRawValue(options: GetRawValueOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['num'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fixed_point32',
			function: 'get_raw_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsZeroArguments {
	num: RawTransactionArgument<string>;
}
export interface IsZeroOptions {
	package?: string;
	arguments: IsZeroArguments | [num: RawTransactionArgument<string>];
}
/** Returns true if the ratio is zero. */
export function isZero(options: IsZeroOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['num'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'fixed_point32',
			function: 'is_zero',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
