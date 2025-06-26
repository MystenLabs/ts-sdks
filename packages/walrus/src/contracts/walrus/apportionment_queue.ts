// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A custom priority queue implementation for use in the apportionment algorithm.
 * This implementation uses a quotient-based priority with a tie-breaker to break
 * ties when priorities are equal.
 */

import { bcs } from '@mysten/sui/bcs';
import type { BcsType } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as uq64_64 from './deps/std/uq64_64.js';
/** Struct representing a priority queue. */
export function ApportionmentQueue<T extends BcsType<any>>(...typeParameters: [T]) {
	return bcs.struct('ApportionmentQueue', {
		/**
		 * The `entries` vector contains a max heap, where the children of the node at
		 * index `i` are at indices `2 * i + 1` and `2 * i + 2`. INV: The parent node's
		 * priority is always higher or equal to its child nodes' priorities.
		 */
		entries: bcs.vector(Entry(typeParameters[0])),
	});
}
export function Entry<T extends BcsType<any>>(...typeParameters: [T]) {
	return bcs.struct('Entry', {
		priority: uq64_64.UQ64_64(),
		tie_breaker: bcs.u64(),
		value: typeParameters[0],
	});
}
export interface NewOptions {
	package?: string;
	arguments: [];
	typeArguments: [string];
}
/** Create a new priority queue. */
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'apportionment_queue',
			function: 'new',
			typeArguments: options.typeArguments,
		});
}
export interface PopMaxArguments {
	pq: RawTransactionArgument<string>;
}
export interface PopMaxOptions {
	package?: string;
	arguments: PopMaxArguments | [pq: RawTransactionArgument<string>];
	typeArguments: [string];
}
/** Pop the entry with the highest priority value. */
export function popMax(options: PopMaxOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::apportionment_queue::ApportionmentQueue<${options.typeArguments[0]}>`,
	] satisfies string[];
	const parameterNames = ['pq'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'apportionment_queue',
			function: 'pop_max',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface InsertArguments<T extends BcsType<any>> {
	pq: RawTransactionArgument<string>;
	priority: RawTransactionArgument<string>;
	tieBreaker: RawTransactionArgument<number | bigint>;
	value: RawTransactionArgument<T>;
}
export interface InsertOptions<T extends BcsType<any>> {
	package?: string;
	arguments:
		| InsertArguments<T>
		| [
				pq: RawTransactionArgument<string>,
				priority: RawTransactionArgument<string>,
				tieBreaker: RawTransactionArgument<number | bigint>,
				value: RawTransactionArgument<T>,
		  ];
	typeArguments: [string];
}
/** Insert a new entry into the queue. */
export function insert<T extends BcsType<any>>(options: InsertOptions<T>) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::apportionment_queue::ApportionmentQueue<${options.typeArguments[0]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::uq64_64::UQ64_64',
		'u64',
		`${options.typeArguments[0]}`,
	] satisfies string[];
	const parameterNames = ['pq', 'priority', 'tieBreaker', 'value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'apportionment_queue',
			function: 'insert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
