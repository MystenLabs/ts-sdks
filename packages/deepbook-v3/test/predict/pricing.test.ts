// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from 'vitest';
import {
	boardPricer,
	downProbability,
	forward,
	probability,
	rangeProbability,
	rollDown,
	strikeAtProbability,
	upProbability,
	type PricerInputs,
	type Svi,
} from '../../src/predict/pricing.js';

// Reference values are computed independently in Python with high-precision `math.erf`
// (see the DBU-610 pricer PR / ledger 0006), from the SAME formula the port implements:
//   up = N(d2) − φ(d2)·w'/(2√w),  d2 = −(k+w/2)/√w,  w = a + b·(ρ·x+√(x²+σ²)),  x = k−m.
// The port's A&S 7.1.26 erf differs from Python's erf by < 1.5e-7, so agreement to ~1e-5
// confirms every term/sign/scale. The skew correction matters: for Set 2, dropping it gives
// N(d2)=0.35591 and flipping its sign gives 0.37090, vs 0.34093 correct — a ~1.5e-2 gap the
// 1e-5 tolerance easily distinguishes.
const F100 = (svi: Svi): PricerInputs => ({ forward: 100, svi });
const ZERO_SKEW: Svi = { a: 0.01, b: 0, rho: 0, m: 0, sigma: 0.1 };
const SKEWED: Svi = { a: 0.02, b: 0.1, rho: -0.3, m: 0, sigma: 0.1 };

describe('upProbability — parity with independent references', () => {
	test('zero-skew ATM digital', () => {
		expect(upProbability(F100(ZERO_SKEW), 100)).toBeCloseTo(0.48006119, 5);
	});
	test('full skew, OTM strike (skew term present + correctly signed)', () => {
		expect(upProbability(F100(SKEWED), 105)).toBeCloseTo(0.34093262, 5);
	});
	test('full skew, ITM strike', () => {
		expect(upProbability(F100(SKEWED), 95)).toBeCloseTo(0.65824285, 5);
	});
});

describe('upProbability — shape invariants', () => {
	const inp = F100(SKEWED);
	test('monotone decreasing in strike', () => {
		expect(upProbability(inp, 90)).toBeGreaterThan(upProbability(inp, 100));
		expect(upProbability(inp, 100)).toBeGreaterThan(upProbability(inp, 110));
	});
	test('tail limits', () => {
		expect(upProbability(inp, 1e-6)).toBeCloseTo(1, 6); // strike → 0⁺ ⇒ P(>strike) → 1
		expect(upProbability(inp, 1e9)).toBeCloseTo(0, 6); // strike → ∞ ⇒ → 0
		expect(upProbability(inp, 0)).toBe(1); // strike ≤ 0 guard (−∞ limit)
		expect(upProbability(inp, -5)).toBe(1);
	});
	test('degenerate forward returns 0', () => {
		expect(upProbability({ forward: 0, svi: SKEWED }, 100)).toBe(0);
	});
	test('probability in [0, 1]', () => {
		for (const strike of [50, 90, 100, 110, 200]) {
			const p = upProbability(inp, strike);
			expect(p).toBeGreaterThanOrEqual(0);
			expect(p).toBeLessThanOrEqual(1);
		}
	});
});

describe('downProbability / probability', () => {
	const inp = F100(SKEWED);
	test('down = 1 − up', () => {
		for (const strike of [90, 100, 110]) {
			expect(downProbability(inp, strike)).toBeCloseTo(1 - upProbability(inp, strike), 12);
		}
	});
	test('probability(side) dispatches', () => {
		expect(probability(inp, 105, 'up')).toBe(upProbability(inp, 105));
		expect(probability(inp, 105, 'down')).toBe(downProbability(inp, 105));
	});
});

describe('rangeProbability', () => {
	const inp = F100(SKEWED);
	test('(lower, higher] = up(lower) − up(higher)', () => {
		expect(rangeProbability(inp, 95, 105)).toBeCloseTo(
			upProbability(inp, 95) - upProbability(inp, 105),
			12,
		);
	});
	test('floors at 0 when inverted', () => {
		expect(rangeProbability(inp, 105, 95)).toBe(0);
	});
	test('full support (−∞, +∞] ≈ 1', () => {
		expect(rangeProbability(inp, 0, Infinity)).toBeCloseTo(1, 6);
	});
});

describe('strikeAtProbability', () => {
	const inp = F100(SKEWED);
	test('inverts upProbability (round trip)', () => {
		for (const strike of [92, 100, 108]) {
			const p = upProbability(inp, strike);
			const k = strikeAtProbability(inp, p);
			expect(k).not.toBeNull();
			expect(k!).toBeCloseTo(strike, 2);
		}
	});
	test('null outside the search band and for degenerate p', () => {
		expect(strikeAtProbability(inp, 0)).toBeNull();
		expect(strikeAtProbability(inp, 1)).toBeNull();
		expect(strikeAtProbability({ forward: 0, svi: SKEWED }, 0.5)).toBeNull();
	});
});

describe('rollDown', () => {
	test('scales a and b by remaining/anchor; leaves rho, m, sigma', () => {
		const rolled = rollDown(SKEWED, 1800, 3600); // half of anchored life remaining
		expect(rolled.a).toBeCloseTo(SKEWED.a * 0.5, 12);
		expect(rolled.b).toBeCloseTo(SKEWED.b * 0.5, 12);
		expect(rolled.rho).toBe(SKEWED.rho);
		expect(rolled.m).toBe(SKEWED.m);
		expect(rolled.sigma).toBe(SKEWED.sigma);
	});
	test('zero/negative anchor collapses a, b to 0', () => {
		expect(rollDown(SKEWED, 1000, 0).a).toBe(0);
	});
});

describe('forward', () => {
	test('re-anchors Pyth spot by the Block-Scholes basis', () => {
		expect(forward(101, 100, 105)).toBeCloseTo(101 * (105 / 100), 12);
	});
	test('falls back to bsForward when Pyth is absent', () => {
		expect(forward(0, 100, 105)).toBe(105);
		expect(forward(-1, 100, 105)).toBe(105);
	});
});

describe('boardPricer', () => {
	const bp = boardPricer(F100(SKEWED));
	test('exposes forward + svi and delegates each method', () => {
		expect(bp.forward).toBe(100);
		expect(bp.svi).toEqual(SKEWED);
		expect(bp.up(105)).toBe(upProbability(F100(SKEWED), 105));
		expect(bp.down(105)).toBe(downProbability(F100(SKEWED), 105));
		expect(bp.probability(105, 'up')).toBe(bp.up(105));
		expect(bp.range(95, 105)).toBe(rangeProbability(F100(SKEWED), 95, 105));
		expect(bp.strikeAtProbability(0.4)).toBeCloseTo(strikeAtProbability(F100(SKEWED), 0.4)!, 10);
	});
});
