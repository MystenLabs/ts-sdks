// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Contains the metadata for Blobs on Walrus. */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as vec_map from './deps/sui/vec_map.js';
export function Metadata() {
	return bcs.struct('Metadata', {
		metadata: vec_map.VecMap(bcs.string(), bcs.string()),
	});
}
export function init(packageAddress: string) {
	/** Creates a new instance of Metadata. */
	function _new(options: { arguments: [] }) {
		const argumentsTypes = [] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'metadata',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Inserts a key-value pair into the metadata.
	 *
	 * If the key is already present, the value is updated.
	 */
	function insert_or_update(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			key: RawTransactionArgument<string>,
			value: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::metadata::Metadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'metadata',
				function: 'insert_or_update',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Removes the metadata associated with the given key. */
	function remove(options: {
		arguments: [self: RawTransactionArgument<string>, key: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::metadata::Metadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'metadata',
				function: 'remove',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Removes the metadata associated with the given key, if it exists.
	 *
	 * Optionally returns the previous value associated with the key.
	 */
	function remove_if_exists(options: {
		arguments: [self: RawTransactionArgument<string>, key: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::metadata::Metadata`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'metadata',
				function: 'remove_if_exists',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return { _new, insert_or_update, remove, remove_if_exists };
}
