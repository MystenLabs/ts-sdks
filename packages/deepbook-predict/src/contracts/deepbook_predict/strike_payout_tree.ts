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
 * each order's quantity and its net payout (`Q - F`), converting the packed static
 * floor once at the write boundary so no aggregate read re-derives it. Live cash
 * backing is the max-point net payout plus a buffer over the disjoint-book gap;
 * the tree's max-point term is the floor anchor of that enforced reserve.
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
		max_net_payout_prefix_gain: bcs.u64(),
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
