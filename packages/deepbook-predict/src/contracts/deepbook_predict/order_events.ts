/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Order-lifecycle and liquidation events for Predict.
 *
 * Events carry transition identities and deltas rather than account or market
 * balances. Partial closes link an old order ID to its replacement; the position
 * root remains constant across that chain.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U256, U64 } from '../../bcs/integers.js';
const $moduleName = '@local-pkg/deepbook_predict::order_events';
export const OrderMinted = new MoveStruct({
	name: `${$moduleName}::OrderMinted`,
	fields: {
		expiry_market_id: bcs.Address,
		account_id: bcs.Address,
		order_id: U256,
		/**
		 * Stable economic-position handle: the original mint's `order_id`, carried forward
		 * unchanged across partial-close replacements. Equals `order_id` here.
		 */
		position_root_id: U256,
		owner: bcs.Address,
		/**
		 * Canonical strike range as absolute ticks: `lower_tick` (`0` = `-inf`) and
		 * `higher_tick` (`pos_inf_tick` = `+inf`). Raw strikes are the derived display
		 * form, `tick * tick_size` with the `tick_size` from `MarketCreated`.
		 */
		lower_tick: U64,
		higher_tick: U64,
		leverage: U64,
		/** 1e9-scaled range probability quoted at entry. */
		entry_probability: U64,
		quantity: U64,
		/** Net premium the user paid into LP backing, in DUSDC base units. */
		net_premium: U64,
		/** Full trading fee collected by the expiry, including any sponsor-paid subsidy. */
		trading_fee: U64,
		/** Portion of `trading_fee` paid from expiry-local fee incentives. */
		fee_incentive_subsidy: U64,
		builder_fee: U64,
		/** EWMA gas-price congestion surcharge retained by the pool, in DUSDC base units. */
		penalty_fee: U64,
		/**
		 * Builder credited for `builder_fee`; `none` when no builder fee was paid
		 * (attribution follows the fee — applied once, in the emit helper).
		 */
		builder_code_id: bcs.option(bcs.Address),
		minted_at_ms: U64,
		/**
		 * Oracle source timestamps present when this mint was priced: the provider model
		 * times the data is "as of" (the SVI one is also the roll-down anchor). Pyth is
		 * `0` only when unusable.
		 */
		pyth_spot_source_timestamp_ms: U64,
		block_scholes_spot_source_timestamp_ms: U64,
		block_scholes_forward_source_timestamp_ms: U64,
		block_scholes_svi_source_timestamp_ms: U64,
	},
});
export const LiveOrderRedeemed = new MoveStruct({
	name: `${$moduleName}::LiveOrderRedeemed`,
	fields: {
		expiry_market_id: bcs.Address,
		account_id: bcs.Address,
		order_id: U256,
		/**
		 * Stable economic-position handle, constant across the replacement chain. On a
		 * partial close the replacement inherits this same root.
		 */
		position_root_id: U256,
		owner: bcs.Address,
		quantity_closed: U64,
		/** `0` means the position was fully closed. */
		remaining_quantity: U64,
		/** New order ID minted to carry the remainder on a partial live close. */
		replacement_order_id: bcs.option(U256),
		/** Redeem value before fees, after any floor deduction. */
		redeem_amount: U64,
		trading_fee: U64,
		builder_fee: U64,
		/** EWMA gas-price congestion surcharge retained by the pool, in DUSDC base units. */
		penalty_fee: U64,
		/**
		 * Builder credited for `builder_fee`; `none` when no builder fee was paid
		 * (attribution follows the fee — applied once, in the emit helper).
		 */
		builder_code_id: bcs.option(bcs.Address),
		redeemed_at_ms: U64,
		/**
		 * Oracle source timestamps present when this redemption was priced: the provider
		 * model times the data is "as of" (the SVI one is also the roll-down anchor). Pyth
		 * is `0` only when unusable.
		 */
		pyth_spot_source_timestamp_ms: U64,
		block_scholes_spot_source_timestamp_ms: U64,
		block_scholes_forward_source_timestamp_ms: U64,
		block_scholes_svi_source_timestamp_ms: U64,
	},
});
export const SettledOrderRedeemed = new MoveStruct({
	name: `${$moduleName}::SettledOrderRedeemed`,
	fields: {
		expiry_market_id: bcs.Address,
		account_id: bcs.Address,
		order_id: U256,
		/** Stable economic-position handle, constant across the replacement chain. */
		position_root_id: U256,
		owner: bcs.Address,
		quantity_closed: U64,
		settlement_price: U64,
		payout_amount: U64,
		redeemed_at_ms: U64,
	},
});
export const LiquidatedOrderRedeemed = new MoveStruct({
	name: `${$moduleName}::LiquidatedOrderRedeemed`,
	fields: {
		expiry_market_id: bcs.Address,
		account_id: bcs.Address,
		order_id: U256,
		/** Stable economic-position handle, constant across the replacement chain. */
		position_root_id: U256,
		owner: bcs.Address,
		quantity_closed: U64,
		redeemed_at_ms: U64,
	},
});
export const OrderLiquidated = new MoveStruct({
	name: `${$moduleName}::OrderLiquidated`,
	fields: {
		expiry_market_id: bcs.Address,
		order_id: U256,
		quantity: U64,
		/** Probability-weighted value checked against the liquidation threshold. */
		gross_value: U64,
		/** Current contract floor in DUSDC base units. */
		floor_amount: U64,
		/** 1e9-scaled floor-to-live-value threshold used for this expiry. */
		liquidation_ltv: U64,
		liquidated_at_ms: U64,
		/**
		 * Oracle source timestamps present when this liquidation was priced: the provider
		 * model times the data is "as of" (the SVI one is also the roll-down anchor). Pyth
		 * is `0` only when unusable.
		 */
		pyth_spot_source_timestamp_ms: U64,
		block_scholes_spot_source_timestamp_ms: U64,
		block_scholes_forward_source_timestamp_ms: U64,
		block_scholes_svi_source_timestamp_ms: U64,
	},
});
