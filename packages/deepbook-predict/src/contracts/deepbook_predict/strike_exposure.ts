/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Expiry-local exposure book for one expiry market.
 *
 * This module interprets `Order` terms against the expiry's `tick_size`,
 * recovering raw strikes from order ticks only at the pricing/settlement boundary.
 * It owns the payout-liability view of the active contracts used for cash backing.
 * The order floor is a static dollar amount (`floor_shares`), so order accounting
 * needs no clock. It stores the parent market identity so market-scoped
 * liquidation events can be emitted atomically with exposure removal.
 * Expiry-market cash custody, rebate accounting, account positions, and payout
 * movement stay outside this module.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as strike_exposure_config from './strike_exposure_config.js';
import * as liquidation_book from './liquidation_book.js';
import * as strike_payout_tree from './strike_payout_tree.js';
const $moduleName = '@local-pkg/deepbook_predict::strike_exposure';
export const StrikeExposure = new MoveStruct({
	name: `${$moduleName}::StrikeExposure`,
	fields: {
		/** Expiry market that owns this exposure book. */
		expiry_market_id: bcs.Address,
		/** Terminal timestamp used by fee and settlement math. */
		expiry_ms: bcs.u64(),
		/** Raw-price-per-tick conversion factor; `raw_strike = tick * tick_size`. */
		tick_size: bcs.u64(),
		/** Coarser raw-price step that new finite mint boundaries must align to. */
		admission_tick_size: bcs.u64(),
		/** Exact Propbook Pyth source timestamp used to derive the reference tick. */
		reference_tick_source_timestamp_ms: bcs.u64(),
		/** Reference fine-grid tick that may bypass the coarser admission grid once set. */
		reference_tick: bcs.option(bcs.u64()),
		/** Snapshotted exposure and fee policy for this expiry. */
		config: strike_exposure_config.StrikeExposureConfig,
		next_order_sequence: bcs.u64(),
		/** Remaining settled liability after settlement has been materialized. */
		settled_payout_liability: bcs.u64(),
		/** True once `settled_payout_liability` has been materialized. */
		settled_liability_materialized: bcs.bool(),
		liquidation: liquidation_book.LiquidationBook,
		/** Sparse payout tree for live cash backing and settled liability. */
		payout: strike_payout_tree.StrikePayoutTree,
	},
});
