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
import { U64 } from '../../bcs/integers.js';
const $moduleName = '@local-pkg/deepbook_predict::strike_exposure_config';
export const StrikeExposureConfig = new MoveStruct({
	name: `${$moduleName}::StrikeExposureConfig`,
	fields: {
		/**
		 * Fraction of the disjoint-book backing gap reserved for early exits. A value of
		 * 1.0 reserves the full gap.
		 */
		backing_buffer_lambda: U64,
		/**
		 * Base fee multiplier for Bernoulli scaling. Effective base fee = base_fee *
		 * sqrt(price * (1 - price)).
		 */
		base_fee: U64,
		/** Minimum per-unit fee floor; live trade fees never go below this value. */
		min_fee: U64,
		/** Minimum raw entry probability allowed for mint admission. */
		min_entry_probability: U64,
		/** Maximum raw entry probability allowed for mint admission. */
		max_entry_probability: U64,
		/** Window before expiry over which trade fees ramp up. */
		expiry_fee_window_ms: U64,
		/** Fee multiplier reached at expiry, in FLOAT_SCALING; 1x disables the ramp. */
		expiry_fee_max_multiplier: U64,
		/**
		 * Maximum marginal rate of the path-independent inventory-impact curve, in
		 * FLOAT_SCALING. `0` disables both charges and rebates.
		 */
		inventory_impact_max_rate: U64,
	},
});
