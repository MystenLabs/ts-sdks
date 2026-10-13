// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Delayed execution (DBU-885): the codes, cash-need math, timing previews and order-state views
// for queued orders. Pure functions over raw bigints, no network. Exported as the `queue`
// namespace, like `cost` and `pricing`.
//
// A queued order is placed now and priced later at Pyth's signed price for its τ, a channel
// tick shortly after placement. A keeper (or anyone, see `fill` in `tx/queue.ts`) commits the
// price and resolves the order: a fill, or a refund with a reason code. A filled mint stays in
// its market's queue as an Open record until `enqueue_redeem_open` sells it or the queue's
// settlement walk (`settle_step`) pays it.
//
// The queue lives in the order-flow companion, `deepbook_predict_orders`. The code values mirror
// its `order_queue` getters, and the cash-need formulas are 1:1 ports (rounding included) of
// `deepbook_predict_math::math::need_*`, which Predict's admission charges. Probabilities and λ
// are 1e9-scaled.

import type { DelayedExecutionPolicy as DelayedExecutionPolicyBcs } from '../contracts/deepbook_predict_orders/delayed_execution_config.js';
import type { OrderView as OrderViewBcs } from '../contracts/deepbook_predict_orders/order_queue.js';
import { FLOAT_SCALING, MAX_QUANTITY_LOTS, POSITION_LOT_SIZE, decodeOrderRange } from './cost.js';
import type { QueueEvent } from './decode.js';
import { PredictInputError } from './errors.js';
import { U64_MAX } from './units.js';

// === Codes ===

/**
 * Predict's `constants::current_version` from the upgrade that added delayed execution. Enqueue
 * works once `ProtocolConfig.version_watermark` reaches it (Predict's admission aborts
 * `ECutoverNotReached` until then). The retired immediate trades (`mint_exact_*`, `redeem_live`)
 * always abort in that package, and the older packages they still run in are retired by the same
 * bump. The same on both networks: it is the code's version constant, not the on-chain package
 * version (Mainnet v4, Testnet v5).
 */
export const DELAYED_EXECUTION_VERSION = 4n;

/**
 * Predict's `constants::current_version` of the package these bindings were generated from. Every
 * version-gated Predict call checks `chk_version`, which aborts `EPackageVersionDisabled` once
 * `ProtocolConfig.version_watermark` is above it, so a higher watermark retires the Predict code
 * this SDK calls. Bump it with Predict when regenerating.
 */
export const PREDICT_PACKAGE_VERSION = 4n;

/**
 * `desk::current_version` of the order-flow package these bindings were generated from. The desk's
 * version floor retires older companion code, so a floor above it means the package this SDK calls
 * aborts `EPackageVersionDisabled`. Bump it with the companion when regenerating.
 */
export const ORDER_FLOW_PACKAGE_VERSION = 1n;

/** `queue::phase_*`: what `settle_step` returns, the phase the next call runs. */
export const SETTLE_PHASE = Object.freeze({
	/** Refunding the waiting orders (reason 5). */
	DRAIN: 0,
	/** Paying the Open records, once Predict has settled the market. */
	PAY: 1,
	/**
	 * The payout walk reached the last record and `MarketPayoutsCompleted` was emitted. A record
	 * the market couldn't pay (`OpenRecordPayoutSkipped`) stays Open and unpaid.
	 */
	DONE: 2,
} as const);

/** `order_queue::status_*`. Never renumbered on chain; unknown codes still decode. */
export const ORDER_STATUS = Object.freeze({
	PENDING: 0,
	COMMITTED: 1,
	OPEN: 2,
	REFUNDED: 3,
	CLOSED: 4,
	/** Reserved: nothing sets it at launch. Counts as unfinished. */
	REFUND_DUE: 5,
} as const);

/** `order_queue::kind_*`. `REDEEM_LIVE` is reserved and never used by v4. */
export const ORDER_KIND = Object.freeze({
	EXACT_QUANTITY: 0,
	EXACT_AMOUNT: 1,
	EXACT_COST: 2,
	REDEEM_LIVE: 3,
	REDEEM_OPEN: 4,
} as const);

/** `order_queue::reason_*`. `0` in a record's result means filled. */
export const REFUND_REASON = Object.freeze({
	LIMITS: 1,
	ADMISSION: 2,
	NO_PRICE: 3,
	MISSING_NODE: 4,
	DEADLINE: 5,
	FREEZE: 6,
	ADMIN: 7,
	NO_CASH: 8,
	RECIPIENT_DENIED: 9,
} as const);

/** The Pyth Lazer channels the queue prices on (`delayed_execution_config`). */
export const PYTH_CHANNEL = Object.freeze({
	FIXED_RATE_50MS: 2,
	FIXED_RATE_200MS: 3,
} as const);

/** Predict's `constants::deadline_expiry_margin_ms`: every deadline is at least this long before expiry. */
export const DEADLINE_EXPIRY_MARGIN_MS = 5_000n;

/**
 * How long after an order's deadline the app waits before offering "Refund my order". Keepers
 * refund overdue orders on their own, so the button only matters when they are all down.
 */
export const REFUND_REQUEST_GRACE_MS = 5_000n;

export type OrderStatusName =
	'pending' | 'committed' | 'open' | 'refunded' | 'closed' | 'refund-due' | 'unknown';

export type OrderKindName =
	'exact-quantity' | 'exact-amount' | 'exact-cost' | 'redeem-live' | 'redeem-open' | 'unknown';

const STATUS_NAMES: readonly OrderStatusName[] = [
	'pending',
	'committed',
	'open',
	'refunded',
	'closed',
	'refund-due',
];
const KIND_NAMES: readonly OrderKindName[] = [
	'exact-quantity',
	'exact-amount',
	'exact-cost',
	'redeem-live',
	'redeem-open',
];

/** A status code's name, or `'unknown'` for a code this SDK version predates. */
export function orderStatusName(code: number): OrderStatusName {
	return STATUS_NAMES[code] ?? 'unknown';
}

/** A kind code's name, or `'unknown'` for a code this SDK version predates. */
export function orderKindName(code: number): OrderKindName {
	return KIND_NAMES[code] ?? 'unknown';
}

/** Whether a kind code is a queued mint (exact quantity, exact amount or exact cost). */
export function isMintKind(kind: number): boolean {
	return (
		kind === ORDER_KIND.EXACT_QUANTITY ||
		kind === ORDER_KIND.EXACT_AMOUNT ||
		kind === ORDER_KIND.EXACT_COST
	);
}

/** Whether a kind code is a queued sell. */
export function isSellKind(kind: number): boolean {
	return kind === ORDER_KIND.REDEEM_OPEN || kind === ORDER_KIND.REDEEM_LIVE;
}

/** What a refund reason means for the trader. */
export interface RefundReasonInfo {
	code: number;
	key:
		| 'limits'
		| 'admission'
		| 'no-price'
		| 'missing-node'
		| 'deadline'
		| 'freeze'
		| 'admin'
		| 'no-cash'
		| 'recipient-denied'
		| 'unknown';
	/** Display text for the refund. */
	text: string;
	/** Whether the order fee was kept (reasons 1 and 2). `null` for an unknown code. */
	feeKept: boolean | null;
	/** False for codes v4 reserves but never sets (3 and 6), and for unknown codes. */
	live: boolean;
}

/** Every reason code v4 defines, with its text and fee treatment. */
export const REFUND_REASONS: Readonly<Record<number, RefundReasonInfo>> = Object.freeze({
	1: {
		code: 1,
		key: 'limits',
		text: "Your price limits weren't met at the fill price. Refunded, the order fee is kept.",
		feeKept: true,
		live: true,
	},
	2: {
		code: 2,
		key: 'admission',
		text: "The market couldn't accept the order at the fill price. Refunded, the order fee is kept.",
		feeKept: true,
		live: true,
	},
	3: {
		code: 3,
		key: 'no-price',
		text: 'No price arrived for the order. Refunded in full.',
		feeKept: false,
		live: false,
	},
	4: {
		code: 4,
		key: 'missing-node',
		text: "The market couldn't place the order. Refunded in full.",
		feeKept: false,
		live: true,
	},
	5: {
		code: 5,
		key: 'deadline',
		text: "The order wasn't priced before its deadline. Refunded in full.",
		feeKept: false,
		live: true,
	},
	6: {
		code: 6,
		key: 'freeze',
		text: 'The protocol was frozen. Refunded in full.',
		feeKept: false,
		live: false,
	},
	7: { code: 7, key: 'admin', text: 'Refunded in full by an admin.', feeKept: false, live: true },
	8: {
		code: 8,
		key: 'no-cash',
		text: "The market couldn't pay right now. Refunded in full.",
		feeKept: false,
		live: true,
	},
	9: {
		code: 9,
		key: 'recipient-denied',
		text: "The account's receive address can't take USDC right now (it is on USDC's deny list, or USDC is paused). Refunded in full, and the refund waits in the order until it can be claimed.",
		feeKept: false,
		live: true,
	},
});

/** A reason code's meaning. Unknown codes map to `key: 'unknown'` rather than throwing. */
export function refundReason(code: number): RefundReasonInfo {
	return (
		REFUND_REASONS[code] ?? {
			code,
			key: 'unknown',
			text: `Refunded (code ${code}).`,
			feeKept: null,
			live: false,
		}
	);
}

// === Policy ===

/**
 * `delayed_execution_config::DelayedExecutionPolicy` with camelCase keys, as the companion's
 * `OrderDesk` holds it (`desk::policy`). Times in ms, USDC raw.
 */
export interface DelayedExecutionPolicy {
	delayMs: bigint;
	stallTimeoutMs: bigint;
	stuckThresholdMs: bigint;
	gapWaitMs: bigint;
	pythPriceBufferMs: bigint;
	/** {@link PYTH_CHANNEL}: `2` is 50 ms, `3` is 200 ms. */
	pythChannel: number;
	sviMaxAgeMs: bigint;
	mintCapacity: bigint;
	sellCapacity: bigint;
	perAccountCap: bigint;
	/** Flat USDC fee charged at enqueue, raw. */
	orderFee: bigint;
	minSellQuantity: bigint;
	settleRefundBatch: bigint;
	settlePayoutBatch: bigint;
}

/** Map the generated policy layout to {@link DelayedExecutionPolicy}. */
export function policyFromBcs(
	p: (typeof DelayedExecutionPolicyBcs)['$inferType'],
): DelayedExecutionPolicy {
	return {
		delayMs: p.delay_ms,
		stallTimeoutMs: p.stall_timeout_ms,
		stuckThresholdMs: p.stuck_threshold_ms,
		gapWaitMs: p.gap_wait_ms,
		pythPriceBufferMs: p.pyth_price_buffer_ms,
		pythChannel: p.pyth_channel,
		sviMaxAgeMs: p.svi_max_age_ms,
		mintCapacity: p.mint_capacity,
		sellCapacity: p.sell_capacity,
		perAccountCap: p.per_account_cap,
		orderFee: p.order_fee,
		minSellQuantity: p.min_sell_quantity,
		settleRefundBatch: p.settle_refund_batch,
		settlePayoutBatch: p.settle_payout_batch,
	};
}

/** `delayed_execution_config::channel_tick_ms`: 50 ms for channel 2, 200 ms for channel 3. */
export function channelTickMs(channel: number): bigint {
	if (channel === PYTH_CHANNEL.FIXED_RATE_50MS) return 50n;
	if (channel === PYTH_CHANNEL.FIXED_RATE_200MS) return 200n;
	throw new PredictInputError(`unsupported Pyth Lazer channel ${channel}`);
}

// === Cash need (`deepbook_predict_math::math::need_*`) ===

function assertUint(value: bigint, name: string, max: bigint = U64_MAX): void {
	if (typeof value !== 'bigint' || value < 0n || value > max) {
		throw new PredictInputError(`${name} must be a bigint in [0, ${max}], got ${String(value)}`);
	}
}

// `math::mul_div_up`, including its abort on a zero denominator and a u64 overflow.
function mulDivUp(x: bigint, y: bigint, denominator: bigint): bigint {
	if (denominator === 0n) throw new PredictInputError('division by zero (EInputZero)');
	return (x * y + denominator - 1n) / denominator;
}

function plusOne(need: bigint): bigint {
	if (need >= U64_MAX) throw new PredictInputError('cash need overflows u64');
	return need + 1n;
}

/** Exact-quantity mint cash need: `⌈quantity · (1 − p_min)⌉ + 1`. */
export function cashNeedExactQuantity(quantity: bigint, minEntryProbability: bigint): bigint {
	assertUint(quantity, 'quantity');
	assertUint(minEntryProbability, 'minEntryProbability', FLOAT_SCALING);
	return plusOne(mulDivUp(quantity, FLOAT_SCALING - minEntryProbability, FLOAT_SCALING));
}

/**
 * Budget mint cash need: `⌈(budget + 1) · (1 / p_min − 1)⌉ + 1`, rounded as Move rounds it (one
 * `mul_div_up` of `(budget + 1) · (1e9 − p_min) / p_min`). Exact-amount mints pass
 * `min(max_premium, budget)`. `p_min = 0` throws, as the Move division aborts.
 */
export function cashNeedBudget(budget: bigint, minEntryProbability: bigint): bigint {
	assertUint(budget, 'budget', U64_MAX - 1n);
	assertUint(minEntryProbability, 'minEntryProbability', FLOAT_SCALING);
	return plusOne(mulDivUp(budget + 1n, FLOAT_SCALING - minEntryProbability, minEntryProbability));
}

/** Sell cash need: `⌈close_quantity · (1 − λ)⌉ + 1`. */
export function cashNeedSell(closeQuantity: bigint, backingBufferLambda: bigint): bigint {
	assertUint(closeQuantity, 'closeQuantity');
	assertUint(backingBufferLambda, 'backingBufferLambda', FLOAT_SCALING);
	return plusOne(mulDivUp(closeQuantity, FLOAT_SCALING - backingBufferLambda, FLOAT_SCALING));
}

/**
 * Whether the account can pay the order fee: a mint needs `available > fee` (it escrows a budget
 * on top), a sell needs `available ≥ fee` (it escrows only the fee). `available` is
 * `account::balance<USDC>`, unsettled accumulator funds included.
 */
export function feeCovered(
	side: 'mint' | 'sell',
	availableRaw: bigint,
	orderFeeRaw: bigint,
): boolean {
	return side === 'mint' ? availableRaw > orderFeeRaw : availableRaw >= orderFeeRaw;
}

/** Inputs for {@link mintBudget}. */
export interface MintBudgetInputs {
	/** {@link ORDER_KIND}: a mint kind. */
	kind: number;
	maxCostRaw: bigint;
	availableRaw: bigint;
	orderFeeRaw: bigint;
	/** Required for exact quantity: a fill never costs more than its quantity. */
	quantityRaw?: bigint;
}

/**
 * The budget a queued mint escrows: `min(max_cost, available − fee)`, and for exact quantity also
 * at most the quantity. `null` when the balance doesn't cover the fee. Enqueue debits the budget
 * plus the order fee, and the unspent budget comes back at the fill.
 */
export function mintBudget(inputs: MintBudgetInputs): bigint | null {
	if (!feeCovered('mint', inputs.availableRaw, inputs.orderFeeRaw)) return null;
	const budget = min(inputs.maxCostRaw, inputs.availableRaw - inputs.orderFeeRaw);
	if (inputs.kind !== ORDER_KIND.EXACT_QUANTITY) return budget;
	if (inputs.quantityRaw == null) {
		throw new PredictInputError('quantityRaw is required for an exact-quantity budget');
	}
	return min(budget, inputs.quantityRaw);
}

/** Inputs for {@link mintCashNeed}. */
export interface MintCashNeedInputs {
	kind: number;
	/** The escrowed budget, from {@link mintBudget}. */
	budgetRaw: bigint;
	minEntryProbability: bigint;
	/** Exact quantity: the quantity ordered. */
	quantityRaw?: bigint;
	/** Exact amount: the premium cap. */
	maxPremiumRaw?: bigint;
}

/** A queued mint's cash need, picking the formula the contract picks for its kind. */
export function mintCashNeed(inputs: MintCashNeedInputs): bigint {
	const p = inputs.minEntryProbability;
	switch (inputs.kind) {
		case ORDER_KIND.EXACT_QUANTITY:
			if (inputs.quantityRaw == null) throw new PredictInputError('quantityRaw is required');
			return cashNeedExactQuantity(inputs.quantityRaw, p);
		case ORDER_KIND.EXACT_AMOUNT:
			if (inputs.maxPremiumRaw == null) throw new PredictInputError('maxPremiumRaw is required');
			return cashNeedBudget(min(inputs.maxPremiumRaw, inputs.budgetRaw), p);
		case ORDER_KIND.EXACT_COST:
			return cashNeedBudget(inputs.budgetRaw, p);
		default:
			throw new PredictInputError(`kind ${inputs.kind} is not a mint`);
	}
}

/**
 * A sell's cash need against the market's spare cash. Sells are never refused for market cash at
 * placement: the keeper funds the market before τ, and a sell the market still can't cover at the
 * fill is refunded in full (reason 8). `short` flags that risk, and the sell builder can add
 * `rebalance_expiry_cash` after the enqueue to fund the market at once.
 */
export function sellCashCheck(
	closeQuantityRaw: bigint,
	spareCashRaw: bigint,
	backingBufferLambda: bigint,
): { needRaw: bigint; short: boolean } {
	const needRaw = cashNeedSell(closeQuantityRaw, backingBufferLambda);
	return { needRaw, short: needRaw > spareCashRaw };
}

// === Largest mint the market takes now ===

/** Inputs for {@link maxMintNow}. */
export interface MaxMintInputs {
	/** `'exact-quantity'` sizes a quantity; `'budget'` sizes an exact-cost or exact-amount spend. */
	shape: 'exact-quantity' | 'budget';
	/** Market cash above required cash (`MarketQueueState.spareCash`). */
	spareCashRaw: bigint;
	/** The minimum entry probability from `expiry_market::order_flow_state`, 1e9-scaled. */
	minEntryProbability: bigint;
	/** `account::balance<USDC>`. Bounds a budget spend at `available − fee`. */
	availableRaw?: bigint;
	orderFeeRaw?: bigint;
	/** The deployment's `position_lot_size`. Defaults to `10_000n`. */
	lotSize?: bigint;
	/** Margin left below spare cash, in basis points. Default 100 (1%). */
	headroomBps?: bigint;
	/** When the reads were taken, echoed back as `asOfMs`. */
	asOfMs?: bigint;
}

/** The largest mint a market takes right now, and what binds it. A snapshot: see {@link maxMintNow}. */
export interface MaxMintNow {
	/**
	 * The cash-limited maximum: a quantity for `'exact-quantity'`, a spend for `'budget'`. `null`
	 * when cash doesn't bind (`p_min ≥ 1`).
	 */
	cashLimitRaw: bigint | null;
	/** `available − fee` for `'budget'`, when a balance was given. `null` otherwise. */
	balanceLimitRaw: bigint | null;
	/** The smaller of the two limits, or `null` when neither binds. */
	maxRaw: bigint | null;
	limitedBy: 'cash' | 'balance' | 'none';
	asOfMs: bigint | null;
}

/**
 * The largest queued mint a market's spare cash admits now ("Max right now"). Predict's admission
 * refuses a mint whose cash need is above spare cash (`EInsufficientMarketCash`). For exact quantity this
 * is the largest lot multiple `q` with `cashNeedExactQuantity(q) ≤ S`; for a budget it is the
 * largest `b` with `cashNeedBudget(b) ≤ S`, where `S` is spare cash less the headroom.
 *
 * It is a snapshot: fills lower spare cash, and the keeper's rebalance after each enqueue raises
 * it. Other waiting orders don't count against a mint. For exact quantity this caps only the
 * cash side: size the balance side with `cost.mintCostForBudget` at `available − fee`. A budget
 * mint with `p_min = 0` can't be placed at all (the cash need divides by `p_min`), so it reads 0.
 */
export function maxMintNow(inputs: MaxMintInputs): MaxMintNow {
	const p = inputs.minEntryProbability;
	assertUint(p, 'minEntryProbability', FLOAT_SCALING);
	assertUint(inputs.spareCashRaw, 'spareCashRaw');
	const headroom = inputs.headroomBps ?? 100n;
	if (headroom < 0n || headroom > 10_000n) {
		throw new PredictInputError(`headroomBps must be in [0, 10000], got ${headroom}`);
	}
	const spare = inputs.spareCashRaw - (inputs.spareCashRaw * headroom) / 10_000n;
	const asOfMs = inputs.asOfMs ?? null;

	let cashLimitRaw: bigint | null;
	let balanceLimitRaw: bigint | null = null;
	if (inputs.shape === 'exact-quantity') {
		const lot = inputs.lotSize ?? POSITION_LOT_SIZE;
		if (p >= FLOAT_SCALING) {
			cashLimitRaw = null;
		} else if (spare < 2n) {
			cashLimitRaw = 0n;
		} else {
			const cap = MAX_QUANTITY_LOTS * lot;
			let q = min(((spare - 1n) * FLOAT_SCALING) / (FLOAT_SCALING - p), cap);
			q -= q % lot;
			while (q > 0n && cashNeedExactQuantity(q, p) > spare) q -= lot;
			cashLimitRaw = q;
		}
	} else {
		if (p === 0n) {
			cashLimitRaw = 0n;
		} else if (p >= FLOAT_SCALING) {
			cashLimitRaw = null;
		} else if (spare < 2n) {
			cashLimitRaw = 0n;
		} else {
			let b = ((spare - 1n) * p) / (FLOAT_SCALING - p) - 1n;
			while (b > 0n && cashNeedBudget(b, p) > spare) b -= 1n;
			cashLimitRaw = b > 0n ? b : 0n;
		}
		if (inputs.availableRaw != null) {
			const fee = inputs.orderFeeRaw ?? 0n;
			balanceLimitRaw = inputs.availableRaw > fee ? inputs.availableRaw - fee : 0n;
		}
	}

	if (cashLimitRaw == null && balanceLimitRaw == null) {
		return { cashLimitRaw, balanceLimitRaw, maxRaw: null, limitedBy: 'none', asOfMs };
	}
	if (balanceLimitRaw == null || (cashLimitRaw != null && cashLimitRaw <= balanceLimitRaw)) {
		return { cashLimitRaw, balanceLimitRaw, maxRaw: cashLimitRaw, limitedBy: 'cash', asOfMs };
	}
	return { cashLimitRaw, balanceLimitRaw, maxRaw: balanceLimitRaw, limitedBy: 'balance', asOfMs };
}

// === Timing ===

/** `(resolve_head, next_id, last_tau_ms, last_committed_tau_ms)` from `queue::queue_heads`. */
export interface QueueHeads {
	resolveHead: bigint;
	nextId: bigint;
	lastTauMs: bigint;
	lastCommittedTauMs: bigint;
}

/**
 * `expiry − max(no_trade_window_ms, stall_timeout_ms + 5_000)`, saturating at 0: enqueue requires
 * the order's τ below it.
 */
export function orderCutoffMs(
	expiryMs: bigint,
	policy: Pick<DelayedExecutionPolicy, 'stallTimeoutMs'>,
	noTradeWindowMs: bigint,
): bigint {
	const margin = max(noTradeWindowMs, policy.stallTimeoutMs + DEADLINE_EXPIRY_MARGIN_MS);
	return expiryMs > margin ? expiryMs - margin : 0n;
}

/** Inputs for {@link previewTiming}. */
export interface TimingPreviewInputs {
	nowMs: bigint;
	policy: Pick<DelayedExecutionPolicy, 'delayMs' | 'stallTimeoutMs' | 'pythChannel'>;
	heads: QueueHeads;
	expiryMs: bigint;
	noTradeWindowMs: bigint;
	/**
	 * The newest order's channel, when known. A channel change pushes τ past the last τ, so one
	 * cohort never mixes channels. The public reads don't expose it, so it is optional.
	 */
	lastChannel?: number;
}

/** A display preview of the τ, deadline and cutoff an order placed now would get. */
export interface TimingPreview {
	tauMs: bigint;
	/** `min(τ + stall, expiry)`. The chain also keeps deadlines non-decreasing. */
	deadlineMs: bigint;
	cutoffMs: bigint;
	tickMs: bigint;
	/** Whether τ is before the cutoff, so enqueue would accept the timing. */
	beforeCutoff: boolean;
}

/**
 * Preview `order_queue::plan_timing`: τ is the policy channel's last tick at or before
 * `now + delay`, never below the last τ, and pushed past the last committed τ. Display only:
 * the contract uses the consensus timestamp, which can differ from the local clock.
 */
export function previewTiming(inputs: TimingPreviewInputs): TimingPreview {
	const { policy, heads } = inputs;
	const tickMs = channelTickMs(policy.pythChannel);
	const rounded = ((inputs.nowMs + policy.delayMs) / tickMs) * tickMs;
	let tauMs = max(rounded, heads.lastTauMs);
	if (
		inputs.lastChannel != null &&
		heads.nextId > 0n &&
		inputs.lastChannel !== policy.pythChannel
	) {
		tauMs = max(rounded, nextTickAfter(heads.lastTauMs, tickMs));
	}
	if (tauMs <= heads.lastCommittedTauMs) tauMs = nextTickAfter(heads.lastCommittedTauMs, tickMs);
	const deadlineMs = min(tauMs + policy.stallTimeoutMs, inputs.expiryMs);
	const cutoffMs = orderCutoffMs(inputs.expiryMs, policy, inputs.noTradeWindowMs);
	return { tauMs, deadlineMs, cutoffMs, tickMs, beforeCutoff: tauMs < cutoffMs };
}

function nextTickAfter(timeMs: bigint, tickMs: bigint): bigint {
	return (timeMs / tickMs + 1n) * tickMs;
}

// === Slippage ===

/** Inputs for {@link slippageBand}. All times in ms. */
export interface SlippageBandInputs {
	/** The quoted probability, in (0, 1). */
	probability: number;
	timeToExpiryMs: number;
	/** The policy's delay. */
	delayMs: number;
	/** The channel tick: 50 or 200. */
	tickMs: number;
	/** Time between the quote and the enqueue landing. Default 500. */
	signingMs?: number;
	/** Time between τ and the fill. Default 500. */
	resolveMs?: number;
	/** Standard deviations of movement to allow. Default 2. */
	k?: number;
}

/**
 * A heuristic band for a queued order's price limits: `Δp ≈ k · φ(Φ⁻¹(p)) · √(h / T)`, the
 * probability move of a digital under Brownian motion over the horizon `h` (delay + tick +
 * resolve + signing), scaled by the time `T` left. Use `maxProbability = p + Δp` on exact-quantity
 * mints and `minProbability = p − Δp` on sells, and size cost caps at the shifted probability.
 * A sizing aid pending product sign-off, not a contract rule.
 */
export function slippageBand(inputs: SlippageBandInputs): {
	horizonMs: number;
	deltaProbability: number;
	maxProbability: number;
	minProbability: number;
} {
	const p = inputs.probability;
	if (!(p > 0 && p < 1)) {
		throw new PredictInputError(`probability must be in (0, 1), got ${p}`);
	}
	const horizonMs =
		inputs.delayMs + inputs.tickMs + (inputs.resolveMs ?? 500) + (inputs.signingMs ?? 500);
	const k = inputs.k ?? 2;
	const delta =
		inputs.timeToExpiryMs <= horizonMs
			? 1
			: Math.min(
					1,
					k * normalPdf(inverseNormalCdf(p)) * Math.sqrt(horizonMs / inputs.timeToExpiryMs),
				);
	return {
		horizonMs,
		deltaProbability: delta,
		maxProbability: Math.min(1, p + delta),
		minProbability: Math.max(0, p - delta),
	};
}

// === Order limits from a quote ===
//
// A queued order prices at its τ, after the quote. Its limits bound how far the price may move
// against it in the meantime. `slippageRaw` is that move in price per contract, an absolute amount
// and never a percentage: a contract pays $1, so 10¢ is `100_000_000n` (1e9-scaled). Each helper
// turns a quote at the current price into the limits the enqueue takes.

/** The quote a set of mint limits is sized from: the chain quote at the current price. */
export interface MintLimitsInputs {
	/** The quote's all-in cost after its fee subsidy, order fee excluded. */
	quoteCostRaw: bigint;
	/** The quote's payout quantity. */
	quoteQuantityRaw: bigint;
	/** The quote's entry probability, 1e9-scaled. */
	entryProbabilityRaw: bigint;
	/** The price move to allow per contract, 1e9-scaled: 10¢ is `100_000_000n`. */
	slippageRaw: bigint;
	/**
	 * The quote's fee subsidy (`fee_incentive_subsidy`). Defaults to `0n`. Enqueue admission checks
	 * the order's limits without the subsidy, and the subsidy can run out before the fill, so the
	 * limits add it back: they are sized from the unsubsidized cost.
	 */
	feeIncentiveSubsidyRaw?: bigint;
	/** The deployment's `position_lot_size`. Defaults to `10_000n`. */
	lotSize?: bigint;
}

// Raw USDC a budget floor leaves for the per-component rounding of the fill's cost: the premium,
// the trading, builder and referral fees and the inventory impact each round on their own.
const COST_ROUNDING_SLACK = 10n;

/** All-in price per $1 of payout, 1e9-scaled and rounded up. */
export interface PricePerContract {
	/** The quote's price, after its fee subsidy. */
	nowRaw: bigint;
	/** The worst price the limits admit: the price without the fee subsidy, plus the slippage. */
	worstRaw: bigint;
}

function pricePerContract(inputs: MintLimitsInputs): PricePerContract {
	const subsidy = inputs.feeIncentiveSubsidyRaw ?? 0n;
	assertUint(inputs.quoteCostRaw, 'quoteCostRaw');
	assertUint(inputs.quoteQuantityRaw, 'quoteQuantityRaw');
	assertUint(inputs.slippageRaw, 'slippageRaw', FLOAT_SCALING);
	assertUint(subsidy, 'feeIncentiveSubsidyRaw');
	if (inputs.quoteQuantityRaw === 0n) {
		throw new PredictInputError('the quote buys no payout, so it sizes no limits');
	}
	const nowRaw = mulDivUp(inputs.quoteCostRaw, FLOAT_SCALING, inputs.quoteQuantityRaw);
	const unsubsidizedRaw = mulDivUp(
		inputs.quoteCostRaw + subsidy,
		FLOAT_SCALING,
		inputs.quoteQuantityRaw,
	);
	return { nowRaw, worstRaw: unsubsidizedRaw + inputs.slippageRaw };
}

/**
 * Limits for a queued all-in budget mint (`enqueueMintCost`): the payout floor at the worst price.
 * The fill buys what `budgetRaw` buys at τ and refunds the order when that is below
 * `minQuantityRaw`, so the order fills while the all-in price per $1 of payout stays within
 * `slippageRaw` of the quote.
 */
export function budgetMintLimits(inputs: MintLimitsInputs & { budgetRaw: bigint }): {
	minQuantityRaw: bigint;
	pricePerContract: PricePerContract;
} {
	assertUint(inputs.budgetRaw, 'budgetRaw');
	const price = pricePerContract(inputs);
	const lot = inputs.lotSize ?? POSITION_LOT_SIZE;
	// The fill rounds the premium and each fee on its own, so a quantity's cost can sit above
	// `quantity × price`. The floor leaves a few raw units of the budget for that. Inventory impact
	// can round by more, so `read.planMint` also checks the floor with exact quotes.
	const spendable =
		inputs.budgetRaw > COST_ROUNDING_SLACK ? inputs.budgetRaw - COST_ROUNDING_SLACK : 0n;
	const quantity = (spendable * FLOAT_SCALING) / price.worstRaw;
	return { minQuantityRaw: (quantity / lot) * lot, pricePerContract: price };
}

/**
 * Limits for a queued exact-quantity mint (`enqueueMint`): the entry-probability cap and the
 * all-in cost cap at the worst price. The cost cap never exceeds the quantity, since a contract
 * never costs more than it pays.
 */
export function exactMintLimits(inputs: MintLimitsInputs): {
	maxCostRaw: bigint;
	maxProbabilityRaw: bigint;
	pricePerContract: PricePerContract;
} {
	assertUint(inputs.entryProbabilityRaw, 'entryProbabilityRaw', FLOAT_SCALING);
	const price = pricePerContract(inputs);
	const maxCostRaw = mulDivUp(inputs.quoteQuantityRaw, price.worstRaw, FLOAT_SCALING);
	const maxProbabilityRaw = inputs.entryProbabilityRaw + inputs.slippageRaw;
	return {
		maxCostRaw: min(maxCostRaw, inputs.quoteQuantityRaw),
		maxProbabilityRaw: min(maxProbabilityRaw, FLOAT_SCALING),
		pricePerContract: price,
	};
}

/**
 * Limits for a queued early sell (`enqueueSell`): the close-probability floor and the proceeds
 * floor at the worst price. `proceedsRaw` is the quote's proceeds before the order fee, as
 * `minProceeds` is.
 */
export function sellLimits(inputs: {
	proceedsRaw: bigint;
	closeQuantityRaw: bigint;
	probabilityRaw: bigint;
	slippageRaw: bigint;
}): { minProceedsRaw: bigint; minProbabilityRaw: bigint } {
	assertUint(inputs.proceedsRaw, 'proceedsRaw');
	assertUint(inputs.closeQuantityRaw, 'closeQuantityRaw');
	assertUint(inputs.probabilityRaw, 'probabilityRaw', FLOAT_SCALING);
	assertUint(inputs.slippageRaw, 'slippageRaw', FLOAT_SCALING);
	const give = mulDivUp(inputs.closeQuantityRaw, inputs.slippageRaw, FLOAT_SCALING);
	return {
		minProceedsRaw: inputs.proceedsRaw > give ? inputs.proceedsRaw - give : 0n,
		minProbabilityRaw:
			inputs.probabilityRaw > inputs.slippageRaw ? inputs.probabilityRaw - inputs.slippageRaw : 0n,
	};
}

function normalPdf(x: number): number {
	return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Acklam's rational approximation of Φ⁻¹, relative error below 1.15e-9.
function inverseNormalCdf(p: number): number {
	const a = [
		-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
		-3.066479806614716e1, 2.506628277459239,
	];
	const b = [
		-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
		-1.328068155288572e1,
	];
	const c = [
		-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
		4.374664141464968, 2.938163982698783,
	];
	const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
	const low = 0.02425;
	if (p < low) {
		const q = Math.sqrt(-2 * Math.log(p));
		return (
			(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
			((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
		);
	}
	if (p > 1 - low) {
		const q = Math.sqrt(-2 * Math.log(1 - p));
		return -(
			(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
			((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
		);
	}
	const q = p - 0.5;
	const r = q * q;
	return (
		((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
		(((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
	);
}

// === Order state ===

/**
 * A queue record as `queue::order` returns it: the generated `order_queue::OrderView` layout, a
 * copy of the record without Predict's receipt and the escrow balance (`funds` is its value).
 */
export type QueuedOrder = (typeof OrderViewBcs)['$inferType'];

/** The position a record holds: a filled mint's, a sell's, or a partial sell's remainder. */
export interface HeldPosition {
	orderId: bigint;
	rootId: bigint;
	openedAtMs: bigint;
	/**
	 * The position's payout quantity, decoded from `orderId` at the Move lot size: a filled
	 * mint's quantity, or what a partial sell left Open.
	 */
	quantityRaw: bigint;
}

interface OrderViewBase {
	status: number;
	kind: number;
	kindName: OrderKindName;
	side: 'mint' | 'sell' | 'unknown';
}

/**
 * What the app shows for one queued order. `placed` → `priced` → one of `filled` / `refunded`.
 * Report `filled` only from the record or the fill event, never from a resolve simulation.
 */
export type OrderView = OrderViewBase &
	(
		| {
				state: 'placed';
				tauMs: bigint;
				deadlineMs: bigint;
				/** τ has passed and the price hasn't been committed yet. */
				awaitingPrice: boolean;
				/** Keepers refund an unfinished order at its deadline. */
				autoRefundByMs: bigint;
				/** Offer "Refund my order": unfinished and {@link REFUND_REQUEST_GRACE_MS} past the deadline. */
				canRequestRefund: boolean;
		  }
		| {
				state: 'priced';
				tauMs: bigint;
				/** The committed update's tick: τ, or a backup tick. */
				tickMs: bigint;
				/** The committed Pyth price, 1e9-scaled. */
				priceRaw: bigint;
				deadlineMs: bigint;
				msToDeadline: bigint;
				autoRefundByMs: bigint;
				canRequestRefund: boolean;
		  }
		| {
				state: 'refunding';
				reason: RefundReasonInfo;
				deadlineMs: bigint;
				canRequestRefund: boolean;
		  }
		| {
				state: 'filled';
				/**
				 * Filled quantity (mint) or closed quantity (sell). A partial sell's remainder is
				 * `position.quantityRaw`.
				 */
				quantityRaw: bigint;
				/** Cost paid (mint) or proceeds before the order fee (sell). */
				amountRaw: bigint;
				finishedAtMs: bigint;
				/** The Open record's position: a filled mint, or a partial sell's remainder. */
				position: HeldPosition | null;
				/** Whether `enqueue_redeem_open` can sell this record now. */
				sellable: boolean;
				/** See {@link ParkedFunds}. */
				parkedRaw: bigint;
		  }
		| {
				state: 'refunded';
				reason: RefundReasonInfo;
				finishedAtMs: bigint;
				/** A refunded sell keeps its position as an Open record, sellable again. */
				positionBackAsOpenRecord: boolean;
				position: HeldPosition | null;
				sellable: boolean;
				/** See {@link ParkedFunds}. */
				parkedRaw: bigint;
		  }
		| {
				/** A filled mint's record whose position was later sold or settled. */
				state: 'closed';
				quantityRaw: bigint;
				amountRaw: bigint;
				finishedAtMs: bigint;
				/** See {@link ParkedFunds}. */
				parkedRaw: bigint;
		  }
		| { state: 'unknown' }
	);

/**
 * `parkedRaw` on a finished record: USDC the record kept because its receive address couldn't take
 * it (on USDC's deny list, or USDC paused) when its change or refund was sent. It is the
 * record's `funds`, which holds only parked USDC once the order finishes. Anyone can send it with
 * `claim_parked` once the address is clear. `0n` when nothing is parked.
 */
export type ParkedFunds = bigint;

function heldPosition(p: QueuedOrder['position'], lotSize?: bigint): HeldPosition | null {
	return p.order_id === 0n
		? null
		: {
				orderId: p.order_id,
				rootId: p.root_id,
				openedAtMs: p.opened_at_ms,
				quantityRaw: decodeOrderRange(p.order_id, lotSize).quantity,
			};
}

/**
 * Map a queue record to its display state. `nowMs` drives the refund flags. A record is sellable
 * while it is Open, holds a position, and `nowMs` is before the cutoff (`opts.cutoffMs`, or the
 * record's own placement cutoff when omitted). Unknown status or kind codes map to `unknown`.
 * `opts.lotSize` is the config's position lot (default 10,000, Predict's), which decodes a held
 * position's quantity.
 */
export function orderView(
	record: QueuedOrder,
	nowMs: bigint,
	opts: { cutoffMs?: bigint; lotSize?: bigint } = {},
): OrderView {
	const kind = record.kind;
	const base: OrderViewBase = {
		status: record.status,
		kind,
		kindName: orderKindName(kind),
		side: isMintKind(kind) ? 'mint' : isSellKind(kind) ? 'sell' : 'unknown',
	};
	if (base.side === 'unknown') return { ...base, state: 'unknown' };
	const { tau_ms: tauMs, deadline_ms: deadlineMs } = record.timing;
	const canRequestRefund = nowMs >= deadlineMs + REFUND_REQUEST_GRACE_MS;
	const position = heldPosition(record.position, opts.lotSize);
	const cutoffMs = opts.cutoffMs ?? record.timing.cutoff_ms;
	const sellable = position != null && nowMs < cutoffMs;
	const result = record.result;
	// Only read on the finished statuses below, where `funds` holds parked USDC, not escrow.
	const parkedRaw = record.funds;
	switch (record.status) {
		case ORDER_STATUS.PENDING:
			return {
				...base,
				state: 'placed',
				tauMs,
				deadlineMs,
				awaitingPrice: nowMs >= tauMs,
				autoRefundByMs: deadlineMs,
				canRequestRefund,
			};
		case ORDER_STATUS.COMMITTED:
			return {
				...base,
				state: 'priced',
				tauMs,
				tickMs: record.price.tick_ms,
				priceRaw: record.price.spot,
				deadlineMs,
				msToDeadline: deadlineMs > nowMs ? deadlineMs - nowMs : 0n,
				autoRefundByMs: deadlineMs,
				canRequestRefund,
			};
		case ORDER_STATUS.REFUND_DUE:
			return {
				...base,
				state: 'refunding',
				reason: refundReason(result.reason),
				deadlineMs,
				canRequestRefund,
			};
		case ORDER_STATUS.OPEN:
			if (base.side === 'sell' && result.reason > 0) {
				return {
					...base,
					state: 'refunded',
					reason: refundReason(result.reason),
					finishedAtMs: result.finished_at_ms,
					positionBackAsOpenRecord: true,
					position,
					sellable,
					parkedRaw,
				};
			}
			return {
				...base,
				state: 'filled',
				quantityRaw: result.quantity,
				amountRaw: result.amount,
				finishedAtMs: result.finished_at_ms,
				position,
				sellable,
				parkedRaw,
			};
		case ORDER_STATUS.REFUNDED:
			return {
				...base,
				state: 'refunded',
				reason: refundReason(result.reason),
				finishedAtMs: result.finished_at_ms,
				positionBackAsOpenRecord: false,
				position: null,
				sellable: false,
				parkedRaw,
			};
		case ORDER_STATUS.CLOSED:
			// A sell record that filled stays `filled` after its remainder moves on; a mint record
			// (or a refunded sell sold again) is `closed` once its position left.
			if (base.side === 'sell' && result.reason === 0 && result.quantity > 0n) {
				return {
					...base,
					state: 'filled',
					quantityRaw: result.quantity,
					amountRaw: result.amount,
					finishedAtMs: result.finished_at_ms,
					position: null,
					sellable: false,
					parkedRaw,
				};
			}
			return {
				...base,
				state: 'closed',
				quantityRaw: result.quantity,
				amountRaw: result.amount,
				finishedAtMs: result.finished_at_ms,
				parkedRaw,
			};
		default:
			return { ...base, state: 'unknown' };
	}
}

/** One record's state rebuilt from events, for the app's event path (indexer or own effects). */
export interface OrderEventState {
	marketId: string;
	recordId: bigint;
	/**
	 * `closed`: the record's position moved into a later sell's record (`enqueue_redeem_open` closes
	 * the source record), so this record holds nothing any more.
	 */
	state: 'placed' | 'priced' | 'filled' | 'refunded' | 'settled' | 'closed';
	kind: number | null;
	tauMs: bigint | null;
	deadlineMs: bigint | null;
	/** Set once priced: the committed Pyth price as a float (`spot / 1e9`) and its tick. */
	price: number | null;
	tickMs: bigint | null;
	/**
	 * Set on a refund. The settlement drain (`settle_step`) refunds the orders still waiting at
	 * expiry with reason 5 (deadline), like a keeper's deadline refund.
	 */
	reason: RefundReasonInfo | null;
	/**
	 * The position the record holds now, or null. A sell's record takes its source's position at
	 * enqueue and keeps it through a refund, a fill leaves a mint's new position or a partial
	 * sell's remainder, and a later sell, a full close or settlement clears it.
	 */
	position: HeldPosition | null;
	/** For a sell: the record its position came from. */
	sourceRecordId: bigint | null;
	/** Set when `settle_step` or `pay_open` paid the record (0 for a loser). */
	payoutRaw: bigint | null;
	/** True after `OpenRecordPayoutSkipped`: the record stays Open, unpaid for now. */
	payoutSkipped: boolean;
	/**
	 * USDC the record holds parked (`RecordFundsParked`, summed) until `RecordFundsClaimed`. See
	 * {@link ParkedFunds}.
	 */
	parkedRaw: bigint;
}

/**
 * Fold decoded queue events (in chain order) into per-record states, keyed `marketId:recordId`.
 * The app shows Placed from the enqueue's own effects, Priced at the cohort commit, and switches to
 * Filled or Refunded on `QueuedOrderFilled` / `QueuedOrderRefunded`. Events for records that never
 * appeared enqueued still create an entry, so a partial event window works.
 */
export function reduceOrderEvents(
	events: readonly QueueEvent[],
	into: Map<string, OrderEventState> = new Map(),
): Map<string, OrderEventState> {
	const entry = (marketId: string, recordId: bigint): OrderEventState => {
		const key = `${marketId}:${recordId}`;
		let s = into.get(key);
		if (!s) {
			s = {
				marketId,
				recordId,
				state: 'placed',
				kind: null,
				tauMs: null,
				deadlineMs: null,
				price: null,
				tickMs: null,
				reason: null,
				position: null,
				sourceRecordId: null,
				payoutRaw: null,
				payoutSkipped: false,
				parkedRaw: 0n,
			};
			into.set(key, s);
		}
		return s;
	};
	for (const e of events) {
		switch (e.type) {
			case 'enqueued': {
				const s = entry(e.marketId, e.recordId);
				s.kind = e.kind;
				s.tauMs = e.timing.tauMs;
				s.deadlineMs = e.timing.deadlineMs;
				// A sell moves the whole position out of its source record, which the chain marks
				// Closed, and into the new record, which holds it until the sell fills or refunds.
				s.position = e.position;
				s.sourceRecordId = e.sourceRecordId;
				if (e.sourceRecordId != null) {
					const source = entry(e.marketId, e.sourceRecordId);
					source.state = 'closed';
					source.position = null;
				}
				break;
			}
			case 'cohort-committed':
				for (const s of into.values()) {
					if (
						s.marketId === e.marketId &&
						s.state === 'placed' &&
						s.recordId >= e.firstRecordId &&
						s.recordId <= e.lastRecordId
					) {
						s.state = 'priced';
						s.price = e.price;
						s.tickMs = e.tickMs;
					}
				}
				break;
			case 'filled': {
				const s = entry(e.marketId, e.recordId);
				s.state = 'filled';
				s.kind = e.kind;
				s.tickMs = e.tickMs;
				s.position = e.position;
				break;
			}
			case 'refunded': {
				const s = entry(e.marketId, e.recordId);
				s.state = 'refunded';
				s.kind = e.kind;
				s.reason = e.reason;
				// A refunded sell keeps its position, Open and sellable again from this record.
				if (!e.positionReturned) s.position = null;
				break;
			}
			case 'open-record-settled': {
				const s = entry(e.marketId, e.recordId);
				s.state = 'settled';
				s.payoutRaw = e.raw.payout;
				s.payoutSkipped = false;
				s.position = null;
				break;
			}
			case 'open-record-payout-skipped': {
				const s = entry(e.marketId, e.recordId);
				s.payoutSkipped = true;
				break;
			}
			case 'record-funds-parked': {
				const s = entry(e.marketId, e.recordId);
				s.parkedRaw += e.raw.amount;
				break;
			}
			case 'record-funds-claimed': {
				// `claim_parked` sends everything the record had parked.
				const s = entry(e.marketId, e.recordId);
				s.parkedRaw = 0n;
				break;
			}
			default:
				break;
		}
	}
	return into;
}

function min(a: bigint, b: bigint): bigint {
	return a < b ? a : b;
}

function max(a: bigint, b: bigint): bigint {
	return a > b ? a : b;
}
