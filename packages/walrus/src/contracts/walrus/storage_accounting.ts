/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as balance from './deps/sui/balance.js';
const $moduleName = '@local-pkg/walrus::storage_accounting';
export const FutureAccounting = new MoveStruct({
	name: `${$moduleName}::FutureAccounting`,
	fields: {
		epoch: bcs.u32(),
		/**
		 * This field stores `used_capacity` for the epoch. Currently, impossible to rename
		 * due to package upgrade limitations.
		 */
		used_capacity: bcs.u64(),
		rewards_to_distribute: balance.Balance,
	},
});
export const FutureAccountingRingBuffer = new MoveStruct({
	name: `${$moduleName}::FutureAccountingRingBuffer`,
	fields: {
		current_index: bcs.u32(),
		length: bcs.u32(),
		ring_buffer: bcs.vector(FutureAccounting),
	},
});
export interface MaxEpochsAheadArguments {
	self: TransactionArgument;
}
export interface MaxEpochsAheadOptions {
	package?: string;
	arguments: MaxEpochsAheadArguments | [self: TransactionArgument];
}
/** The maximum number of epochs for which we can use `self`. */
export function maxEpochsAhead(options: MaxEpochsAheadOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
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
	self: TransactionArgument;
	epochsInFuture: RawTransactionArgument<number>;
}
export interface RingLookupOptions {
	package?: string;
	arguments:
		| RingLookupArguments
		| [self: TransactionArgument, epochsInFuture: RawTransactionArgument<number>];
}
/** Read-only lookup for an element in the `FutureAccountingRingBuffer` */
export function ringLookup(options: RingLookupOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, 'u32'] satisfies (string | null)[];
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
	accounting: TransactionArgument;
}
export interface EpochOptions {
	package?: string;
	arguments: EpochArguments | [accounting: TransactionArgument];
}
/** Accessor for epoch, read-only. */
export function epoch(options: EpochOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
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
	accounting: TransactionArgument;
}
export interface UsedCapacityOptions {
	package?: string;
	arguments: UsedCapacityArguments | [accounting: TransactionArgument];
}
/** Accessor for used_capacity, read-only. */
export function usedCapacity(options: UsedCapacityOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
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
	accounting: TransactionArgument;
}
export interface RewardsOptions {
	package?: string;
	arguments: RewardsArguments | [accounting: TransactionArgument];
}
/** Accessor for rewards, read-only. */
export function rewards(options: RewardsOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['accounting'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_accounting',
			function: 'rewards',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
