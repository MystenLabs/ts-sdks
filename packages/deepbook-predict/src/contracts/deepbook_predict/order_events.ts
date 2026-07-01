/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Order-lifecycle and liquidation events for Predict.
 *
 * Hot-path events stay lean: each carries the deltas and identities a consumer
 * needs to reconstruct money flows off-chain, with no absolute balances.
 * `order_id` joins minted, redeemed, and liquidated rows for one position; the
 * network envelope supplies timestamp and sender, so neither is a field.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::order_events';
export const OrderMinted = new MoveStruct({
	name: `${$moduleName}::OrderMinted`,
	fields: {
		expiry_market_id: bcs.Address,
		account_id: bcs.Address,
		order_id: bcs.u256(),
		/**
		 * Stable economic-position handle: the original mint's `order_id`, carried forward
		 * unchanged across partial-close replacements. Equals `order_id` here.
		 */
		position_root_id: bcs.u256(),
		owner: bcs.Address,
		/**
		 * Canonical strike range as absolute ticks: `lower_tick` (`0` = `-inf`) and
		 * `higher_tick` (`pos_inf_tick` = `+inf`). Raw strikes are the derived display
		 * form, `tick * tick_size` with the `tick_size` from `MarketCreated`.
		 */
		lower_tick: bcs.u64(),
		higher_tick: bcs.u64(),
		leverage: bcs.u64(),
		/** 1e9-scaled range probability quoted at entry. */
		entry_probability: bcs.u64(),
		quantity: bcs.u64(),
		/** Net premium the user paid into LP backing, in DUSDC base units. */
		net_premium: bcs.u64(),
		/** Full trading fee collected by the expiry, including any sponsor-paid subsidy. */
		trading_fee: bcs.u64(),
		/** Portion of `trading_fee` paid from expiry-local fee incentives. */
		fee_incentive_subsidy: bcs.u64(),
		builder_fee: bcs.u64(),
		/** EWMA gas-price congestion surcharge retained by the pool, in DUSDC base units. */
		penalty_fee: bcs.u64(),
		builder_code_id: bcs.option(bcs.Address),
	},
});
export const LiveOrderRedeemed = new MoveStruct({
	name: `${$moduleName}::LiveOrderRedeemed`,
	fields: {
		expiry_market_id: bcs.Address,
		account_id: bcs.Address,
		order_id: bcs.u256(),
		/**
		 * Stable economic-position handle, constant across the replacement chain. On a
		 * partial close the replacement inherits this same root.
		 */
		position_root_id: bcs.u256(),
		owner: bcs.Address,
		quantity_closed: bcs.u64(),
		/** `0` means the position was fully closed. */
		remaining_quantity: bcs.u64(),
		/** New order ID minted to carry the remainder on a partial live close. */
		replacement_order_id: bcs.option(bcs.u256()),
		/** Redeem value before fees, after any floor deduction. */
		redeem_amount: bcs.u64(),
		trading_fee: bcs.u64(),
		builder_fee: bcs.u64(),
		/** EWMA gas-price congestion surcharge retained by the pool, in DUSDC base units. */
		penalty_fee: bcs.u64(),
		builder_code_id: bcs.option(bcs.Address),
	},
});
export const SettledOrderRedeemed = new MoveStruct({
	name: `${$moduleName}::SettledOrderRedeemed`,
	fields: {
		expiry_market_id: bcs.Address,
		account_id: bcs.Address,
		order_id: bcs.u256(),
		/** Stable economic-position handle, constant across the replacement chain. */
		position_root_id: bcs.u256(),
		owner: bcs.Address,
		quantity_closed: bcs.u64(),
		settlement_price: bcs.u64(),
		payout_amount: bcs.u64(),
	},
});
export const LiquidatedOrderRedeemed = new MoveStruct({
	name: `${$moduleName}::LiquidatedOrderRedeemed`,
	fields: {
		expiry_market_id: bcs.Address,
		account_id: bcs.Address,
		order_id: bcs.u256(),
		/** Stable economic-position handle, constant across the replacement chain. */
		position_root_id: bcs.u256(),
		owner: bcs.Address,
		quantity_closed: bcs.u64(),
	},
});
export const OrderLiquidated = new MoveStruct({
	name: `${$moduleName}::OrderLiquidated`,
	fields: {
		expiry_market_id: bcs.Address,
		order_id: bcs.u256(),
		quantity: bcs.u64(),
		/** Probability-weighted value checked against the liquidation threshold. */
		gross_value: bcs.u64(),
		/** Current contract floor in DUSDC base units. */
		floor_amount: bcs.u64(),
		/** 1e9-scaled floor-to-live-value threshold used for this expiry. */
		liquidation_ltv: bcs.u64(),
	},
});
