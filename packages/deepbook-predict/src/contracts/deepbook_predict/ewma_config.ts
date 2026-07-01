/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stored parameters for the gas-price EWMA trade penalty.
 *
 * `ExpiryMarket` holds the evolving `EwmaState`; this config holds the
 * admin-tunable knobs shared by every market. The penalty is disabled by default.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::ewma_config';
export const EwmaConfig = new MoveStruct({
	name: `${$moduleName}::EwmaConfig`,
	fields: {
		/** Smoothing factor for the gas-price mean and variance; higher reacts faster. */
		alpha: bcs.u64(),
		/** Standard deviations above the smoothed mean required before a penalty applies. */
		z_score_threshold: bcs.u64(),
		/** Per-unit fee added to a penalized trade's trading fee. */
		penalty_rate: bcs.u64(),
		/** Master switch; no penalty applies while false. */
		enabled: bcs.bool(),
	},
});
