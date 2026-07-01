/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Per-market exponentially-weighted gas-price statistics used to surcharge trades
 * placed during abnormal network congestion, mirroring DeepBook core's gas-price
 * EWMA penalty.
 *
 * This module owns only the evolving `(mean, variance)` estimate and the gas-price
 * observation and penalty math. The tunable knobs (`alpha`, `z_score_threshold`,
 * `penalty_rate`, `enabled`) live in `EwmaConfig`; `ExpiryMarket` owns the stored
 * state and decides when to fold observations in.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '@local-pkg/deepbook_predict::ewma';
export const EwmaState = new MoveStruct({
	name: `${$moduleName}::EwmaState`,
	fields: {
		mean: bcs.u64(),
		variance: bcs.u64(),
		/** On-chain time of the last fold; guards against more than one update per ms. */
		last_updated_timestamp_ms: bcs.u64(),
	},
});
