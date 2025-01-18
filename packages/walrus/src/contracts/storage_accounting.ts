// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as balance from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/balance.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function FutureAccounting() {
	return bcs.struct('FutureAccounting', {
		epoch: bcs.u32(),
		storage_to_reclaim: bcs.u64(),
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
	function new_future_accounting(options: {
		arguments: [
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'u32',
			'u64',
			`0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<${packageAddress}::wal::WAL>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'new_future_accounting',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function epoch(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_accounting::FutureAccounting`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function storage_to_reclaim(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_accounting::FutureAccounting`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'storage_to_reclaim',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function increase_storage_to_reclaim(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = [`${packageAddress}::storage_accounting::FutureAccounting`, 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'increase_storage_to_reclaim',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function decrease_storage_to_reclaim(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = [`${packageAddress}::storage_accounting::FutureAccounting`, 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'decrease_storage_to_reclaim',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function rewards_balance(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_accounting::FutureAccounting`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'rewards_balance',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function delete_empty_future_accounting(options: {
		arguments: [RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::storage_accounting::FutureAccounting`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'delete_empty_future_accounting',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function unwrap_balance(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_accounting::FutureAccounting`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'unwrap_balance',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function ring_new(options: { arguments: [RawTransactionArgument<number>] }) {
		const argumentsTypes = ['u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'ring_new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function ring_lookup_mut(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_accounting::FutureAccountingRingBuffer`,
			'u32',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'ring_lookup_mut',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function ring_pop_expand(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_accounting::FutureAccountingRingBuffer`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'ring_pop_expand',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function max_epochs_ahead(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_accounting::FutureAccountingRingBuffer`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_accounting',
				function: 'max_epochs_ahead',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		new_future_accounting,
		epoch,
		storage_to_reclaim,
		increase_storage_to_reclaim,
		decrease_storage_to_reclaim,
		rewards_balance,
		delete_empty_future_accounting,
		unwrap_balance,
		ring_new,
		ring_lookup_mut,
		ring_pop_expand,
		max_epochs_ahead,
	};
}
