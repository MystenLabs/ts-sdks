// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as storage_resource from './storage_resource.js';
export function Blob() {
	return bcs.struct('Blob', {
		id: object.UID(),
		registered_epoch: bcs.u32(),
		blob_id: bcs.u256(),
		size: bcs.u64(),
		encoding_type: bcs.u8(),
		certified_epoch: bcs.option(bcs.u32()),
		storage: storage_resource.Storage(),
		deletable: bcs.bool(),
	});
}
export function BlobIdDerivation() {
	return bcs.struct('BlobIdDerivation', {
		encoding_type: bcs.u8(),
		size: bcs.u64(),
		root_hash: bcs.u256(),
	});
}
export function init(packageAddress: string) {
	function object_id(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'object_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function registered_epoch(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'registered_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function blob_id(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'blob_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function size(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function encoding_type(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'encoding_type',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function certified_epoch(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'certified_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function storage(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'storage',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function is_deletable(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'is_deletable',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function encoded_size(options: {
		arguments: [self: RawTransactionArgument<string>, n_shards: RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`, 'u16'] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'encoded_size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function end_epoch(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'end_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Derives the blob_id for a blob given the root_hash, encoding_type and size. */
	function derive_blob_id(options: {
		arguments: [
			root_hash: RawTransactionArgument<number | bigint>,
			encoding_type: RawTransactionArgument<number>,
			size: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = ['u256', 'u8', 'u64'] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'derive_blob_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Allow the owner of a blob object to destroy it.
	 *
	 * This function also burns any [`Metadata`] associated with the blob, if present.
	 */
	function burn(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'burn',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Adds the metadata dynamic field to the Blob.
	 *
	 * Aborts if the metadata is already present.
	 */
	function add_metadata(options: {
		arguments: [self: RawTransactionArgument<string>, metadata: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::blob::Blob`,
			`${packageAddress}::metadata::Metadata`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'add_metadata',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Adds the metadata dynamic field to the Blob, replacing the existing metadata if
	 * present.
	 *
	 * Returns the replaced metadata if present.
	 */
	function add_or_replace_metadata(options: {
		arguments: [self: RawTransactionArgument<string>, metadata: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::blob::Blob`,
			`${packageAddress}::metadata::Metadata`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'add_or_replace_metadata',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Removes the metadata dynamic field from the Blob, returning the contained
	 * `Metadata`.
	 *
	 * Aborts if the metadata does not exist.
	 */
	function take_metadata(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::blob::Blob`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'take_metadata',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Inserts a key-value pair into the metadata.
	 *
	 * If the key is already present, the value is updated. Creates new metadata on the
	 * Blob object if it does not exist already.
	 */
	function insert_or_update_metadata_pair(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			key: RawTransactionArgument<string>,
			value: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::blob::Blob`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'insert_or_update_metadata_pair',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Removes the metadata associated with the given key.
	 *
	 * Aborts if the metadata does not exist.
	 */
	function remove_metadata_pair(options: {
		arguments: [self: RawTransactionArgument<string>, key: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::blob::Blob`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'remove_metadata_pair',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Removes and returns the metadata associated with the given key, if it exists. */
	function remove_metadata_pair_if_exists(options: {
		arguments: [self: RawTransactionArgument<string>, key: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::blob::Blob`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'blob',
				function: 'remove_metadata_pair_if_exists',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		object_id,
		registered_epoch,
		blob_id,
		size,
		encoding_type,
		certified_epoch,
		storage,
		is_deletable,
		encoded_size,
		end_epoch,
		derive_blob_id,
		burn,
		add_metadata,
		add_or_replace_metadata,
		take_metadata,
		insert_or_update_metadata_pair,
		remove_metadata_pair,
		remove_metadata_pair_if_exists,
	};
}
