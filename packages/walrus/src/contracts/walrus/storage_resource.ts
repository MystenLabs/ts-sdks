/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/walrus::storage_resource';
export const Storage = new MoveStruct({
	name: `${$moduleName}::Storage`,
	fields: {
		id: bcs.Address,
		start_epoch: bcs.u32(),
		end_epoch: bcs.u32(),
		storage_size: bcs.u64(),
	},
});
export interface StartEpochArguments {
	self: RawTransactionArgument<string>;
}
export interface StartEpochOptions {
	package?: string;
	arguments: StartEpochArguments | [self: RawTransactionArgument<string>];
}
export function startEpoch(options: StartEpochOptions) {
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
export interface EndEpochArguments {
	self: RawTransactionArgument<string>;
}
export interface EndEpochOptions {
	package?: string;
	arguments: EndEpochArguments | [self: RawTransactionArgument<string>];
}
export function endEpoch(options: EndEpochOptions) {
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
export interface SizeArguments {
	self: RawTransactionArgument<string>;
}
export interface SizeOptions {
	package?: string;
	arguments: SizeArguments | [self: RawTransactionArgument<string>];
}
export function size(options: SizeOptions) {
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
export interface SplitByEpochArguments {
	storage: RawTransactionArgument<string>;
	splitEpoch: RawTransactionArgument<number>;
}
export interface SplitByEpochOptions {
	package?: string;
	arguments:
		| SplitByEpochArguments
		| [storage: RawTransactionArgument<string>, splitEpoch: RawTransactionArgument<number>];
}
/**
 * Splits the storage object into two based on `split_epoch`.
 *
 * `storage` is modified to cover the period from `start_epoch` to `split_epoch`
 * and a new storage object covering `split_epoch` to `end_epoch` is returned.
 */
export function splitByEpoch(options: SplitByEpochOptions) {
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
export interface SplitBySizeArguments {
	storage: RawTransactionArgument<string>;
	splitSize: RawTransactionArgument<number | bigint>;
}
export interface SplitBySizeOptions {
	package?: string;
	arguments:
		| SplitBySizeArguments
		| [storage: RawTransactionArgument<string>, splitSize: RawTransactionArgument<number | bigint>];
}
/**
 * Splits the storage object into two based on `split_size`.
 *
 * `storage` is modified to cover `split_size` and a new object covering
 * `storage.storage_size - split_size` is created.
 */
export function splitBySize(options: SplitBySizeOptions) {
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
export interface FusePeriodsArguments {
	first: RawTransactionArgument<string>;
	second: RawTransactionArgument<string>;
}
export interface FusePeriodsOptions {
	package?: string;
	arguments:
		| FusePeriodsArguments
		| [first: RawTransactionArgument<string>, second: RawTransactionArgument<string>];
}
/** Fuse two storage objects that cover adjacent periods with the same storage size. */
export function fusePeriods(options: FusePeriodsOptions) {
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
export interface FuseAmountArguments {
	first: RawTransactionArgument<string>;
	second: RawTransactionArgument<string>;
}
export interface FuseAmountOptions {
	package?: string;
	arguments:
		| FuseAmountArguments
		| [first: RawTransactionArgument<string>, second: RawTransactionArgument<string>];
}
/** Fuse two storage objects that cover the same period. */
export function fuseAmount(options: FuseAmountOptions) {
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
export interface FuseArguments {
	first: RawTransactionArgument<string>;
	second: RawTransactionArgument<string>;
}
export interface FuseOptions {
	package?: string;
	arguments:
		| FuseArguments
		| [first: RawTransactionArgument<string>, second: RawTransactionArgument<string>];
}
/**
 * Fuse two storage objects that either cover the same period or adjacent periods
 * with the same storage size.
 */
export function fuse(options: FuseOptions) {
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
export interface DestroyArguments {
	storage: RawTransactionArgument<string>;
}
export interface DestroyOptions {
	package?: string;
	arguments: DestroyArguments | [storage: RawTransactionArgument<string>];
}
/** Destructor for [Storage] objects. */
export function destroy(options: DestroyOptions) {
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
