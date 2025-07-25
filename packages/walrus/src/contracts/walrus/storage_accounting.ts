// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import * as balance from './deps/sui/balance.js';
const $moduleName = '@local-pkg/walrus::storage_accounting';
export const FutureAccounting = new MoveStruct(`${$moduleName}::FutureAccounting`, {
	epoch: bcs.u32(),
	/**
	 * This field stores `used_capacity` for the epoch. Currently, impossible to rename
	 * due to package upgrade limitations.
	 */
	used_capacity: bcs.u64(),
	rewards_to_distribute: balance.Balance,
});
export const FutureAccountingRingBuffer = new MoveStruct(
	`${$moduleName}::FutureAccountingRingBuffer`,
	{
		current_index: bcs.u32(),
		length: bcs.u32(),
		ring_buffer: bcs.vector(FutureAccounting),
	},
);
export interface MaxEpochsAheadArguments {
	self: RawTransactionArgument<string>;
}
export interface MaxEpochsAheadOptions {
	package?: string;
	arguments: MaxEpochsAheadArguments | [self: RawTransactionArgument<string>];
}
/** The maximum number of epochs for which we can use `self`. */
export function maxEpochsAhead(options: MaxEpochsAheadOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::storage_accounting::FutureAccountingRingBuffer`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_accounting',
			function: 'max_epochs_ahead',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RingLookupArguments {
	self: RawTransactionArgument<string>;
	epochsInFuture: RawTransactionArgument<number>;
}
export interface RingLookupOptions {
	package?: string;
	arguments:
		| RingLookupArguments
		| [self: RawTransactionArgument<string>, epochsInFuture: RawTransactionArgument<number>];
}
/** Read-only lookup for an element in the `FutureAccountingRingBuffer` */
export function ringLookup(options: RingLookupOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::storage_accounting::FutureAccountingRingBuffer`,
		'u32',
	] satisfies string[];
	const parameterNames = ['self', 'epochsInFuture'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_accounting',
			function: 'ring_lookup',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EpochArguments {
	accounting: RawTransactionArgument<string>;
}
export interface EpochOptions {
	package?: string;
	arguments: EpochArguments | [accounting: RawTransactionArgument<string>];
}
/** Accessor for epoch, read-only. */
export function epoch(options: EpochOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::storage_accounting::FutureAccounting`,
	] satisfies string[];
	const parameterNames = ['accounting'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_accounting',
			function: 'epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UsedCapacityArguments {
	accounting: RawTransactionArgument<string>;
}
export interface UsedCapacityOptions {
	package?: string;
	arguments: UsedCapacityArguments | [accounting: RawTransactionArgument<string>];
}
/** Accessor for used_capacity, read-only. */
export function usedCapacity(options: UsedCapacityOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::storage_accounting::FutureAccounting`,
	] satisfies string[];
	const parameterNames = ['accounting'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_accounting',
			function: 'used_capacity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface RewardsArguments {
	accounting: RawTransactionArgument<string>;
}
export interface RewardsOptions {
	package?: string;
	arguments: RewardsArguments | [accounting: RawTransactionArgument<string>];
}
/** Accessor for rewards, read-only. */
export function rewards(options: RewardsOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::storage_accounting::FutureAccounting`,
	] satisfies string[];
	const parameterNames = ['accounting'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_accounting',
			function: 'rewards',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
