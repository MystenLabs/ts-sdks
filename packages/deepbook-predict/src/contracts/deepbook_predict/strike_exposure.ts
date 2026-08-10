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

import { MoveStruct, MoveEnum } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import * as strike_exposure_config from './strike_exposure_config.js';
import * as liquidation_book from './liquidation_book.js';
import * as strike_payout_tree from './strike_payout_tree.js';
import * as order from './order.js';
const $moduleName = '@local-pkg/deepbook_predict::strike_exposure';
export const StrikeExposure = new MoveStruct({
	name: `${$moduleName}::StrikeExposure`,
	fields: {
		/** Expiry market that owns this exposure book. */
		expiry_market_id: bcs.Address,
		/** Terminal timestamp used by fee and settlement math. */
		expiry_ms: U64,
		/** Raw-price-per-tick conversion factor; `raw_strike = tick * tick_size`. */
		tick_size: U64,
		/** Coarser raw-price step that new finite mint boundaries must align to. */
		admission_tick_size: U64,
		/** Exact Propbook Pyth source timestamp used to derive the reference tick. */
		reference_tick_source_timestamp_ms: U64,
		/** Reference fine-grid tick that may bypass the coarser admission grid once set. */
		reference_tick: bcs.option(bcs.u64()),
		/** Snapshotted exposure and fee policy for this expiry. */
		config: strike_exposure_config.StrikeExposureConfig,
		next_order_sequence: U64,
		/** Terminal settlement price once the exposure has entered its settled phase. */
		settlement_price: bcs.option(bcs.u64()),
		/** Remaining payout liability in the settled phase. */
		settled_payout_liability: U64,
		liquidation: liquidation_book.LiquidationBook,
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
		leverage: U64,
		entry_probability: U64,
		net_premium: U64,
		floor_shares: U64,
	},
});
export const LiveCloseTerms = new MoveStruct({
	name: `${$moduleName}::LiveCloseTerms`,
	fields: {
		close_quantity: U64,
		/** Floor shares leaving the book with the closed slice. */
		remove_floor_shares: U64,
		redeem_amount: U64,
		range_probability: U64,
	},
});
/**
 * Every outcome of one prospective close: an already-liquidated order whose book
 * state is gone (only the holder's position clear remains), a liquidatable order
 * due its knock-out at the current price, a priced live close, or the settled
 * terminal payout (zero for a loss). Enums match only inside their defining
 * module, so flows branch via the `is_*` accessors and `process_close` owns the
 * dispatch.
 */
export const CloseOutcome = new MoveEnum({
	name: `${$moduleName}::CloseOutcome`,
	fields: {
		Liquidated: null,
		Liquidatable: new MoveStruct({
			name: `CloseOutcome.Liquidatable`,
			fields: {
				gross_value: U64,
			},
		}),
		Live: LiveCloseTerms,
		Settled: new MoveStruct({
			name: `CloseOutcome.Settled`,
			fields: {
				payout: U64,
			},
		}),
	},
});
export const CloseTerms = new MoveStruct({
	name: `${$moduleName}::CloseTerms`,
	fields: {
		expiry_market_id: bcs.Address,
		/** Which book entry the close removes. */
		order: order.Order,
		outcome: CloseOutcome,
	},
});
