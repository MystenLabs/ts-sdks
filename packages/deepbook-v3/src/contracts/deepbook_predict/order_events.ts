/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Order-lifecycle events for Predict.
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
		/** 1e9-scaled range probability quoted at entry. */
		entry_probability: U64,
		quantity: U64,
		/** Premium the user paid into LP backing, in USDC base units. */
		premium: U64,
		/** Full trading fee assessed for the mint, including any sponsor-paid subsidy. */
		trading_fee: U64,
		/** Portion of `trading_fee` paid from expiry-local fee incentives. */
		fee_incentive_subsidy: U64,
		builder_fee: U64,
		/** EWMA gas-price congestion surcharge assessed for the mint, in USDC base units. */
		penalty_fee: U64,
		/**
		 * Portion of the trader-paid trading fee and congestion surcharge delivered to the
		 * referrer.
		 */
		referral_fee: U64,
		/** Separate inventory-impact charge escrowed for live-close rebates. */
		inventory_impact_charge: U64,
		/**
		 * Builder credited for `builder_fee`; `none` when no builder fee was paid
		 * (attribution follows the fee — applied once, in the emit helper).
		 */
		builder_code_id: bcs.option(bcs.Address),
		/** Referrer recorded on the minting account, independent of the fee paid. */
		referrer_account_id: bcs.option(bcs.Address),
		onchain_timestamp_ms: U64,
		/**
		 * Oracle source timestamps present when this mint was priced: Pyth's canonical
		 * source time and the Block Scholes per-update source times used for freshness.
		 * The SVI one is also the roll-down anchor. Pyth is `0` only when unusable.
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
		/** Redeem value before fees. */
		redeem_amount: U64,
		trading_fee: U64,
		builder_fee: U64,
		/** EWMA gas-price congestion surcharge retained by the pool, in USDC base units. */
		penalty_fee: U64,
		/** Separate inventory-impact rebate paid from its isolated escrow. */
		inventory_impact_rebate: U64,
		/**
		 * Builder credited for `builder_fee`; `none` when no builder fee was paid
		 * (attribution follows the fee — applied once, in the emit helper).
		 */
		builder_code_id: bcs.option(bcs.Address),
		onchain_timestamp_ms: U64,
		/**
		 * Oracle source timestamps present when this redemption was priced: Pyth's
		 * canonical source time and the Block Scholes per-update source times used for
		 * freshness. The SVI one is also the roll-down anchor. Pyth is `0` only when
		 * unusable.
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
		payout_amount: U64,
		onchain_timestamp_ms: U64,
	},
});
