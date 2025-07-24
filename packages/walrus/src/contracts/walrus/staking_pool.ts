// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Module: staking_pool */

import { bcs } from '@mysten/sui/bcs';
import { MoveStruct, MoveEnum } from '../utils/index.js';
import * as object from './deps/sui/object.js';
import * as storage_node from './storage_node.js';
import * as pending_values from './pending_values.js';
import * as table from './deps/sui/table.js';
import * as balance from './deps/sui/balance.js';
import * as auth from './auth.js';
import * as bag from './deps/sui/bag.js';
const $moduleName = '@local-pkg/walrus::staking_pool';
export const VotingParams = new MoveStruct(`${$moduleName}::VotingParams`, {
	/** Voting: storage price for the next epoch. */
	storage_price: bcs.u64(),
	/** Voting: write price for the next epoch. */
	write_price: bcs.u64(),
	/** Voting: node capacity for the next epoch. */
	node_capacity: bcs.u64(),
});
/** Represents the state of the staking pool. */
export const PoolState = new MoveEnum(`${$moduleName}::PoolState`, {
	Active: null,
	Withdrawing: bcs.u32(),
	Withdrawn: null,
});
export const StakingPool = new MoveStruct(`${$moduleName}::StakingPool`, {
	id: object.UID,
	/** The current state of the pool. */
	state: PoolState,
	/** Current epoch's pool parameters. */
	voting_params: VotingParams,
	/** The storage node info for the pool. */
	node_info: storage_node.StorageNodeInfo,
	/**
	 * The epoch when the pool is / will be activated. Serves information purposes
	 * only, the checks are performed in the `state` property.
	 */
	activation_epoch: bcs.u32(),
	/** Epoch when the pool was last updated. */
	latest_epoch: bcs.u32(),
	/** Currently staked WAL in the pool + rewards pool. */
	wal_balance: bcs.u64(),
	/** The total number of shares in the current epoch. */
	num_shares: bcs.u64(),
	/**
	 * The amount of the shares that will be withdrawn in E+1 or E+2. We use this
	 * amount to calculate the WAL withdrawal in the `process_pending_stake`.
	 */
	pending_shares_withdraw: pending_values.PendingValues,
	/**
	 * The amount of the stake requested for withdrawal for a node that may part of the
	 * next committee. Stores principals of not yet active stakes. In practice, those
	 * tokens are staked for exactly one epoch.
	 */
	pre_active_withdrawals: pending_values.PendingValues,
	/**
	 * The pending commission rate for the pool. Commission rate is applied in E+2, so
	 * we store the value for the matching epoch and apply it in the `advance_epoch`
	 * function.
	 */
	pending_commission_rate: pending_values.PendingValues,
	/** The commission rate for the pool, in basis points. */
	commission_rate: bcs.u16(),
	/**
	 * Historical exchange rates for the pool. The key is the epoch when the exchange
	 * rate was set, and the value is the exchange rate (the ratio of the amount of WAL
	 * tokens for the pool shares).
	 */
	exchange_rates: table.Table,
	/**
	 * The amount of stake that will be added to the `wal_balance`. Can hold up to two
	 * keys: E+1 and E+2, due to the differences in the activation epoch.
	 *
	 * ```
	 * E+1 -> Balance
	 * E+2 -> Balance
	 * ```
	 *
	 * Single key is cleared in the `advance_epoch` function, leaving only the next
	 * epoch's stake.
	 */
	pending_stake: pending_values.PendingValues,
	/** The rewards that the pool has received from being in the committee. */
	rewards_pool: balance.Balance,
	/** The commission that the pool has received from the rewards. */
	commission: balance.Balance,
	/** An Object or an address which can claim the commission. */
	commission_receiver: auth.Authorized,
	/** An Object or address that can authorize governance actions, such as upgrades. */
	governance_authorized: auth.Authorized,
	/** Reserved for future use and migrations. */
	extra_fields: bag.Bag,
});
