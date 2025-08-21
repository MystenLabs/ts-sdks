// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';

/**
 * BCS struct for ID type
 */
export const ID = bcs.struct('ID', {
	bytes: bcs.Address,
});

/**
 * BCS struct for VecSet type
 */
export const VecSet = bcs.struct('VecSet', {
	constants: bcs.vector(bcs.U128),
});

/**
 * BCS struct for OrderDeepPrice type
 */
export const OrderDeepPrice = bcs.struct('OrderDeepPrice', {
	asset_is_base: bcs.bool(),
	deep_per_asset: bcs.u64(),
});

/**
 * BCS struct for Order type
 */
export const Order = bcs.struct('Order', {
	balance_manager_id: ID,
	order_id: bcs.u128(),
	client_order_id: bcs.u64(),
	quantity: bcs.u64(),
	filled_quantity: bcs.u64(),
	fee_is_deep: bcs.bool(),
	order_deep_price: OrderDeepPrice,
	epoch: bcs.u64(),
	status: bcs.u8(),
	expire_timestamp: bcs.u64(),
});

/**
 * BCS struct for Balances type
 */
export const Balances = bcs.struct('Balances', {
	base: bcs.u64(),
	quote: bcs.u64(),
	deep: bcs.u64(),
});

/**
 * BCS struct for Account type
 */
export const Account = bcs.struct('Account', {
	epoch: bcs.u64(),
	open_orders: VecSet,
	taker_volume: bcs.u128(),
	maker_volume: bcs.u128(),
	active_stake: bcs.u64(),
	inactive_stake: bcs.u64(),
	created_proposal: bcs.bool(),
	voted_proposal: bcs.option(ID),
	unclaimed_rebates: Balances,
	settled_balances: Balances,
	owed_balances: Balances,
});
