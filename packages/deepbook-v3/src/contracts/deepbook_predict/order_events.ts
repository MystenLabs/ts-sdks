/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Order-lifecycle events for Predict.
 *
 * Events carry transition identities and deltas rather than account or market
 * balances. Partial closes link an old order ID to its replacement; the position
 * root remains constant across that chain. The delayed-execution queue events
 * (`OrderEnqueued`, `QueuedOrderFilled`, `QueuedOrderRefunded`) also carry the
 * market's post-call cash, required cash, and waiting cash need, so the keeper
 * tracks spare cash from events alone.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U256, U64 } from '../../bcs/integers.js';
import * as order_queue from './order_queue.js';
import * as pricing from './pricing.js';
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
export const OrderEnqueued = new MoveStruct({
	name: `${$moduleName}::OrderEnqueued`,
	fields: {
		expiry_market_id: bcs.Address,
		record_id: U64,
		account_id: bcs.Address,
		/** An `order_queue` kind code. */
		kind: bcs.u8(),
		request: order_queue.OrderRequest,
		/** The position a sell moved into the record; zero for a mint. */
		position: order_queue.HeldPosition,
		timing: order_queue.OrderTiming,
		vol: pricing.VolSnapshot,
		budget: U64,
		order_fee: U64,
		/** The order's worst-case cash need, added to the waiting total. */
		cash_need: U64,
		subsidy_bound: U64,
		builder_code_id: bcs.option(bcs.Address),
		referrer_account_id: bcs.option(bcs.Address),
		/** The Open record a sell took its position from. `none` for a mint. */
		source_record_id: bcs.option(U64),
		/** The market's cash, required cash, and waiting cash need after the call. */
		market_cash: U64,
		required_cash: U64,
		waiting_cash_need: U64,
	},
});
export const CohortCommitted = new MoveStruct({
	name: `${$moduleName}::CohortCommitted`,
	fields: {
		expiry_market_id: bcs.Address,
		tau_ms: U64,
		/** The update's envelope in ms: τ, or a later backup tick. */
		tick_ms: U64,
		first_record_id: U64,
		last_record_id: U64,
		price_magnitude: U64,
		price_is_negative: bcs.bool(),
		exponent_magnitude: bcs.u16(),
		exponent_is_negative: bcs.bool(),
		/** The feed's own update time, in µs. */
		generation_us: U64,
		pyth_source_id: bcs.u32(),
		pyth_channel: bcs.u8(),
		/** The transaction sender, so monitoring sees commits by third parties. */
		sender: bcs.Address,
		onchain_timestamp_ms: U64,
	},
});
export const QueuedOrderFilled = new MoveStruct({
	name: `${$moduleName}::QueuedOrderFilled`,
	fields: {
		/** The market's cash, required cash, and waiting cash need after the call. */
		market_cash: U64,
		required_cash: U64,
		waiting_cash_need: U64,
		expiry_market_id: bcs.Address,
		record_id: U64,
		account_id: bcs.Address,
		kind: bcs.u8(),
		/** Filled quantity (mint) or closed quantity (sell). */
		quantity: U64,
		/** Cost paid (mint) or proceeds (sell). */
		amount: U64,
		trading_fee: U64,
		builder_fee: U64,
		referral_fee: U64,
		order_fee: U64,
		/** Reserved fee subsidy the fill used. */
		subsidy_used: U64,
		inventory_impact: U64,
		tau_ms: U64,
		tick_ms: U64,
		/**
		 * The position the record now holds: a mint's new position or a partial sell's
		 * replacement; zero after a full close.
		 */
		position: order_queue.HeldPosition,
		sender: bcs.Address,
		onchain_timestamp_ms: U64,
	},
});
export const QueuedOrderRefunded = new MoveStruct({
	name: `${$moduleName}::QueuedOrderRefunded`,
	fields: {
		/** The market's cash, required cash, and waiting cash need after the call. */
		market_cash: U64,
		required_cash: U64,
		waiting_cash_need: U64,
		expiry_market_id: bcs.Address,
		record_id: U64,
		account_id: bcs.Address,
		kind: bcs.u8(),
		/** An `order_queue` reason code. */
		reason: bcs.u8(),
		escrow_returned: U64,
		order_fee_returned: U64,
		subsidy_returned: U64,
		/** True when a sell's position went back to its Open record. */
		position_returned: bcs.bool(),
		sender: bcs.Address,
		onchain_timestamp_ms: U64,
	},
});
export const EscrowShortfall = new MoveStruct({
	name: `${$moduleName}::EscrowShortfall`,
	fields: {
		expiry_market_id: bcs.Address,
		record_id: U64,
		owed: U64,
		paid: U64,
		onchain_timestamp_ms: U64,
	},
});
export const QueuedOrdersCleaned = new MoveStruct({
	name: `${$moduleName}::QueuedOrdersCleaned`,
	fields: {
		expiry_market_id: bcs.Address,
		record_ids: bcs.vector(U64),
		onchain_timestamp_ms: U64,
	},
});
export const QueueEscrowSwept = new MoveStruct({
	name: `${$moduleName}::QueueEscrowSwept`,
	fields: {
		expiry_market_id: bcs.Address,
		amount: U64,
		onchain_timestamp_ms: U64,
	},
});
export const OpenRecordSettled = new MoveStruct({
	name: `${$moduleName}::OpenRecordSettled`,
	fields: {
		expiry_market_id: bcs.Address,
		record_id: U64,
		account_id: bcs.Address,
		order_id: U256,
		payout: U64,
		onchain_timestamp_ms: U64,
	},
});
export const OpenRecordPayoutSkipped = new MoveStruct({
	name: `${$moduleName}::OpenRecordPayoutSkipped`,
	fields: {
		expiry_market_id: bcs.Address,
		record_id: U64,
		account_id: bcs.Address,
		order_id: U256,
		payout: U64,
		onchain_timestamp_ms: U64,
	},
});
export const MarketPayoutsCompleted = new MoveStruct({
	name: `${$moduleName}::MarketPayoutsCompleted`,
	fields: {
		expiry_market_id: bcs.Address,
		onchain_timestamp_ms: U64,
	},
});
