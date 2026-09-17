// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Offline coverage for the client-side cost port (`src/predict/cost.ts`).
//
// The fee identities pinned here are the ones the contract's own suites pin, at the same
// fixtures, so a drift in either direction shows up as a failure rather than as a quote that
// is merely plausible: a single finite leg at a 0.005 floor costs `quantity / 200`
// (`mint_exact_cost_tests`), the builder cut is a tenth of the fee until its own rate cap
// binds, the sponsor subsidy is a fifth, the two-leg range at the shipped 2.2% floor pays both
// legs, and the inventory-impact curve's below-kink charge on an empty book is the quadratic
// arm's value. The budget search is checked for the property it exists for — maximality: the
// fill fits, and one more lot does not.
import { describe, expect, test } from 'vitest';

import * as cost from '../../src/predict/cost.js';
import { PredictInputError } from '../../src/predict/errors.js';
import type { PricerInputs } from '../../src/predict/pricing.js';

const { FLOAT_SCALING, POSITION_LOT_SIZE, SHIPPED_FEE_POLICY } = cost;

/** 10_000 lots — a tenth of the fixed-point scale, so `premium == probability / 10`. */
const TEN_THOUSAND_LOTS = 100_000_000n;
const NEXT_LOT = TEN_THOUSAND_LOTS + POSITION_LOT_SIZE;
const DAY_MS = 86_400_000n;
const NOW = 1_700_000_000_000n;
/** Far enough out that the one-day ramp is inert (multiplier exactly 1.0). */
const FAR_EXPIRY = NOW + 30n * DAY_MS;

// The contract fixture: `base_fee` floored to 1 raw unit so the Bernoulli term never binds,
// `min_fee` at 0.005, ramp inert. One finite leg then costs exactly `quantity / 200`.
const FLOORED: cost.FeePolicy = {
	...SHIPPED_FEE_POLICY,
	baseFee: 1n,
	minFee: 5_000_000n,
};

/** An at-the-money-ish binary UP order: one finite lower boundary, +inf higher. */
const UP_AT_60: cost.Boundaries = { lowerUp: 600_000_000n, higherUp: null };

function mint(overrides: Partial<cost.MintCostInputs> = {}): cost.MintCost {
	return cost.mintCost({
		fees: FLOORED,
		expiryMs: FAR_EXPIRY,
		nowMs: NOW,
		probabilities: UP_AT_60,
		quantity: TEN_THOUSAND_LOTS,
		...overrides,
	});
}

describe('fixed-point primitives', () => {
	test('sqrtDown floors the 1e9-scaled root', () => {
		for (const x of [0n, 1n, 250_000_000n, 1_000_000_000n, 4_000_000_000n, 999_999_999n]) {
			const root = cost.sqrtDown(x);
			expect(root * root).toBeLessThanOrEqual(x * FLOAT_SCALING);
			expect((root + 1n) * (root + 1n)).toBeGreaterThan(x * FLOAT_SCALING);
		}
		expect(cost.sqrtDown(250_000_000n)).toBe(500_000_000n); // sqrt(0.25) = 0.5
	});

	test('the Bernoulli rate peaks at p = 0.5 and vanishes at the certain ends', () => {
		// base_fee * sqrt(p(1-p)): at p = 0.5 that is base_fee / 2 exactly.
		expect(cost.bernoulliFeeRate(100_000_000n, 500_000_000n)).toBe(50_000_000n);
		expect(cost.bernoulliFeeRate(100_000_000n, 0n)).toBe(0n);
		expect(cost.bernoulliFeeRate(100_000_000n, FLOAT_SCALING)).toBe(0n);
		expect(cost.bernoulliFeeRate(100_000_000n, 900_000_000n)).toBe(30_000_000n); // sqrt(.09)=.3
	});

	test('the expiry ramp is inert outside its window and linear inside it', () => {
		const ramped: cost.FeePolicy = { ...FLOORED, expiryFeeMaxMultiplier: 2n * FLOAT_SCALING };
		expect(cost.expiryFeeMultiplier(ramped, DAY_MS)).toBe(FLOAT_SCALING);
		expect(cost.expiryFeeMultiplier(ramped, 2n * DAY_MS)).toBe(FLOAT_SCALING);
		expect(cost.expiryFeeMultiplier(ramped, DAY_MS / 2n)).toBe(1_500_000_000n);
		expect(cost.expiryFeeMultiplier(ramped, 0n)).toBe(2n * FLOAT_SCALING);
		// A 1.0 max multiplier disables the ramp at every point in the window.
		expect(cost.expiryFeeMultiplier(FLOORED, 0n)).toBe(FLOAT_SCALING);
	});
});

describe('trading fee', () => {
	test('one finite leg at the floor costs quantity / 200', () => {
		const quote = mint();
		expect(quote.raw.tradingFee).toBe(TEN_THOUSAND_LOTS / 200n);
		expect(quote.raw.premium).toBe(quote.raw.entryProbability / 10n);
		expect(quote.raw.cost).toBe(quote.raw.premium + quote.raw.tradingFee);
		expect(quote.cost).toBe(60.5); // $60 premium + $0.50 fee
		expect(quote.costPerContract).toBeCloseTo(0.605, 12);
	});

	test('an infinite boundary pays no leg, a finite one pays even in the tail', () => {
		const down: cost.Boundaries = { lowerUp: null, higherUp: 400_000_000n };
		const oneLeg = cost.tradingFee(FLOORED, down, TEN_THOUSAND_LOTS, 30n * DAY_MS);
		expect(oneLeg).toBe(TEN_THOUSAND_LOTS / 200n);
		// Both boundaries finite: two independently floored legs, so twice the fee.
		const range: cost.Boundaries = { lowerUp: 600_000_000n, higherUp: 400_000_000n };
		expect(cost.tradingFee(FLOORED, range, TEN_THOUSAND_LOTS, 30n * DAY_MS)).toBe(2n * oneLeg);
	});

	test('a two-leg range at the shipped 2.2% floor pays both legs, priced locally', () => {
		// forward 90, flat total variance 0.04 (b = 0): both boundaries of (60, 130] sit far
		// enough out that the Bernoulli term is under the floor, so each leg is min_fee.
		const inputs: PricerInputs = {
			forward: 90,
			svi: { a: 0.04, b: 0, rho: 0, m: 0, sigma: 0.1 },
		};
		const quote = cost.mintCost({
			fees: SHIPPED_FEE_POLICY,
			expiryMs: FAR_EXPIRY,
			nowMs: NOW,
			probabilities: { pricer: inputs, lower: 60, upper: 130 },
			quantity: TEN_THOUSAND_LOTS,
		});
		const floorLeg = (SHIPPED_FEE_POLICY.minFee * TEN_THOUSAND_LOTS) / FLOAT_SCALING;
		expect(quote.raw.tradingFee).toBe(2n * floorLeg);
		// Priced from the float board pricer, so the probability is the approximate input.
		expect(quote.exactProbabilities).toBe(false);
		expect(quote.entryProbability).toBeCloseTo(0.9465, 3);
	});

	test('the ramp multiplies the fee inside the window', () => {
		const ramped: cost.FeePolicy = { ...FLOORED, expiryFeeMaxMultiplier: 2n * FLOAT_SCALING };
		const halfway = mint({ fees: ramped, expiryMs: NOW + DAY_MS / 2n });
		expect(halfway.raw.tradingFee).toBe((3n * TEN_THOUSAND_LOTS) / 400n); // 1.5x
	});
});

describe('builder fee and sponsor subsidy', () => {
	test('the builder takes a tenth of the fee until its own rate cap binds', () => {
		const multiplierArm = mint({ builderCode: true });
		expect(multiplierArm.raw.builderFee).toBe(multiplierArm.raw.tradingFee / 10n);

		// A 6% floor makes a tenth of the fee exceed max_builder_fee_rate (0.005) * quantity.
		const capArm = mint({ fees: { ...FLOORED, minFee: 60_000_000n }, builderCode: true });
		expect(capArm.raw.tradingFee).toBe((6n * TEN_THOUSAND_LOTS) / 100n);
		expect(capArm.raw.builderFee).toBe((TEN_THOUSAND_LOTS * 5n) / 1000n);
		expect(capArm.raw.builderFee).toBeLessThan(capArm.raw.tradingFee / 10n);
	});

	test('the subsidy is a fifth of the fee, bounded by the sponsored balance', () => {
		const funded = mint({ feeIncentiveBalance: 1_000_000_000n });
		expect(funded.raw.subsidy).toBe(funded.raw.tradingFee / 5n);
		// The subsidy reduces the debit, it does not reduce the fee.
		expect(funded.raw.cost).toBe(funded.raw.premium + funded.raw.tradingFee - funded.raw.subsidy);

		const starved = mint({ feeIncentiveBalance: 1n });
		expect(starved.raw.subsidy).toBe(1n);
		expect(mint().raw.subsidy).toBe(0n); // no sponsorship by default
	});
});

describe('congestion surcharge', () => {
	const policy: cost.CongestionPolicy = {
		enabled: true,
		penaltyRate: 1_000_000n, // 0.001
		zScoreThreshold: 3n * FLOAT_SCALING,
	};
	const state: cost.CongestionState = {
		mean: 1_000n * FLOAT_SCALING,
		variance: 10_000n * FLOAT_SCALING,
	};

	test('fires only for a high gas-price outlier', () => {
		expect(cost.congestionPenaltyRate(policy, state, 1_000n)).toBe(0n); // at the mean
		expect(cost.congestionPenaltyRate(policy, state, 1_200n)).toBe(0n); // 2 sigma
		expect(cost.congestionPenaltyRate(policy, state, 2_000n)).toBe(policy.penaltyRate); // 10 sigma
		expect(cost.congestionPenaltyRate({ ...policy, enabled: false }, state, 2_000n)).toBe(0n);
		expect(cost.congestionPenaltyRate(policy, { ...state, variance: 0n }, 2_000n)).toBe(0n);
	});

	test('the surcharge is per unit of quantity', () => {
		const surcharged = mint({ penaltyRate: 1_000_000n });
		expect(surcharged.raw.penaltyFee).toBe(TEN_THOUSAND_LOTS / 1000n);
		expect(surcharged.raw.cost).toBe(mint().raw.cost + surcharged.raw.penaltyFee);
	});
});

describe('inventory impact', () => {
	const impact: cost.FeePolicy = {
		...FLOORED,
		inventoryImpactMaxRate: 200_000_000n, // 20%
		inventoryImpactScale: 10_000_000_000n, // B
		backingBufferLambda: 500_000_000n,
	};
	const emptyBook: cost.MintBookTerms = { maxPayout: 0n, totalPayout: 0n, rangeMaxPayout: 0n };

	test('below the kink the charge is the quadratic arm', () => {
		// r_max * L^2 / (2B) at L = 1e8, B = 1e10, r_max = 0.2.
		expect(cost.mintInventoryImpact(impact, emptyBook, TEN_THOUSAND_LOTS)).toBe(100_000n);
		expect(cost.mintInventoryImpact(SHIPPED_FEE_POLICY, emptyBook, TEN_THOUSAND_LOTS)).toBe(0n);
	});

	test('past the kink the marginal rate is capped', () => {
		// phi(B) = r_max * B / 2 = 1e9, so a mint of q > B costs q / 5 - 1e9.
		const q = 30_000_000_000n;
		expect(cost.mintInventoryImpact(impact, emptyBook, q)).toBe(q / 5n - 1_000_000_000n);
	});

	test('a mint and the close that undoes it telescope to zero', () => {
		const q = 2_000_000_000n;
		const charge = cost.mintInventoryImpact(impact, emptyBook, q);
		expect(charge).toBeGreaterThan(0n);
		// The book after that mint: the position is the whole book.
		const rebate = cost.closeInventoryImpact(
			impact,
			{ maxPayout: q, totalPayout: q, rangeMaxPayout: q, complementMaxPayout: 0n },
			q,
		);
		expect(rebate).toBe(charge);
	});

	test('the charge is part of the all-in cost', () => {
		const quote = mint({ fees: impact, book: emptyBook });
		expect(quote.raw.impactCharge).toBe(100_000n);
		expect(quote.raw.cost).toBe(mint().raw.cost + 100_000n);
	});
});

describe('mint admission', () => {
	test('rejects an entry probability outside the band', () => {
		expect(() => mint({ probabilities: { lowerUp: 5_000_000n, higherUp: null } })).toThrow(
			PredictInputError,
		);
		expect(() => mint({ probabilities: { lowerUp: 995_000_000n, higherUp: null } })).toThrow(
			/EEntryProbabilityOutOfBounds/,
		);
		// Applied to the complement of a finite HIGHER boundary, as the chain applies it.
		expect(() => mint({ probabilities: { lowerUp: null, higherUp: 995_000_000n } })).toThrow(
			/EEntryProbabilityOutOfBounds/,
		);
	});

	test('rejects a premium below the minimum, an off-lot quantity, and an expired market', () => {
		expect(() => mint({ quantity: POSITION_LOT_SIZE })).toThrow(/EPremiumBelowMinimum/);
		expect(() => mint({ quantity: 100_000_001n })).toThrow(/EInvalidQuantity/);
		expect(() => mint({ nowMs: FAR_EXPIRY })).toThrow(/ELivePricingExpired/);
	});

	test('rejects a fill that would cost more than it can ever pay out', () => {
		// A 60% fee floor on top of a 60% premium clears 1.0 per contract.
		expect(() => mint({ fees: { ...FLOORED, minFee: 600_000_000n } })).toThrow(
			/EMintCostAboveMaxPayout/,
		);
	});
});

describe('budget sizing', () => {
	const budgetOf = (overrides: Partial<cost.MintBudgetInputs> = {}) =>
		cost.mintCostForBudget({
			fees: FLOORED,
			expiryMs: FAR_EXPIRY,
			nowMs: NOW,
			probabilities: UP_AT_60,
			budget: 0n,
			...overrides,
		});

	test('sizes the largest fill that fits, and one more lot does not', () => {
		const nextLotCost = mint({ quantity: NEXT_LOT }).raw.cost;
		const sized = budgetOf({ budget: nextLotCost - 1n });
		expect(sized.raw.quantity).toBe(TEN_THOUSAND_LOTS);
		expect(sized.raw.cost).toBe(mint().raw.cost);
		expect(sized.raw.cost).toBeLessThanOrEqual(nextLotCost - 1n);

		// Exactly one fill's cost leaves no dust at all.
		expect(budgetOf({ budget: nextLotCost }).raw.quantity).toBe(NEXT_LOT);
	});

	test('stays maximal with every cost component switched on', () => {
		const opts = {
			builderCode: true,
			feeIncentiveBalance: 250_000n,
			penaltyRate: 1_000_000n,
			fees: {
				...FLOORED,
				inventoryImpactMaxRate: 200_000_000n,
				inventoryImpactScale: 10_000_000_000n,
			},
			book: { maxPayout: 0n, totalPayout: 0n, rangeMaxPayout: 0n },
		} satisfies Partial<cost.MintBudgetInputs>;
		for (const budget of [5_000_000n, 61_000_000n, 250_000_000n, 1_234_567_891n]) {
			const sized = budgetOf({ ...opts, budget });
			expect(sized.raw.cost).toBeLessThanOrEqual(budget);
			const oneMore = mint({
				...opts,
				quantity: sized.raw.quantity + POSITION_LOT_SIZE,
			});
			expect(oneMore.raw.cost).toBeGreaterThan(budget);
			// The unspent remainder is bounded by that next lot's all-in cost.
			expect(budget - sized.raw.cost).toBeLessThan(oneMore.raw.cost);
		}
	});

	test('a premium-sized budget overspends the same figure, which is why this exists', () => {
		const budget = mint().raw.cost;
		// Premium sizing buys what the budget covers in PREMIUM, then charges fees on top.
		const premiumSized = (budget * FLOAT_SCALING) / UP_AT_60.lowerUp!;
		const lots = premiumSized / POSITION_LOT_SIZE;
		const premiumQuote = mint({ quantity: lots * POSITION_LOT_SIZE });
		expect(premiumQuote.raw.cost).toBeGreaterThan(budget);
		// All-in sizing fits it exactly.
		expect(budgetOf({ budget }).raw.cost).toBe(budget);
	});

	test('steps down from a fill that would cost more than it could pay out', () => {
		// p = 0.5 with a 0.5000001 fee floor: every lot costs its own payout plus a thousandth
		// of a raw unit, so the rounding carries a unit only once the fill reaches 1_000 lots.
		// The budget fill breaches `cost <= quantity` there; the largest admissible fill is the
		// lot below, and the bound must be consulted on the budget fill rather than searched.
		const fees = { ...FLOORED, minFee: 500_000_100n };
		const probabilities: cost.Boundaries = { lowerUp: 500_000_000n, higherUp: null };
		// 1_000 lots costs 10_000_001 against a 10_000_000 payout, which `mintCost` rejects
		// outright — the budget search has to find the fill below it instead.
		expect(() => mint({ fees, probabilities, quantity: 10_000_000n })).toThrow(
			/EMintCostAboveMaxPayout/,
		);

		const sized = budgetOf({ fees, probabilities, budget: 10_000_001n });
		expect(sized.raw.quantity).toBe(9_990_000n);
		expect(sized.raw.cost).toBe(9_990_000n);
		expect(sized.raw.cost).toBeLessThanOrEqual(sized.raw.quantity);
	});

	test('aborts when no fill inside the budget can pay for itself', () => {
		// A 60% fee floor on a 50% contract: unit cost is 1.1 at every size.
		expect(() =>
			budgetOf({
				fees: { ...FLOORED, minFee: 600_000_000n },
				probabilities: { lowerUp: 500_000_000n, higherUp: null },
				budget: 100_000_000n,
			}),
		).toThrow(/EMintCostAboveMaxPayout/);
	});

	test('caps the budget at the account balance', () => {
		const balance = mint().raw.cost;
		const sized = budgetOf({ budget: (1n << 64n) - 1n, accountBalance: balance });
		expect(sized.raw.quantity).toBe(TEN_THOUSAND_LOTS);
		expect(sized.raw.cost).toBeLessThanOrEqual(balance);
	});

	test('aborts below the quantity floor and below the minimum premium', () => {
		const budget = mint().raw.cost;
		expect(() => budgetOf({ budget, minQuantity: NEXT_LOT })).toThrow(/EMintQuantityBelowMin/);
		// A dust budget buys nothing: against the default one-lot floor that is a quantity
		// abort, and against an explicit floor of zero it is the premium abort the chain
		// raises (admission runs before the lot-shape check, as `mint_terms` orders them).
		expect(() => budgetOf({ budget: 1_000n })).toThrow(/EMintQuantityBelowMin/);
		expect(() => budgetOf({ budget: 1_000n, minQuantity: 0n })).toThrow(/EPremiumBelowMinimum/);
	});
});

describe('live redeem', () => {
	const redeem = (overrides: Partial<cost.RedeemLiveInputs> = {}) =>
		cost.redeemLiveProceeds({
			fees: FLOORED,
			expiryMs: FAR_EXPIRY,
			nowMs: NOW,
			probabilities: UP_AT_60,
			closeQuantity: TEN_THOUSAND_LOTS,
			...overrides,
		});

	test('nets the trading fee out of the gross payout', () => {
		const quote = redeem();
		expect(quote.raw.gross).toBe((UP_AT_60.lowerUp! * TEN_THOUSAND_LOTS) / FLOAT_SCALING);
		expect(quote.raw.tradingFee).toBe(TEN_THOUSAND_LOTS / 200n);
		expect(quote.raw.proceeds).toBe(quote.raw.gross - quote.raw.tradingFee);
		expect(quote.proceeds).toBe(59.5); // $60 gross - $0.50 fee
		// No sponsor subsidy on a close: incentives subsidise mints only.
		expect(quote.raw.gross).toBe(mint().raw.premium);
	});

	test('charges the builder and the surcharge the same way a mint does', () => {
		const quote = redeem({ builderCode: true, penaltyRate: 1_000_000n });
		expect(quote.raw.builderFee).toBe(quote.raw.tradingFee / 10n);
		expect(quote.raw.penaltyFee).toBe(TEN_THOUSAND_LOTS / 1000n);
		expect(quote.raw.proceeds).toBe(
			quote.raw.gross - quote.raw.tradingFee - quote.raw.builderFee - quote.raw.penaltyFee,
		);
	});

	test('never pays out less than nothing: each deduction is clamped at what is left', () => {
		// A 90% fee floor against a 60% payout: the fee alone exceeds the gross.
		const quote = redeem({
			fees: { ...FLOORED, minFee: 900_000_000n },
			builderCode: true,
			penaltyRate: 1_000_000n,
		});
		expect(quote.raw.tradingFee).toBe(quote.raw.gross);
		expect(quote.raw.builderFee).toBe(0n);
		expect(quote.raw.penaltyFee).toBe(0n);
		expect(quote.raw.proceeds).toBe(0n);
	});

	test('credits the inventory-impact rebate on top of the payout', () => {
		const impact: cost.FeePolicy = {
			...FLOORED,
			inventoryImpactMaxRate: 200_000_000n,
			inventoryImpactScale: 10_000_000_000n,
			backingBufferLambda: 500_000_000n,
		};
		const book: cost.CloseBookTerms = {
			maxPayout: TEN_THOUSAND_LOTS,
			totalPayout: TEN_THOUSAND_LOTS,
			rangeMaxPayout: TEN_THOUSAND_LOTS,
			complementMaxPayout: 0n,
		};
		const quote = redeem({ fees: impact, book });
		expect(quote.raw.impactRebate).toBe(100_000n);
		expect(quote.raw.proceeds).toBe(quote.raw.gross - quote.raw.tradingFee + 100_000n);
	});

	test('a round trip at an unchanged price costs exactly the two trading fees', () => {
		const opened = mint();
		const closed = redeem();
		expect(opened.raw.cost - closed.raw.proceeds).toBe(
			opened.raw.tradingFee + closed.raw.tradingFee,
		);
	});

	test('rejects an off-lot close quantity', () => {
		expect(() => redeem({ closeQuantity: 100_000_001n })).toThrow(/EInvalidQuantity/);
	});
});

describe('order IDs', () => {
	// `order::new`: quantity_lots << 100 | lower_tick << 70 | higher_tick << 40 | sequence.
	const pack = (lowerTick: bigint, higherTick: bigint, lots: bigint, sequence: bigint) =>
		(lots << 100n) | (lowerTick << 70n) | (higherTick << 40n) | sequence;

	test('decodes the range and quantity an order was minted with', () => {
		const id = pack(12_000n, cost.POS_INF_TICK, 10_000n, 7n);
		expect(cost.decodeOrderRange(id)).toEqual({
			lowerTick: 12_000n,
			higherTick: cost.POS_INF_TICK,
			quantity: TEN_THOUSAND_LOTS,
		});
	});

	test('maps sentinel ticks to the infinite sides a quote takes', () => {
		const tickSize = 10_000_000n; // $0.01 at 1e9 price scaling
		const up = cost.orderStrikes(
			cost.decodeOrderRange(pack(12_000n, cost.POS_INF_TICK, 1n, 0n)),
			tickSize,
		);
		expect(up).toEqual({ lower: 120, upper: null });
		const down = cost.orderStrikes(cost.decodeOrderRange(pack(0n, 12_000n, 1n, 0n)), tickSize);
		expect(down).toEqual({ lower: null, upper: 120 });
	});

	test('a decoded position prices its own close', () => {
		const tickSize = 10_000_000n;
		const decoded = cost.decodeOrderRange(pack(12_000n, cost.POS_INF_TICK, 10_000n, 3n));
		const strikes = cost.orderStrikes(decoded, tickSize);
		const quote = cost.redeemLiveProceeds({
			fees: FLOORED,
			expiryMs: FAR_EXPIRY,
			nowMs: NOW,
			probabilities: {
				pricer: { forward: 130, svi: { a: 0.04, b: 0, rho: 0, m: 0, sigma: 0.1 } },
				lower: strikes.lower,
				upper: strikes.upper,
			},
			closeQuantity: decoded.quantity,
		});
		expect(quote.quantityClosed).toBe(100);
		expect(quote.probability).toBeGreaterThan(0.5); // spot above the strike
		expect(quote.raw.proceeds).toBe(quote.raw.gross - quote.raw.tradingFee);
		expect(quote.exactProbabilities).toBe(false);
	});
});

describe('probability plumbing', () => {
	test('range probability saturates rather than inverting', () => {
		expect(cost.rangeProbability({ lowerUp: 600_000_000n, higherUp: 100_000_000n })).toBe(
			500_000_000n,
		);
		expect(cost.rangeProbability({ lowerUp: 100_000_000n, higherUp: 600_000_000n })).toBe(0n);
		// Infinite sides take the digital limits: up(-inf) = 1, up(+inf) = 0.
		expect(cost.rangeProbability({ lowerUp: null, higherUp: 400_000_000n })).toBe(600_000_000n);
		expect(cost.rangeProbability({ lowerUp: 400_000_000n, higherUp: null })).toBe(400_000_000n);
	});

	test('chain-sourced probabilities are flagged exact', () => {
		expect(mint().exactProbabilities).toBe(true);
	});

	test('a range cannot be infinite on both sides, or inverted', () => {
		expect(() => mint({ probabilities: { lowerUp: null, higherUp: null } })).toThrow(
			/EInvalidRange/,
		);
		const inputs: PricerInputs = { forward: 90, svi: { a: 0.04, b: 0, rho: 0, m: 0, sigma: 0.1 } };
		expect(() => mint({ probabilities: { pricer: inputs, lower: 130, upper: 60 } })).toThrow(
			/EInvalidRange/,
		);
	});
});

describe('quote input validation', () => {
	const base = { fees: FLOORED, expiryMs: FAR_EXPIRY, nowMs: NOW, probabilities: UP_AT_60 };
	const impactFees = {
		...FLOORED,
		inventoryImpactMaxRate: 200_000_000n,
		inventoryImpactScale: 10_000_000_000n,
	};
	const emptyBook: cost.MintBookTerms = { maxPayout: 0n, totalPayout: 0n, rangeMaxPayout: 0n };
	const closeBook: cost.CloseBookTerms = {
		maxPayout: TEN_THOUSAND_LOTS,
		totalPayout: TEN_THOUSAND_LOTS,
		rangeMaxPayout: TEN_THOUSAND_LOTS,
		complementMaxPayout: 0n,
	};

	test('requires book data for every quote when impact is enabled', () => {
		expect(() => mint({ fees: impactFees })).toThrow(/book is required/);
		expect(() => cost.mintCostForBudget({ ...base, fees: impactFees, budget: 60.5 })).toThrow(
			/book is required/,
		);
		expect(() =>
			cost.redeemLiveProceeds({ ...base, fees: impactFees, closeQuantity: 100 }),
		).toThrow(/book is required/);
	});

	test('sizes below the formerly underquoted fill when impact is included', () => {
		// At p=.6, q=100 costs $60 premium + $.50 fee + $.10 impact on an empty book.
		expect(mint({ fees: impactFees, book: emptyBook }).raw.cost).toBe(60_600_000n);
		const sized = cost.mintCostForBudget({
			...base,
			fees: impactFees,
			book: emptyBook,
			budget: 60.5,
		});
		// q=99.83: premium=59_898_000, fee=499_150, impact=99_660. One more lot costs
		// 59_904_000 + 499_200 + 99_680 = 60_502_880, above the 60_500_000 budget.
		expect(sized.raw.quantity).toBe(99_830_000n);
		expect(sized.raw.cost).toBe(60_496_810n);
	});

	test('includes the live rebate with book data and allows omitted book when disabled', () => {
		const quote = cost.redeemLiveProceeds({
			...base,
			fees: impactFees,
			book: closeBook,
			closeQuantity: 100,
		});
		expect(quote.raw.proceeds).toBe(59_600_000n); // $60 gross - $.50 fee + $.10 rebate
		expect(cost.redeemLiveProceeds({ ...base, closeQuantity: 100 }).raw.proceeds).toBe(59_500_000n);
		expect(mint().raw.cost).toBe(60_500_000n);
	});

	test.each([-100_000_000n, FLOAT_SCALING + 1n])('rejects out-of-domain boundary %s', (p) => {
		for (const probabilities of [
			{ lowerUp: p, higherUp: null },
			{ lowerUp: null, higherUp: p },
		]) {
			expect(() => mint({ probabilities })).toThrow(PredictInputError);
			expect(() => cost.mintCostForBudget({ ...base, probabilities, budget: 100 })).toThrow(
				PredictInputError,
			);
			expect(() => cost.redeemLiveProceeds({ ...base, probabilities, closeQuantity: 100 })).toThrow(
				PredictInputError,
			);
		}
		expect(() => cost.bernoulliFeeRate(FLOORED.baseFee, p)).toThrow(/EInvalidFeeProbability/);
		expect(() => cost.rangeProbability({ lowerUp: null, higherUp: p })).toThrow(PredictInputError);
	});

	test('still allows live exits at the certain ends outside the mint admission band', () => {
		for (const p of [0n, FLOAT_SCALING]) {
			const quote = cost.redeemLiveProceeds({
				...base,
				probabilities: { lowerUp: p, higherUp: null },
				closeQuantity: 100,
			});
			expect(quote.raw.proceeds).toBe(p === 0n ? 0n : 99_500_000n);
		}
	});

	test.each([-FLOAT_SCALING, FLOAT_SCALING + 1n])(
		'rejects invalid penalty rate %s in every quote',
		(penaltyRate) => {
			expect(() => mint({ penaltyRate })).toThrow(/penaltyRate/);
			expect(() => cost.mintCostForBudget({ ...base, penaltyRate, budget: 100 })).toThrow(
				/penaltyRate/,
			);
			expect(() => cost.redeemLiveProceeds({ ...base, penaltyRate, closeQuantity: 100 })).toThrow(
				/penaltyRate/,
			);
		},
	);

	test.each([-1n, 1n << 64n])('rejects non-u64 amounts %s', (amount) => {
		expect(() => mint({ quantity: amount })).toThrow(PredictInputError);
		expect(() => mint({ feeIncentiveBalance: amount })).toThrow(PredictInputError);
		expect(() => cost.mintCostForBudget({ ...base, budget: amount })).toThrow(PredictInputError);
		expect(() => cost.mintCostForBudget({ ...base, budget: 100, accountBalance: amount })).toThrow(
			PredictInputError,
		);
		expect(() => cost.mintCostForBudget({ ...base, budget: 100, minQuantity: amount })).toThrow(
			PredictInputError,
		);
		expect(() => cost.redeemLiveProceeds({ ...base, closeQuantity: amount })).toThrow(
			PredictInputError,
		);
	});

	test.each([0n, -1n, 1n << 64n])('rejects invalid lot size %s before arithmetic', (lotSize) => {
		expect(() => mint({ lotSize })).toThrow(/lotSize/);
		expect(() => cost.mintCostForBudget({ ...base, lotSize, budget: 100 })).toThrow(/lotSize/);
		expect(() => cost.redeemLiveProceeds({ ...base, lotSize, closeQuantity: 100 })).toThrow(
			/lotSize/,
		);
	});

	test.each([
		{ baseFee: -1n },
		{ minFee: -1n },
		{ minFee: FLOAT_SCALING + 1n },
		{ expiryFeeWindowMs: 0n },
		{ expiryFeeMaxMultiplier: FLOAT_SCALING - 1n },
		{ minEntryProbability: -1n },
		{ maxEntryProbability: FLOAT_SCALING + 1n },
		{ minEntryProbability: FLOORED.maxEntryProbability },
		{ inventoryImpactMaxRate: -1n },
		{ inventoryImpactMaxRate: 1n, inventoryImpactScale: 0n },
		{ backingBufferLambda: FLOAT_SCALING + 1n },
	])('rejects an invalid fee policy %o', (overrides) => {
		expect(() => mint({ fees: { ...FLOORED, ...overrides } })).toThrow(PredictInputError);
	});

	test('rejects inconsistent book state and impossible closes', () => {
		expect(() => mint({ fees: impactFees, book: { ...emptyBook, totalPayout: -1n } })).toThrow(
			PredictInputError,
		);
		expect(() => mint({ fees: impactFees, book: { ...emptyBook, maxPayout: 1n } })).toThrow(
			PredictInputError,
		);
		expect(() => mint({ fees: impactFees, book: { ...emptyBook, rangeMaxPayout: 1n } })).toThrow(
			PredictInputError,
		);
		expect(() =>
			cost.redeemLiveProceeds({ ...base, fees: impactFees, book: closeBook, closeQuantity: 101 }),
		).toThrow(/close payout/);
		expect(() =>
			cost.closeInventoryImpact(impactFees, { ...closeBook, rangeMaxPayout: 0n }, 1n),
		).toThrow(/maxPayout/);
	});

	test.each([NaN, Infinity, 1.5, -1n])('rejects invalid timestamp %s', (nowMs) => {
		expect(() => mint({ nowMs })).toThrow(PredictInputError);
	});

	test('exported fee components reject signed inputs too', () => {
		expect(() => cost.sqrtDown(-1n)).toThrow(PredictInputError);
		expect(() => cost.builderFee(-1n, TEN_THOUSAND_LOTS, true)).toThrow(PredictInputError);
		expect(() => cost.feeIncentiveSubsidy(100n, -1n)).toThrow(PredictInputError);
		expect(() => cost.tradingFee(FLOORED, UP_AT_60, -1n, DAY_MS)).toThrow(PredictInputError);
		expect(() => cost.expiryFeeMultiplier(FLOORED, -1n)).toThrow(PredictInputError);
		expect(() => cost.inventoryImpactPotential(impactFees, -1n)).toThrow(PredictInputError);
		expect(() =>
			cost.congestionPenaltyRate(
				{ enabled: true, penaltyRate: -1n, zScoreThreshold: 0n },
				{ mean: 0n, variance: 1n },
				1n,
			),
		).toThrow(PredictInputError);
	});
});
