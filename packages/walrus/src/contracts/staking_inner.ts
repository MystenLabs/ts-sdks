// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as committee from './committee.js';
import * as object_table from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/object_table.js';
import * as epoch_parameters from './epoch_parameters.js';
import * as extended_field from './extended_field.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function StakingInnerV1() {
	return bcs.struct('StakingInnerV1', {
		n_shards: bcs.u16(),
		epoch_duration: bcs.u64(),
		first_epoch_start: bcs.u64(),
		pools: object_table.ObjectTable(),
		epoch: bcs.u32(),
		active_set: extended_field.ExtendedField(),
		next_committee: bcs.option(committee.Committee()),
		committee: committee.Committee(),
		previous_committee: committee.Committee(),
		next_epoch_params: bcs.option(epoch_parameters.EpochParams()),
		epoch_state: EpochState(),
		next_epoch_public_keys: extended_field.ExtendedField(),
	});
}
export function EpochState() {
	return bcs.enum('EpochState', {
		EpochChangeSync: bcs.u16(),
		EpochChangeDone: bcs.u64(),
		NextParamsSelected: bcs.u64(),
	});
}
export function init(packageAddress: string) {
	function _new(options: {
		arguments: [
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'u64',
			'u64',
			'u16',
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'new',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function create_pool(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
			`${packageAddress}::node_metadata::NodeMetadata`,
			'vector<u8>',
			'vector<u8>',
			'vector<u8>',
			'u16',
			'u64',
			'u64',
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'create_pool',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function withdraw_node(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'withdraw_node',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_commission_receiver(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
			`${packageAddress}::auth::Authorized`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_commission_receiver',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function collect_commission(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'collect_commission',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function voting_end(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'voting_end',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function calculate_votes(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'calculate_votes',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function quorum_above(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::priority_queue::PriorityQueue<u64>',
			'u16',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'quorum_above',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function quorum_below(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::priority_queue::PriorityQueue<u64>',
			'u16',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'quorum_below',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function take_threshold_value(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = [
			'0x0000000000000000000000000000000000000000000000000000000000000002::priority_queue::PriorityQueue<u64>',
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'take_threshold_value',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_governance_authorized(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
			`${packageAddress}::auth::Authorized`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_governance_authorized',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function check_governance_authorization(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'check_governance_authorization',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function get_current_node_weight(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'get_current_node_weight',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_next_commission(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u16',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_next_commission',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_storage_price_vote(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_storage_price_vote',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_write_price_vote(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_write_price_vote',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_node_capacity_vote(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_node_capacity_vote',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_next_public_key(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
			RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'vector<u8>',
			'vector<u8>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_next_public_key',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_name(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_name',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_network_address(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_network_address',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_network_public_key(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'vector<u8>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_network_public_key',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_node_metadata(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			`${packageAddress}::node_metadata::NodeMetadata`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_node_metadata',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_withdrawing(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'set_withdrawing',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function destroy_empty_pool(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'destroy_empty_pool',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function stake_with_pool(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'stake_with_pool',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function request_withdraw_stake(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::staked_wal::StakedWal`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'request_withdraw_stake',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function withdraw_stake(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::staked_wal::StakedWal`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'withdraw_stake',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function compute_next_committee(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'compute_next_committee',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function select_committee(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'select_committee',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function apportionment(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'apportionment',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function dhondt(options: {
		arguments: [
			RawTransactionArgument<number | bigint[]>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number | bigint[]>,
		];
	}) {
		const argumentsTypes = ['vector<u64>', 'u16', 'vector<u64>'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'dhondt',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function max_shards_per_node(options: {
		arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<number | bigint>];
	}) {
		const argumentsTypes = ['u64', 'u64'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'max_shards_per_node',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function initiate_epoch_change(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
			`0x0000000000000000000000000000000000000000000000000000000000000002::vec_map::VecMap<0x0000000000000000000000000000000000000000000000000000000000000002::object::ID, 0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<${packageAddress}::wal::WAL>>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'initiate_epoch_change',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function advance_epoch(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::vec_map::VecMap<0x0000000000000000000000000000000000000000000000000000000000000002::object::ID, 0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<${packageAddress}::wal::WAL>>`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'advance_epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function epoch_sync_done(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u32',
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'epoch_sync_done',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function shard_transfer_failed(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'vector<u16>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'shard_transfer_failed',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function node_metadata(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'node_metadata',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function next_committee(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'next_committee',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function next_epoch_params(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'next_epoch_params',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function epoch(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function committee(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'committee',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function previous_committee(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'previous_committee',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function next_bls_committee(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'next_bls_committee',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function has_pool(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'has_pool',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function n_shards(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'n_shards',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function calculate_rewards(options: {
		arguments: [
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking_inner::StakingInnerV1`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'u64',
			'u32',
			'u32',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'calculate_rewards',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function new_walrus_context(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'new_walrus_context',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function is_quorum(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddress}::staking_inner::StakingInnerV1`, 'u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking_inner',
				function: 'is_quorum',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		_new,
		create_pool,
		withdraw_node,
		set_commission_receiver,
		collect_commission,
		voting_end,
		calculate_votes,
		quorum_above,
		quorum_below,
		take_threshold_value,
		set_governance_authorized,
		check_governance_authorization,
		get_current_node_weight,
		set_next_commission,
		set_storage_price_vote,
		set_write_price_vote,
		set_node_capacity_vote,
		set_next_public_key,
		set_name,
		set_network_address,
		set_network_public_key,
		set_node_metadata,
		set_withdrawing,
		destroy_empty_pool,
		stake_with_pool,
		request_withdraw_stake,
		withdraw_stake,
		compute_next_committee,
		select_committee,
		apportionment,
		dhondt,
		max_shards_per_node,
		initiate_epoch_change,
		advance_epoch,
		epoch_sync_done,
		shard_transfer_failed,
		node_metadata,
		next_committee,
		next_epoch_params,
		epoch,
		committee,
		previous_committee,
		next_bls_committee,
		has_pool,
		n_shards,
		calculate_rewards,
		new_walrus_context,
		is_quorum,
	};
}
