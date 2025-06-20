// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as group_ops from './deps/sui/group_ops.js';
import * as extended_field from './extended_field.js';
import * as object from './deps/sui/object.js';
import * as event_blob from './event_blob.js';
export function StorageNodeInfo() {
	return bcs.struct('StorageNodeInfo', {
		name: bcs.string(),
		node_id: bcs.Address,
		network_address: bcs.string(),
		public_key: group_ops.Element(),
		next_epoch_public_key: bcs.option(group_ops.Element()),
		network_public_key: bcs.vector(bcs.u8()),
		metadata: extended_field.ExtendedField(),
	});
}
export function StorageNodeCap() {
	return bcs.struct('StorageNodeCap', {
		id: object.UID(),
		node_id: bcs.Address,
		last_epoch_sync_done: bcs.u32(),
		last_event_blob_attestation: bcs.option(event_blob.EventBlobAttestation()),
		/** Stores the Merkle root of the deny list for the storage node. */
		deny_list_root: bcs.u256(),
		/** Stores the sequence number of the deny list for the storage node. */
		deny_list_sequence: bcs.u64(),
		/** Stores the size of the deny list for the storage node. */
		deny_list_size: bcs.u64(),
	});
}
export function init(packageAddress: string) {
	/** Return the node ID of the storage node. */
	function id(options: { arguments: [cap: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeInfo`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Return the pool ID of the storage node. */
	function node_id(options: { arguments: [cap: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'node_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Return the last epoch in which the storage node attested that it has finished
	 * syncing.
	 */
	function last_epoch_sync_done(options: { arguments: [cap: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'last_epoch_sync_done',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Return the latest event blob attestation. */
	function last_event_blob_attestation(options: {
		arguments: [cap: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'last_event_blob_attestation',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Return the deny list root of the storage node. */
	function deny_list_root(options: { arguments: [cap: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'deny_list_root',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Return the deny list sequence number of the storage node. */
	function deny_list_sequence(options: { arguments: [cap: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'deny_list_sequence',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		id,
		node_id,
		last_epoch_sync_done,
		last_event_blob_attestation,
		deny_list_root,
		deny_list_sequence,
	};
}
