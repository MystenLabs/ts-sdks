// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
export function Storage() {
	return bcs.struct('Storage', {
		id: object.UID(),
		start_epoch: bcs.u32(),
		end_epoch: bcs.u32(),
		storage_size: bcs.u64(),
	});
}
export function init(packageAddress: string) {
	function start_epoch(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'start_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function end_epoch(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'end_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function size(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Splits the storage object into two based on `split_epoch`.
	 *
	 * `storage` is modified to cover the period from `start_epoch` to `split_epoch`
	 * and a new storage object covering `split_epoch` to `end_epoch` is returned.
	 */
	function split_by_epoch(options: {
		arguments: [
			storage: RawTransactionArgument<string>,
			split_epoch: RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_resource::Storage`,
			'u32',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'split_by_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Splits the storage object into two based on `split_size`.
	 *
	 * `storage` is modified to cover `split_size` and a new object covering
	 * `storage.storage_size - split_size` is created.
	 */
	function split_by_size(options: {
		arguments: [
			storage: RawTransactionArgument<string>,
			split_size: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_resource::Storage`,
			'u64',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'split_by_size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Fuse two storage objects that cover adjacent periods with the same storage size. */
	function fuse_periods(options: {
		arguments: [first: RawTransactionArgument<string>, second: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_resource::Storage`,
			`${packageAddress}::storage_resource::Storage`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'fuse_periods',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Fuse two storage objects that cover the same period. */
	function fuse_amount(options: {
		arguments: [first: RawTransactionArgument<string>, second: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_resource::Storage`,
			`${packageAddress}::storage_resource::Storage`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'fuse_amount',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Fuse two storage objects that either cover the same period or adjacent periods
	 * with the same storage size.
	 */
	function fuse(options: {
		arguments: [first: RawTransactionArgument<string>, second: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_resource::Storage`,
			`${packageAddress}::storage_resource::Storage`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_resource',
				function: 'fuse',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Destructor for [Storage] objects. */
	function destroy(options: { arguments: [storage: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_resource::Storage`] satisfies string[];
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
		size,
		split_by_epoch,
		split_by_size,
		fuse_periods,
		fuse_amount,
		fuse,
		destroy,
	};
}
