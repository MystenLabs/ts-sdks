/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
export function Storage() {
	return bcs.struct('Storage', {
		id: object.UID(),
		start_epoch: bcs.u32(),
		end_epoch: bcs.u32(),
		storage_size: bcs.u64(),
	});
}
export function start_epoch(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_resource::Storage`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_resource',
			function: 'start_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function end_epoch(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_resource::Storage`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_resource',
			function: 'end_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export function size(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_resource::Storage`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_resource',
			function: 'size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Split the storage object into two based on `split_epoch`
 *
 * `storage` is modified to cover the period from `start_epoch` to `split_epoch`
 * and a new storage object covering `split_epoch` to `end_epoch` is returned.
 */
export function split_by_epoch(options: {
	package?: string;
	arguments:
		| [storage: RawTransactionArgument<string>, splitEpoch: RawTransactionArgument<number>]
		| {
				storage: RawTransactionArgument<string>;
				splitEpoch: RawTransactionArgument<number>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_resource::Storage`, 'u32'] satisfies string[];
	const parameterNames = ['storage', 'splitEpoch'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_resource',
			function: 'split_by_epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Split the storage object into two based on `split_size`
 *
 * `storage` is modified to cover `split_size` and a new object covering
 * `storage.storage_size - split_size` is created.
 */
export function split_by_size(options: {
	package?: string;
	arguments:
		| [storage: RawTransactionArgument<string>, splitSize: RawTransactionArgument<number | bigint>]
		| {
				storage: RawTransactionArgument<string>;
				splitSize: RawTransactionArgument<number | bigint>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_resource::Storage`, 'u64'] satisfies string[];
	const parameterNames = ['storage', 'splitSize'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_resource',
			function: 'split_by_size',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Fuse two storage objects that cover adjacent periods with the same storage size. */
export function fuse_periods(options: {
	package?: string;
	arguments:
		| [first: RawTransactionArgument<string>, second: RawTransactionArgument<string>]
		| {
				first: RawTransactionArgument<string>;
				second: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::storage_resource::Storage`,
		`${packageAddress}::storage_resource::Storage`,
	] satisfies string[];
	const parameterNames = ['first', 'second'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_resource',
			function: 'fuse_periods',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Fuse two storage objects that cover the same period */
export function fuse_amount(options: {
	package?: string;
	arguments:
		| [first: RawTransactionArgument<string>, second: RawTransactionArgument<string>]
		| {
				first: RawTransactionArgument<string>;
				second: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::storage_resource::Storage`,
		`${packageAddress}::storage_resource::Storage`,
	] satisfies string[];
	const parameterNames = ['first', 'second'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_resource',
			function: 'fuse_amount',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/**
 * Fuse two storage objects that either cover the same period or adjacent periods
 * with the same storage size.
 */
export function fuse(options: {
	package?: string;
	arguments:
		| [first: RawTransactionArgument<string>, second: RawTransactionArgument<string>]
		| {
				first: RawTransactionArgument<string>;
				second: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::storage_resource::Storage`,
		`${packageAddress}::storage_resource::Storage`,
	] satisfies string[];
	const parameterNames = ['first', 'second'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_resource',
			function: 'fuse',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
/** Destructor for [Storage] objects */
export function destroy(options: {
	package?: string;
	arguments:
		| [storage: RawTransactionArgument<string>]
		| {
				storage: RawTransactionArgument<string>;
		  };
}) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::storage_resource::Storage`] satisfies string[];
	const parameterNames = ['storage'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'storage_resource',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
