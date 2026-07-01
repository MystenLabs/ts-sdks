/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Sparse strike exposure index for payout-liability accounting.
 *
 * The tree keys finite interval boundaries by absolute tick, matching the tick
 * pair packed into the durable order ID. Raw strikes are recovered only at the
 * pricing/settlement boundary, where callers pass the owning market's `tick_size`
 * (`raw_strike = tick * tick_size`); the tree stores no grid geometry.
 *
 * This treap stores finite interval boundaries touched by positions. It tracks
 * each order's quantity and static floor shares, deriving net payout
 * (`quantity -  floor_shares = Q - F`) for settled liability and max single-point
 * payout. Live cash backing is the max-point net payout plus a buffer over the
 * disjoint-book gap; the tree's max-point term is the floor anchor of that
 * enforced reserve.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/deepbook_predict::strike_payout_tree';
export const PayoutTerms = new MoveStruct({
	name: `${$moduleName}::PayoutTerms`,
	fields: {
		/**
		 * Aggregate order quantity over the prefix. Read by the NAV linear walk
		 * (`walk_linear`), which prices each boundary's start/end quantity.
		 */
		quantity: bcs.u64(),
		/**
		 * Aggregate static floor shares over the prefix. Net payout is derived as
		 * `quantity - floor_shares` for settled liability and max-point reserve reads.
		 */
		floor_shares: bcs.u64(),
	},
});
export const StrikePayoutTree = new MoveStruct({
	name: `${$moduleName}::StrikePayoutTree`,
	fields: {
		root: bcs.option(bcs.u64()),
		nodes: table.Table,
		node_count: bcs.u64(),
		base: PayoutTerms,
	},
});
export const PayoutSummary = new MoveStruct({
	name: `${$moduleName}::PayoutSummary`,
	fields: {
		total_start: PayoutTerms,
		total_end: PayoutTerms,
		max_net_payout_prefix_gain: bcs.u64(),
		/**
		 * Exact tick span of this subtree (BST invariant: leftmost / rightmost node key).
		 * `up_price` is monotone decreasing in strike, so
		 * `[up_price(max_tick·ts), up_price(min_tick·ts)]` bounds every node price in the
		 * subtree — the basis for `walk_linear`'s bounded interpolation. Set in `new_leaf`
		 * / `resummarize`; the `combine_summaries` / `zero_summary` outputs leave these
		 * `0` (the owning node overwrites them).
		 */
		min_tick: bcs.u64(),
		max_tick: bcs.u64(),
	},
});
export const PayoutNode = new MoveStruct({
	name: `${$moduleName}::PayoutNode`,
	fields: {
		priority: bcs.u64(),
		left: bcs.option(bcs.u64()),
		right: bcs.option(bcs.u64()),
		/**
		 * This node's own boundary terms, stored so the subtree `summary` can be
		 * recomputed without deriving locals by subtracting child summaries.
		 */
		local_start: PayoutTerms,
		local_end: PayoutTerms,
		summary: PayoutSummary,
	},
});
