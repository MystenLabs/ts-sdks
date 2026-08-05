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
 * This height-balanced (AVL) tree stores finite interval boundaries touched by
 * positions. Boundary ticks are caller-chosen, so the balancing rule must not read
 * anything the caller supplies: rotations are driven by measured subtree height,
 * which bounds depth at `O(log n)` for _every_ tick set rather than in expectation
 * over a random one. Depth is the cost model that matters — each node is a
 * dynamic-field child, and `apply_at` and `settlement_prefix_net_payout` touch one
 * per level against a per-transaction cached-object ceiling.
 *
 * It tracks each order's quantity and its net payout (`Q - F`), converting the
 * packed static floor once at the write boundary so no aggregate read re-derives
 * it. Live cash backing is the max-point net payout plus a buffer over the
 * disjoint-book gap; the tree's max-point term is the floor anchor of that
 * enforced reserve.
 *
 * Shape carries no value for a consistent index: `combine_summaries` is
 * associative over the in-order sequence, so any arrangement of the same
 * boundaries yields identical summaries, settlement prefixes, and linear-walk
 * totals. That holds only while every prefix is non-negative, which a consistent
 * book guarantees. Under a caller/index desync the settlement walk's underflow
 * abort depends on which prefixes a given shape happens to visit, so it is not a
 * desync detector — `apply_terms_delta`'s per-boundary assert is the authority.
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
		 * Aggregate net payout (`Q - F`) over the prefix — the basis for settled liability
		 * and max-point reserve reads. Stored rather than derived so a negative aggregate
		 * net payout is unrepresentable instead of relying on the per-order `F <= Q`
		 * invariant surviving every summation.
		 */
		net_payout: bcs.u64(),
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
		net_start: bcs.u64(),
		net_end: bcs.u64(),
		/**
		 * Never exceeds `net_start`, by construction in `boundary_summary` and
		 * `combine_summaries`. That bound is what makes `combine_summaries` associative at
		 * u64 scale — and therefore what makes the tree's shape irrelevant to every value
		 * it reports. A summary term that could outgrow `net_start` would break
		 * shape-independence with no test to catch it, and would also abort
		 * `strike_exposure`'s plain `total - max` subtraction.
		 */
		max_net_payout_prefix_gain: bcs.u64(),
	},
});
export const PayoutNode = new MoveStruct({
	name: `${$moduleName}::PayoutNode`,
	fields: {
		/**
		 * Longest root-to-leaf path in this subtree, counting this node. A leaf is 1; an
		 * absent child is 0. Maintained by `resummarize` alongside `summary`, and read
		 * only by `rebalance` — never by a caller, and never derived from a tick.
		 */
		height: bcs.u64(),
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
