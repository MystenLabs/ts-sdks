/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface MaxOptions {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number | bigint>];
}
export function max(options: MaxOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u64', 'u64'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'max',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface MinOptions {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number | bigint>];
}
export function min(options: MinOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u64', 'u64'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'min',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DiffOptions {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number | bigint>];
}
export function diff(options: DiffOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u64', 'u64'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'diff',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PowOptions {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number>];
}
export function pow(options: PowOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u64', 'u8'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'pow',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface SqrtOptions {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>];
}
export function sqrt(options: SqrtOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u64'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'sqrt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface SqrtU128Options {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>];
}
export function sqrtU128(options: SqrtU128Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u128'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'sqrt_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DivideAndRoundUpOptions {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number | bigint>];
}
export function divideAndRoundUp(options: DivideAndRoundUpOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u64', 'u64'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'math',
			function: 'divide_and_round_up',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
