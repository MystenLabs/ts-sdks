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
 * dynamic-field child, and `apply_at` and `settlement_prefix_payout` touch one per
 * level against a per-transaction cached-object ceiling.
 *
 * It tracks each order's quantity, which is also its settled payout: a winning
 * order pays its full quantity. Live cash backing is the max-point payout plus a
 * buffer over the disjoint-book gap; the tree's max-point term is the floor anchor
 * of that enforced reserve.
 *
 * Shape carries no value for a consistent index: `combine_summaries` is
 * associative over the in-order sequence, so any arrangement of the same
 * boundaries yields identical summaries, settlement prefixes, and linear-walk
 * totals. That holds only while every prefix is non-negative, which a consistent
 * book guarantees. Under a caller/index desync the settlement walk's underflow
 * abort depends on which prefixes a given shape happens to visit, so it is not a
 * desync detector — the per-boundary underflow in `apply_net_delta` is the
 * authority.
 */

import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { U64 } from '../../bcs/integers.js';
import * as table from './deps/sui/table.js';
const $moduleName = '@local-pkg/deepbook_predict::strike_payout_tree';
export const StrikePayoutTree = new MoveStruct({
	name: `${$moduleName}::StrikePayoutTree`,
	fields: {
		root: bcs.option(U64),
		nodes: table.Table,
		node_count: U64,
		/**
		 * Aggregate order quantity over the open-lower prefix, which is also its aggregate
		 * settled payout.
		 */
		base: U64,
	},
});
export const PayoutSummary = new MoveStruct({
	name: `${$moduleName}::PayoutSummary`,
	fields: {
		start: U64,
		end: U64,
		/**
		 * Never exceeds `start`, by construction in `boundary_summary` and
		 * `combine_summaries`. That bound is what makes `combine_summaries` associative at
		 * u64 scale — and therefore what makes the tree's shape irrelevant to every value
		 * it reports. A summary term that could outgrow `start` would break
		 * shape-independence with no test to catch it, and would also abort
		 * `strike_exposure`'s plain `total - max` subtraction.
		 */
		max_payout_prefix_gain: U64,
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
		height: U64,
		left: bcs.option(U64),
		right: bcs.option(U64),
		/**
		 * This node's own boundary terms, stored so the subtree `summary` can be
		 * recomputed without deriving locals by subtracting child summaries.
		 */
		local_start: U64,
		local_end: U64,
		summary: PayoutSummary,
	},
});
