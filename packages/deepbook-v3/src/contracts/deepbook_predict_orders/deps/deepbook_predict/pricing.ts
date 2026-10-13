/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pricing for Predict markets.
 *
 * This module reads canonical Propbook Pyth and Block Scholes feeds and computes
 * SVI-adjusted digital probabilities. Live reads require fresh, pricing-safe Block
 * Scholes spot, forward, and SVI observations. The latest forward is paired with
 * an exact source-timestamp spot from Propbook's bounded recent history. The live
 * forward comes from one of two admin-selected sources
 * (`PricingConfig.use_pyth_spot_for_forward`): a fresh positive Pyth spot carrying
 * the Block Scholes basis, or the Block Scholes forward directly. A load falls
 * back to the Block Scholes forward when the selected Pyth spot is stale or
 * unavailable; valuation prices on that fallback, while every live trade (mints,
 * mint quotes, and live redeems) refuses it through `assert_pyth_spot_fresh`.
 * Exact-history reads do not apply live freshness policy.
 *
 * Delayed execution splits that read in two. `load_vol` validates the same live
 * inputs when an order is admitted and returns the raw Block Scholes basis and SVI
 * its receipt stores; `pricer_at` later rebuilds a `Pricer` from them at the
 * order's committed Pyth tick. The `try_*` reads price exactly as `up_price` and
 * `range_price` do, and return `none` where those abort, so an order-flow fill
 * never aborts on a surface.
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../../../bcs/integers.js';
import * as i64 from '../fixed_math/i64.js';
const $moduleName = 'deepbook_predict::pricing';
export const VolSnapshot = new MoveStruct({
	name: `${$moduleName}::VolSnapshot`,
	fields: {
		/**
		 * Canonical Propbook Pyth source for the market's underlying; commit finds this
		 * feed in each Lazer update.
		 */
		pyth_source_id: bcs.u32(),
		/** The matched Block Scholes spot and forward, narrowed to Predict's width. */
		bs_spot: U64,
		bs_forward: U64,
		/** Raw SVI parameters before roll-down, at 1e9. */
		svi_a: i64.I64,
		svi_b: U64,
		svi_rho: i64.I64,
		svi_m: i64.I64,
		svi_sigma: U64,
		/**
		 * Provider source timestamps of the three reads. The SVI one is also the roll-down
		 * anchor.
		 */
		bs_spot_source_timestamp_ms: U64,
		bs_forward_source_timestamp_ms: U64,
		svi_source_timestamp_ms: U64,
	},
});
