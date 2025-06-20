// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This module defines the `Committee` struct which stores the current committee
 * with shard assignments. Additionally, it manages transitions / transfers of
 * shards between committees with the least amount of changes.
 */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as vec_map from './deps/sui/vec_map.js';
export function Committee() {
	return bcs.tuple([vec_map.VecMap(bcs.Address, bcs.vector(bcs.u16()))], { name: 'Committee' });
}
export function init(packageAddress: string) {
	/** Get the shards assigned to the given `node_id`. */
	function shards(options: {
		arguments: [cmt: RawTransactionArgument<string>, node_id: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::committee::Committee`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'committee',
				function: 'shards',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Get the number of nodes in the committee. */
	function size(options: { arguments: [cmt: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::committee::Committee`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'committee',
				function: 'size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Get the inner representation of the committee. */
	function inner(options: { arguments: [cmt: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::committee::Committee`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'committee',
				function: 'inner',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Copy the inner representation of the committee. */
	function to_inner(options: { arguments: [cmt: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::committee::Committee`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'committee',
				function: 'to_inner',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return { shards, size, inner, to_inner };
}
