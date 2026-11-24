// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): composable thunks for queued orders. Each is
// `(config, args) => (tx) => result`, like `tx/trade.ts`, so an app can put several into one
// PTB. The `PredictClient.tx.enqueue*` facade adds the chain preflight on top.
//
// Every queued-order entry point lives in the order-flow companion, `deepbook_predict_orders`
// (`queue::*`), and runs against one market's `MarketQueue` plus the companion's shared
// `OrderDesk`. The queue's ID is derived from the companion's `QueueRegistry` and the market, so
// each thunk takes it as an optional `queueId` and derives it otherwise. The thunks take
// `OrdersGeneratedConfig` (`toOrdersConfig(cfg)`), which supplies the companion package, the desk,
// the registry and Predict's shared objects.
//
// Every call that can send USDC (`resolve`, `refund`, `admin_refund`, `settle_step`, `pay_open`,
// `claim_parked`) also reads Sui's shared `DenyList` (0x403), which the generated bindings inject
// as a read-only shared input. Nothing sends USDC to an address on USDC's deny list, or while USDC
// is globally paused: a fill for such a receive address is refused (reason 9), a refund or change
// is parked in its record (`RecordFundsParked`), and a payout is skipped until `pay_open`.
//
// Up to Predict version 5, queued orders read Propbook's oracle objects directly for their
// volatility snapshot (`enqueue_*`, which take the market's feeds). From version 6 (`deepbook_predict_orders`
// v3) placement takes no oracle object at all (`enqueue_*_v2`, the `*V2` thunks below): the order is
// priced at its τ from signed Pyth and Block Scholes data the filler commits (`commitV2`). The
// version 5 `enqueue_*` stay as forwarders that ignore their Propbook arguments.
import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { GeneratedConfig, OrdersGeneratedConfig } from '../config/generated.js';
import { MIN_PREMIUM } from '../cost.js';
import { PredictInputError } from '../errors.js';
import { deriveQueueId } from '../queue-id.js';
import { U64_MAX } from '../units.js';
import * as plp from '../../contracts/deepbook_predict/plp.js';
import * as delayedExecutionConfig from '../../contracts/deepbook_predict_orders/delayed_execution_config.js';
import * as desk from '../../contracts/deepbook_predict_orders/desk.js';
import * as queue from '../../contracts/deepbook_predict_orders/queue.js';
import * as blockScholes from '../../contracts/deepbook_predict_math/block_scholes.js';
import { withAuth } from './common.js';
import type { MarketFeeds } from './trade.js';

const FLOAT_SCALING = 1_000_000_000n;

// The queued placements with their `auth` argument already supplied: auth → enqueue.
const authed = {
	enqueueExactQuantity: withAuth(queue.enqueueExactQuantity),
	enqueueExactAmount: withAuth(queue.enqueueExactAmount),
	enqueueExactCost: withAuth(queue.enqueueExactCost),
	enqueueRedeemOpen: withAuth(queue.enqueueRedeemOpen),
	enqueueExactQuantityV2: withAuth(queue.enqueueExactQuantityV2),
	enqueueExactAmountV2: withAuth(queue.enqueueExactAmountV2),
	enqueueExactCostV2: withAuth(queue.enqueueExactCostV2),
	enqueueRedeemOpenV2: withAuth(queue.enqueueRedeemOpenV2),
	enqueueExactQuantityWithBuilderV2: withAuth(queue.enqueueExactQuantityWithBuilderV2),
	enqueueExactAmountWithBuilderV2: withAuth(queue.enqueueExactAmountWithBuilderV2),
	enqueueExactCostWithBuilderV2: withAuth(queue.enqueueExactCostWithBuilderV2),
	enqueueRedeemOpenWithBuilderV2: withAuth(queue.enqueueRedeemOpenWithBuilderV2),
};

/** One market's queue. */
export interface QueueTarget {
	expiryMarketId: string;
	/**
	 * The market's `MarketQueue`. Defaults to `deriveQueueId(config.queueRegistry, expiryMarketId)`,
	 * the ID `queue::create_and_share` gives it, so pass it only to address another registry's
	 * queue.
	 */
	queueId?: string;
}

/** The queue ID a thunk addresses: the given one, or the one derived from the config's registry. */
export function queueIdOf(
	config: Pick<OrdersGeneratedConfig, 'queueRegistry'>,
	args: QueueTarget,
): string {
	return args.queueId ?? deriveQueueId(config.queueRegistry, args.expiryMarketId);
}

/** The market, queue and account every queued order names. */
interface QueuedOrderTarget extends MarketFeeds, QueueTarget {
	wrapperId: string;
}

// The leading arguments every version 5 placement shares, after `queue` and `market`. Version 6
// underscore-prefixed the Propbook parameters of these forwarders, so codegen capitalizes their
// keys. The emitted call is unchanged.
function placement(config: OrdersGeneratedConfig, args: QueuedOrderTarget) {
	return {
		queue: queueIdOf(config, args),
		market: args.expiryMarketId,
		wrapper: args.wrapperId,
		Pyth: args.pythFeed,
		BsValues: args.blockScholesValueStore,
		BsSvi: args.blockScholesSviStore,
	};
}

/**
 * A builder an order names: its `BuilderCode` object and the fee it charges per contract (1e9 is
 * $1). Predict caps the fee at `protocol_config::builder_fee_cap` and records it in the receipt.
 */
export interface OrderBuilder {
	codeId: string;
	feePerContract: bigint;
}

/** The market, queue and account a version 6 placement names: no oracle object. */
export interface QueuedOrderTargetV2 extends QueueTarget {
	wrapperId: string;
	/** Name a builder to call the `_with_builder_v2` placement. */
	builder?: OrderBuilder;
}

function placementV2(config: OrdersGeneratedConfig, args: QueuedOrderTargetV2) {
	return { queue: queueIdOf(config, args), market: args.expiryMarketId, wrapper: args.wrapperId };
}

function builderArgs(builder: OrderBuilder) {
	assertU64(builder.feePerContract, 'builder.feePerContract');
	return { code: builder.codeId, builderFeePerContract: builder.feePerContract };
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

// === Version 6 placement (`deepbook_predict_orders` v3) ===

function assertMaxProbability(maxProbabilityRaw: bigint): void {
	if (
		typeof maxProbabilityRaw !== 'bigint' ||
		maxProbabilityRaw <= 0n ||
		maxProbabilityRaw > FLOAT_SCALING
	) {
		throw new PredictInputError(
			`maxProbabilityRaw must be in (0, 1e9], got ${String(maxProbabilityRaw)}`,
		);
	}
}

/**
 * Queue a mint of an exact payout quantity with no oracle object (`queue::enqueue_exact_quantity_v2`,
 * or `enqueue_exact_quantity_with_builder_v2` when `builder` is given). The order is priced at its
 * τ from the signed data the filler commits. Same caps and escrow as {@link enqueueExactQuantity}.
 * Needs a config whose order-flow call target is `deepbook_predict_orders` version 3. Returns the
 * record ID. Command order is auth → enqueue.
 */
export function enqueueExactQuantityV2(
	config: OrdersGeneratedConfig,
	args: QueuedOrderTargetV2 & {
		lowerTick: bigint;
		higherTick: bigint;
		quantityRaw: bigint;
		maxCostRaw: bigint;
		maxProbabilityRaw: bigint;
	},
): (tx: Transaction) => TransactionResult {
	assertMaxCost(args.maxCostRaw);
	assertU64(args.quantityRaw, 'quantityRaw');
	assertMaxProbability(args.maxProbabilityRaw);
	const terms = {
		lowerTick: args.lowerTick,
		higherTick: args.higherTick,
		quantity: args.quantityRaw,
		maxCost: args.maxCostRaw,
		maxProbability: args.maxProbabilityRaw,
	};
	return args.builder
		? authed.enqueueExactQuantityWithBuilderV2({
				config,
				arguments: { ...placementV2(config, args), ...builderArgs(args.builder), ...terms },
			})
		: authed.enqueueExactQuantityV2({
				config,
				arguments: { ...placementV2(config, args), ...terms },
			});
}

/**
 * Queue a premium-budget mint with no oracle object (`queue::enqueue_exact_amount_v2`, or the
 * `_with_builder_v2` form). Same checks as {@link enqueueExactAmount}.
 */
export function enqueueExactAmountV2(
	config: OrdersGeneratedConfig,
	args: QueuedOrderTargetV2 & {
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
	const terms = {
		lowerTick: args.lowerTick,
		higherTick: args.higherTick,
		maxPremium: args.maxPremiumRaw,
		minQuantity: args.minQuantityRaw,
		maxCost: args.maxCostRaw,
	};
	return args.builder
		? authed.enqueueExactAmountWithBuilderV2({
				config,
				arguments: { ...placementV2(config, args), ...builderArgs(args.builder), ...terms },
			})
		: authed.enqueueExactAmountV2({
				config,
				arguments: { ...placementV2(config, args), ...terms },
			});
}

/**
 * Queue an all-in-budget mint with no oracle object (`queue::enqueue_exact_cost_v2`, or the
 * `_with_builder_v2` form). Same checks as {@link enqueueExactCost}.
 */
export function enqueueExactCostV2(
	config: OrdersGeneratedConfig,
	args: QueuedOrderTargetV2 & {
		lowerTick: bigint;
		higherTick: bigint;
		maxCostRaw: bigint;
		minQuantityRaw: bigint;
	},
): (tx: Transaction) => TransactionResult {
	assertMaxCost(args.maxCostRaw);
	assertU64(args.minQuantityRaw, 'minQuantityRaw');
	const terms = {
		lowerTick: args.lowerTick,
		higherTick: args.higherTick,
		maxCost: args.maxCostRaw,
		minQuantity: args.minQuantityRaw,
	};
	return args.builder
		? authed.enqueueExactCostWithBuilderV2({
				config,
				arguments: { ...placementV2(config, args), ...builderArgs(args.builder), ...terms },
			})
		: authed.enqueueExactCostV2({
				config,
				arguments: { ...placementV2(config, args), ...terms },
			});
}

/**
 * Queue an early sell of an Open record with no oracle object (`queue::enqueue_redeem_open_v2`, or
 * the `_with_builder_v2` form). Same checks as {@link enqueueRedeemOpen}.
 */
export function enqueueRedeemOpenV2(
	config: OrdersGeneratedConfig,
	args: QueuedOrderTargetV2 & {
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
	const terms = {
		recordId: args.recordId,
		closeQuantity: args.closeQuantityRaw,
		minProbability: args.minProbabilityRaw,
		minProceeds: args.minProceedsRaw,
	};
	return args.builder
		? authed.enqueueRedeemOpenWithBuilderV2({
				config,
				arguments: { ...placementV2(config, args), ...builderArgs(args.builder), ...terms },
			})
		: authed.enqueueRedeemOpenV2({
				config,
				arguments: { ...placementV2(config, args), ...terms },
			});
}

/**
 * Abort the transaction unless the order desk's fee is at most `maxOrderFeeRaw` when it executes.
 * The enqueues charge the desk's fee at execution and take no fee bound, so add this BEFORE an
 * enqueue to hold it to the fee its preview showed. It reads the desk's policy, and
 * `0x1::u64::checked_sub(max, fee)` is none once the fee is above the bound, so
 * `0x1::option::destroy_some` aborts (`option::EOPTION_NOT_SET`, code 0x40001) before the
 * enqueue debits anything. Read-only on the desk.
 */
export function assertOrderFeeAtMost(
	config: OrdersGeneratedConfig,
	maxOrderFeeRaw: bigint,
): (tx: Transaction) => void {
	assertU64(maxOrderFeeRaw, 'maxOrderFeeRaw');
	return (tx) => {
		const policy = tx.add(desk.policy({ config }));
		const fee = tx.add(delayedExecutionConfig.orderFee({ config, arguments: { policy } }));
		const headroom = tx.moveCall({
			target: '0x1::u64::checked_sub',
			arguments: [tx.pure.u64(maxOrderFeeRaw), fee],
		});
		tx.moveCall({
			target: '0x1::option::destroy_some',
			typeArguments: ['u64'],
			arguments: [headroom],
		});
	};
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
 * Create and share a market's `MarketQueue` (`queue::create_and_share(registry, desk, market)`),
 * at the ID `deriveQueueId(config.queueRegistry, expiryMarketId)`. Takes the registry mutably and
 * the desk read-only, so it never contends with trading. Permissionless and once per market (a
 * second call aborts, since the ID is taken); the caller pays its storage. The market-creation
 * keeper sends it after each new `ExpiryMarket`. Returns the queue ID.
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
 * receipt or funds (parked funds included, until `claimParked`) are skipped. Aborts
 * `EMarketNotSettled` before settlement.
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

/**
 * Pay one Open record of a settled market its settled payout (`queue::pay_open`), at any time
 * after settlement, before or after `settle_step` completes: a record the payout walk skipped
 * because the market was short of cash or its receive address was denied. Permissionless: the
 * payout goes only to the record's own receive address. Emits `OpenRecordSettled`, or
 * `OpenRecordPayoutSkipped` again while the cause persists. A missing or non-Open record is left
 * alone. Aborts `EMarketNotSettled` before Predict settles the market.
 */
export function payOpen(
	config: OrdersGeneratedConfig,
	args: QueueTarget & { recordId: bigint },
): (tx: Transaction) => TransactionResult {
	assertU64(args.recordId, 'recordId');
	return queue.payOpen({
		config,
		arguments: {
			queue: queueIdOf(config, args),
			market: args.expiryMarketId,
			recordId: args.recordId,
		},
	});
}

/**
 * Send a finished record's parked funds (`queue::claim_parked`): change or a refund its receive
 * address couldn't take while it was on USDC's deny list or USDC was paused. Permissionless: the
 * funds go only to the record's own receive address. Returns the amount sent (u64), or `0` and
 * changes nothing for a missing or unfinished record, one with nothing parked, or an address still
 * denied. Emits `RecordFundsClaimed`. Takes no market: `expiryMarketId` only derives the queue.
 */
export function claimParked(
	config: OrdersGeneratedConfig,
	args: QueueTarget & { recordId: bigint },
): (tx: Transaction) => TransactionResult {
	assertU64(args.recordId, 'recordId');
	return queue.claimParked({
		config,
		arguments: { queue: queueIdOf(config, args), recordId: args.recordId },
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
 * Version 5 only: `queue::commit` aborts `EUseV2` from `deepbook_predict_orders` version 3, where
 * {@link commitV2} replaces it. Verify the signed Lazer payloads and commit them to the market's
 * waiting cohorts (`queue::commit`). Permissionless. Pass the payloads for a cohort's exact τ, or a backup tick
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
				arguments: { Queue: queueIdOf(config, args), Market: args.expiryMarketId, Updates: vector },
			}),
		);
	};
}

/** The Block Scholes verifier (`bs_oracle`) a version 6 commit verifies its batches with. */
export interface BlockScholesPackages {
	/** The verifier's shared `SignerRegistry`. */
	signerRegistryId: string;
	/** The package to call `verify::verify_and_create_*_batch` on. */
	packageId: string;
	/** The original package ID, which types `verify::ValueUpdate` and `verify::SviUpdate`. */
	originalId: string;
}

/** The market's oracle binding fields a version 6 commit decodes Block Scholes data under. */
export interface CommitBinding {
	blockScholesBaseAsset: string;
	sviModel: string;
	sviDecimals: number;
}

// Verify every signed Block Scholes message of one kind and gather their updates into one vector.
function blockScholesUpdates(
	bs: BlockScholesPackages,
	kind: 'value' | 'svi',
	messages: readonly Uint8Array[],
): (tx: Transaction) => TransactionResult {
	return (tx) => {
		const verify =
			kind === 'value' ? 'verify_and_create_value_batch' : 'verify_and_create_svi_batch';
		const into = kind === 'value' ? 'into_value_updates' : 'into_svi_updates';
		const type = `${bs.originalId}::verify::${kind === 'value' ? 'ValueUpdate' : 'SviUpdate'}`;
		const updatesOf = (message: Uint8Array) => {
			const batch = tx.moveCall({
				target: `${bs.packageId}::verify::${verify}`,
				arguments: [tx.object(bs.signerRegistryId), tx.pure.vector('u8', message)],
			});
			return tx.moveCall({ target: `${bs.packageId}::verify::${into}`, arguments: [batch] });
		};
		const all = updatesOf(messages[0]);
		for (const message of messages.slice(1)) {
			tx.moveCall({
				target: '0x1::vector::append',
				typeArguments: [type],
				arguments: [all, updatesOf(message)],
			});
		}
		return all;
	};
}

/**
 * Verify signed Pyth Lazer payloads and Block Scholes value and SVI batches, and commit them to the
 * market's waiting cohorts (`queue::commit_v2`, Predict version 6). Permissionless. Pass the Lazer
 * payloads for each cohort's τ (or its backup tick), and Block Scholes batches holding, for the
 * market's expiry, the spot and forward at each τ's value slot and the SVI at its SVI slot
 * (`queue.bsSlots`). `vols` is built on chain from the verified updates
 * (`block_scholes::vols`) under the market's oracle binding. A cohort with no admissible slot is
 * skipped and refunded at its deadline. Needs a config whose call targets are `deepbook_predict_orders`
 * version 3 and the `deepbook_predict_math` publication with `block_scholes`.
 */
export function commitV2(
	config: OrdersGeneratedConfig,
	args: QueueTarget & {
		payloads: readonly Uint8Array[];
		lazer: LazerPackages;
		valueMessages: readonly Uint8Array[];
		sviMessages: readonly Uint8Array[];
		blockScholes: BlockScholesPackages;
		binding: CommitBinding;
		expiryMs: bigint;
	},
): (tx: Transaction) => TransactionResult {
	if (args.payloads.length === 0) {
		throw new PredictInputError('commitV2 needs at least one signed Lazer payload');
	}
	if (args.valueMessages.length === 0 || args.sviMessages.length === 0) {
		throw new PredictInputError(
			'commitV2 needs at least one signed Block Scholes value batch and one SVI batch',
		);
	}
	return (tx) => {
		const updates = args.payloads.map((payload) => tx.add(parseLazerUpdate(args.lazer, payload)));
		const vector = tx.makeMoveVec({
			type: `${args.lazer.originalId}::update::Update`,
			elements: updates,
		});
		const values = tx.add(blockScholesUpdates(args.blockScholes, 'value', args.valueMessages));
		const svis = tx.add(blockScholesUpdates(args.blockScholes, 'svi', args.sviMessages));
		const vols = tx.add(
			blockScholes.vols({
				config,
				arguments: {
					values,
					svis,
					baseAsset: args.binding.blockScholesBaseAsset,
					sviModel: args.binding.sviModel,
					sviDecimals: args.binding.sviDecimals,
					expiriesMs: [args.expiryMs],
				},
			}),
		);
		return tx.add(
			queue.commitV2({
				config,
				arguments: {
					queue: queueIdOf(config, args),
					market: args.expiryMarketId,
					updates: vector,
					vols,
				},
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
 * The version 6 open filler: {@link commitV2} the signed Lazer and Block Scholes data, then
 * {@link resolve} up to `maxOrders` records, and with `refundOverdue` a final `refund`.
 */
export function fillV2(
	config: OrdersGeneratedConfig,
	args: Parameters<typeof commitV2>[1] & {
		maxOrders: bigint | number;
		refundOverdue?: boolean;
	},
): (tx: Transaction) => TransactionResult {
	const commit = commitV2(config, args);
	const target = { expiryMarketId: args.expiryMarketId, queueId: queueIdOf(config, args) };
	return (tx) => {
		tx.add(commit);
		const resolved = tx.add(resolve(config, { ...target, maxOrders: args.maxOrders }));
		if (args.refundOverdue) {
			tx.add(refund(config, { ...target, maxOrders: args.maxOrders }));
		}
		return resolved;
	};
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
