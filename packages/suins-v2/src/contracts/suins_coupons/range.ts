// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** A module to introduce `range` checks for the rules. */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
export function Range() {
	return bcs.struct('Range', {
		vec: bcs.vector(bcs.u8()),
	});
}
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
	const argumentsTypes = ['u8', 'u8'] satisfies string[];
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
	range: RawTransactionArgument<string>;
	number: RawTransactionArgument<number>;
}
export interface IsInRangeOptions {
	package?: string;
	arguments:
		| IsInRangeArguments
		| [range: RawTransactionArgument<string>, number: RawTransactionArgument<number>];
}
export function isInRange(options: IsInRangeOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::range::Range`, 'u8'] satisfies string[];
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
	range: RawTransactionArgument<string>;
}
export interface FromOptions {
	package?: string;
	arguments: FromArguments | [range: RawTransactionArgument<string>];
}
/** Get floor limit for the range. */
export function _from(options: FromOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::range::Range`] satisfies string[];
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
	range: RawTransactionArgument<string>;
}
export interface ToOptions {
	package?: string;
	arguments: ToArguments | [range: RawTransactionArgument<string>];
}
/** Get upper limit for the range. */
export function to(options: ToOptions) {
	const packageAddress = options.package ?? '@suins/coupons';
	const argumentsTypes = [`${packageAddress}::range::Range`] satisfies string[];
	const parameterNames = ['range'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'range',
			function: 'to',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
