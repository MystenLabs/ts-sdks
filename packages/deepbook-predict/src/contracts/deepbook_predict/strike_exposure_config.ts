/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stored strike-exposure policy config.
 *
 * ProtocolConfig owns the current global template. Each StrikeExposure stores a
 * snapshot initialized from that template, so later admin updates do not reprice
 * active markets. Fee policy lives here because fees consume prices but are not
 * themselves contract probability.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::strike_exposure_config';
export const StrikeExposureConfig = new MoveStruct({
	name: `${$moduleName}::StrikeExposureConfig`,
	fields: {
		/**
		 * 1e9-scaled floor-to-live-value threshold for liquidation. `850_000_000` means
		 * liquidate at 85% LTV. With a static floor the trigger is
		 * `qty·P <= floor_shares / liquidation_ltv`; the buffer is the anti-arbitrage
		 * enforcement margin (knock out a hair before zero equity), not a solvency margin
		 * — the reserve already backs the full `Q - F`.
		 */
		liquidation_ltv: bcs.u64(),
		/**
		 * Global max leverage for mint admission, before the low-probability curve scales
		 * it down. Actual liquidation still uses `liquidation_ltv`.
		 */
		max_admission_leverage: bcs.u64(),
		/**
		 * Fraction of the disjoint-book backing gap reserved for early exits. 1.0 fully
		 * reserves early exits, matching the pre-buffer summed reserve.
		 */
		backing_buffer_lambda: bcs.u64(),
		/**
		 * Base fee multiplier for Bernoulli scaling. Effective base fee = base_fee _
		 * sqrt(price _ (1 - price)).
		 */
		base_fee: bcs.u64(),
		/** Minimum per-unit fee floor; live trade fees never go below this value. */
		min_fee: bcs.u64(),
		/** Minimum raw entry probability allowed for mint admission. */
		min_entry_probability: bcs.u64(),
		/** Maximum raw entry probability allowed for mint admission. */
		max_entry_probability: bcs.u64(),
		/** Window before expiry over which trade fees ramp up. */
		expiry_fee_window_ms: bcs.u64(),
		/** Fee multiplier reached at expiry, in FLOAT_SCALING; 1x disables the ramp. */
		expiry_fee_max_multiplier: bcs.u64(),
	},
});
