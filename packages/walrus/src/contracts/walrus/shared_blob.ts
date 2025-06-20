// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
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
export function init(packageAddress: string) {
	/** Shares the provided `blob` as a `SharedBlob` with zero funds. */
	function _new(options: { arguments: [blob: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'shared_blob',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Shares the provided `blob` as a `SharedBlob` with funds. */
	function new_funded(options: {
		arguments: [blob: RawTransactionArgument<string>, funds: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::blob::Blob`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'shared_blob',
				function: 'new_funded',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Adds the provided `Coin` to the stored funds. */
	function fund(options: {
		arguments: [self: RawTransactionArgument<string>, added_funds: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::shared_blob::SharedBlob`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'shared_blob',
				function: 'fund',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Extends the lifetime of the wrapped `Blob` by `extended_epochs` epochs if the
	 * stored funds are sufficient and the new lifetime does not exceed the maximum
	 * lifetime.
	 */
	function extend(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			system: RawTransactionArgument<string>,
			extended_epochs: RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::shared_blob::SharedBlob`,
			`${packageAddress}::system::System`,
			'u32',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'shared_blob',
				function: 'extend',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns a reference to the wrapped `Blob`. */
	function blob(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::shared_blob::SharedBlob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'shared_blob',
				function: 'blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the balance of funds stored in the `SharedBlob`. */
	function funds(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::shared_blob::SharedBlob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'shared_blob',
				function: 'funds',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return { _new, new_funded, fund, extend, blob, funds };
}
