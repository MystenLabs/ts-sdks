/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as blob from './blob.js';
import * as balance from './deps/sui/balance.js';
export function SharedBlob() {
	return bcs.struct('SharedBlob', {
		id: object.UID(),
		blob: blob.Blob(),
		funds: balance.Balance(),
	});
}
/** Shares the provided `blob` as a `SharedBlob` with zero funds. */
export function _new(options: {
	package?: string;
	arguments:
		| [blob: RawTransactionArgument<string>]
		| {
				blob: RawTransactionArgument<string>;
		  };
}) {
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
/** Shares the provided `blob` as a `SharedBlob` with funds. */
export function new_funded(options: {
	package?: string;
	arguments:
		| [blob: RawTransactionArgument<string>, funds: RawTransactionArgument<string>]
		| {
				blob: RawTransactionArgument<string>;
				funds: RawTransactionArgument<string>;
		  };
}) {
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
/** Adds the provided `Coin` to the stored funds. */
export function fund(options: {
	package?: string;
	arguments:
		| [self: RawTransactionArgument<string>, addedFunds: RawTransactionArgument<string>]
		| {
				self: RawTransactionArgument<string>;
				addedFunds: RawTransactionArgument<string>;
		  };
}) {
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
/**
 * Extends the lifetime of the wrapped `Blob` by `extended_epochs` epochs if the
 * stored funds are sufficient and the new lifetime does not exceed the maximum
 * lifetime.
 */
export function extend(options: {
	package?: string;
	arguments:
		| [
				self: RawTransactionArgument<string>,
				system: RawTransactionArgument<string>,
				extendedEpochs: RawTransactionArgument<number>,
		  ]
		| {
				self: RawTransactionArgument<string>;
				system: RawTransactionArgument<string>;
				extendedEpochs: RawTransactionArgument<number>;
		  };
}) {
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
