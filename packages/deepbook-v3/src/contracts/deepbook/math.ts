/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface MulArguments {
	x: RawTransactionArgument<number | bigint>;
	y: RawTransactionArgument<number | bigint>;
}
export interface MulOptions {
	package?: string;
	arguments:
		| MulArguments
		| [x: RawTransactionArgument<number | bigint>, y: RawTransactionArgument<number | bigint>];
}
/** Multiply two floating numbers. This function will round down the result. */
export function mul(options: MulOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MulU128Arguments {
	x: RawTransactionArgument<number | bigint>;
	y: RawTransactionArgument<number | bigint>;
}
export interface MulU128Options {
	package?: string;
	arguments:
		| MulU128Arguments
		| [x: RawTransactionArgument<number | bigint>, y: RawTransactionArgument<number | bigint>];
}
export function mulU128(options: MulU128Options) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['u128', 'u128'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'mul_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MulRoundUpArguments {
	x: RawTransactionArgument<number | bigint>;
	y: RawTransactionArgument<number | bigint>;
}
export interface MulRoundUpOptions {
	package?: string;
	arguments:
		| MulRoundUpArguments
		| [x: RawTransactionArgument<number | bigint>, y: RawTransactionArgument<number | bigint>];
}
/** Multiply two floating numbers. This function will round up the result. */
export function mulRoundUp(options: MulRoundUpOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'mul_round_up',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DivArguments {
	x: RawTransactionArgument<number | bigint>;
	y: RawTransactionArgument<number | bigint>;
}
export interface DivOptions {
	package?: string;
	arguments:
		| DivArguments
		| [x: RawTransactionArgument<number | bigint>, y: RawTransactionArgument<number | bigint>];
}
/** Divide two floating numbers. This function will round down the result. */
export function div(options: DivOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DivU128Arguments {
	x: RawTransactionArgument<number | bigint>;
	y: RawTransactionArgument<number | bigint>;
}
export interface DivU128Options {
	package?: string;
	arguments:
		| DivU128Arguments
		| [x: RawTransactionArgument<number | bigint>, y: RawTransactionArgument<number | bigint>];
}
export function divU128(options: DivU128Options) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['u128', 'u128'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'div_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DivRoundUpArguments {
	x: RawTransactionArgument<number | bigint>;
	y: RawTransactionArgument<number | bigint>;
}
export interface DivRoundUpOptions {
	package?: string;
	arguments:
		| DivRoundUpArguments
		| [x: RawTransactionArgument<number | bigint>, y: RawTransactionArgument<number | bigint>];
}
/** Divide two floating numbers. This function will round up the result. */
export function divRoundUp(options: DivRoundUpOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['x', 'y'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'div_round_up',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MedianArguments {
	v: RawTransactionArgument<number | bigint[]>;
}
export interface MedianOptions {
	package?: string;
	arguments: MedianArguments | [v: RawTransactionArgument<number | bigint[]>];
}
/** given a vector of u128, return the median */
export function median(options: MedianOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['vector<u128>'] satisfies (string | null)[];
	const parameterNames = ['v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'median',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SqrtArguments {
	x: RawTransactionArgument<number | bigint>;
	precision: RawTransactionArgument<number | bigint>;
}
export interface SqrtOptions {
	package?: string;
	arguments:
		| SqrtArguments
		| [
				x: RawTransactionArgument<number | bigint>,
				precision: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Computes the integer square root of a scaled u64 value, assuming the original
 * value is scaled by precision. The result will be in the same floating-point
 * representation.
 */
export function sqrt(options: SqrtOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['x', 'precision'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'sqrt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsPowerOfTenArguments {
	n: RawTransactionArgument<number | bigint>;
}
export interface IsPowerOfTenOptions {
	package?: string;
	arguments: IsPowerOfTenArguments | [n: RawTransactionArgument<number | bigint>];
}
export function isPowerOfTen(options: IsPowerOfTenOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = ['u64'] satisfies (string | null)[];
	const parameterNames = ['n'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'is_power_of_ten',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
