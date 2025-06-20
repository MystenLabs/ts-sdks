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
export function init(packageAddress: string) {
	/** Create a new priority queue. */
	function _new(options: { arguments: []; typeArguments: [string] }) {
		const argumentsTypes = [] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'apportionment_queue',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	/** Pop the entry with the highest priority value. */
	function pop_max(options: {
		arguments: [pq: RawTransactionArgument<string>];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`${packageAddress}::apportionment_queue::ApportionmentQueue<${options.typeArguments[0]}>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'apportionment_queue',
				function: 'pop_max',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	/** Insert a new entry into the queue. */
	function insert<T extends BcsType<any>>(options: {
		arguments: [
			pq: RawTransactionArgument<string>,
			priority: RawTransactionArgument<string>,
			tie_breaker: RawTransactionArgument<number | bigint>,
			value: RawTransactionArgument<T>,
		];
		typeArguments: [string];
	}) {
		const argumentsTypes = [
			`${packageAddress}::apportionment_queue::ApportionmentQueue<${options.typeArguments[0]}>`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::uq64_64::UQ64_64',
			'u64',
			`${options.typeArguments[0]}`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'apportionment_queue',
				function: 'insert',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
				typeArguments: options.typeArguments,
			});
	}
	return { _new, pop_max, insert };
}
