/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionResult } from '@mysten/sui/transactions';
import * as blob_1 from './blob.js';
import * as balance from './deps/sui/balance.js';
const $moduleName = '@local-pkg/walrus::shared_blob';
export const SharedBlob: MoveStruct<{
	id: typeof bcs.Address;
	blob: typeof blob_1.Blob;
	funds: typeof balance.Balance;
}> = new MoveStruct({
	name: `${$moduleName}::SharedBlob`,
	fields: {
		id: bcs.Address,
		blob: blob_1.Blob,
		funds: balance.Balance,
	},
});
export interface NewArguments {
	blob: RawTransactionArgument<string>;
}
export interface NewOptions {
	package?: string;
	arguments: NewArguments | [blob: RawTransactionArgument<string>];
}
/** Shares the provided `blob` as a `SharedBlob` with zero funds. */
export function _new(options: NewOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
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
export function newFunded(options: NewFundedOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null] satisfies (string | null)[];
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
export function fund(options: FundOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null] satisfies (string | null)[];
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
export function extend(options: ExtendOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null, null, 'u32'] satisfies (string | null)[];
	const parameterNames = ['self', 'system', 'extendedEpochs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'shared_blob',
			function: 'extend',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BlobArguments {
	self: RawTransactionArgument<string>;
}
export interface BlobOptions {
	package?: string;
	arguments: BlobArguments | [self: RawTransactionArgument<string>];
}
/** Returns a reference to the wrapped `Blob`. */
export function blob(options: BlobOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'shared_blob',
			function: 'blob',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FundsArguments {
	self: RawTransactionArgument<string>;
}
export interface FundsOptions {
	package?: string;
	arguments: FundsArguments | [self: RawTransactionArgument<string>];
}
/** Returns the balance of funds stored in the `SharedBlob`. */
export function funds(options: FundsOptions): (tx: Transaction) => TransactionResult {
	const packageAddress = options.package ?? '@local-pkg/walrus';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'shared_blob',
			function: 'funds',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
