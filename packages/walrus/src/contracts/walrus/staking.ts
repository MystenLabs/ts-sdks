// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Module: staking */

import { bcs } from '@mysten/sui/bcs';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments } from '../utils/index.js';
import type { RawTransactionArgument } from '../utils/index.js';
import * as object from './deps/sui/object.js';
export function Staking() {
	return bcs.struct('Staking', {
		id: object.UID(),
		version: bcs.u64(),
		package_id: bcs.Address,
		new_package_id: bcs.option(bcs.Address),
	});
}
export function init(packageAddress: string) {
	/**
	 * Creates a staking pool for the candidate, registers the candidate as a storage
	 * node.
	 */
	function register_candidate(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			name: RawTransactionArgument<string>,
			network_address: RawTransactionArgument<string>,
			metadata: RawTransactionArgument<string>,
			public_key: RawTransactionArgument<number[]>,
			network_public_key: RawTransactionArgument<number[]>,
			proof_of_possession: RawTransactionArgument<number[]>,
			commission_rate: RawTransactionArgument<number>,
			storage_price: RawTransactionArgument<number | bigint>,
			write_price: RawTransactionArgument<number | bigint>,
			node_capacity: RawTransactionArgument<number | bigint>,
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
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'register_candidate',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Sets next_commission in the staking pool, which will then take effect as
	 * commission rate one epoch after setting the value (to allow stakers to react to
	 * setting this).
	 */
	function set_next_commission(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			commission_rate: RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u16',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_next_commission',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Collects the commission for the node. Transaction sender must be the
	 * `CommissionReceiver` for the `StakingPool`.
	 */
	function collect_commission(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			node_id: RawTransactionArgument<string>,
			auth: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'collect_commission',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Sets the commission receiver for the node. */
	function set_commission_receiver(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			node_id: RawTransactionArgument<string>,
			auth: RawTransactionArgument<string>,
			receiver: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
			`${packageAddress}::auth::Authorized`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_commission_receiver',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Sets the governance authorized object for the pool. */
	function set_governance_authorized(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			node_id: RawTransactionArgument<string>,
			auth: RawTransactionArgument<string>,
			authorized: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			`${packageAddress}::auth::Authenticated`,
			`${packageAddress}::auth::Authorized`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_governance_authorized',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Get the current committee. */
	function committee(options: { arguments: [staking: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'committee',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Computes the committee for the next epoch. */
	function compute_next_committee(options: {
		arguments: [staking: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'compute_next_committee',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Sets the storage price vote for the pool. */
	function set_storage_price_vote(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			storage_price: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u64',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_storage_price_vote',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Sets the write price vote for the pool. */
	function set_write_price_vote(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			write_price: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u64',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_write_price_vote',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Sets the node capacity vote for the pool. */
	function set_node_capacity_vote(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			node_capacity: RawTransactionArgument<number | bigint>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u64',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_node_capacity_vote',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Get `NodeMetadata` for the given node. */
	function node_metadata(options: {
		arguments: [self: RawTransactionArgument<string>, node_id: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'node_metadata',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Sets the public key of a node to be used starting from the next epoch for which
	 * the node is selected.
	 */
	function set_next_public_key(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			public_key: RawTransactionArgument<number[]>,
			proof_of_possession: RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'vector<u8>',
			'vector<u8>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_next_public_key',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Sets the name of a storage node. */
	function set_name(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			name: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_name',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Sets the network address or host of a storage node. */
	function set_network_address(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			network_address: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'0x0000000000000000000000000000000000000000000000000000000000000001::string::String',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_network_address',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Sets the public key used for TLS communication for a node. */
	function set_network_public_key(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			network_public_key: RawTransactionArgument<number[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'vector<u8>',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_network_public_key',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Sets the metadata of a storage node. */
	function set_node_metadata(options: {
		arguments: [
			self: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			metadata: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			`${packageAddress}::node_metadata::NodeMetadata`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'set_node_metadata',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Ends the voting period and runs the apportionment if the current time allows.
	 *
	 * This function is permissionless and can be called by anyone. Emits the
	 * `EpochParametersSelected` event.
	 */
	function voting_end(options: {
		arguments: [staking: RawTransactionArgument<string>, clock: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'voting_end',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Initiates the epoch change if the current time allows.
	 *
	 * Emits the `EpochChangeStart` event.
	 */
	function initiate_epoch_change(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			system: RawTransactionArgument<string>,
			clock: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::system::System`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'initiate_epoch_change',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Signals to the contract that the node has received all its shards for the new
	 * epoch.
	 */
	function epoch_sync_done(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			cap: RawTransactionArgument<string>,
			epoch: RawTransactionArgument<number>,
			clock: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
			'u32',
			'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'epoch_sync_done',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Stake `Coin` with the staking pool. */
	function stake_with_pool(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			to_stake: RawTransactionArgument<string>,
			node_id: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::wal::WAL>`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'stake_with_pool',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Marks the amount as a withdrawal to be processed and removes it from the stake
	 * weight of the node.
	 *
	 * Allows the user to call `withdraw_stake` after the epoch change to the next
	 * epoch and shard transfer is done.
	 */
	function request_withdraw_stake(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			staked_wal: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::staked_wal::StakedWal`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'request_withdraw_stake',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Withdraws the staked amount from the staking pool. */
	function withdraw_stake(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			staked_wal: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::staked_wal::StakedWal`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'withdraw_stake',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Allows a node to join the active set if it has sufficient stake.
	 *
	 * This can be useful if another node in the active set had its stake reduced below
	 * that of the current node. In that case, the current node will be added to the
	 * active set either the next time stake is added or by calling this function.
	 */
	function try_join_active_set(options: {
		arguments: [staking: RawTransactionArgument<string>, cap: RawTransactionArgument<string>];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::storage_node::StorageNodeCap`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'try_join_active_set',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Adds `commissions[i]` to the commission of pool `node_ids[i]`. */
	function add_commission_to_pools(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			node_ids: RawTransactionArgument<string[]>,
			commissions: RawTransactionArgument<string[]>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'vector<0x0000000000000000000000000000000000000000000000000000000000000002::object::ID>',
			`vector<0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<${packageAddress}::wal::WAL>>`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'add_commission_to_pools',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/** Returns the current epoch of the staking object. */
	function epoch(options: { arguments: [staking: RawTransactionArgument<string>] }) {
		const argumentsTypes = [`${packageAddress}::staking::Staking`] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'epoch',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Calculates the rewards for an amount with value `staked_principal`, staked in
	 * the pool with the given `node_id` between `activation_epoch` and
	 * `withdraw_epoch`.
	 *
	 * This function can be used with `dev_inspect` to calculate the expected rewards
	 * for a `StakedWal` object or, more generally, the returns provided by a given
	 * node over a given period.
	 */
	function calculate_rewards(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			node_id: RawTransactionArgument<string>,
			staked_principal: RawTransactionArgument<number | bigint>,
			activation_epoch: RawTransactionArgument<number>,
			withdraw_epoch: RawTransactionArgument<number>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
			'u64',
			'u32',
			'u32',
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'calculate_rewards',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	/**
	 * Call `staked_wal::can_withdraw_early` to allow calling this method in
	 * applications.
	 */
	function can_withdraw_staked_wal_early(options: {
		arguments: [
			staking: RawTransactionArgument<string>,
			staked_wal: RawTransactionArgument<string>,
		];
	}) {
		const argumentsTypes = [
			`${packageAddress}::staking::Staking`,
			`${packageAddress}::staked_wal::StakedWal`,
		] satisfies string[];
		return (tx: Transaction) =>
			tx.moveCall({
				package: packageAddress,
				module: 'staking',
				function: 'can_withdraw_staked_wal_early',
				arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			});
	}
	return {
		register_candidate,
		set_next_commission,
		collect_commission,
		set_commission_receiver,
		set_governance_authorized,
		committee,
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
		epoch_sync_done,
		stake_with_pool,
		request_withdraw_stake,
		withdraw_stake,
		try_join_active_set,
		add_commission_to_pools,
		epoch,
		calculate_rewards,
		can_withdraw_staked_wal_early,
	};
}
