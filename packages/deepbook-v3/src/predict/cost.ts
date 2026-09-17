// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Client-side ALL-IN cost math for Predict trades — the fee layer `pricing.ts` stops short of.
// `pricing.*` answers "what is this contract worth?" (the probability); this module answers
// "what does the chain debit me for it?" and "what does closing it credit me?", with NO chain
// call: no `devInspect`, no dry run, no simulate.
//
// It is an EXACT integer port of the deployed cost path, function for function:
//
//   mint     `expiry_market::mint_quote_at` / `compute_mint_quote`
//              -> premium + (trading_fee - fee_incentive_subsidy) + builder_fee + penalty_fee
//                 + inventory_impact_charge
//   budget   `expiry_market::quote_exact_cost_terms` (the `mint_exact_cost` lot search)
//   redeem   `expiry_market::redeem_live`'s payment decomposition
//              -> gross + inventory_impact_rebate - trading_fee - builder_fee - penalty
//   fees     `strike_exposure_config::trading_fee` (per-boundary Bernoulli fee + expiry ramp),
//            `expiry_market::builder_fee_amount`, `ewma::penalty_fee`,
//            `strike_exposure::mint_range_inventory_impact` / `live_close_inventory_impact`
//
// Every rounding step is the chain's: `mul_down`, `mul_div_down` and a bit-identical
// `sqrt_down` (same Newton schedule as `fixed_math::math`), all on bigints. So given the same
// inputs the chain uses, these return the chain's numbers to the raw unit — the fee layer
// carries no approximation of its own.
//
// Local float probabilities (`pricing.upProbability`, ~1e-4) introduce approximation.
// With raw probabilities AND the same fee, account, book and clock inputs as execution,
// the arithmetic matches the chain. `exactProbabilities` only identifies the probability
// input format; it does not certify the source or freshness of any state. A nonzero
// inventory-impact policy requires book data. Congestion defaults to a zero rate; supply
// the actual rate when enabled. Use `read.quoteMint` / `read.quoteRedeem` for a simulation
// against current account and market state, including the execution gates these previews
// do not check (ownership, pauses, trade window, oracle freshness and cash backing).
//
// The fee POLICY is a per-market snapshot taken at creation (`StrikeExposureConfig`), and the
// chain exposes no getter for `base_fee`/`min_fee` — take it from the market's `MarketCreated`
// event (an indexer, or `decode`), or use {@link SHIPPED_FEE_POLICY} for the shipped template.

import { PredictInputError } from './errors.js';
import type { PricerInputs } from './pricing.js';
import { upProbability } from './pricing.js';
import { POS_INF_TICK } from './ticks.js';
import { fromRaw, U64_MAX, usdcToRaw } from './units.js';

// === Protocol constants (mirrors of `deepbook_predict::constants` / `fixed_math::math`) ===

/** `math::float_scaling` — 1e9 is 1.0 for every rate and probability here. */
export const FLOAT_SCALING = 1_000_000_000n;
/** `constants::position_lot_size` — quantity is an integer number of these. */
export const POSITION_LOT_SIZE = 10_000n;
/** `constants::min_premium` — a mint below this premium aborts `EPremiumBelowMinimum`. */
export const MIN_PREMIUM = 1_000_000n;
/** `constants::builder_fee_multiplier` — the builder's cut of the trading fee (10%). */
export const BUILDER_FEE_MULTIPLIER = 100_000_000n;
/** `constants::max_builder_fee_rate` — cap on the builder fee as a share of quantity (0.5%). */
export const MAX_BUILDER_FEE_RATE = 5_000_000n;
/** `constants::fee_incentive_subsidy_rate` — sponsor share of a trader's mint fee (20%). */
export const FEE_INCENTIVE_SUBSIDY_RATE = 200_000_000n;
/** `order::max_quantity_lots` — the order ID's 32-bit lot field. */
export const MAX_QUANTITY_LOTS = (1n << 32n) - 1n;

// === Fixed-point primitives (mirrors of `fixed_math::math`) ===

const mulDown = (x: bigint, y: bigint): bigint => (x * y) / FLOAT_SCALING;
const divDown = (x: bigint, y: bigint): bigint => (x * FLOAT_SCALING) / y;
const mulDivDown = (x: bigint, y: bigint, denominator: bigint): bigint => (x * y) / denominator;
const min = (a: bigint, b: bigint): bigint => (a < b ? a : b);
const max = (a: bigint, b: bigint): bigint => (a > b ? a : b);

// Move's unsigned types enforce these domains before arithmetic. JS bigint does not.
function assertUint(value: bigint, name: string, maximum = U64_MAX, minimum = 0n): void {
	if (typeof value !== 'bigint' || value < minimum || value > maximum) {
		throw new PredictInputError(
			`${name} must be an integer in [${minimum}, ${maximum}], got ${value}`,
		);
	}
}

// `math::sqrt_initial_guess_u128` — power-of-two seed for the Newton iteration.
function sqrtInitialGuess(x: bigint): bigint {
	let bits = 0n;
	let val = x;
	if (val >= 1n << 64n) {
		val >>= 64n;
		bits += 64n;
	}
	if (val >= 1n << 32n) {
		val >>= 32n;
		bits += 32n;
	}
	if (val >= 1n << 16n) {
		val >>= 16n;
		bits += 16n;
	}
	if (val >= 1n << 8n) {
		val >>= 8n;
		bits += 8n;
	}
	if (val >= 1n << 4n) {
		val >>= 4n;
		bits += 4n;
	}
	if (val >= 1n << 2n) {
		val >>= 2n;
		bits += 2n;
	}
	if (val >= 1n << 1n) bits += 1n;
	return 1n << ((bits + 1n) / 2n);
}

// `math::sqrt_u128_down` — seven Newton steps then one correcting decrement, exactly as the
// chain runs them, so this agrees with the contract raw unit for raw unit rather than merely
// to within a rounding step.
function sqrtU128Down(x: bigint): bigint {
	if (x === 0n) return 0n;
	if (x < 4n) return 1n;
	let g = sqrtInitialGuess(x);
	for (let i = 0; i < 7; i++) g = (g + x / g) / 2n;
	if (g > x / g) g -= 1n;
	return g;
}

/** `math::sqrt_down` — square root of a 1e9-scaled value, 1e9-scaled, rounded down. */
export function sqrtDown(x: bigint): bigint {
	assertUint(x, 'sqrt input');
	return sqrtU128Down(x * FLOAT_SCALING);
}

// === Policy and state inputs ===

/**
 * One market's fee policy: the `StrikeExposureConfig` it snapshotted at creation, in raw 1e9
 * rates. Snapshotted means later admin changes do NOT reprice a market already trading, so
 * read it per market (the `MarketCreated` event carries every field) rather than assuming the
 * template. The last three are the inventory-impact parameters, inert while
 * `inventoryImpactMaxRate` is `0n` (the shipped value).
 */
export interface FeePolicy {
	/** `base_fee` — multiplies `sqrt(p·(1−p))`. */
	baseFee: bigint;
	/** `min_fee` — per-unit floor, applied per boundary leg before the ramp. */
	minFee: bigint;
	/** `expiry_fee_window_ms` — window before expiry over which the fee ramps. */
	expiryFeeWindowMs: bigint;
	/** `expiry_fee_max_multiplier` — multiplier reached at expiry; 1e9 disables the ramp. */
	expiryFeeMaxMultiplier: bigint;
	/** `min_entry_probability` — mint admission floor on the entry probability. */
	minEntryProbability: bigint;
	/** `max_entry_probability` — mint admission ceiling on the entry probability. */
	maxEntryProbability: bigint;
	/** `inventory_impact_max_rate` — maximum marginal impact rate; `0n` disables impact. */
	inventoryImpactMaxRate: bigint;
	/** `inventory_impact_scale` — the market's `max_expiry_allocation`, the curve's `B`. */
	inventoryImpactScale: bigint;
	/** `backing_buffer_lambda` — the buffer on non-peak payout in the liability formula. */
	backingBufferLambda: bigint;
}

/**
 * The shipped template (`config_constants` defaults): 10% Bernoulli fee, a 2.2% per-leg floor,
 * a one-day ramp window that is inert at a 1.0 multiplier, a 1%–99% entry band, and inventory
 * impact disabled. A market that was created under these values charges exactly this; one
 * created after an admin change does not, which is why the per-market snapshot is the real
 * answer. Verify against the deployment's `MarketCreated` before pricing money on it.
 */
export const SHIPPED_FEE_POLICY: FeePolicy = Object.freeze({
	baseFee: 100_000_000n,
	minFee: 22_000_000n,
	expiryFeeWindowMs: 86_400_000n,
	expiryFeeMaxMultiplier: FLOAT_SCALING,
	minEntryProbability: 10_000_000n,
	maxEntryProbability: 990_000_000n,
	inventoryImpactMaxRate: 0n,
	inventoryImpactScale: 0n,
	backingBufferLambda: 310_000_000n,
});

/** A range's two boundary UP probabilities, raw 1e9. `null` is an infinite boundary — the
 * −∞ lower of a DOWN order and the +∞ higher of an UP order — which is priced at the digital
 * limit and pays no fee leg. */
export interface Boundaries {
	/** `P(settle > lower)`, or `null` for the −∞ lower bound. */
	lowerUp: bigint | null;
	/** `P(settle > higher)`, or `null` for the +∞ higher bound. */
	higherUp: bigint | null;
}

/** Where a quote's probabilities come from: boundary probabilities you already hold (raw 1e9,
 * e.g. `probabilityToRaw((await read.price(...)).up)`) or a local pricer snapshot plus
 * the range's strikes in USD (`null` for an infinite side). */
export type ProbabilitySource =
	Boundaries | { pricer: PricerInputs; lower: number | null; upper: number | null };

/** The market's gas-price EWMA (`ewma::EwmaState`), both fields 1e9-scaled. */
export interface CongestionState {
	mean: bigint;
	variance: bigint;
}

/** The protocol's congestion knobs (`EwmaConfig`). Shipped disabled. */
export interface CongestionPolicy {
	enabled: boolean;
	/** `penalty_rate` — per-unit surcharge charged when the z-score fires. */
	penaltyRate: bigint;
	/** `z_score_threshold` — how many standard deviations above the mean gas must sit. */
	zScoreThreshold: bigint;
}

/** Pre-trade payout-tree reads a mint's inventory-impact charge is evaluated against
 * (`strike_exposure::quote_mint_range`). All in quote units. */
export interface MintBookTerms {
	/** `M` — largest summed net payout at any one settlement price. */
	maxPayout: bigint;
	/** `T` — sum of every live order's payout. */
	totalPayout: bigint;
	/** The payout peak inside the mint's own `(lower, higher]`. */
	rangeMaxPayout: bigint;
}

/** The same reads for a live close, which also needs the peak OUTSIDE the order's range
 * (`strike_exposure::live_close_inventory_impact`). */
export interface CloseBookTerms extends MintBookTerms {
	/** The payout peak in the complement of the order's range. */
	complementMaxPayout: bigint;
}

function assertFeePolicy(policy: FeePolicy): void {
	assertUint(policy.baseFee, 'baseFee', FLOAT_SCALING);
	assertUint(policy.minFee, 'minFee', FLOAT_SCALING);
	assertUint(policy.expiryFeeWindowMs, 'expiryFeeWindowMs', U64_MAX, 1n);
	assertUint(
		policy.expiryFeeMaxMultiplier,
		'expiryFeeMaxMultiplier',
		10n * FLOAT_SCALING,
		FLOAT_SCALING,
	);
	assertUint(policy.minEntryProbability, 'minEntryProbability', FLOAT_SCALING);
	assertUint(policy.maxEntryProbability, 'maxEntryProbability', FLOAT_SCALING);
	if (policy.minEntryProbability >= policy.maxEntryProbability) {
		throw new PredictInputError('minEntryProbability must be below maxEntryProbability');
	}
	assertUint(policy.inventoryImpactMaxRate, 'inventoryImpactMaxRate', FLOAT_SCALING);
	assertUint(policy.backingBufferLambda, 'backingBufferLambda', FLOAT_SCALING);
	assertUint(
		policy.inventoryImpactScale,
		'inventoryImpactScale',
		U64_MAX,
		policy.inventoryImpactMaxRate === 0n ? 0n : 1n,
	);
}

function assertBoundaries(boundaries: Boundaries): void {
	if (boundaries.lowerUp !== null) assertUint(boundaries.lowerUp, 'lowerUp', FLOAT_SCALING);
	if (boundaries.higherUp !== null) assertUint(boundaries.higherUp, 'higherUp', FLOAT_SCALING);
}

function assertBook(book: MintBookTerms): void {
	assertUint(book.totalPayout, 'totalPayout');
	assertUint(book.maxPayout, 'maxPayout', book.totalPayout);
	assertUint(book.rangeMaxPayout, 'rangeMaxPayout', book.maxPayout);
}

function assertCostInputs(
	inputs: Pick<MintInputsBase, 'fees' | 'book' | 'penaltyRate' | 'lotSize'>,
): void {
	assertFeePolicy(inputs.fees);
	assertUint(inputs.penaltyRate ?? 0n, 'penaltyRate', FLOAT_SCALING);
	assertUint(inputs.lotSize ?? POSITION_LOT_SIZE, 'lotSize', U64_MAX / MAX_QUANTITY_LOTS, 1n);
	if (inputs.fees.inventoryImpactMaxRate > 0n && !inputs.book) {
		throw new PredictInputError('book is required when inventory impact is enabled');
	}
	if (inputs.book) assertBook(inputs.book);
}

// === Fee components ===

/** `strike_exposure_config::raw_bernoulli_fee_rate` — `base_fee · sqrt(p·(1−p))`, the fee rate
 * before the `min_fee` floor and the expiry ramp. Zero at the certain ends. */
export function bernoulliFeeRate(baseFee: bigint, probability: bigint): bigint {
	assertUint(baseFee, 'baseFee', FLOAT_SCALING);
	assertUint(probability, 'probability (EInvalidFeeProbability)', FLOAT_SCALING);
	if (probability === 0n || probability === FLOAT_SCALING) return 0n;
	return mulDown(baseFee, sqrtDown(mulDown(probability, FLOAT_SCALING - probability)));
}

/** `strike_exposure_config::expiry_fee_multiplier` — 1.0 outside the window, rising linearly
 * to `expiry_fee_max_multiplier` at expiry. */
export function expiryFeeMultiplier(policy: FeePolicy, timeToExpiryMs: bigint): bigint {
	assertFeePolicy(policy);
	assertUint(timeToExpiryMs, 'timeToExpiryMs');
	if (timeToExpiryMs >= policy.expiryFeeWindowMs) return FLOAT_SCALING;
	return (
		FLOAT_SCALING +
		mulDivDown(
			policy.expiryFeeMaxMultiplier - FLOAT_SCALING,
			policy.expiryFeeWindowMs - timeToExpiryMs,
			policy.expiryFeeWindowMs,
		)
	);
}

// `strike_exposure_config::leg_trading_fee` — one finite boundary's fee, floored then ramped,
// rounded down at each step.
function legTradingFee(
	policy: FeePolicy,
	probability: bigint,
	quantity: bigint,
	timeToExpiryMs: bigint,
): bigint {
	const base = max(bernoulliFeeRate(policy.baseFee, probability), policy.minFee);
	return mulDown(mulDown(base, expiryFeeMultiplier(policy, timeToExpiryMs)), quantity);
}

/**
 * `strike_exposure_config::trading_fee` — the fee for a whole range, charged PER FINITE
 * BOUNDARY with each leg floored and ramped independently. A binary order has one finite
 * boundary and pays one leg; a two-sided range pays two, so it is not the same fee as the
 * range's own probability would suggest.
 */
export function tradingFee(
	policy: FeePolicy,
	boundaries: Boundaries,
	quantity: bigint,
	timeToExpiryMs: bigint,
): bigint {
	assertFeePolicy(policy);
	assertBoundaries(boundaries);
	assertUint(quantity, 'quantity');
	assertUint(timeToExpiryMs, 'timeToExpiryMs');
	const lower =
		boundaries.lowerUp === null
			? 0n
			: legTradingFee(policy, boundaries.lowerUp, quantity, timeToExpiryMs);
	const higher =
		boundaries.higherUp === null
			? 0n
			: legTradingFee(policy, boundaries.higherUp, quantity, timeToExpiryMs);
	return lower + higher;
}

/** `expiry_market::builder_fee_amount` — an account carrying a builder code pays the builder a
 * multiple of its trading fee, capped as a share of quantity. */
export function builderFee(fee: bigint, quantity: bigint, hasBuilderCode: boolean): bigint {
	assertUint(fee, 'fee');
	assertUint(quantity, 'quantity');
	if (!hasBuilderCode) return 0n;
	return min(mulDown(fee, BUILDER_FEE_MULTIPLIER), mulDown(quantity, MAX_BUILDER_FEE_RATE));
}

/** `expiry_market::fee_incentive_subsidy_amount` — a sponsor pays part of the trader's MINT
 * fee, bounded by the expiry's remaining sponsored balance. Mints only; redeems pay in full. */
export function feeIncentiveSubsidy(fee: bigint, feeIncentiveBalance: bigint): bigint {
	assertUint(fee, 'fee');
	assertUint(feeIncentiveBalance, 'feeIncentiveBalance');
	return min(mulDown(fee, FEE_INCENTIVE_SUBSIDY_RATE), feeIncentiveBalance);
}

/**
 * `ewma::penalty_fee`'s firing test, as a per-unit RATE: `penalty_rate` when the transaction's
 * gas price is a high outlier against the market's pre-trade EWMA, else zero. It is a rate and
 * not an amount because the surcharge is `rate · quantity`, and a budget search has to reprice
 * it at every candidate quantity. `gasPrice` is the raw reference gas price (not 1e9-scaled),
 * as `tx_context::gas_price` reports it.
 */
export function congestionPenaltyRate(
	policy: CongestionPolicy,
	state: CongestionState,
	gasPrice: bigint,
): bigint {
	assertUint(policy.penaltyRate, 'penaltyRate', FLOAT_SCALING);
	assertUint(policy.zScoreThreshold, 'zScoreThreshold');
	assertUint(state.mean, 'mean');
	assertUint(state.variance, 'variance');
	assertUint(gasPrice, 'gasPrice', U64_MAX / FLOAT_SCALING);
	if (!policy.enabled || state.variance === 0n) return 0n;
	const scaled = gasPrice * FLOAT_SCALING;
	if (scaled <= state.mean) return 0n;
	const zScore = divDown(scaled - state.mean, sqrtDown(state.variance));
	if (zScore <= policy.zScoreThreshold) return 0n;
	return policy.penaltyRate;
}

// `strike_exposure::live_payout_liability_from_terms` — `M + lambda·(T − M)`.
function payoutLiability(policy: FeePolicy, maxPayout: bigint, totalPayout: bigint): bigint {
	return maxPayout + mulDown(policy.backingBufferLambda, totalPayout - maxPayout);
}

/**
 * `strike_exposure::inventory_impact_potential_for_liability` — the book-level potential
 * `phi(L)`: marginal rate rising linearly to `inventory_impact_max_rate` over the scale `B`,
 * flat at the cap above it. Trades are charged the DIFFERENCE of two evaluations, which is
 * what makes inventory cycles telescope to zero.
 */
export function inventoryImpactPotential(policy: FeePolicy, liability: bigint): bigint {
	assertFeePolicy(policy);
	assertUint(liability, 'liability');
	if (policy.inventoryImpactMaxRate === 0n || liability === 0n) return 0n;
	const scale = policy.inventoryImpactScale;
	const capped = min(liability, scale);
	const utilization = mulDivDown(capped, FLOAT_SCALING, scale);
	const marginalRate = mulDown(policy.inventoryImpactMaxRate, utilization);
	const potentialAtCapped = mulDown(marginalRate, capped) / 2n;
	if (liability <= scale) return potentialAtCapped;
	return potentialAtCapped + mulDown(policy.inventoryImpactMaxRate, liability - scale);
}

/** `strike_exposure::mint_range_inventory_impact` — the charge a mint of `quantity` over a
 * range pays: the exact rise in the book potential. Zero at the shipped rate of `0n`. */
export function mintInventoryImpact(
	policy: FeePolicy,
	book: MintBookTerms,
	quantity: bigint,
): bigint {
	assertFeePolicy(policy);
	assertBook(book);
	assertUint(quantity, 'quantity', U64_MAX - book.totalPayout);
	if (policy.inventoryImpactMaxRate === 0n || quantity === 0n) return 0n;
	const before = payoutLiability(policy, book.maxPayout, book.totalPayout);
	const after = payoutLiability(
		policy,
		max(book.maxPayout, book.rangeMaxPayout + quantity),
		book.totalPayout + quantity,
	);
	return inventoryImpactPotential(policy, after) - inventoryImpactPotential(policy, before);
}

/** `strike_exposure::live_close_inventory_impact` — the rebate a live close of `payout`
 * receives: the exact fall in the same potential. Zero at the shipped rate of `0n`. */
export function closeInventoryImpact(
	policy: FeePolicy,
	book: CloseBookTerms,
	payout: bigint,
): bigint {
	assertFeePolicy(policy);
	assertBook(book);
	assertUint(book.complementMaxPayout, 'complementMaxPayout', book.maxPayout);
	if (max(book.rangeMaxPayout, book.complementMaxPayout) !== book.maxPayout) {
		throw new PredictInputError('maxPayout must equal the larger range or complement payout');
	}
	assertUint(payout, 'close payout', book.rangeMaxPayout);
	if (policy.inventoryImpactMaxRate === 0n || payout === 0n) return 0n;
	const before = payoutLiability(policy, book.maxPayout, book.totalPayout);
	const after = payoutLiability(
		policy,
		max(book.rangeMaxPayout - payout, book.complementMaxPayout),
		book.totalPayout - payout,
	);
	return inventoryImpactPotential(policy, before) - inventoryImpactPotential(policy, after);
}

// === Probabilities ===

/** `pricing::probability` — the range's own probability, `up(lower) − up(higher)` with the
 * chain's saturating subtraction and its infinite-boundary defaults. */
export function rangeProbability(boundaries: Boundaries): bigint {
	assertBoundaries(boundaries);
	const lower = boundaries.lowerUp ?? FLOAT_SCALING;
	const higher = boundaries.higherUp ?? 0n;
	return lower > higher ? lower - higher : 0n;
}

// Float probability -> the chain's raw 1e9 domain, clamped like `compute_nd2`'s own clamp.
function toRawProbability(p: number): bigint {
	if (!Number.isFinite(p)) throw new PredictInputError(`probability is not finite: ${p}`);
	const raw = BigInt(Math.round(p * Number(FLOAT_SCALING)));
	return raw < 0n ? 0n : raw > FLOAT_SCALING ? FLOAT_SCALING : raw;
}

/** Price a range's two boundaries with the local float pricer. `lower`/`upper` are strikes in
 * USD; pass `null` for an infinite side (`{ lower: strike, upper: null }` is an UP order,
 * `{ lower: null, upper: strike }` a DOWN order). Carries the pricer's ~1e-4 approximation. */
export function boundaryProbabilities(
	pricer: PricerInputs,
	lower: number | null,
	upper: number | null,
): Boundaries {
	return {
		lowerUp: lower === null ? null : toRawProbability(upProbability(pricer, lower)),
		higherUp: upper === null ? null : toRawProbability(upProbability(pricer, upper)),
	};
}

function resolveBoundaries(source: ProbabilitySource): { boundaries: Boundaries; exact: boolean } {
	let boundaries: Boundaries;
	let exact: boolean;
	if ('pricer' in source) {
		const { lower, upper } = source;
		if (lower !== null && upper !== null && lower >= upper) {
			throw new PredictInputError(`lower strike ${lower} must be below ${upper} (EInvalidRange)`);
		}
		boundaries = boundaryProbabilities(source.pricer, lower, upper);
		exact = false;
	} else {
		boundaries = source;
		exact = true;
	}
	assertBoundaries(boundaries);
	// `(-inf, +inf]` is the whole outcome space; `order::assert_valid_order_shape` rejects it.
	if (boundaries.lowerUp === null && boundaries.higherUp === null) {
		throw new PredictInputError('a range cannot be infinite on both sides (EInvalidRange)');
	}
	return { boundaries, exact };
}

// `number` is a human amount in USDC decimals, `bigint` is already raw — the SDK-wide
// convention for every financial parameter.
function rawAmount(value: number | bigint): bigint {
	const raw = typeof value === 'bigint' ? value : usdcToRaw(value);
	assertUint(raw, 'amount');
	return raw;
}

function rawMs(value: number | bigint): bigint {
	if (typeof value === 'number' && !Number.isSafeInteger(value)) {
		throw new PredictInputError(`timestamp must be a safe integer in milliseconds, got ${value}`);
	}
	const raw = typeof value === 'bigint' ? value : BigInt(value);
	assertUint(raw, 'timestamp');
	return raw;
}

// === Mint ===

/** Inputs shared by the exact-quantity mint quote and the budget-sized one. */
interface MintInputsBase {
	/** The market's snapshotted fee policy. */
	fees: FeePolicy;
	/** Market expiry, ms since epoch. */
	expiryMs: number | bigint;
	/** The clock the trade will price against, ms since epoch. Defaults to `Date.now()`. */
	nowMs?: number | bigint;
	/** Boundary probabilities, or a pricer snapshot plus the range's strikes. */
	probabilities: ProbabilitySource;
	/** Whether the minting account carries a builder code (it pays the builder fee). */
	builderCode?: boolean;
	/** The expiry's remaining sponsored fee balance (`fee_incentive_balance`). Default `0n`. */
	feeIncentiveBalance?: number | bigint;
	/** Per-unit congestion surcharge rate — see {@link congestionPenaltyRate}. Default `0n`. */
	penaltyRate?: bigint;
	/** Pre-trade payout-tree terms. Required when inventory impact is enabled. */
	book?: MintBookTerms;
	/** The deployment's `position_lot_size`. Defaults to the Move constant, `10_000n`. */
	lotSize?: bigint;
}

/** Inputs for {@link mintCost}: an exact payout quantity. */
export interface MintCostInputs extends MintInputsBase {
	/** Maximum payout bought, in quote units — `number` is human USD, `bigint` is raw. */
	quantity: number | bigint;
}

/** Inputs for {@link mintCostForBudget}: an all-in budget, the `mint_exact_cost` shape. */
export interface MintBudgetInputs extends MintInputsBase {
	/** The total to spend, fees included. */
	budget: number | bigint;
	/** Floor on the fill; a smaller result aborts, as `mint_exact_cost` does. Default one lot. */
	minQuantity?: number | bigint;
	/** The account's settled USDC. The chain caps the budget at it before sizing; pass it to
	 * reproduce that cap (and to let `U64_MAX` mean "my whole balance"). */
	accountBalance?: number | bigint;
}

/** One mint's cost decomposition — the fields of the chain's `MintQuote`, in human units with
 * the exact integers alongside. `cost` is the account debit. */
export interface MintCost {
	/** Maximum payout bought (human quote units). */
	quantity: number;
	/** Fill price, 0..1 per $1 of payout, before fees. */
	entryProbability: number;
	/** Premium into LP backing. */
	premium: number;
	/** `referral` is not here: it is a split of protocol proceeds, not a trader debit. */
	fees: { trading: number; subsidy: number; builder: number; penalty: number; impact: number };
	/** All-in account debit: `premium + (trading − subsidy) + builder + penalty + impact`. */
	cost: number;
	/** All-in price per $1 of payout — `cost / quantity`, the number to compare across venues. */
	costPerContract: number;
	raw: {
		quantity: bigint;
		entryProbability: bigint;
		premium: bigint;
		tradingFee: bigint;
		subsidy: bigint;
		builderFee: bigint;
		penaltyFee: bigint;
		impactCharge: bigint;
		cost: bigint;
	};
	/** True when boundary probabilities were supplied as raw integers rather than priced
	 * locally in float. Does not verify their source, freshness or the other quote inputs. */
	exactProbabilities: boolean;
}

// `strike_exposure_config::assert_mint_probability_policy`, applied where
// `assert_range_mint_probability_policy` applies it: each finite leg and the range itself.
function assertProbabilityPolicy(policy: FeePolicy, probability: bigint): void {
	if (probability < policy.minEntryProbability || probability > policy.maxEntryProbability) {
		throw new PredictInputError(
			`entry probability ${probability} outside the market's [${policy.minEntryProbability}, ` +
				`${policy.maxEntryProbability}] admission band (EEntryProbabilityOutOfBounds)`,
		);
	}
}

function assertRangeMintPolicy(policy: FeePolicy, boundaries: Boundaries): void {
	if (boundaries.lowerUp !== null) assertProbabilityPolicy(policy, boundaries.lowerUp);
	if (boundaries.higherUp !== null) {
		assertProbabilityPolicy(policy, FLOAT_SCALING - boundaries.higherUp);
	}
	assertProbabilityPolicy(policy, rangeProbability(boundaries));
}

function assertValidQuantity(quantity: bigint, lotSize: bigint): void {
	if (quantity <= 0n || quantity % lotSize !== 0n || quantity / lotSize > MAX_QUANTITY_LOTS) {
		throw new PredictInputError(
			`quantity ${quantity} must be a positive multiple of the ${lotSize} lot size, at most ` +
				`${MAX_QUANTITY_LOTS} lots (EInvalidQuantity)`,
		);
	}
}

function timeToExpiry(expiryMs: bigint, nowMs: bigint): bigint {
	if (nowMs >= expiryMs) {
		throw new PredictInputError(
			`market expired at ${expiryMs}; a live trade at ${nowMs} aborts (ELivePricingExpired)`,
		);
	}
	return expiryMs - nowMs;
}

// The all-in sum, `expiry_market::mint_quote_at`, with no admission checks — the one place the
// cost is assembled, shared by the quote and the budget search exactly as the contract shares
// it. Rounding order is the chain's: every component is floored before it is summed.
function mintQuoteAt(
	inputs: MintInputsBase,
	boundaries: Boundaries,
	quantity: bigint,
	timeToExpiryMs: bigint,
): {
	premium: bigint;
	fee: bigint;
	subsidy: bigint;
	builder: bigint;
	penalty: bigint;
	impact: bigint;
	cost: bigint;
} {
	const premium = mulDown(rangeProbability(boundaries), quantity);
	const fee = tradingFee(inputs.fees, boundaries, quantity, timeToExpiryMs);
	const subsidy = feeIncentiveSubsidy(fee, rawAmount(inputs.feeIncentiveBalance ?? 0n));
	const builder = builderFee(fee, quantity, inputs.builderCode ?? false);
	const penalty = mulDown(inputs.penaltyRate ?? 0n, quantity);
	const impact = inputs.book ? mintInventoryImpact(inputs.fees, inputs.book, quantity) : 0n;
	return {
		premium,
		fee,
		subsidy,
		builder,
		penalty,
		impact,
		cost: premium + (fee - subsidy) + builder + penalty + impact,
	};
}

function mintCostFrom(
	inputs: MintInputsBase,
	boundaries: Boundaries,
	exact: boolean,
	quantity: bigint,
	timeToExpiryMs: bigint,
): MintCost {
	const q = mintQuoteAt(inputs, boundaries, quantity, timeToExpiryMs);
	const probability = rangeProbability(boundaries);
	return {
		quantity: fromRaw(quantity, 6),
		entryProbability: fromRaw(probability, 9),
		premium: fromRaw(q.premium, 6),
		fees: {
			trading: fromRaw(q.fee, 6),
			subsidy: fromRaw(q.subsidy, 6),
			builder: fromRaw(q.builder, 6),
			penalty: fromRaw(q.penalty, 6),
			impact: fromRaw(q.impact, 6),
		},
		cost: fromRaw(q.cost, 6),
		costPerContract: quantity === 0n ? 0 : Number(q.cost) / Number(quantity),
		raw: {
			quantity,
			entryProbability: probability,
			premium: q.premium,
			tradingFee: q.fee,
			subsidy: q.subsidy,
			builderFee: q.builder,
			penaltyFee: q.penalty,
			impactCharge: q.impact,
			cost: q.cost,
		},
		exactProbabilities: exact,
	};
}

/**
 * All-in cost of minting an exact payout quantity — the `mint_exact_quantity` shape, priced
 * entirely client-side. Mirrors `compute_mint_quote`, including its admission checks: the
 * entry-probability band on each finite leg and on the range, the `min_premium` floor, the lot
 * grid, and the `all_in_cost <= quantity` bound (a contract may never cost more than it can
 * pay out). Each violation throws the `PredictInputError` naming the abort the chain would
 * have raised.
 */
export function mintCost(inputs: MintCostInputs): MintCost {
	assertCostInputs(inputs);
	const { boundaries, exact } = resolveBoundaries(inputs.probabilities);
	const lotSize = inputs.lotSize ?? POSITION_LOT_SIZE;
	const quantity = rawAmount(inputs.quantity);
	const ttl = timeToExpiry(rawMs(inputs.expiryMs), rawMs(inputs.nowMs ?? Date.now()));

	assertRangeMintPolicy(inputs.fees, boundaries);
	const premium = mulDown(rangeProbability(boundaries), quantity);
	if (premium < MIN_PREMIUM) {
		throw new PredictInputError(
			`premium ${premium} is below the ${MIN_PREMIUM} minimum (EPremiumBelowMinimum)`,
		);
	}
	assertValidQuantity(quantity, lotSize);

	const quote = mintCostFrom(inputs, boundaries, exact, quantity, ttl);
	if (quote.raw.cost > quantity) {
		throw new PredictInputError(
			`all-in cost ${quote.raw.cost} exceeds the maximum payout ${quantity} ` +
				`(EMintCostAboveMaxPayout)`,
		);
	}
	return quote;
}

/**
 * A fill whose ALL-IN cost fits a budget — `expiry_market::mint_exact_cost` computed
 * client-side, with the same lot search over the same cost function, so the answer is the
 * quantity that entrypoint would size and the cost it would debit.
 *
 * Without it a "spend exactly $X" flow has to guess: every fee is charged ON TOP of the
 * premium, so the caller subtracts an estimated fee load, pads it against an abort, and
 * systematically underspends. Here the whole search runs locally, then the fill is sent
 * through `mint_exact_amount` with `premium` as the budget (or through `mint_exact_cost`
 * itself once a deployment carries it).
 *
 * Sizing also respects the fill's maximum payout and the 32-bit lot cap; either can leave
 * substantial budget unspent. When only the budget binds, one more lot would exceed it.
 * If the budget fill exceeds its maximum payout, the contract's step-down is best effort:
 * rounding can make it miss a larger admissible fill, including one meeting `minQuantity`.
 * The chain caps the budget at the account balance first ({@link MintBudgetInputs.accountBalance}).
 */
export function mintCostForBudget(inputs: MintBudgetInputs): MintCost {
	assertCostInputs(inputs);
	const { boundaries, exact } = resolveBoundaries(inputs.probabilities);
	const lotSize = inputs.lotSize ?? POSITION_LOT_SIZE;
	const ttl = timeToExpiry(rawMs(inputs.expiryMs), rawMs(inputs.nowMs ?? Date.now()));
	const minQuantity = inputs.minQuantity === undefined ? lotSize : rawAmount(inputs.minQuantity);
	let budget = rawAmount(inputs.budget);
	if (inputs.accountBalance !== undefined) budget = min(budget, rawAmount(inputs.accountBalance));

	assertRangeMintPolicy(inputs.fees, boundaries);

	// `strike_exposure::max_quantity_for_premium` — the premium-only fit bounds the all-in
	// fit from above, because every other term is non-negative.
	const probability = rangeProbability(boundaries);
	let lo = 0n;
	let hi = MAX_QUANTITY_LOTS;
	while (lo < hi) {
		const mid = (lo + hi + 1n) / 2n;
		if (mulDown(probability, mid * lotSize) <= budget) lo = mid;
		else hi = mid - 1n;
	}

	// `expiry_market::quote_exact_cost_terms`, first half: the budget search proper. Exact,
	// because every all-in term is nondecreasing in quantity for fixed pre-trade state.
	const allInCostAt = (quantity: bigint) => mintQuoteAt(inputs, boundaries, quantity, ttl).cost;
	hi = lo;
	lo = 0n;
	while (lo < hi) {
		const mid = (lo + hi + 1n) / 2n;
		if (allInCostAt(mid * lotSize) <= budget) lo = mid;
		else hi = mid - 1n;
	}
	const budgetLots = lo;
	const budgetQuantity = budgetLots * lotSize;

	// Second half: the maximum-payout bound (`cost <= quantity`) is deliberately NOT part of
	// that search. It is not monotone — cost and quantity both rise, and the independent floors
	// in each cost term let `cost(q) <= q` flip back to true at a larger lot wherever unit cost
	// sits within rounding of one — so binary-searching it would discard admissible fills. It is
	// consulted only when the budget fill breaches it, and the step-down runs strictly below
	// that fill, so every candidate already fits the budget.
	// This fallback mirrors Move's best-effort search; its nonmonotone predicate means it
	// can miss larger admissible fills, including one satisfying minQuantity.
	let lots = budgetLots;
	if (budgetLots > 0n && allInCostAt(budgetQuantity) > budgetQuantity) {
		let stepLo = 0n;
		let stepHi = budgetLots - 1n;
		while (stepLo < stepHi) {
			const mid = (stepLo + stepHi + 1n) / 2n;
			const candidate = mid * lotSize;
			if (allInCostAt(candidate) <= candidate) stepLo = mid;
			else stepHi = mid - 1n;
		}
		// No admissible smaller fill: fall back to the budget fill, which then fails the
		// maximum-payout bound below exactly as the chain's own quote aborts on it.
		lots = stepLo === 0n ? budgetLots : stepLo;
	}

	const quantity = lots * lotSize;
	if (quantity < minQuantity) {
		throw new PredictInputError(
			`budget ${budget} sizes ${quantity}, below the ${minQuantity} minimum ` +
				`(EMintQuantityBelowMin)`,
		);
	}
	const premium = mulDown(probability, quantity);
	if (premium < MIN_PREMIUM) {
		throw new PredictInputError(
			`budget ${budget} sizes a premium of ${premium}, below the ${MIN_PREMIUM} minimum ` +
				`(EPremiumBelowMinimum)`,
		);
	}
	assertValidQuantity(quantity, lotSize);
	const quote = mintCostFrom(inputs, boundaries, exact, quantity, ttl);
	if (quote.raw.cost > quantity) {
		throw new PredictInputError(
			`sized fill inside budget ${budget} costs more than it can pay out: ${quote.raw.cost} ` +
				`exceeds ${quantity} (EMintCostAboveMaxPayout)`,
		);
	}
	return quote;
}

// === Live redeem ===

/** Inputs for {@link redeemLiveProceeds}. The range is the ORDER's own range — the same two
 * boundaries it was minted over, which is what `redeem_live` reprices. */
export interface RedeemLiveInputs {
	fees: FeePolicy;
	expiryMs: number | bigint;
	nowMs?: number | bigint;
	/** The order's boundary probabilities now, or a pricer snapshot plus the order's strikes. */
	probabilities: ProbabilitySource;
	/** Payout being closed — the whole order, or part of it. */
	closeQuantity: number | bigint;
	builderCode?: boolean;
	penaltyRate?: bigint;
	/** Pre-trade payout-tree terms. Required when inventory impact is enabled. */
	book?: CloseBookTerms;
	lotSize?: bigint;
}

/** What a live close credits the account, decomposed. */
export interface RedeemLiveProceeds {
	/** NET credited to the account. */
	proceeds: number;
	/** Close value before fees: the range's current probability times the closed payout. */
	gross: number;
	fees: { trading: number; builder: number; penalty: number; impactRebate: number };
	quantityClosed: number;
	/** Current per-contract value, 0..1 — `gross / quantityClosed`, before fees. */
	probability: number;
	raw: {
		proceeds: bigint;
		gross: bigint;
		tradingFee: bigint;
		builderFee: bigint;
		penaltyFee: bigint;
		impactRebate: bigint;
		quantityClosed: bigint;
	};
	/** Identifies raw probability inputs; does not verify their source or state freshness. */
	exactProbabilities: boolean;
}

/**
 * Net proceeds of closing a live position — `expiry_market::redeem_live`'s payment
 * decomposition, client-side. The mirror of {@link mintCost}: the same per-boundary trading
 * fee and builder fee, the same congestion surcharge, and the inventory-impact term as a
 * REBATE rather than a charge. There is no sponsor subsidy on a close (incentives subsidise
 * mints only), and each deduction is clamped at the payout remaining after the ones before it,
 * exactly as the contract clamps them, so a close can never cost more than it releases.
 *
 * Use this for a local UI preview from a supplied snapshot. `read.quoteRedeem` simulates
 * the actual close and remains the pre-trade check for ownership, remaining position size,
 * live-market gates and current fees. `proceeds` is what `min_proceeds` is compared against
 * on the real call; this preview does not guarantee execution at that amount.
 */
export function redeemLiveProceeds(inputs: RedeemLiveInputs): RedeemLiveProceeds {
	assertCostInputs(inputs);
	const { boundaries, exact } = resolveBoundaries(inputs.probabilities);
	const lotSize = inputs.lotSize ?? POSITION_LOT_SIZE;
	const quantity = rawAmount(inputs.closeQuantity);
	const ttl = timeToExpiry(rawMs(inputs.expiryMs), rawMs(inputs.nowMs ?? Date.now()));
	assertValidQuantity(quantity, lotSize);

	const probability = rangeProbability(boundaries);
	const gross = mulDown(probability, quantity);
	const fee = min(tradingFee(inputs.fees, boundaries, quantity, ttl), gross);
	const builder = min(builderFee(fee, quantity, inputs.builderCode ?? false), gross - fee);
	const penalty = min(mulDown(inputs.penaltyRate ?? 0n, quantity), gross - fee - builder);
	const rebate = inputs.book ? closeInventoryImpact(inputs.fees, inputs.book, quantity) : 0n;
	const proceeds = gross + rebate - fee - builder - penalty;

	return {
		proceeds: fromRaw(proceeds, 6),
		gross: fromRaw(gross, 6),
		fees: {
			trading: fromRaw(fee, 6),
			builder: fromRaw(builder, 6),
			penalty: fromRaw(penalty, 6),
			impactRebate: fromRaw(rebate, 6),
		},
		quantityClosed: fromRaw(quantity, 6),
		probability: fromRaw(probability, 9),
		raw: {
			proceeds,
			gross,
			tradingFee: fee,
			builderFee: builder,
			penaltyFee: penalty,
			impactRebate: rebate,
			quantityClosed: quantity,
		},
		exactProbabilities: exact,
	};
}

// === Order IDs ===

const QUANTITY_LOTS_OFFSET = 100n;
const LOWER_TICK_OFFSET = 70n;
const HIGHER_TICK_OFFSET = 40n;
const TICK_MASK = POS_INF_TICK; // `constants::pos_inf_tick` is the full 30-bit mask
/** `constants::pos_inf_tick` — the +∞ sentinel in an order's higher-tick field. */
export { POS_INF_TICK };
const U32_MASK = (1n << 32n) - 1n;

/** The contract terms packed into an order ID (`deepbook_predict::order`). Tick `0` as the
 * lower bound is −∞ and {@link POS_INF_TICK} as the higher is +∞; multiply a finite tick by
 * the market's `tickSize` for its raw strike. Use it to feed a position from `read.positions`
 * into {@link redeemLiveProceeds}. */
export interface OrderRange {
	lowerTick: bigint;
	higherTick: bigint;
	/** Minted payout: `quantity_lots · position_lot_size`. */
	quantity: bigint;
}

/** Decode an order ID's range and quantity — the TypeScript mirror of `order::lower_tick` /
 * `higher_tick` / `quantity`. */
export function decodeOrderRange(orderId: bigint, lotSize: bigint = POSITION_LOT_SIZE): OrderRange {
	return {
		lowerTick: (orderId >> LOWER_TICK_OFFSET) & TICK_MASK,
		higherTick: (orderId >> HIGHER_TICK_OFFSET) & TICK_MASK,
		quantity: ((orderId >> QUANTITY_LOTS_OFFSET) & U32_MASK) * lotSize,
	};
}

/** The strikes an {@link OrderRange} prices against, in USD, with `null` for each infinite
 * side — the shape {@link boundaryProbabilities} takes. `tickSize` is the market's raw tick
 * size (`ActiveMarket.tickSize` in USD, or the raw value from the deployment). */
export function orderStrikes(
	range: OrderRange,
	tickSizeRaw: bigint,
): { lower: number | null; upper: number | null } {
	return {
		lower: range.lowerTick === 0n ? null : fromRaw(range.lowerTick * tickSizeRaw, 9),
		upper: range.higherTick === POS_INF_TICK ? null : fromRaw(range.higherTick * tickSizeRaw, 9),
	};
}
