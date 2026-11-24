/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Pricing for Predict markets.
 *
 * This module computes SVI-adjusted digital probabilities from Block Scholes
 * inputs and a Pyth spot that arrive inline, signed, in the transaction that needs
 * them. `snap_v2` turns a `block_scholes::BsVol` into the `VolSnapshot` a receipt
 * or the flush stores, and `pricer_at` builds a `Pricer` from a snapshot at a
 * committed Pyth tick: the Block Scholes basis re-anchored on the Pyth spot, and
 * the SVI rolled down to the tick. It returns `none` where the inputs leave
 * Predict's pricing envelope. The `try_*` reads price exactly as `up_price` and
 * `range_price` do, and return `none` where those abort, so an order-flow fill
 * never aborts on a surface.
 *
 * Block Scholes signs SVI at `9` or `18` decimals. Pricing carries `a` and `b` at
 * 1e18 either way, exactly when they were signed at 18. A snapshot keeps them at
 * 1e9, so a snapshot from 18 decimals also records the full-precision tuple in its
 * market's SVI cache, a dynamic field this module keeps on the market's UID
 * (`SviKey`), and pricing reads that entry when it still holds it.
 *
 * Earlier package versions read Propbook's stores here. Those readers survive only
 * as test fixtures (`load_live_pricer`, `load_vol`).
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
		 * The market's Pyth Lazer feed, from its oracle binding at admission. Commit finds
		 * this feed in each Lazer update.
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
