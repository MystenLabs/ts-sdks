// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Off-chain quotes, prices and NAV.
//
// Predict version 6 retires the views that priced a market at the clock (`quote_mint*`,
// `quote_close*`, the queue's `quote_redeem_open*`, `current_nav`, `live_order_value`,
// `load_live_pricer`): each aborts `EUseV2`. This module computes the same numbers off chain, as
// the version 5 views computed them, from a pricer built from signed inputs (`inputs.ts`) and the
// market's own state:
//
//   mint quote   `expiry_market::quote_now` / `price_mint`: the entry band per leg and range, the
//                minimum premium, the lot grid, the budget searches, the trading fee times the
//                market's fee band, the sponsor subsidy capped by the market's incentive balance,
//                a per-contract builder fee, no congestion penalty, and the payout bound
//   sell quote   `expiry_market::quote_sell` / `price_close`: the close value, the banded trading
//                fee and the builder fee, each capped at what remains, and the impact rebate
//   NAV          `expiry_market::current_nav`: free cash less the payout tree's marked liability
//
// Every fee and rounding step is the chain's integer arithmetic (`cost.ts`). The boundary
// probabilities come from the float digital in `pricing.ts`, so a quote here agrees with the chain
// to that pricer's ~1e-4 in probability, not to the raw unit. A refusal is raised as the
// `PredictMoveError` the version 5 view aborted with (`EOrderFailsLimits`, `ELivePricingExpired`),
// so callers that matched on those names keep working.

import {
	FLOAT_SCALING,
	MAX_QUANTITY_LOTS,
	MIN_PREMIUM,
	POSITION_LOT_SIZE,
	boundaryProbabilities,
	closeInventoryImpact,
	feeIncentiveSubsidy,
	mintInventoryImpact,
	rangeProbability,
	tradingFee,
	type Boundaries,
	type CloseBookTerms,
	type FeePolicy,
	type MintBookTerms,
} from './cost.js';
import { PredictInputError, PredictMoveError } from './errors.js';
import { upProbability, type PricerInputs } from './pricing.js';
import { POS_INF_TICK } from './ticks.js';
import { fromRaw } from './units.js';

const mulDown = (x: bigint, y: bigint) => (x * y) / FLOAT_SCALING;
const mulDivUp = (x: bigint, y: bigint, d: bigint) => (x * y + d - 1n) / d;
const U64_MAX = (1n << 64n) - 1n;

/** One fee band of a market: trades whose price is in `[low, high)` pay `multiplier` × the fee. */
export interface FeeBand {
	/** Inclusive lower price bound, 1e9-scaled. */
	low: bigint;
	/** Exclusive upper price bound, 1e9-scaled. */
	high: bigint;
	/** Fee multiplier, 1e9-scaled (1e9 is 1x). */
	multiplier: bigint;
}

/** `protocol_config::band_mult`: the multiplier of the band holding `price`, 1x when none does. */
export function feeBandMultiplier(bands: readonly FeeBand[], price: bigint): bigint {
	for (const band of bands) {
		if (price >= band.low && price < band.high) return band.multiplier;
	}
	return FLOAT_SCALING;
}

/** Decode a market's fee-band field: the flat `[low, high, multiplier]` triples the chain stores. */
export function feeBandsFromTriples(flat: readonly bigint[]): FeeBand[] {
	if (flat.length % 3 !== 0) {
		throw new PredictInputError(
			`fee bands must be [low, high, multiplier] triples, got ${flat.length} values`,
		);
	}
	const out: FeeBand[] = [];
	for (let i = 0; i < flat.length; i += 3) {
		out.push({ low: flat[i], high: flat[i + 1], multiplier: flat[i + 2] });
	}
	return out;
}

/** One finite boundary of a market's payout tree. */
export interface PayoutBoundary {
	tick: bigint;
	/** Quantity of the orders whose range starts at this tick. */
	localStart: bigint;
	/** Quantity of the orders whose range ends at this tick. */
	localEnd: bigint;
}

/**
 * A market's payout tree as plain data: `base` (orders open below) and every finite boundary,
 * in ascending tick order.
 */
export interface PayoutBook {
	base: bigint;
	boundaries: readonly PayoutBoundary[];
}

// The highest payout prefix over settlement limits in `[lower + 1, higher]`
// (`strike_payout_tree::range_max`): the boundaries at or below `lower`, then each one strictly
// inside `(lower, higher)`.
function rangeMax(book: PayoutBook, lower: bigint, higher: bigint): bigint {
	let running = book.base;
	let i = 0;
	const b = book.boundaries;
	for (; i < b.length && b[i].tick <= lower; i++) running += b[i].localStart - b[i].localEnd;
	let best = running;
	for (; i < b.length && b[i].tick < higher; i++) {
		running += b[i].localStart - b[i].localEnd;
		if (running > best) best = running;
	}
	return best;
}

/**
 * The pre-trade book terms a range's inventory-impact charge or rebate is priced against
 * (`strike_payout_tree::rsv_terms`, `range_max`, `out_max`), from the market's payout tree.
 */
export function bookTerms(book: PayoutBook, lowerTick: bigint, higherTick: bigint): CloseBookTerms {
	let total = book.base;
	for (const n of book.boundaries) total += n.localStart;
	const maxPayout = rangeMax(book, 0n, POS_INF_TICK);
	const left = lowerTick === 0n ? 0n : rangeMax(book, 0n, lowerTick);
	const right = higherTick === POS_INF_TICK ? 0n : rangeMax(book, higherTick, POS_INF_TICK);
	return {
		maxPayout,
		totalPayout: total,
		rangeMaxPayout: rangeMax(book, lowerTick, higherTick),
		complementMaxPayout: left > right ? left : right,
	};
}

/** The market state a local quote reads. */
export interface QuoteMarket {
	expiryMs: bigint;
	tickSizeRaw: bigint;
	admissionTickSizeRaw: bigint;
	referenceTickRaw: bigint | null;
	/** The market's snapshotted fee policy (`read.feePolicy`). */
	fees: FeePolicy;
	/** The market's fee bands, `[]` for none. */
	feeBands: readonly FeeBand[];
	/** The market's remaining sponsored fee balance (`fee_incentive_balance`). */
	feeIncentiveBalance: bigint;
	/**
	 * The payout tree, needed only while the market's inventory impact is enabled
	 * (`fees.inventoryImpactMaxRate > 0n`). The quote throws without it then.
	 */
	book?: PayoutBook;
}

/** What a local mint quote prices: the three shapes of `quote_mint*`. */
export type LocalMintRequest =
	| { shape: 'exact-quantity'; quantityRaw: bigint }
	| { shape: 'exact-amount'; maxPremiumRaw: bigint; minQuantityRaw: bigint }
	| { shape: 'exact-cost'; maxCostRaw: bigint; minQuantityRaw: bigint };

/** `expiry_market::MintQuote` with camelCase keys. `penaltyFee` is always 0: a queued fill pays none. */
export interface LocalMintQuote {
	quantity: bigint;
	entryProbability: bigint;
	premium: bigint;
	tradingFee: bigint;
	feeIncentiveSubsidy: bigint;
	builderFee: bigint;
	penaltyFee: bigint;
	inventoryImpactCharge: bigint;
	allInCost: bigint;
}

/** `expiry_market::RedeemQuote` with camelCase keys. `proceeds` is before the order fee. */
export interface LocalSellQuote {
	closeQuantity: bigint;
	probability: bigint;
	proceeds: bigint;
	tradingFee: bigint;
	builderFee: bigint;
	inventoryImpactRebate: bigint;
}

const ordersFailLimits = () => new PredictMoveError('expiry_market', 14n, 'EOrderFailsLimits');
const pastExpiry = () => new PredictMoveError('pricing', 9n, 'ELivePricingExpired');

function strikeOf(tick: bigint, tickSize: bigint): number | null {
	return tick === 0n || tick === POS_INF_TICK ? null : fromRaw(tick * tickSize, 9);
}

/** The two boundary UP probabilities of `(lowerTick, higherTick]`, raw 1e9, from a local pricer. */
export function rangeBoundaries(
	pricer: PricerInputs,
	lowerTick: bigint,
	higherTick: bigint,
	tickSizeRaw: bigint,
): Boundaries {
	return boundaryProbabilities(
		pricer,
		strikeOf(lowerTick, tickSizeRaw),
		strikeOf(higherTick, tickSizeRaw),
	);
}

// `strike_exposure::valid_range` and `is_admitted`.
function admitted(market: QuoteMarket, lower: bigint, higher: bigint): boolean {
	if (!(lower < higher && higher <= POS_INF_TICK && !(lower === 0n && higher === POS_INF_TICK))) {
		return false;
	}
	const multiple = market.admissionTickSizeRaw / market.tickSizeRaw;
	const ok = (tick: bigint, sentinel: bigint) =>
		tick === sentinel ||
		(multiple > 0n && tick % multiple === 0n) ||
		(market.referenceTickRaw != null && market.referenceTickRaw === tick);
	return ok(lower, 0n) && ok(higher, POS_INF_TICK);
}

const probOk = (fees: FeePolicy, p: bigint) =>
	p >= fees.minEntryProbability && p <= fees.maxEntryProbability;

// `strike_exposure_config::range_ok`: the band on each finite leg and on the range.
function rangeOk(fees: FeePolicy, b: Boundaries): boolean {
	return (
		(b.lowerUp === null || probOk(fees, b.lowerUp)) &&
		(b.higherUp === null || probOk(fees, FLOAT_SCALING - b.higherUp)) &&
		probOk(fees, rangeProbability(b))
	);
}

const validQty = (q: bigint, lot: bigint) =>
	q > 0n && q % lot === 0n && q / lot <= MAX_QUANTITY_LOTS;

// `pmath::max_qty`: the largest lot multiple whose premium fits `maxPremium`.
function maxQty(probability: bigint, maxPremium: bigint, lot: bigint): bigint {
	let lo = 0n;
	let hi = MAX_QUANTITY_LOTS;
	while (lo < hi) {
		const mid = (lo + hi + 1n) / 2n;
		if (mulDown(probability, mid * lot) <= maxPremium) lo = mid;
		else hi = mid - 1n;
	}
	return lo * lot;
}

function assertNonNegative(value: bigint, name: string): void {
	if (typeof value !== 'bigint' || value < 0n || value > U64_MAX) {
		throw new PredictInputError(`${name} must be a u64 bigint, got ${String(value)}`);
	}
}

/** Inputs to {@link localMintQuote}. */
export interface LocalMintQuoteInputs {
	market: QuoteMarket;
	pricer: PricerInputs;
	lowerTick: bigint;
	higherTick: bigint;
	request: LocalMintRequest;
	/** The time the fee ramp is read at, ms. The pricer's own pricing time. */
	nowMs: bigint;
	/** The protocol's `fee_incentive_subsidy_rate`, 1e9-scaled. */
	feeIncentiveSubsidyRate: bigint;
	/** Builder fee per contract, already capped at the protocol's `builder_fee_cap`. Default 0. */
	builderFeePerContract?: bigint;
	/**
	 * An account's USDC balance, for the account's own quote: it caps a premium budget or an
	 * all-in budget, as `quote_mint_for_account` did. Omit it for a quote for no particular
	 * account (`quote_mint`).
	 */
	availableRaw?: bigint;
	/** The deployment's `position_lot_size`. Default `10_000n`. */
	lotSize?: bigint;
}

/**
 * Quote a mint locally, as Predict version 5's `quote_mint*` did at the clock: the queued fill's
 * price at the current pricer, with no congestion penalty. Throws `EOrderFailsLimits` (a
 * `PredictMoveError`) where the chain's quote refused, and `ELivePricingExpired` at or past
 * expiry.
 */
export function localMintQuote(inputs: LocalMintQuoteInputs): LocalMintQuote {
	const { market } = inputs;
	const cap = (x: bigint) =>
		inputs.availableRaw !== undefined && inputs.availableRaw < x ? inputs.availableRaw : x;
	const request: LocalMintRequest =
		inputs.request.shape === 'exact-amount'
			? { ...inputs.request, maxPremiumRaw: cap(inputs.request.maxPremiumRaw) }
			: inputs.request.shape === 'exact-cost'
				? { ...inputs.request, maxCostRaw: cap(inputs.request.maxCostRaw) }
				: inputs.request;
	const lot = inputs.lotSize ?? POSITION_LOT_SIZE;
	const bfee = inputs.builderFeePerContract ?? 0n;
	assertNonNegative(bfee, 'builderFeePerContract');
	if (inputs.nowMs >= market.expiryMs) throw pastExpiry();
	if (!admitted(market, inputs.lowerTick, inputs.higherTick)) throw ordersFailLimits();
	const boundaries = rangeBoundaries(
		inputs.pricer,
		inputs.lowerTick,
		inputs.higherTick,
		market.tickSizeRaw,
	);
	if (!rangeOk(market.fees, boundaries)) throw ordersFailLimits();
	const impactOn = market.fees.inventoryImpactMaxRate > 0n;
	if (impactOn && !market.book) {
		throw new PredictInputError(
			"this market charges inventory impact, so a local quote needs the market's payout tree (`book`)",
		);
	}
	const book: MintBookTerms | undefined =
		impactOn && market.book
			? bookTerms(market.book, inputs.lowerTick, inputs.higherTick)
			: undefined;
	const probability = rangeProbability(boundaries);
	const mult = feeBandMultiplier(market.feeBands, probability);
	const ttl = market.expiryMs - inputs.nowMs;

	// `mint_q_at` at the clock, from the range's price.
	const quoteAt = (quantity: bigint): LocalMintQuote => {
		const premium = mulDown(probability, quantity);
		const fee = mulDown(tradingFee(market.fees, boundaries, quantity, ttl), mult);
		const subsidy = feeIncentiveSubsidy(
			fee,
			market.feeIncentiveBalance,
			inputs.feeIncentiveSubsidyRate,
		);
		const builder = mulDown(quantity, bfee);
		const impact = book ? mintInventoryImpact(market.fees, book, quantity) : 0n;
		return {
			quantity,
			entryProbability: probability,
			premium,
			tradingFee: fee,
			feeIncentiveSubsidy: subsidy,
			builderFee: builder,
			penaltyFee: 0n,
			inventoryImpactCharge: impact,
			allInCost: premium + (fee - subsidy) + builder + impact,
		};
	};

	let quantity: bigint;
	let minQuantity: bigint;
	let costCap = U64_MAX;
	if (request.shape === 'exact-quantity') {
		assertNonNegative(request.quantityRaw, 'quantityRaw');
		quantity = request.quantityRaw;
		minQuantity = quantity;
	} else if (request.shape === 'exact-amount') {
		assertNonNegative(request.maxPremiumRaw, 'maxPremiumRaw');
		assertNonNegative(request.minQuantityRaw, 'minQuantityRaw');
		quantity = maxQty(probability, request.maxPremiumRaw, lot);
		minQuantity = request.minQuantityRaw;
	} else {
		assertNonNegative(request.maxCostRaw, 'maxCostRaw');
		assertNonNegative(request.minQuantityRaw, 'minQuantityRaw');
		costCap = request.maxCostRaw;
		minQuantity = request.minQuantityRaw;
		// `cost_qty_at`: the largest lot multiple whose all-in cost fits the budget, stepped down
		// only when that fill costs more than its payout.
		const costAt = (q: bigint) => quoteAt(q).allInCost;
		let lo = 0n;
		let hi = maxQty(probability, costCap, lot) / lot;
		while (lo < hi) {
			const mid = (lo + hi + 1n) / 2n;
			if (costAt(mid * lot) <= costCap) lo = mid;
			else hi = mid - 1n;
		}
		const budgetQuantity = lo * lot;
		if (lo === 0n || costAt(budgetQuantity) <= budgetQuantity) {
			quantity = budgetQuantity;
		} else {
			let stepLo = 0n;
			let stepHi = lo - 1n;
			while (stepLo < stepHi) {
				const mid = (stepLo + stepHi + 1n) / 2n;
				const q = mid * lot;
				if (costAt(q) <= q) stepLo = mid;
				else stepHi = mid - 1n;
			}
			quantity = stepLo === 0n ? budgetQuantity : stepLo * lot;
		}
	}

	// `try_terms`: size first (reason 1), then the entry band and the minimum premium (reason 2).
	if (quantity < minQuantity || !validQty(quantity, lot)) throw ordersFailLimits();
	if (!probOk(market.fees, probability) || mulDown(probability, quantity) < MIN_PREMIUM) {
		throw ordersFailLimits();
	}
	const quote = quoteAt(quantity);
	if (quote.allInCost > quote.quantity) throw ordersFailLimits();
	if (quote.allInCost > costCap) throw ordersFailLimits();
	return quote;
}

/** Inputs to {@link localSellQuote}. */
export interface LocalSellQuoteInputs {
	market: QuoteMarket;
	pricer: PricerInputs;
	/** The Open record's range and held quantity (`cost.decodeOrderRange(position.order_id)`). */
	order: { lowerTick: bigint; higherTick: bigint; quantity: bigint };
	closeQuantityRaw: bigint;
	nowMs: bigint;
	/** Builder fee per contract, already capped at the protocol's `builder_fee_cap`. Default 0. */
	builderFeePerContract?: bigint;
	lotSize?: bigint;
}

/**
 * Quote an early sell of an Open record locally, as Predict version 5's `quote_close` did at the
 * clock: the close value at the current pricer, less the banded trading fee and the builder fee,
 * plus the inventory-impact rebate, with no congestion penalty. `proceeds` is before the order
 * fee. Throws `EOrderFailsLimits` where the chain's quote refused (a quantity off the lot grid or
 * above the record's), and `ELivePricingExpired` at or past expiry.
 */
export function localSellQuote(inputs: LocalSellQuoteInputs): LocalSellQuote {
	const { market, order } = inputs;
	const lot = inputs.lotSize ?? POSITION_LOT_SIZE;
	const close = inputs.closeQuantityRaw;
	const bfee = inputs.builderFeePerContract ?? 0n;
	assertNonNegative(bfee, 'builderFeePerContract');
	if (inputs.nowMs >= market.expiryMs) throw pastExpiry();
	if (!validQty(close, lot) || close > order.quantity) throw ordersFailLimits();
	const boundaries = rangeBoundaries(
		inputs.pricer,
		order.lowerTick,
		order.higherTick,
		market.tickSizeRaw,
	);
	const probability = rangeProbability(boundaries);
	const redeem = mulDown(probability, close);
	let rebate = 0n;
	if (market.fees.inventoryImpactMaxRate > 0n) {
		if (!market.book) {
			throw new PredictInputError(
				"this market charges inventory impact, so a local quote needs the market's payout tree (`book`)",
			);
		}
		rebate = closeInventoryImpact(
			market.fees,
			bookTerms(market.book, order.lowerTick, order.higherTick),
			close,
		);
	}
	const ttl = market.expiryMs - inputs.nowMs;
	const fee0 = mulDown(
		tradingFee(market.fees, boundaries, close, ttl),
		feeBandMultiplier(market.feeBands, probability),
	);
	const fee = fee0 < redeem ? fee0 : redeem;
	const builder0 = mulDown(close, bfee);
	const builder = builder0 < redeem - fee ? builder0 : redeem - fee;
	return {
		closeQuantity: close,
		probability,
		proceeds: redeem + rebate - fee - builder,
		tradingFee: fee,
		builderFee: builder,
		inventoryImpactRebate: rebate,
	};
}

/**
 * `pricing::price_monotonicity_tolerance`: the largest rise in UP price across ascending
 * boundaries the liability walk treats as rounding rather than an inverted surface.
 */
export const PRICE_MONOTONICITY_TOLERANCE = 2n;

/**
 * The payout tree's marked liability at a pricer (`strike_payout_tree::walk_linear`): every open
 * order's range value, priced once per boundary in ascending order, with the chain's handling of a
 * small rise in price across boundaries. Throws `PredictMoveError` `ENonMonotonePrice` where the
 * chain's walk aborted, a rise above the tolerance.
 */
export function markedLiability(
	book: PayoutBook,
	pricer: PricerInputs,
	tickSizeRaw: bigint,
): bigint {
	let envelope: bigint | null = null;
	let startTotal = 0n;
	let endTotal = 0n;
	for (const node of book.boundaries) {
		if (node.localStart === 0n && node.localEnd === 0n) continue;
		const p = upProbability(pricer, fromRaw(node.tick * tickSizeRaw, 9));
		let price = BigInt(Math.round(p * 1e9));
		if (price < 0n) price = 0n;
		if (price > FLOAT_SCALING) price = FLOAT_SCALING;
		let start = 0n;
		if (envelope != null) {
			if (price > envelope + PRICE_MONOTONICITY_TOLERANCE) {
				throw new PredictMoveError('strike_payout_tree', 2n, 'ENonMonotonePrice');
			}
			if (price > envelope) start = mulDivUp(price - envelope, node.localEnd, FLOAT_SCALING);
			if (price < envelope) envelope = price;
		} else {
			envelope = price;
		}
		if (node.localStart !== node.localEnd) {
			start += mulDown(price, node.localStart);
			endTotal += mulDown(price, node.localEnd);
		}
		startTotal += start;
	}
	const gross = book.base + startTotal;
	return gross > endTotal ? gross - endTotal : 0n;
}

/**
 * A market's NAV mark at a pricer, as Predict version 5's `current_nav` computed it: free cash
 * (`cash_balance − inventory_impact_reserve`, floored at 0) less the marked liability, floored at
 * 0.
 */
export function localNav(inputs: {
	cashBalance: bigint;
	inventoryImpactReserve: bigint;
	book: PayoutBook;
	pricer: PricerInputs;
	tickSizeRaw: bigint;
}): bigint {
	const free =
		inputs.cashBalance > inputs.inventoryImpactReserve
			? inputs.cashBalance - inputs.inventoryImpactReserve
			: 0n;
	const liability = markedLiability(inputs.book, inputs.pricer, inputs.tickSizeRaw);
	return free > liability ? free - liability : 0n;
}
