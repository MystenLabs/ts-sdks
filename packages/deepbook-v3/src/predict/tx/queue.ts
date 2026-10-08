// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): composable thunks for queued orders. Each is
// `(config, args) => (tx) => result`, like `tx/trade.ts`, so an app can put several into one
// PTB. The `PredictClient.tx.enqueue*` facade adds the chain preflight on top.
//
// Queued orders read the oracle objects directly for their volatility snapshot, so unlike the
// retired immediate trades there is no `load_live_pricer` command before them.
import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { GeneratedConfig } from '../config/generated.js';
import { PredictInputError } from '../errors.js';
import { U64_MAX } from '../units.js';
import * as expiryMarket from '../../contracts/deepbook_predict/expiry_market.js';
import * as plp from '../../contracts/deepbook_predict/plp.js';
import { withAuth } from './common.js';
import type { MarketFeeds } from './trade.js';

const FLOAT_SCALING = 1_000_000_000n;

// The queued placements with their `auth` argument already supplied: auth → enqueue.
const authed = {
	enqueueExactQuantity: withAuth(expiryMarket.enqueueExactQuantity),
	enqueueExactAmount: withAuth(expiryMarket.enqueueExactAmount),
	enqueueExactCost: withAuth(expiryMarket.enqueueExactCost),
	enqueueRedeemOpen: withAuth(expiryMarket.enqueueRedeemOpen),
};

/** The market and account every queued order names. */
interface QueuedOrderTarget extends MarketFeeds {
	expiryMarketId: string;
	wrapperId: string;
}

// The chain refuses a zero or "unlimited" cap (`EMintCostCapRequired`), so a queued mint always
// carries a real one. Checked here so a bad cap never reaches a PTB.
function assertMaxCost(maxCostRaw: bigint): void {
	if (typeof maxCostRaw !== 'bigint' || maxCostRaw <= 0n || maxCostRaw >= U64_MAX) {
		throw new PredictInputError(
			`maxCostRaw must be above 0 and below u64::MAX (a queued mint requires a real cap), got ${String(maxCostRaw)}`,
		);
	}
}

function assertU64(value: bigint, name: string): void {
	if (typeof value !== 'bigint' || value < 0n || value > U64_MAX) {
		throw new PredictInputError(`${name} must be a u64 bigint, got ${String(value)}`);
	}
}

/**
 * Queue a mint of an exact payout quantity, priced at Pyth's signed price for its τ. Returns the
 * record ID (u64). `maxCostRaw` (all-in cap) and `maxProbabilityRaw` (entry-probability cap, at
 * most 1e9) are required: there is no "unlimited" default on the queued path. Escrows
 * `min(max_cost, quantity, available − fee)` plus the order fee. Command order is auth → enqueue.
 */
export function enqueueExactQuantity(
	config: GeneratedConfig,
	args: QueuedOrderTarget & {
		lowerTick: bigint;
		higherTick: bigint;
		quantityRaw: bigint;
		maxCostRaw: bigint;
		maxProbabilityRaw: bigint;
	},
): (tx: Transaction) => TransactionResult {
	assertMaxCost(args.maxCostRaw);
	assertU64(args.quantityRaw, 'quantityRaw');
	if (
		typeof args.maxProbabilityRaw !== 'bigint' ||
		args.maxProbabilityRaw <= 0n ||
		args.maxProbabilityRaw > FLOAT_SCALING
	) {
		throw new PredictInputError(
			`maxProbabilityRaw must be in (0, 1e9], got ${String(args.maxProbabilityRaw)}`,
		);
	}
	return authed.enqueueExactQuantity({
		config,
		arguments: {
			market: args.expiryMarketId,
			wrapper: args.wrapperId,
			pyth: args.pythFeed,
			bsValues: args.blockScholesValueStore,
			bsSvi: args.blockScholesSviStore,
			lowerTick: args.lowerTick,
			higherTick: args.higherTick,
			quantity: args.quantityRaw,
			maxCost: args.maxCostRaw,
			maxProbability: args.maxProbabilityRaw,
		},
	});
}

/**
 * Queue a premium-budget mint: sized at τ under `maxPremiumRaw`, at least `minQuantityRaw`, with
 * the all-in withdrawal capped by the required `maxCostRaw`. Escrows `min(max_cost, available −
 * fee)` plus the order fee. Returns the record ID. Command order is auth → enqueue.
 */
export function enqueueExactAmount(
	config: GeneratedConfig,
	args: QueuedOrderTarget & {
		lowerTick: bigint;
		higherTick: bigint;
		maxPremiumRaw: bigint;
		minQuantityRaw: bigint;
		maxCostRaw: bigint;
	},
): (tx: Transaction) => TransactionResult {
	assertMaxCost(args.maxCostRaw);
	assertU64(args.maxPremiumRaw, 'maxPremiumRaw');
	assertU64(args.minQuantityRaw, 'minQuantityRaw');
	return authed.enqueueExactAmount({
		config,
		arguments: {
			market: args.expiryMarketId,
			wrapper: args.wrapperId,
			pyth: args.pythFeed,
			bsValues: args.blockScholesValueStore,
			bsSvi: args.blockScholesSviStore,
			lowerTick: args.lowerTick,
			higherTick: args.higherTick,
			maxPremium: args.maxPremiumRaw,
			minQuantity: args.minQuantityRaw,
			maxCost: args.maxCostRaw,
		},
	});
}

/**
 * Queue an all-in-budget mint: sized at τ so the all-in cost fits `maxCostRaw`, at least
 * `minQuantityRaw`. `maxCostRaw` is the budget and must be a real cap. Escrows `min(max_cost,
 * available − fee)` plus the order fee. Returns the record ID. Command order is auth → enqueue.
 */
export function enqueueExactCost(
	config: GeneratedConfig,
	args: QueuedOrderTarget & {
		lowerTick: bigint;
		higherTick: bigint;
		maxCostRaw: bigint;
		minQuantityRaw: bigint;
	},
): (tx: Transaction) => TransactionResult {
	assertMaxCost(args.maxCostRaw);
	assertU64(args.minQuantityRaw, 'minQuantityRaw');
	return authed.enqueueExactCost({
		config,
		arguments: {
			market: args.expiryMarketId,
			wrapper: args.wrapperId,
			pyth: args.pythFeed,
			bsValues: args.blockScholesValueStore,
			bsSvi: args.blockScholesSviStore,
			lowerTick: args.lowerTick,
			higherTick: args.higherTick,
			maxCost: args.maxCostRaw,
			minQuantity: args.minQuantityRaw,
		},
	});
}

/**
 * Queue an early sell of `closeQuantityRaw` from the Open record `recordId` (the queue record ID,
 * not the position's u256 order ID). The only early sell in v4: a position held in the account
 * can't be sold early. The record must be Open and belong to this account. `minProbabilityRaw`
 * and `minProceedsRaw` are the close-side floors at τ and are required (`0n` disables either, so
 * pass it on purpose). Escrows only the order fee. Returns the new record ID, which holds the
 * position until the sell fills or refunds. Command order is auth → enqueue.
 */
export function enqueueRedeemOpen(
	config: GeneratedConfig,
	args: QueuedOrderTarget & {
		recordId: bigint;
		closeQuantityRaw: bigint;
		minProbabilityRaw: bigint;
		minProceedsRaw: bigint;
	},
): (tx: Transaction) => TransactionResult {
	assertU64(args.recordId, 'recordId');
	assertU64(args.minProbabilityRaw, 'minProbabilityRaw');
	assertU64(args.minProceedsRaw, 'minProceedsRaw');
	if (typeof args.closeQuantityRaw !== 'bigint' || args.closeQuantityRaw <= 0n) {
		throw new PredictInputError(
			`closeQuantityRaw must be above 0, got ${String(args.closeQuantityRaw)}`,
		);
	}
	return authed.enqueueRedeemOpen({
		config,
		arguments: {
			market: args.expiryMarketId,
			wrapper: args.wrapperId,
			pyth: args.pythFeed,
			bsValues: args.blockScholesValueStore,
			bsSvi: args.blockScholesSviStore,
			recordId: args.recordId,
			closeQuantity: args.closeQuantityRaw,
			minProbability: args.minProbabilityRaw,
			minProceeds: args.minProceedsRaw,
		},
	});
}

/**
 * Fund a live market from the pool vault to `max(required × (1 + rebalance %), initial cash,
 * required + waiting_cash_need)`. Permissionless, and takes no target. Add it AFTER a big sell's
 * enqueue in the same PTB: the enqueue has already added the sell's cash need to the waiting
 * total, so the rebalance funds it at once. It takes the hot `PoolVault`, so add it only when a
 * sell's cash need is above spare cash.
 */
export function rebalanceExpiryCash(
	config: GeneratedConfig,
	args: { expiryMarketId: string },
): (tx: Transaction) => TransactionResult {
	return plp.rebalanceExpiryCash({ config, arguments: { market: args.expiryMarketId } });
}

/**
 * Refund this market's waiting orders at or past their deadline (reason 5), visiting at most
 * `maxOrders` records. Permissionless: no auth, session or Pyth key, and it works during a freeze.
 * Returns how many it refunded, `0` without aborting when none is due. Send it only from the
 * app's refund button, never prepended to other transactions: keepers refund on their own.
 * Every visited record counts toward Sui's per-transaction object limit.
 */
export function refund(
	config: GeneratedConfig,
	args: { expiryMarketId: string; maxOrders: bigint | number },
): (tx: Transaction) => TransactionResult {
	return expiryMarket.refund({
		config,
		arguments: { market: args.expiryMarketId, maxOrders: args.maxOrders },
	});
}

/** The current Pyth Lazer package and the original ID that types its `Update`. */
export interface LazerPackages {
	/** Lazer's shared `State`. */
	stateId: string;
	/** The package to call `parse_and_verify_le_ecdsa_update` on: `State.upgrade_cap.package`. */
	packageId: string;
	/** The original package ID, which `update::Update` is typed by. */
	originalId: string;
}

/**
 * Verify one signed Lazer payload with the current Lazer package. A positional call on purpose:
 * the oracle-construction packages are not generated (see `sui-codegen.config.ts`).
 */
export function parseLazerUpdate(
	lazer: Pick<LazerPackages, 'stateId' | 'packageId'>,
	payload: Uint8Array,
): (tx: Transaction) => TransactionResult {
	return (tx) =>
		tx.moveCall({
			target: `${lazer.packageId}::pyth_lazer::parse_and_verify_le_ecdsa_update`,
			arguments: [tx.object(lazer.stateId), tx.object.clock(), tx.pure.vector('u8', payload)],
		});
}

/**
 * The open filler (no cap exists in v4): verify the signed Lazer payloads, commit them to the
 * market's waiting cohorts, then resolve up to `maxOrders` records. Anyone with Pyth Lazer access
 * can run it. Pass the payloads for a cohort's exact τ, or a backup tick once τ + gap wait has
 * passed with τ uncommitted (when the policy's price buffer is on). `commit` matches each update
 * to its own cohort by τ and skips one that matches nothing, so no head-of-line ordering is
 * assumed. `resolve` refunds an order the market can't cover with reason 8. With
 * `refundOverdue`, a final `refund` call sweeps orders past their deadline.
 *
 * Resolve `lazer` per batch with `read.lazerPackages` and never cache it: a Pyth upgrade retires
 * the old package at once. Size `maxOrders` against the payout tree (`payoutTreeNodeCount`):
 * about 10 to 15 fills fit one transaction in a full tree, so split commit from resolve when the
 * tree is large.
 */
export function fill(
	config: GeneratedConfig,
	args: {
		expiryMarketId: string;
		payloads: readonly Uint8Array[];
		lazer: LazerPackages;
		maxOrders: bigint | number;
		refundOverdue?: boolean;
	},
): (tx: Transaction) => TransactionResult {
	if (args.payloads.length === 0) {
		throw new PredictInputError('fill needs at least one signed Lazer payload');
	}
	return (tx) => {
		const updates = args.payloads.map((payload) => tx.add(parseLazerUpdate(args.lazer, payload)));
		const vector = tx.makeMoveVec({
			type: `${args.lazer.originalId}::update::Update`,
			elements: updates,
		});
		tx.add(
			expiryMarket.commit({ config, arguments: { market: args.expiryMarketId, updates: vector } }),
		);
		const resolved = tx.add(
			expiryMarket.resolve({
				config,
				arguments: { market: args.expiryMarketId, maxOrders: args.maxOrders },
			}),
		);
		if (args.refundOverdue) {
			tx.add(refund(config, { expiryMarketId: args.expiryMarketId, maxOrders: args.maxOrders }));
		}
		return resolved;
	};
}
