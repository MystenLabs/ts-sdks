// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';

import * as object from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/object.js';
import { normalizeMoveArguments } from './utils/index.js';
import type { RawTransactionArgument } from './utils/index.js';

export function Staking() {
	return bcs.struct('Staking', {
		id: object.UID(),
		version: bcs.u64(),
		package_id: bcs.Address,
		new_package_id: bcs.option(bcs.Address),
	});
}
export function init(packageAddress: string) {
	function create(options: {
		arguments: [
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number | bigint>,
			RawTransactionArgument<number>,
			RawTransactionArgument<string>,
			RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			'u64',
			'u64',
			'u16',
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'create',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function register_candidate(options: {
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
			`${packageAddress}::staking::Staking`,
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
				module: 'staking',
				function: 'register_candidate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function withdraw_node(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'withdraw_node',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u16',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_next_commission',
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
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'collect_commission',
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
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
			`${packageAddress}::auth::Authorized`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_commission_receiver',
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
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
			`${packageAddress}::auth::Authorized`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
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
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'check_governance_authorization',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function get_current_node_weight(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'get_current_node_weight',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function compute_next_committee(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'compute_next_committee',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u64',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_node_capacity_vote',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function node_metadata(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'node_metadata',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'vector<u8>',
			'vector<u8>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'vector<u8>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			`${packageAddress}::node_metadata::NodeMetadata`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_node_metadata',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function voting_end(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'voting_end',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::system::System`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'initiate_epoch_change',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'vector<u16>',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'shard_transfer_failed',
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
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u32',
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'epoch_sync_done',
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
			`${packageAddress}::staking::Staking`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'stake_with_pool',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function request_withdraw_stake(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::staked_wal::StakedWal`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'request_withdraw_stake',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function withdraw_stake(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::staked_wal::StakedWal`,
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'withdraw_stake',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function package_id(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'package_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function version(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'version',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function epoch(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function is_quorum(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
	}) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`, 'u16'];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'is_quorum',
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
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'u64',
			'u32',
			'u32',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'calculate_rewards',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function set_new_package_id(options: {
		arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_new_package_id',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function migrate(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'migrate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function inner_mut(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'inner_mut',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	function inner(options: { arguments: [RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'inner',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		create,
		register_candidate,
		withdraw_node,
		set_next_commission,
		collect_commission,
		set_commission_receiver,
		set_governance_authorized,
		check_governance_authorization,
		get_current_node_weight,
		compute_next_committee,
		set_storage_price_vote,
		set_write_price_vote,
		set_node_capacity_vote,
		node_metadata,
		set_next_public_key,
		set_name,
		set_network_address,
		set_network_public_key,
		set_node_metadata,
		voting_end,
		initiate_epoch_change,
		shard_transfer_failed,
		epoch_sync_done,
		stake_with_pool,
		request_withdraw_stake,
		withdraw_stake,
		package_id,
		version,
		epoch,
		is_quorum,
		calculate_rewards,
		set_new_package_id,
		migrate,
		inner_mut,
		inner,
	};
}
