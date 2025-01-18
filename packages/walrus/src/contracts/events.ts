// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function BlobRegistered() {
	return bcs.struct('BlobRegistered', {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		size: bcs.u64(),
		encoding_type: bcs.u8(),
		end_epoch: bcs.u32(),
		deletable: bcs.bool(),
		object_id: bcs.Address,
	});
}
export function BlobCertified() {
	return bcs.struct('BlobCertified', {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		end_epoch: bcs.u32(),
		deletable: bcs.bool(),
		object_id: bcs.Address,
		is_extension: bcs.bool(),
	});
}
export function BlobDeleted() {
	return bcs.struct('BlobDeleted', {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
		end_epoch: bcs.u32(),
		object_id: bcs.Address,
		was_certified: bcs.bool(),
	});
}
export function InvalidBlobID() {
	return bcs.struct('InvalidBlobID', {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
	});
}
export function EpochChangeStart() {
	return bcs.struct('EpochChangeStart', {
		epoch: bcs.u32(),
	});
}
export function EpochChangeDone() {
	return bcs.struct('EpochChangeDone', {
		epoch: bcs.u32(),
	});
}
export function ShardsReceived() {
	return bcs.struct('ShardsReceived', {
		epoch: bcs.u32(),
		shards: bcs.vector(bcs.u16()),
	});
}
export function EpochParametersSelected() {
	return bcs.struct('EpochParametersSelected', {
		next_epoch: bcs.u32(),
	});
}
export function ShardRecoveryStart() {
	return bcs.struct('ShardRecoveryStart', {
		epoch: bcs.u32(),
		shards: bcs.vector(bcs.u16()),
	});
}
export function ContractUpgraded() {
	return bcs.struct('ContractUpgraded', {
		epoch: bcs.u32(),
		package_id: bcs.Address,
		version: bcs.u64(),
	});
}
export function RegisterDenyListUpdate() {
	return bcs.struct('RegisterDenyListUpdate', {
		epoch: bcs.u32(),
		root: bcs.u256(),
		sequence_number: bcs.u64(),
		node_id: bcs.Address,
	});
}
export function DenyListUpdate() {
	return bcs.struct('DenyListUpdate', {
		epoch: bcs.u32(),
		root: bcs.u256(),
		sequence_number: bcs.u64(),
		node_id: bcs.Address,
	});
}
export function DenyListBlobDeleted() {
	return bcs.struct('DenyListBlobDeleted', {
		epoch: bcs.u32(),
		blob_id: bcs.u256(),
	});
}
export function ContractUpgradeProposed() {
	return bcs.struct('ContractUpgradeProposed', {
		epoch: bcs.u32(),
		package_digest: bcs.vector(bcs.u8()),
	});
}
export function ContractUpgradeQuorumReached() {
	return bcs.struct('ContractUpgradeQuorumReached', {
		epoch: bcs.u32(),
		package_digest: bcs.vector(bcs.u8()),
	});
}
export function init(packageAddress: string) {
	function emit_blob_registered(options: {
		arguments: [
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number>,
			RawTransactionArgument<boolean>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'u32',
			'u256',
			'u64',
			'u8',
			'u32',
			'bool',
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_blob_registered',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_blob_certified(options: {
		arguments: [
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<boolean>,
			RawTransactionArgument<string>,
			RawTransactionArgument<boolean>,
		];
	}) {
		const argumentsTypes = [
			'u32',
			'u256',
			'u32',
			'bool',
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'bool',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_blob_certified',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_invalid_blob_id(options: {
		arguments: [RawTransactionArgument<number>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = ['u32', 'u256'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_invalid_blob_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_blob_deleted(options: {
		arguments: [
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
			RawTransactionArgument<boolean>,
		];
	}) {
		const argumentsTypes = [
			'u32',
			'u256',
			'u32',
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'bool',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_blob_deleted',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_epoch_change_start(options: { arguments: [RawTransactionArgument<number>] }) {
		const argumentsTypes = ['u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_epoch_change_start',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_epoch_change_done(options: { arguments: [RawTransactionArgument<number>] }) {
		const argumentsTypes = ['u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_epoch_change_done',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_shards_received(options: {
		arguments: [RawTransactionArgument<number>, RawTransactionArgument<number[]>];
	}) {
		const argumentsTypes = ['u32', 'vector<u16>'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_shards_received',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_epoch_parameters_selected(options: {
		arguments: [RawTransactionArgument<number>];
	}) {
		const argumentsTypes = ['u32'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_epoch_parameters_selected',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_shard_recovery_start(options: {
		arguments: [RawTransactionArgument<number>, RawTransactionArgument<number[]>];
	}) {
		const argumentsTypes = ['u32', 'vector<u16>'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_shard_recovery_start',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_contract_upgraded(options: {
		arguments: [
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			'u32',
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_contract_upgraded',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_register_deny_list_update(options: {
		arguments: [
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'u32',
			'u256',
			'u64',
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_register_deny_list_update',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_deny_list_update(options: {
		arguments: [
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'u32',
			'u256',
			'u64',
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_deny_list_update',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_deny_listed_blob_deleted(options: {
		arguments: [RawTransactionArgument<number>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = ['u32', 'u256'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_deny_listed_blob_deleted',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_contract_upgrade_proposed(options: {
		arguments: [RawTransactionArgument<number>, RawTransactionArgument<number[]>];
	}) {
		const argumentsTypes = ['u32', 'vector<u8>'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_contract_upgrade_proposed',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function emit_contract_upgrade_quorum_reached(options: {
		arguments: [RawTransactionArgument<number>, RawTransactionArgument<number[]>];
	}) {
		const argumentsTypes = ['u32', 'vector<u8>'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'events',
				function: 'emit_contract_upgrade_quorum_reached',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		emit_blob_registered,
		emit_blob_certified,
		emit_invalid_blob_id,
		emit_blob_deleted,
		emit_epoch_change_start,
		emit_epoch_change_done,
		emit_shards_received,
		emit_epoch_parameters_selected,
		emit_shard_recovery_start,
		emit_contract_upgraded,
		emit_register_deny_list_update,
		emit_deny_list_update,
		emit_deny_listed_blob_deleted,
		emit_contract_upgrade_proposed,
		emit_contract_upgrade_quorum_reached,
	};
}
