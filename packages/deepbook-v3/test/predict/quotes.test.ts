// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// The off-chain quote engine (`src/predict/quotes.ts`), which replaces the views Predict version 6
// retires. Its fee arithmetic is pinned against the integer cost port (`cost.ts`, itself pinned
// against the contract's vectors) wherever the two charge the same thing, and the version 5
// additions (fee bands, a per-contract builder fee, the subsidy cap) are pinned on their own.
import { describe, expect, test } from 'vitest';
import * as cost from '../../src/predict/cost.js';
import { PredictMoveError } from '../../src/predict/errors.js';
import type { PricerInputs } from '../../src/predict/pricing.js';
import { upProbability } from '../../src/predict/pricing.js';
import {
	bookTerms,
	feeBandMultiplier,
	feeBandsFromTriples,
	localMintQuote,
	localNav,
	localSellQuote,
	markedLiability,
	rangeBoundaries,
	type PayoutBook,
	type QuoteMarket,
} from '../../src/predict/quotes.js';
import { POS_INF_TICK } from '../../src/predict/ticks.js';

const E9 = 1_000_000_000n;
const NOW = 1_700_000_000_000n;
const EXPIRY = NOW + 3_600_000n;
const TICK = 10_000_000n; // $0.01
const STRIKE_TICK = 10_000_000n; // $100,000
// A pricer at the money at $100,000.
const PRICER: PricerInputs = {
	forward: 100_000,
	svi: { a: 0.00002, b: 0.0004, rho: -0.1, m: 0, sigma: 0.01 },
};
const FEES: cost.FeePolicy = { ...cost.SHIPPED_FEE_POLICY };
const MARKET: QuoteMarket = {
	expiryMs: EXPIRY,
	tickSizeRaw: TICK,
	admissionTickSizeRaw: TICK,
	referenceTickRaw: null,
	fees: FEES,
	feeBands: [],
	feeIncentiveBalance: 50_000_000n,
};
const SUBSIDY = 200_000_000n;
const UP = { lowerTick: STRIKE_TICK, higherTick: POS_INF_TICK };

function err(f: () => unknown): PredictMoveError | null {
	try {
		f();
	} catch (e) {
		if (e instanceof PredictMoveError) return e;
		throw e;
	}
	return null;
}

const mint = (overrides: Partial<Parameters<typeof localMintQuote>[0]> = {}) =>
	localMintQuote({
		market: MARKET,
		pricer: PRICER,
		...UP,
		request: { shape: 'exact-quantity', quantityRaw: 10_000_000n },
		nowMs: NOW,
		feeIncentiveSubsidyRate: SUBSIDY,
		...overrides,
	});

describe('localMintQuote', () => {
	test('an exact quantity costs what the cost port charges, with no penalty', () => {
		const q = mint();
		const ref = cost.mintCost({
			fees: FEES,
			expiryMs: EXPIRY,
			nowMs: NOW,
			probabilities: { pricer: PRICER, lower: 100_000, upper: null },
			quantity: 10_000_000n,
			feeIncentiveBalance: 50_000_000n,
			feeIncentiveSubsidyRate: SUBSIDY,
		});
		expect(q).toMatchObject({
			quantity: 10_000_000n,
			entryProbability: ref.raw.entryProbability,
			premium: ref.raw.premium,
			tradingFee: ref.raw.tradingFee,
			feeIncentiveSubsidy: ref.raw.subsidy,
			builderFee: 0n,
			penaltyFee: 0n,
			inventoryImpactCharge: 0n,
			allInCost: ref.raw.cost,
		});
		expect(q.entryProbability).toBe(BigInt(Math.round(upProbability(PRICER, 100_000) * 1e9)));
	});

	test('an all-in budget sizes the largest lot fill that fits, as the cost port does', () => {
		const q = mint({
			request: { shape: 'exact-cost', maxCostRaw: 25_000_000n, minQuantityRaw: 0n },
		});
		const ref = cost.mintCostForBudget({
			fees: FEES,
			expiryMs: EXPIRY,
			nowMs: NOW,
			probabilities: { pricer: PRICER, lower: 100_000, upper: null },
			budget: 25_000_000n,
			minQuantity: 0n,
			feeIncentiveBalance: 50_000_000n,
			feeIncentiveSubsidyRate: SUBSIDY,
		});
		expect(q.quantity).toBe(ref.raw.quantity);
		expect(q.allInCost).toBe(ref.raw.cost);
		expect(q.allInCost).toBeLessThanOrEqual(25_000_000n);
		expect(
			mint({ request: { shape: 'exact-quantity', quantityRaw: q.quantity + 10_000n } }).allInCost,
		).toBeGreaterThan(25_000_000n);
	});

	test('a premium budget buys the largest lot multiple whose premium fits', () => {
		const q = mint({
			request: { shape: 'exact-amount', maxPremiumRaw: 5_000_000n, minQuantityRaw: 0n },
		});
		expect(q.premium).toBeLessThanOrEqual(5_000_000n);
		expect(((q.quantity + 10_000n) * q.entryProbability) / E9).toBeGreaterThan(5_000_000n);
	});

	test("an account's balance caps a budget, as quote_mint_for_account did", () => {
		const capped = mint({
			request: { shape: 'exact-cost', maxCostRaw: 25_000_000n, minQuantityRaw: 0n },
			availableRaw: 3_000_000n,
		});
		expect(capped.allInCost).toBeLessThanOrEqual(3_000_000n);
		// An exact quantity is not capped.
		expect(mint({ availableRaw: 1n }).quantity).toBe(10_000_000n);
	});

	test("the market's fee band multiplies the trading fee, and the subsidy follows it", () => {
		const base = mint();
		const p = base.entryProbability;
		const banded = mint({
			market: { ...MARKET, feeBands: [{ low: p - 1n, high: p + 1n, multiplier: 2n * E9 }] },
		});
		expect(banded.tradingFee).toBe((base.tradingFee * 2n * E9) / E9);
		expect(banded.feeIncentiveSubsidy).toBe((banded.tradingFee * SUBSIDY) / E9);
		expect(banded.allInCost - base.allInCost).toBe(
			banded.tradingFee - banded.feeIncentiveSubsidy - (base.tradingFee - base.feeIncentiveSubsidy),
		);
		// A band that doesn't hold the price charges 1x.
		const elsewhere = mint({
			market: { ...MARKET, feeBands: [{ low: p + 1n, high: E9, multiplier: 3n * E9 }] },
		});
		expect(elsewhere.tradingFee).toBe(base.tradingFee);
	});

	test("the subsidy is capped by the market's sponsored balance", () => {
		const q = mint({ market: { ...MARKET, feeIncentiveBalance: 1_000n } });
		expect(q.feeIncentiveSubsidy).toBe(1_000n);
	});

	test('a builder fee per contract is charged on the quantity', () => {
		const q = mint({ builderFeePerContract: 2_000_000n });
		expect(q.builderFee).toBe((10_000_000n * 2_000_000n) / E9);
		expect(q.allInCost - mint().allInCost).toBe(q.builderFee);
	});

	test('refuses what the chain quote refused, with its abort names', () => {
		// Far out of the money: below the 1% entry band.
		expect(err(() => mint({ lowerTick: 13_000_000n }))?.abortName).toBe('EOrderFailsLimits');
		// A premium below the 1 USDC minimum.
		expect(
			err(() => mint({ request: { shape: 'exact-quantity', quantityRaw: 1_000_000n } }))?.abortName,
		).toBe('EOrderFailsLimits');
		// Off the lot grid.
		expect(
			err(() => mint({ request: { shape: 'exact-quantity', quantityRaw: 10_000_001n } }))
				?.abortName,
		).toBe('EOrderFailsLimits');
		// Off the admission grid, unless it is the reference tick.
		const coarse = { ...MARKET, admissionTickSizeRaw: 100n * TICK };
		expect(err(() => mint({ market: coarse, lowerTick: STRIKE_TICK + 1n }))?.abortName).toBe(
			'EOrderFailsLimits',
		);
		expect(
			mint({
				market: { ...coarse, referenceTickRaw: STRIKE_TICK + 1n },
				lowerTick: STRIKE_TICK + 1n,
			}).quantity,
		).toBe(10_000_000n);
		// A budget that buys less than its floor.
		expect(
			err(() =>
				mint({
					request: {
						shape: 'exact-amount',
						maxPremiumRaw: 5_000_000n,
						minQuantityRaw: 50_000_000n,
					},
				}),
			)?.abortName,
		).toBe('EOrderFailsLimits');
		expect(err(() => mint({ nowMs: EXPIRY }))?.abortName).toBe('ELivePricingExpired');
	});

	test('a market charging inventory impact needs its payout tree', () => {
		const fees = {
			...FEES,
			inventoryImpactMaxRate: 10_000_000n,
			inventoryImpactScale: 1_000_000_000n,
		};
		expect(() => mint({ market: { ...MARKET, fees } })).toThrow(/payout tree/);
		const book: PayoutBook = {
			base: 0n,
			boundaries: [{ tick: STRIKE_TICK, localStart: 5_000_000n, localEnd: 0n }],
		};
		const q = mint({ market: { ...MARKET, fees, book } });
		expect(q.inventoryImpactCharge).toBe(
			cost.mintInventoryImpact(fees, bookTerms(book, UP.lowerTick, UP.higherTick), 10_000_000n),
		);
		expect(q.inventoryImpactCharge).toBeGreaterThan(0n);
	});
});

describe('localSellQuote', () => {
	const order = { ...UP, quantity: 5_000_000n };
	const sell = (overrides: Partial<Parameters<typeof localSellQuote>[0]> = {}) =>
		localSellQuote({
			market: MARKET,
			pricer: PRICER,
			order,
			closeQuantityRaw: 2_000_000n,
			nowMs: NOW,
			...overrides,
		});

	test('nets the close value of the fee, as the cost port does with no builder', () => {
		const q = sell();
		const ref = cost.redeemLiveProceeds({
			fees: FEES,
			expiryMs: EXPIRY,
			nowMs: NOW,
			probabilities: { pricer: PRICER, lower: 100_000, upper: null },
			closeQuantity: 2_000_000n,
		});
		expect(q).toMatchObject({
			closeQuantity: 2_000_000n,
			probability: ref.raw.probability,
			proceeds: ref.raw.proceeds,
			tradingFee: ref.raw.tradingFee,
			builderFee: 0n,
			inventoryImpactRebate: 0n,
		});
	});

	test('the fee band and a builder fee each come off, capped at what remains', () => {
		const p = sell().probability;
		const banded = sell({
			market: { ...MARKET, feeBands: [{ low: 0n, high: E9, multiplier: 2n * E9 }] },
			builderFeePerContract: 1_000_000n,
		});
		expect(banded.tradingFee).toBe(sell().tradingFee * 2n);
		expect(banded.builderFee).toBe(2_000n);
		const redeem = (p * 2_000_000n) / E9;
		expect(banded.proceeds).toBe(redeem - banded.tradingFee - banded.builderFee);
		const greedy = sell({ builderFeePerContract: E9 });
		expect(greedy.proceeds).toBe(0n);
	});

	test('refuses a quantity off the lot grid or above the record, and a market past expiry', () => {
		expect(err(() => sell({ closeQuantityRaw: 6_000_000n }))?.abortName).toBe('EOrderFailsLimits');
		expect(err(() => sell({ closeQuantityRaw: 1n }))?.abortName).toBe('EOrderFailsLimits');
		expect(err(() => sell({ nowMs: EXPIRY }))?.abortName).toBe('ELivePricingExpired');
	});
});

describe('fee bands', () => {
	test('a band holds [low, high), and no band charges 1x', () => {
		const bands = feeBandsFromTriples([0n, 150_000_000n, 2n * E9, 850_000_000n, E9, 3n * E9]);
		expect(feeBandMultiplier(bands, 0n)).toBe(2n * E9);
		expect(feeBandMultiplier(bands, 149_999_999n)).toBe(2n * E9);
		expect(feeBandMultiplier(bands, 150_000_000n)).toBe(E9);
		expect(feeBandMultiplier(bands, 850_000_000n)).toBe(3n * E9);
		expect(feeBandMultiplier([], 500_000_000n)).toBe(E9);
		expect(() => feeBandsFromTriples([1n, 2n])).toThrow(/triples/);
	});
});

describe('the payout tree', () => {
	// An UP order of 3 at $100,000, a range of 2 over ($99,000, $101,000], and a DOWN order of 4
	// below $99,000 (open lower, so in `base`).
	const LOW = 9_900_000n;
	const HIGH = 10_100_000n;
	const book: PayoutBook = {
		base: 4_000_000n,
		boundaries: [
			{ tick: LOW, localStart: 2_000_000n, localEnd: 4_000_000n },
			{ tick: STRIKE_TICK, localStart: 3_000_000n, localEnd: 0n },
			{ tick: HIGH, localStart: 0n, localEnd: 2_000_000n },
		],
	};

	test("the marked liability is each order's range value, within boundary rounding", () => {
		const up = (tick: bigint) =>
			BigInt(Math.round(upProbability(PRICER, Number(tick * TICK) / 1e9) * 1e9));
		const perOrder =
			(3_000_000n * up(STRIKE_TICK)) / E9 +
			(2_000_000n * (up(LOW) - up(HIGH))) / E9 +
			(4_000_000n * (E9 - up(LOW))) / E9;
		const walked = markedLiability(book, PRICER, TICK);
		expect(walked - perOrder).toBeGreaterThanOrEqual(-3n);
		expect(walked - perOrder).toBeLessThanOrEqual(3n);
	});

	test('NAV is free cash less the marked liability, floored at 0', () => {
		const liability = markedLiability(book, PRICER, TICK);
		expect(
			localNav({
				cashBalance: 20_000_000n,
				inventoryImpactReserve: 1_000_000n,
				book,
				pricer: PRICER,
				tickSizeRaw: TICK,
			}),
		).toBe(19_000_000n - liability);
		expect(
			localNav({
				cashBalance: 1n,
				inventoryImpactReserve: 0n,
				book,
				pricer: PRICER,
				tickSizeRaw: TICK,
			}),
		).toBe(0n);
	});

	test('the book terms are the payout prefix maxima and totals', () => {
		// Payouts by settlement interval: ≤ LOW pays 4, (LOW, 100k] pays 2, (100k, HIGH] pays 5,
		// above HIGH pays 3.
		const terms = bookTerms(book, STRIKE_TICK, POS_INF_TICK);
		expect(terms).toEqual({
			maxPayout: 5_000_000n,
			totalPayout: 9_000_000n,
			rangeMaxPayout: 5_000_000n,
			complementMaxPayout: 4_000_000n,
		});
		expect(bookTerms(book, 0n, LOW).rangeMaxPayout).toBe(4_000_000n);
		expect(bookTerms(book, LOW, STRIKE_TICK).rangeMaxPayout).toBe(2_000_000n);
	});

	test('the boundaries of a range price as the chain range does', () => {
		const b = rangeBoundaries(PRICER, LOW, HIGH, TICK);
		expect(b.lowerUp).toBe(BigInt(Math.round(upProbability(PRICER, 99_000) * 1e9)));
		expect(b.higherUp).toBe(BigInt(Math.round(upProbability(PRICER, 101_000) * 1e9)));
		expect(rangeBoundaries(PRICER, 0n, HIGH, TICK).lowerUp).toBeNull();
		expect(rangeBoundaries(PRICER, LOW, POS_INF_TICK, TICK).higherUp).toBeNull();
	});
});
