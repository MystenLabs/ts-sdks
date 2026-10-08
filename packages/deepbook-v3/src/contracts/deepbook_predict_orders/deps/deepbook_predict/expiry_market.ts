/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Per-expiry Predict market.
 *
 * An ExpiryMarket is the hot shared object for one expiry. It owns trade
 * execution, strike exposure state, and an embedded expiry-cash custody component,
 * plus local sponsor-funded fee incentives. Live oracle validation is delegated to
 * `pricing::load_live_pricer`; this module owns market flow policy and then passes
 * loaded `Pricer` snapshots into exposure business logic. Pool-wide PLP accounting
 * and profit accounting remain outside this module.
 *
 * It also owns the order-flow primitives an order-flow companion package drives.
 * `admit_mint` and `admit_sell` admit one queued order, pin a mint's boundary
 * nodes, record the order's cash need in the market's `OrderFlowLedger`, and issue
 * or advance its `OrderReceipt`. `commit` stores the bounded Pyth price the order
 * fills at, `try_fill` fills or refunds it, `release` takes it out without
 * filling, and `try_pay_settled` pays a queue-held position after settlement. A
 * queued fill never enters the account: its position stays in the receipt.
 * Admission, commit, and fill need an allowlisted companion witness; release and
 * the settled payout need only the receipt. The queue itself, its escrow, its
 * policy, and its events live in the companion.
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64, U256 } from '../../../../bcs/integers.js';
import * as pricing from './pricing.js';
const $moduleName = 'deepbook_predict::expiry_market';
export const OrderParties = new MoveStruct({
	name: `${$moduleName}::OrderParties`,
	fields: {
		account_id: bcs.Address,
		owner: bcs.Address,
		/** Sell proceeds and the settled payout go only here. */
		receive_address: bcs.Address,
		referrer_account_id: bcs.option(bcs.Address),
		referrer_receive_address: bcs.option(bcs.Address),
		builder_code_id: bcs.option(bcs.Address),
	},
});
export const OrderReceipt = new MoveStruct({
	name: `${$moduleName}::OrderReceipt`,
	fields: {
		expiry_market_id: bcs.Address,
		stage: bcs.u8(),
		/** A `constants` mint kind, or `order_kind_sell` once a sell is admitted. */
		kind: bcs.u8(),
		/** The account's snapshot at the last admission. */
		parties: OrderParties,
		lower_tick: U64,
		higher_tick: U64,
		/** The exact mint quantity, or the sell's close quantity. */
		quantity: U64,
		max_premium: U64,
		min_quantity: U64,
		max_probability: U64,
		min_probability: U64,
		min_proceeds: U64,
		/** Earliest Pyth generation time the order may price at. */
		tau_ms: U64,
		/** At or past it the order is refunded, never filled. */
		deadline_ms: U64,
		/** The Lazer channel τ was planned on; the committed price must come from it. */
		channel: bcs.u8(),
		vol: pricing.VolSnapshot,
		budget: U64,
		order_fee: U64,
		/**
		 * Worst-case market cash the fill can consume. Counted in the ledger's
		 * `waiting_cash_need` while the order is admitted.
		 */
		cash_need: U64,
		/**
		 * The t₀ quote's pre-subsidy trading fee, capped at `budget`. Bounds the subsidy
		 * `commit` reserves.
		 */
		subsidy_bound: U64,
		subsidy_rate: U64,
		subsidy_reserved: U64,
		/** The committed Pyth price, 1e9-normalized; `0` until `commit`. */
		spot: U64,
		/** The committed update's envelope, in ms. The fill prices at it. */
		tick_ms: U64,
		/** The committed feed's own update time, in µs. */
		generation_us: U64,
		/** The open position's order ID; `0` until the mint fills. */
		order_id: U256,
		/** Stable economic-position handle, constant across partial closes. */
		root_id: U256,
		opened_at_ms: U64,
		/**
		 * The open position's size, the quantity `order_id` names. The request's
		 * `quantity` is the mint or close quantity, so a sell admission never overwrites
		 * the size it closes.
		 */
		held_quantity: U64,
	},
});
