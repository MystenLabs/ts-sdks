// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as object from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function System() {
	return bcs.struct('System', {
		id: object.UID(),
		version: bcs.u64(),
		package_id: bcs.Address,
		new_package_id: bcs.option(bcs.Address),
	});
}
export function init(packageAddress: string) {
	function create_empty(options: {
		arguments: [RawTransactionArgument<number>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			'u32',
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'create_empty',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function invalidate_blob_id(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'invalidate_blob_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function certify_event_blob(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
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
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'certify_event_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function reserve_space(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			'u64',
			'u32',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'reserve_space',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function register_blob(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<boolean>,
			RawTransactionArgument<string>,
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
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'register_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function certify_blob(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::blob::Blob`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'certify_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function delete_blob(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::system::System`, `${packageAddress}::blob::Blob`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'delete_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function extend_blob_with_resource(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::blob::Blob`,
			`${packageAddress}::storage_resource::Storage`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'extend_blob_with_resource',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function extend_blob(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::blob::Blob`,
			'u32',
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'extend_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function add_subsidy(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
			'u32',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'add_subsidy',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function register_deny_list_update(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u256',
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'register_deny_list_update',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function update_deny_list(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'update_deny_list',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function delete_deny_listed_blob(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'delete_deny_listed_blob',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function epoch(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function total_capacity_size(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'total_capacity_size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function used_capacity_size(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'used_capacity_size',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function n_shards(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'n_shards',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function committee(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'committee',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function advance_epoch(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			`${packageAddress}::bls_aggregate::BlsCommittee`,
			`${packageAddress}::epoch_parameters::EpochParams`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'advance_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function package_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'package_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function version(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'version',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_new_package_id(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::system::System`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'set_new_package_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function migrate(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'migrate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function inner_mut(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'inner_mut',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function inner(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::system::System`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'system',
				function: 'inner',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		create_empty,
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
		committee,
		advance_epoch,
		package_id,
		version,
		set_new_package_id,
		migrate,
		inner_mut,
		inner,
	};
}
