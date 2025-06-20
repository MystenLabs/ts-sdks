/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: system */

import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
export function System() {
	return bcs.struct('System', {
		id: object.UID(),
		version: bcs.u64(),
		package_id: bcs.Address,
		new_package_id: bcs.option(bcs.Address),
	});
}
export function init(packageAddress: string) {
	/** Marks blob as invalid given an invalid blob certificate. */
	function invalidate_blob_id(options: {
		arguments: [
			system: RawTransactionArgument<string>,
			signature: RawTransactionArgument<number[]>,
			members_bitmap: RawTransactionArgument<number[]>,
			message: RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'invalidate_blob_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Certifies a blob containing Walrus events. */
	function certify_event_blob(options: {
		arguments: [
			system: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			blob_id: RawTransactionArgument<number | bigint>,
			root_hash: RawTransactionArgument<number | bigint>,
			size: RawTransactionArgument<number | bigint>,
			encoding_type: RawTransactionArgument<number>,
			ending_checkpoint_sequence_num: RawTransactionArgument<number | bigint>,
			epoch: RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u256',
			'u256',
			'u64',
			'u8',
			'u64',
			'u32',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'certify_event_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Allows buying a storage reservation for a given period of epochs. */
	function reserve_space(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			storage_amount: RawTransactionArgument<number | bigint>,
			epochs_ahead: RawTransactionArgument<number>,
			payment: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			'u64',
			'u32',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'reserve_space',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Registers a new blob in the system. `size` is the size of the unencoded blob.
	 * The reserved space in `storage` must be at least the size of the encoded blob.
	 */
	function register_blob(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			storage: RawTransactionArgument<string>,
			blob_id: RawTransactionArgument<number | bigint>,
			root_hash: RawTransactionArgument<number | bigint>,
			size: RawTransactionArgument<number | bigint>,
			encoding_type: RawTransactionArgument<number>,
			deletable: RawTransactionArgument<boolean>,
			write_payment: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::storage_resource::Storage`,
			'u256',
			'u256',
			'u64',
			'u8',
			'bool',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'register_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Certify that a blob will be available in the storage system until the end epoch
	 * of the storage associated with it.
	 */
	function certify_blob(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			blob: RawTransactionArgument<string>,
			signature: RawTransactionArgument<number[]>,
			signers_bitmap: RawTransactionArgument<number[]>,
			message: RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::blob::Blob`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'certify_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Deletes a deletable blob and returns the contained storage resource. */
	function delete_blob(options: {
		arguments: [self: RawTransactionArgument<string>, blob: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::blob::Blob`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'delete_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Extend the period of validity of a blob with a new storage resource. The new
	 * storage resource must be the same size as the storage resource used in the blob,
	 * and have a longer period of validity.
	 */
	function extend_blob_with_resource(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			blob: RawTransactionArgument<string>,
			extension: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::blob::Blob`,
			`${packageAddress}::storage_resource::Storage`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'extend_blob_with_resource',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Extend the period of validity of a blob by extending its contained storage
	 * resource by `extended_epochs` epochs.
	 */
	function extend_blob(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			blob: RawTransactionArgument<string>,
			extended_epochs: RawTransactionArgument<number>,
			payment: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::blob::Blob`,
			'u32',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'extend_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Adds rewards to the system for the specified number of epochs ahead. The rewards
	 * are split equally across the future accounting ring buffer up to the specified
	 * epoch.
	 */
	function add_subsidy(options: {
		arguments: [
			system: RawTransactionArgument<string>,
			subsidy: RawTransactionArgument<string>,
			epochs_ahead: RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
			'u32',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'add_subsidy',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Register a deny list update. */
	function register_deny_list_update(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			deny_list_root: RawTransactionArgument<number | bigint>,
			deny_list_sequence: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u256',
			'u64',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'register_deny_list_update',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Perform the update of the deny list. */
	function update_deny_list(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			signature: RawTransactionArgument<number[]>,
			members_bitmap: RawTransactionArgument<number[]>,
			message: RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'update_deny_list',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Delete a blob that is deny listed by f+1 members. */
	function delete_deny_listed_blob(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			signature: RawTransactionArgument<number[]>,
			members_bitmap: RawTransactionArgument<number[]>,
			message: RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'delete_deny_listed_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Get epoch. Uses the committee to get the epoch. */
	function epoch(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Accessor for total capacity size. */
	function total_capacity_size(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'total_capacity_size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Accessor for used capacity size. */
	function used_capacity_size(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'used_capacity_size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Accessor for the number of shards. */
	function n_shards(options: { arguments: [self: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'n_shards',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		invalidate_blob_id,
		certify_event_blob,
		reserve_space,
		register_blob,
		certify_blob,
		delete_blob,
		extend_blob_with_resource,
		extend_blob,
		add_subsidy,
		register_deny_list_update,
		update_deny_list,
		delete_deny_listed_blob,
		epoch,
		total_capacity_size,
		used_capacity_size,
		n_shards,
	};
}
