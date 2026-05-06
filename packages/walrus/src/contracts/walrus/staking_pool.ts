/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Module: staking_pool */

import {  MoveStruct, MoveEnum  } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as storage_node from './storage_node.js';
import * as pending_values from './pending_values.js';
import * as table from './deps/sui/table.js';
import * as balance from './deps/sui/balance.js';
import * as auth from './auth.js';
import * as bag from './deps/sui/bag.js';
const $moduleName = '@local-pkg/walrus::staking_pool';
export const NewEpochCommissionBlockedForCollection: MoveStruct<{
	dummy_field: ReturnType<typeof bcs.bool>;
}> = new MoveStruct({
	name: `${$moduleName}::NewEpochCommissionBlockedForCollection`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const VotingParams: MoveStruct<{
	storage_price: ReturnType<typeof bcs.u64>;
	write_price: ReturnType<typeof bcs.u64>;
	node_capacity: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
	name: `${$moduleName}::VotingParams`,
	fields: {
		/** Voting: storage price for the next epoch. */
		storage_price: bcs.u64(),
		/** Voting: write price for the next epoch. */
		write_price: bcs.u64(),
		/** Voting: node capacity for the next epoch. */
		node_capacity: bcs.u64(),
	},
});
/** Represents the state of the staking pool. */
export const PoolState: MoveEnum<{
	Active: null;
	Withdrawing: ReturnType<typeof bcs.u32>;
	Withdrawn: null;
}> = new MoveEnum({
	name: `${$moduleName}::PoolState`,
	fields: {
		Active: null,
		Withdrawing: bcs.u32(),
		Withdrawn: null,
	},
});
export const StakingPool: MoveStruct<{
	id: typeof bcs.Address;
	state: typeof PoolState;
	voting_params: typeof VotingParams;
	node_info: typeof storage_node.StorageNodeInfo;
	activation_epoch: ReturnType<typeof bcs.u32>;
	latest_epoch: ReturnType<typeof bcs.u32>;
	wal_balance: ReturnType<typeof bcs.u64>;
	num_shares: ReturnType<typeof bcs.u64>;
	pending_shares_withdraw: typeof pending_values.PendingValues;
	pre_active_withdrawals: typeof pending_values.PendingValues;
	pending_commission_rate: typeof pending_values.PendingValues;
	commission_rate: ReturnType<typeof bcs.u16>;
	exchange_rates: typeof table.Table;
	pending_stake: typeof pending_values.PendingValues;
	rewards_pool: typeof balance.Balance;
	commission: typeof balance.Balance;
	commission_receiver: typeof auth.Authorized;
	governance_authorized: typeof auth.Authorized;
	extra_fields: typeof bag.Bag;
}> = new MoveStruct({
	name: `${$moduleName}::StakingPool`,
	fields: {
		id: bcs.Address,
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
	},
});
