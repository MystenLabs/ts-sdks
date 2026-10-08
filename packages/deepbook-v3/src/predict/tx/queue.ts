// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): composable thunks for queued orders. Each is
// `(config, args) => (tx) => result`, like `tx/trade.ts`, so an app can put several into one
// PTB. The `PredictClient.tx.enqueue*` facade adds the chain preflight on top.
//
// Every queued-order entry point lives in the order-flow companion, `deepbook_predict_orders`
// (`queue::*`), and runs against one market's `MarketQueue` plus the companion's shared
// `OrderDesk`. The queue's ID is derived from the desk and the market, so each thunk takes it
// as an optional `queueId` and derives it otherwise. The thunks take `OrdersGeneratedConfig`
// (`toOrdersConfig(cfg)`), which supplies the companion package, the desk and Predict's shared
// objects.
//
// Queued orders read the oracle objects directly for their volatility snapshot, so unlike the
// retired immediate trades there is no `load_live_pricer` command before them.
import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { GeneratedConfig, OrdersGeneratedConfig } from '../config/generated.js';
import { MIN_PREMIUM } from '../cost.js';
import { PredictInputError } from '../errors.js';
import { deriveQueueId } from '../queue-id.js';
import { U64_MAX } from '../units.js';
import * as plp from '../../contracts/deepbook_predict/plp.js';
import * as queue from '../../contracts/deepbook_predict_orders/queue.js';
import { withAuth } from './common.js';
import type { MarketFeeds } from './trade.js';

const FLOAT_SCALING = 1_000_000_000n;

// The queued placements with their `auth` argument already supplied: auth → enqueue.
const authed = {
	enqueueExactQuantity: withAuth(queue.enqueueExactQuantity),
	enqueueExactAmount: withAuth(queue.enqueueExactAmount),
	enqueueExactCost: withAuth(queue.enqueueExactCost),
	enqueueRedeemOpen: withAuth(queue.enqueueRedeemOpen),
};

/** One market's queue. */
export interface QueueTarget {
	expiryMarketId: string;
	/**
	 * The market's `MarketQueue`. Defaults to `deriveQueueId(config.orderDesk, expiryMarketId)`,
	 * the ID `queue::create_and_share` gives it, so pass it only to address another desk's queue.
	 */
	queueId?: string;
}

/** The queue ID a thunk addresses: the given one, or the one derived from the config's desk. */
export function queueIdOf(config: Pick<OrdersGeneratedConfig, 'orderDesk'>, args: QueueTarget) {
	return args.queueId ?? deriveQueueId(config.orderDesk, args.expiryMarketId);
}

/** The market, queue and account every queued order names. */
interface QueuedOrderTarget extends MarketFeeds, QueueTarget {
	wrapperId: string;
}

// The leading arguments every placement shares, after `queue` and `market`.
function placement(config: OrdersGeneratedConfig, args: QueuedOrderTarget) {
	return {
		queue: queueIdOf(config, args),
		market: args.expiryMarketId,
		wrapper: args.wrapperId,
		pyth: args.pythFeed,
		bsValues: args.blockScholesValueStore,
		bsSvi: args.blockScholesSviStore,
	};
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
 * Queue a mint of an exact payout quantity, priced at Pyth's signed price for its τ
 * (`queue::enqueue_exact_quantity`). Returns the record ID (u64). `maxCostRaw` (all-in cap) and
 * `maxProbabilityRaw` (entry-probability cap, at most 1e9) are required: there is no "unlimited"
 * default on the queued path. Escrows `min(max_cost, quantity, available − fee)` plus the order
 * fee. Command order is auth → enqueue.
 */
export function enqueueExactQuantity(
	config: OrdersGeneratedConfig,
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
			...placement(config, args),
			lowerTick: args.lowerTick,
			higherTick: args.higherTick,
			quantity: args.quantityRaw,
			maxCost: args.maxCostRaw,
			maxProbability: args.maxProbabilityRaw,
		},
	});
}

/**
 * Queue a premium-budget mint (`queue::enqueue_exact_amount`): sized at τ under
 * `maxPremiumRaw`, at least `minQuantityRaw`, with the all-in withdrawal capped by the required
 * `maxCostRaw`. Escrows `min(max_cost, available − fee)` plus the order fee. Returns the record
 * ID. Command order is auth → enqueue. `maxPremiumRaw` below the minimum premium (1 USDC) is
 * refused: the fill could never buy enough premium, so Predict's admission dry run would abort
 * `EOrderFailsLimits`.
 */
export function enqueueExactAmount(
	config: OrdersGeneratedConfig,
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
	if (args.maxPremiumRaw < MIN_PREMIUM) {
		throw new PredictInputError(
			`maxPremiumRaw ${args.maxPremiumRaw} is below the ${MIN_PREMIUM} minimum premium (EOrderFailsLimits)`,
		);
	}
	return authed.enqueueExactAmount({
		config,
		arguments: {
			...placement(config, args),
			lowerTick: args.lowerTick,
			higherTick: args.higherTick,
			maxPremium: args.maxPremiumRaw,
			minQuantity: args.minQuantityRaw,
			maxCost: args.maxCostRaw,
		},
	});
}

/**
 * Queue an all-in-budget mint (`queue::enqueue_exact_cost`): sized at τ so the all-in cost fits
 * `maxCostRaw`, at least `minQuantityRaw`. `maxCostRaw` is the budget and must be a real cap.
 * Escrows `min(max_cost, available − fee)` plus the order fee. Returns the record ID. Command
 * order is auth → enqueue.
 */
export function enqueueExactCost(
	config: OrdersGeneratedConfig,
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
			...placement(config, args),
			lowerTick: args.lowerTick,
			higherTick: args.higherTick,
			maxCost: args.maxCostRaw,
			minQuantity: args.minQuantityRaw,
		},
	});
}

/**
 * Queue an early sell of `closeQuantityRaw` from the Open record `recordId`
 * (`queue::enqueue_redeem_open`; the queue record ID, not the position's u256 order ID). The
 * only early sell: a position held in the account can't be sold early. The record must be Open
 * and belong to this account. `minProbabilityRaw` and `minProceedsRaw` are the close-side floors
 * at τ and are required (`0n` disables either, so pass it on purpose). Escrows only the order
 * fee. Returns the new record ID, which holds the position until the sell fills or refunds.
 * Command order is auth → enqueue.
 */
export function enqueueRedeemOpen(
	config: OrdersGeneratedConfig,
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
			...placement(config, args),
			recordId: args.recordId,
			closeQuantity: args.closeQuantityRaw,
			minProbability: args.minProbabilityRaw,
			minProceeds: args.minProceedsRaw,
		},
	});
}

/**
 * Fund a live market from the pool vault to `max(required × (1 + rebalance %), initial cash,
 * required + waiting_cash_need)` (Predict's `plp::rebalance_expiry_cash`). Permissionless, and
 * takes no target. Add it AFTER a big sell's enqueue in the same PTB: the enqueue has already
 * added the sell's cash need to Predict's waiting total, so the rebalance funds it at once. It
 * takes the hot `PoolVault`, so add it only when a sell's cash need is above spare cash.
 */
export function rebalanceExpiryCash(
	config: GeneratedConfig,
	args: { expiryMarketId: string },
): (tx: Transaction) => TransactionResult {
	return plp.rebalanceExpiryCash({ config, arguments: { market: args.expiryMarketId } });
}

/**
 * Create and share a market's `MarketQueue` (`queue::create_and_share`), at the ID
 * `deriveQueueId(config.orderDesk, expiryMarketId)`. Permissionless and once per market (a second
 * call aborts, since the ID is taken); the caller pays its storage. The market-creation keeper
 * sends it after each new `ExpiryMarket`. Returns the queue ID.
 */
export function createQueue(
	config: OrdersGeneratedConfig,
	args: { expiryMarketId: string },
): (tx: Transaction) => TransactionResult {
	return queue.createAndShare({ config, arguments: { market: args.expiryMarketId } });
}

/**
 * Refund this market's waiting orders at or past their deadline (`queue::refund`, reason 5),
 * visiting at most `maxOrders` records (the chain caps one call at 450). Permissionless: no auth,
 * session or Pyth key, and it works during a freeze. Returns how many it refunded, `0` without
 * aborting when none is due. Send it only from the app's refund button, never prepended to other
 * transactions: keepers refund on their own. Every visited record counts toward Sui's
 * per-transaction object limit.
 */
export function refund(
	config: OrdersGeneratedConfig,
	args: QueueTarget & { maxOrders: bigint | number },
): (tx: Transaction) => TransactionResult {
	return queue.refund({
		config,
		arguments: {
			queue: queueIdOf(config, args),
			market: args.expiryMarketId,
			maxOrders: args.maxOrders,
		},
	});
}

/**
 * Refund the listed waiting orders at once (`queue::admin_refund`, reason 7), wherever they sit
 * in the queue. Takes Predict's `AdminCap`, and works while Predict is frozen. Missing and
 * finished record IDs are skipped.
 */
export function adminRefund(
	config: OrdersGeneratedConfig,
	args: QueueTarget & { adminCapId: string; recordIds: readonly bigint[] },
): (tx: Transaction) => TransactionResult {
	return queue.adminRefund({
		config,
		arguments: {
			queue: queueIdOf(config, args),
			market: args.expiryMarketId,
			AdminCap: args.adminCapId,
			recordIds: [...args.recordIds],
		},
	});
}

/**
 * Delete Refunded and Closed records of a settled market (`queue::cleanup`). Permissionless; the
 * storage rebate goes to the sender. Missing IDs, other statuses and records still holding a
 * receipt or escrow are skipped. Aborts `EMarketNotSettled` before settlement.
 */
export function cleanup(
	config: OrdersGeneratedConfig,
	args: QueueTarget & { recordIds: readonly bigint[] },
): (tx: Transaction) => TransactionResult {
	return queue.cleanup({
		config,
		arguments: {
			queue: queueIdOf(config, args),
			market: args.expiryMarketId,
			recordIds: [...args.recordIds],
		},
	});
}

/**
 * Run one bounded settlement phase on a market's queue (`queue::settle_step`) and return the
 * phase the queue is in afterwards (u8, `queue.SETTLE_PHASE`): `0` DRAIN refunds the waiting
 * orders, `1` PAY pays the Open records once Predict has settled the market, `2` DONE once the
 * payout walk has reached the last record. Send one call per transaction until it returns `2` (or
 * `MarketPayoutsCompleted` is emitted), after Predict's `try_settle`. A record the market couldn't
 * pay stays Open with `OpenRecordPayoutSkipped`, even after DONE. Permissionless. Aborts
 * `EMarketNotExpired` before expiry.
 */
export function settleStep(
	config: OrdersGeneratedConfig,
	args: QueueTarget,
): (tx: Transaction) => TransactionResult {
	return queue.settleStep({
		config,
		arguments: { queue: queueIdOf(config, args), market: args.expiryMarketId },
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
 * Verify the signed Lazer payloads and commit them to the market's waiting cohorts
 * (`queue::commit`). Permissionless. Pass the payloads for a cohort's exact τ, or a backup tick
 * once τ + gap wait has passed with τ uncommitted (when the policy's price buffer is on). Commit
 * matches each update to its own cohort by τ and skips one that matches nothing, so no
 * head-of-line ordering is assumed. Resolve `lazer` per batch with `read.lazerPackages` and never
 * cache it: a Pyth upgrade retires the old package at once.
 */
export function commit(
	config: OrdersGeneratedConfig,
	args: QueueTarget & { payloads: readonly Uint8Array[]; lazer: LazerPackages },
): (tx: Transaction) => TransactionResult {
	if (args.payloads.length === 0) {
		throw new PredictInputError('commit needs at least one signed Lazer payload');
	}
	return (tx) => {
		const updates = args.payloads.map((payload) => tx.add(parseLazerUpdate(args.lazer, payload)));
		const vector = tx.makeMoveVec({
			type: `${args.lazer.originalId}::update::Update`,
			elements: updates,
		});
		return tx.add(
			queue.commit({
				config,
				arguments: { queue: queueIdOf(config, args), market: args.expiryMarketId, updates: vector },
			}),
		);
	};
}

/**
 * Fill or refund committed orders in τ order (`queue::resolve`), visiting at most `maxOrders`
 * records (the chain caps one call at 450, since a fill emits two events and Sui allows 1,024
 * per transaction). Permissionless. Returns how many orders it finished. An order the market
 * can't cover is refunded with reason 8. Size `maxOrders` against the payout tree
 * (`payoutTreeNodeCount`): about 10 to 15 fills fit one transaction in a full tree.
 */
export function resolve(
	config: OrdersGeneratedConfig,
	args: QueueTarget & { maxOrders: bigint | number },
): (tx: Transaction) => TransactionResult {
	return queue.resolve({
		config,
		arguments: {
			queue: queueIdOf(config, args),
			market: args.expiryMarketId,
			maxOrders: args.maxOrders,
		},
	});
}

/**
 * The open filler (no cap exists): {@link commit} the signed Lazer payloads, then
 * {@link resolve} up to `maxOrders` records. Anyone with Pyth Lazer access can run it. With
 * `refundOverdue`, a final `refund` call sweeps orders past their deadline. Returns the resolve
 * result. Split commit from resolve when the payout tree is large.
 */
export function fill(
	config: OrdersGeneratedConfig,
	args: QueueTarget & {
		payloads: readonly Uint8Array[];
		lazer: LazerPackages;
		maxOrders: bigint | number;
		refundOverdue?: boolean;
	},
): (tx: Transaction) => TransactionResult {
	if (args.payloads.length === 0) {
		throw new PredictInputError('fill needs at least one signed Lazer payload');
	}
	const target = { expiryMarketId: args.expiryMarketId, queueId: queueIdOf(config, args) };
	return (tx) => {
		tx.add(commit(config, { ...target, payloads: args.payloads, lazer: args.lazer }));
		const resolved = tx.add(resolve(config, { ...target, maxOrders: args.maxOrders }));
		if (args.refundOverdue) {
			tx.add(refund(config, { ...target, maxOrders: args.maxOrders }));
		}
		return resolved;
	};
}
