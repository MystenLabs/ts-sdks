/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Block Scholes SVI oracle: one shared object per source id, storing per-expiry
 * volatility-surface streams keyed by expiry timestamp.
 *
 * Propbook does not validate Predict's pricing-safe SVI envelope; consumers own
 * any bounds or no-arbitrage policy needed by their pricing math.
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as i64 from '../fixed_math/i64.js';
import * as i64_1 from '../fixed_math/i64.js';
const $moduleName = 'propbook::block_scholes_svi_feed';
export const SVIParams = new MoveStruct({
	name: `${$moduleName}::SVIParams`,
	fields: {
		a: bcs.u64(),
		b: bcs.u64(),
		rho: i64.I64,
		m: i64_1.I64,
		sigma: bcs.u64(),
	},
});
