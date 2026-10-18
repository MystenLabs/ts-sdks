/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module providing debug functionality. */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type BcsType } from '@mysten/sui/bcs';
export interface PrintArguments<T extends BcsType<any>> {
	x: RawTransactionArgument<T>;
}
export interface PrintOptions<T extends BcsType<any>> {
	package?: string;
	arguments: PrintArguments<T> | [x: RawTransactionArgument<T>];
	typeArguments: [string];
}
export function print<T extends BcsType<any>>(options: PrintOptions<T>) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['x'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'debug',
			function: 'print',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PrintStackTraceOptions {
	package?: string;
	arguments?: [];
}
export function printStackTrace(options: PrintStackTraceOptions = {}) {
	const packageAddress = options.package ?? '@suins/auction';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'debug',
			function: 'print_stack_trace',
		});
}
