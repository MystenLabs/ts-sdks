/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** A module to introduce `range` checks for the rules. */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '@suins/coupons::range';
export const Range = new MoveStruct({
	name: `${$moduleName}::Range`,
	fields: {
		vec: bcs.vector(bcs.u8()),
	},
});
export interface NewArguments {
	from: RawTransactionArgument<number>;
	to: RawTransactionArgument<number>;
}
export interface NewOptions {
	package?: string;
	arguments:
		| NewArguments
		| [from: RawTransactionArgument<number>, to: RawTransactionArgument<number>];
}
/** a new Range constructor[from, to] */
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = ['u8', 'u8'] satisfies (string | null)[];
	const parameterNames = ['from', 'to'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'range',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsInRangeArguments {
	range: TransactionArgument;
	number: RawTransactionArgument<number>;
}
export interface IsInRangeOptions {
	package?: string;
	arguments:
		| IsInRangeArguments
		| [range: TransactionArgument, number: RawTransactionArgument<number>];
}
export function isInRange(options: IsInRangeOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [null, 'u8'] satisfies (string | null)[];
	const parameterNames = ['range', 'number'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'range',
			function: 'is_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FromArguments {
	range: TransactionArgument;
}
export interface FromOptions {
	package?: string;
	arguments: FromArguments | [range: TransactionArgument];
}
/** Get floor limit for the range. */
export function _from(options: FromOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['range'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'range',
			function: 'from',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToArguments {
	range: TransactionArgument;
}
export interface ToOptions {
	package?: string;
	arguments: ToArguments | [range: TransactionArgument];
}
/** Get upper limit for the range. */
export function to(options: ToOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['range'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'range',
			function: 'to',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
