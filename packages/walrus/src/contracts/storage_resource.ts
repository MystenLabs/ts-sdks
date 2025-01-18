// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as object from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function Storage() {
	return bcs.struct('Storage', {
		id: object.UID(),
		start_epoch: bcs.u32(),
		end_epoch: bcs.u32(),
		storage_size: bcs.u64(),
	});
}
export function init(packageAddress: string) {
	function start_epoch(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'start_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function end_epoch(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'end_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function storage_size(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'storage_size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function create_storage(options: {
		arguments: [
			RawTransactionArgument<number>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = ['u32', 'u32', 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'create_storage',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function extend_end_epoch(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`, 'u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'extend_end_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function split_by_epoch(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`, 'u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'split_by_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function split_by_size(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`, 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'split_by_size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function fuse_periods(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_resource::Storage`,
			`${packageAddress}::storage_resource::Storage`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'fuse_periods',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function fuse_amount(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_resource::Storage`,
			`${packageAddress}::storage_resource::Storage`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'fuse_amount',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function fuse(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_resource::Storage`,
			`${packageAddress}::storage_resource::Storage`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'fuse',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function destroy(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'destroy',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		start_epoch,
		end_epoch,
		storage_size,
		create_storage,
		extend_end_epoch,
		split_by_epoch,
		split_by_size,
		fuse_periods,
		fuse_amount,
		fuse,
		destroy,
	};
}
