// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as group_ops from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/group_ops.js';
import * as object from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js';
import * as event_blob from './event_blob.js';
import * as extended_field from './extended_field.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

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
		deny_list_root: bcs.u256(),
		deny_list_sequence: bcs.u64(),
		deny_list_size: bcs.u64(),
	});
}
export function init(packageAddress: string) {
	function _new(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
			'vector<u8>',
			'vector<u8>',
			`${packageAddress}::node_metadata::NodeMetadata`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function new_cap(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'new_cap',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function public_key(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeInfo`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'public_key',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function metadata(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeInfo`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'metadata',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function next_epoch_public_key(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeInfo`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'next_epoch_public_key',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeInfo`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function node_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'node_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function last_epoch_sync_done(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'last_epoch_sync_done',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function last_event_blob_attestation(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'last_event_blob_attestation',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function deny_list_root(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'deny_list_root',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function deny_list_sequence(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'deny_list_sequence',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_last_epoch_sync_done(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeCap`, 'u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'set_last_epoch_sync_done',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_last_event_blob_attestation(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_node::StorageNodeCap`,
			`${packageAddress}::event_blob::EventBlobAttestation`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'set_last_event_blob_attestation',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_next_public_key(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number[]>];
	}) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeInfo`, 'vector<u8>'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'set_next_public_key',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_name(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_node::StorageNodeInfo`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'set_name',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_network_address(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_node::StorageNodeInfo`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'set_network_address',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_network_public_key(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number[]>];
	}) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeInfo`, 'vector<u8>'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'set_network_public_key',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_node_metadata(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_node::StorageNodeInfo`,
			`${packageAddress}::node_metadata::NodeMetadata`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'set_node_metadata',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function rotate_public_key(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeInfo`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'rotate_public_key',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function destroy(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::storage_node::StorageNodeInfo`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'destroy',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_deny_list_properties(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u256',
			'u64',
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'storage_node',
				function: 'set_deny_list_properties',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		_new,
		new_cap,
		public_key,
		metadata,
		next_epoch_public_key,
		id,
		node_id,
		last_epoch_sync_done,
		last_event_blob_attestation,
		deny_list_root,
		deny_list_sequence,
		set_last_epoch_sync_done,
		set_last_event_blob_attestation,
		set_next_public_key,
		set_name,
		set_network_address,
		set_network_public_key,
		set_node_metadata,
		rotate_public_key,
		destroy,
		set_deny_list_properties,
	};
}
