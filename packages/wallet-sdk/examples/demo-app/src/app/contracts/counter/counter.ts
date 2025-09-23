// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This example demonstrates a basic use of a shared object. Rules:
 *
 * - anyone can create and share a counter
 * - everyone can increment a counter by 1
 * - the owner of the counter can reset it to any value
 */

import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
const $moduleName = 'demo.sui/counter::counter';
export const Counter = new MoveStruct({
	name: `${$moduleName}::Counter`,
	fields: {
		id: object.UID,
		owner: bcs.Address,
		value: bcs.u64(),
	},
});
export interface CreateOptions {
	package?: string;
	arguments?: [];
}
/** Create and share a Counter object. */
export function create(options: CreateOptions = {}) {
	const packageAddress = options.package ?? 'demo.sui/counter';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'counter',
			function: 'create',
		});
}
export interface IncrementArguments {
	counter: RawTransactionArgument<string>;
}
export interface IncrementOptions {
	package?: string;
	arguments: IncrementArguments | [counter: RawTransactionArgument<string>];
}
/** Increment a counter by 1. */
export function increment(options: IncrementOptions) {
	const packageAddress = options.package ?? 'demo.sui/counter';
	const argumentsTypes = [`${packageAddress}::counter::Counter`] satisfies string[];
	const parameterNames = ['counter'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'counter',
			function: 'increment',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetValueArguments {
	counter: RawTransactionArgument<string>;
	value: RawTransactionArgument<number | bigint>;
}
export interface SetValueOptions {
	package?: string;
	arguments:
		| SetValueArguments
		| [counter: RawTransactionArgument<string>, value: RawTransactionArgument<number | bigint>];
}
/** Set value (only runnable by the Counter owner) */
export function setValue(options: SetValueOptions) {
	const packageAddress = options.package ?? 'demo.sui/counter';
	const argumentsTypes = [`${packageAddress}::counter::Counter`, 'u64'] satisfies string[];
	const parameterNames = ['counter', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'counter',
			function: 'set_value',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
