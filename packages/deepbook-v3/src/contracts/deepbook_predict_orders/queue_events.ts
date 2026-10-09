/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The order-flow companion's events. Predict still emits `OrderMinted` and
 * `LiveOrderRedeemed` from its fills; these sit next to them. The placement, fill,
 * and refund events carry the market's post-call cash, required cash, and waiting
 * cash need, so the keeper tracks spare cash from events alone.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64, U256 } from '../../bcs/integers.js';
import * as order_queue from './order_queue.js';
import * as pricing from './deps/deepbook_predict/pricing.js';
import * as delayed_execution_config from './delayed_execution_config.js';
const $moduleName = '@local-pkg/deepbook_predict_orders::queue_events';
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
		onchain_timestamp_ms: U64,
	},
});
export const CohortCommitted = new MoveStruct({
	name: `${$moduleName}::CohortCommitted`,
	fields: {
		expiry_market_id: bcs.Address,
		tau_ms: U64,
		/** The update's envelope in ms: τ, or the backup tick one channel tick later. */
		tick_ms: U64,
		first_record_id: U64,
		last_record_id: U64,
		/** The committed price of the cohort's first order, normalized to 1e9. */
		spot: U64,
		/** That price's own update time, in µs. */
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
		/** True when a sell's record went back to Open holding its position. */
		position_returned: bcs.bool(),
		sender: bcs.Address,
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
export const RecordFundsParked = new MoveStruct({
	name: `${$moduleName}::RecordFundsParked`,
	fields: {
		expiry_market_id: bcs.Address,
		record_id: U64,
		account_id: bcs.Address,
		receive_address: bcs.Address,
		amount: U64,
		onchain_timestamp_ms: U64,
	},
});
export const RecordFundsClaimed = new MoveStruct({
	name: `${$moduleName}::RecordFundsClaimed`,
	fields: {
		expiry_market_id: bcs.Address,
		record_id: U64,
		account_id: bcs.Address,
		receive_address: bcs.Address,
		amount: U64,
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
export const DelayedExecutionPolicyUpdated = new MoveStruct({
	name: `${$moduleName}::DelayedExecutionPolicyUpdated`,
	fields: {
		desk_id: bcs.Address,
		policy: delayed_execution_config.DelayedExecutionPolicy,
		onchain_timestamp_ms: U64,
	},
});
