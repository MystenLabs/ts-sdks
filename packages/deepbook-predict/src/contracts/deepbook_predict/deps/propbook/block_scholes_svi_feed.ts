/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Stores Block Scholes SVI surface streams for one source, partitioned by expiry
 * into independent Propbook oracle lanes. Writes require the verifier-produced
 * `SVIUpdate` type and must match the feed's immutable source ID. Propbook
 * preserves the signed surface parameters but does not impose consumer-specific
 * pricing or no-arbitrage policy.
 */

import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as i64 from '../fixed_math/i64.js';
const $moduleName = 'propbook::block_scholes_svi_feed';
export const SVIParams = new MoveStruct({
	name: `${$moduleName}::SVIParams`,
	fields: {
		a: i64.I64,
		b: bcs.u64(),
		rho: i64.I64,
		m: i64.I64,
		sigma: bcs.u64(),
	},
});
