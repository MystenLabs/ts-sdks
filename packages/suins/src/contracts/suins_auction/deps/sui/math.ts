/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * DEPRECATED, use the each integer type's individual module instead, e.g.
 * `std::u64`
 */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface MaxArguments {
	x: RawTransactionArgument<number | bigint>;
	y: RawTransactionArgument<number | bigint>;
}
export interface MaxOptions {
	package: string;
	arguments:
		| MaxArguments
		| [x: RawTransactionArgument<number | bigint>, y: RawTransactionArgument<number | bigint>];
}
/** DEPRECATED, use `std::u64::max` instead */
export function max(options: MaxOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'max',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MinArguments {
	x: RawTransactionArgument<number | bigint>;
	y: RawTransactionArgument<number | bigint>;
}
export interface MinOptions {
	package: string;
	arguments:
		| MinArguments
		| [x: RawTransactionArgument<number | bigint>, y: RawTransactionArgument<number | bigint>];
}
/** DEPRECATED, use `std::u64::min` instead */
export function min(options: MinOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'min',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DiffArguments {
	x: RawTransactionArgument<number | bigint>;
	y: RawTransactionArgument<number | bigint>;
}
export interface DiffOptions {
	package: string;
	arguments:
		| DiffArguments
		| [x: RawTransactionArgument<number | bigint>, y: RawTransactionArgument<number | bigint>];
}
/** DEPRECATED, use `std::u64::diff` instead */
export function diff(options: DiffOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'diff',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PowArguments {
	base: RawTransactionArgument<number | bigint>;
	exponent: RawTransactionArgument<number>;
}
export interface PowOptions {
	package: string;
	arguments:
		| PowArguments
		| [base: RawTransactionArgument<number | bigint>, exponent: RawTransactionArgument<number>];
}
/** DEPRECATED, use `std::u64::pow` instead */
export function pow(options: PowOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u64', 'u8'] satisfies (string | null)[];
	const parameterNames = ['base', 'exponent'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'pow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SqrtArguments {
	x: RawTransactionArgument<number | bigint>;
}
export interface SqrtOptions {
	package: string;
	arguments: SqrtArguments | [x: RawTransactionArgument<number | bigint>];
}
/** DEPRECATED, use `std::u64::sqrt` instead */
export function sqrt(options: SqrtOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u64'] satisfies (string | null)[];
	const parameterNames = ['x'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'sqrt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SqrtU128Arguments {
	x: RawTransactionArgument<number | bigint>;
}
export interface SqrtU128Options {
	package: string;
	arguments: SqrtU128Arguments | [x: RawTransactionArgument<number | bigint>];
}
/** DEPRECATED, use `std::u128::sqrt` instead */
export function sqrtU128(options: SqrtU128Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['u128'] satisfies (string | null)[];
	const parameterNames = ['x'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'sqrt_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DivideAndRoundUpArguments {
	x: RawTransactionArgument<number | bigint>;
	y: RawTransactionArgument<number | bigint>;
}
export interface DivideAndRoundUpOptions {
	package: string;
	arguments:
		| DivideAndRoundUpArguments
		| [x: RawTransactionArgument<number | bigint>, y: RawTransactionArgument<number | bigint>];
}
/** DEPRECATED, use `std::u64::divide_and_round_up` instead */
export function divideAndRoundUp(options: DivideAndRoundUpOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'divide_and_round_up',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
