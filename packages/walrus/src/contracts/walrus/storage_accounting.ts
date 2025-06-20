// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as balance from './deps/sui/balance.js';
export function FutureAccounting() {
	return bcs.struct('FutureAccounting', {
		epoch: bcs.u32(),
		/**
		 * This field stores `used_capacity` for the epoch. Currently, impossible to rename
		 * due to package upgrade limitations.
		 */
		used_capacity: bcs.u64(),
		rewards_to_distribute: balance.Balance(),
	});
}
export function FutureAccountingRingBuffer() {
	return bcs.struct('FutureAccountingRingBuffer', {
		current_index: bcs.u32(),
		length: bcs.u32(),
		ring_buffer: bcs.vector(FutureAccounting()),
	});
}
export function init(packageAddress: string) {
	/** The maximum number of epochs for which we can use `self`. */
	function max_epochs_ahead(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [
			`${packageAddress}::storage_accounting::FutureAccountingRingBuffer`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'max_epochs_ahead',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Read-only lookup for an element in the `FutureAccountingRingBuffer` */
	function ring_lookup(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			epochs_in_future: RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_accounting::FutureAccountingRingBuffer`,
			'u32',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'ring_lookup',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Accessor for epoch, read-only. */
	function epoch(options: { arguments: [accounting: RawTransactionArgument<string>] }) {
		const argumentsTypes = [
			`${packageAddress}::storage_accounting::FutureAccounting`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Accessor for used_capacity, read-only. */
	function used_capacity(options: { arguments: [accounting: RawTransactionArgument<string>] }) {
		const argumentsTypes = [
			`${packageAddress}::storage_accounting::FutureAccounting`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'used_capacity',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Accessor for rewards, read-only. */
	function rewards(options: { arguments: [accounting: RawTransactionArgument<string>] }) {
		const argumentsTypes = [
			`${packageAddress}::storage_accounting::FutureAccounting`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'rewards',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return { max_epochs_ahead, ring_lookup, epoch, used_capacity, rewards };
}
