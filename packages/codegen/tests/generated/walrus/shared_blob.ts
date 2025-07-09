/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { type Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
import * as blob from './blob.js';
import * as balance from './deps/sui/balance.js';
const $moduleName = '@local-pkg/walrus::shared_blob';
export const SharedBlob = new MoveStruct(`${$moduleName}::SharedBlob`, {
	id: object.UID,
	blob: blob.Blob,
	funds: balance.Balance(),
});
export interface NewArguments {
	blob: RawTransactionArgument<string>;
}
export interface NewOptions {
	package?: string;
	arguments: NewArguments | [blob: RawTransactionArgument<string>];
}
/** Shares the provided `blob` as a `SharedBlob` with zero funds. */
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
	const parameterNames = ['blob'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'shared_blob',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewFundedArguments {
	blob: RawTransactionArgument<string>;
	funds: RawTransactionArgument<string>;
}
export interface NewFundedOptions {
	package?: string;
	arguments:
		| NewFundedArguments
		| [blob: RawTransactionArgument<string>, funds: RawTransactionArgument<string>];
}
/** Shares the provided `blob` as a `SharedBlob` with funds. */
export function newFunded(options: NewFundedOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::blob::Blob`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['blob', 'funds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'shared_blob',
			function: 'new_funded',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FundArguments {
	self: RawTransactionArgument<string>;
	addedFunds: RawTransactionArgument<string>;
}
export interface FundOptions {
	package?: string;
	arguments:
		| FundArguments
		| [self: RawTransactionArgument<string>, addedFunds: RawTransactionArgument<string>];
}
/** Adds the provided `Coin` to the stored funds. */
export function fund(options: FundOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::shared_blob::SharedBlob`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
	] satisfies string[];
	const parameterNames = ['self', 'addedFunds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'shared_blob',
			function: 'fund',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExtendArguments {
	self: RawTransactionArgument<string>;
	system: RawTransactionArgument<string>;
	extendedEpochs: RawTransactionArgument<number>;
}
export interface ExtendOptions {
	package?: string;
	arguments:
		| ExtendArguments
		| [
				self: RawTransactionArgument<string>,
				system: RawTransactionArgument<string>,
				extendedEpochs: RawTransactionArgument<number>,
		  ];
}
/**
 * Extends the lifetime of the wrapped `Blob` by `extended_epochs` epochs if the
 * stored funds are sufficient and the new lifetime does not exceed the maximum
 * lifetime.
 */
export function extend(options: ExtendOptions) {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [
		`${packageAddress}::shared_blob::SharedBlob`,
		`${packageAddress}::system::System`,
		'u32',
	] satisfies string[];
	const parameterNames = ['self', 'system', 'extendedEpochs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'shared_blob',
			function: 'extend',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
