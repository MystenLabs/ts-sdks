// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as vec_map from '../deps/0000000000000000000000000000000000000000000000000000000000000002/vec_map.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { normalizeMoveArguments } from '../utils/index.js';

export function PendingValues() {
	return bcs.struct('PendingValues', {
		pos0: vec_map.VecMap(bcs.u32(), bcs.u64()),
	});
}
export function init(packageAddresses: { walrus: string }) {
	function empty(options: { arguments: [] }) {
		const argumentsTypes: [] = [];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddresses.walrus,
				module: 'pending_values',
				function: 'empty',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function insert_or_add(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddresses.walrus}::pending_values::PendingValues`,
			'u32',
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddresses.walrus,
				module: 'pending_values',
				function: 'insert_or_add',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function reduce(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddresses.walrus}::pending_values::PendingValues`,
			'u32',
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddresses.walrus,
				module: 'pending_values',
				function: 'reduce',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function value_at(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddresses.walrus}::pending_values::PendingValues`, 'u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddresses.walrus,
				module: 'pending_values',
				function: 'value_at',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function flush(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddresses.walrus}::pending_values::PendingValues`, 'u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddresses.walrus,
				module: 'pending_values',
				function: 'flush',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function unwrap(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddresses.walrus}::pending_values::PendingValues`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddresses.walrus,
				module: 'pending_values',
				function: 'unwrap',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function is_empty(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddresses.walrus}::pending_values::PendingValues`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddresses.walrus,
				module: 'pending_values',
				function: 'is_empty',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return { empty, insert_or_add, reduce, value_at, flush, unwrap, is_empty };
}
