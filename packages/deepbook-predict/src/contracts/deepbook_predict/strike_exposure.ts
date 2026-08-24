/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Expiry-local exposure book for one expiry market.
 *
 * This module interprets `Order` terms against the expiry's `tick_size`,
 * recovering raw strikes from order ticks only at the pricing/settlement boundary.
 * It owns the payout-liability view of the active contracts used for cash backing.
 * Order accounting is static and needs no clock: a winning order pays its full
 * quantity. Expiry-market cash custody, account positions, and payout movement
 * stay outside this module.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import * as strike_exposure_config from './strike_exposure_config.js';
import * as strike_payout_tree from './strike_payout_tree.js';
import * as order from './order.js';
const $moduleName = '@local-pkg/deepbook_predict::strike_exposure';
export const StrikeExposure = new MoveStruct({
	name: `${$moduleName}::StrikeExposure`,
	fields: {
		/** Expiry market that owns this exposure book. */
		expiry_market_id: bcs.Address,
		/** Raw-price-per-tick conversion factor; `raw_strike = tick * tick_size`. */
		tick_size: U64,
		/** Coarser raw-price step that new finite mint boundaries must align to. */
		admission_tick_size: U64,
		/** Exact Propbook Pyth source timestamp used to derive the reference tick. */
		reference_tick_source_timestamp_ms: U64,
		/** Reference fine-grid tick that may bypass the coarser admission grid once set. */
		reference_tick: bcs.option(U64),
		/** Snapshotted exposure and fee policy for this expiry. */
		config: strike_exposure_config.StrikeExposureConfig,
		/**
		 * Immutable DUSDC scale for the inventory-impact curve. This is the expiry's
		 * snapshotted maximum pool allocation: a risk-capacity parameter, not live pool
		 * equity, so LP flows cannot reprice an existing book.
		 */
		inventory_impact_scale: U64,
		next_order_sequence: U64,
		/** Terminal settlement price once the exposure has entered its settled phase. */
		settlement_price: bcs.option(U64),
		/** Remaining payout liability in the settled phase. */
		settled_payout_liability: U64,
		/** Sparse payout tree for live cash backing and settled liability. */
		payout: strike_payout_tree.StrikePayoutTree,
	},
});
export const MintTerms = new MoveStruct({
	name: `${$moduleName}::MintTerms`,
	fields: {
		expiry_market_id: bcs.Address,
		lower_tick: U64,
		higher_tick: U64,
		quantity: U64,
		entry_probability: U64,
		premium: U64,
		/** Separate inventory-impact charge, sampled against the pre-mint book. */
		inventory_impact_charge: U64,
	},
});
export const LiveCloseTerms = new MoveStruct({
	name: `${$moduleName}::LiveCloseTerms`,
	fields: {
		expiry_market_id: bcs.Address,
		order: order.Order,
		close_quantity: U64,
		redeem_amount: U64,
		range_probability: U64,
		/** Separate inventory-impact rebate, sampled against the pre-close book. */
		inventory_impact_rebate: U64,
	},
});
