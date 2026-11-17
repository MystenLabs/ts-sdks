// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// `pricerAt`: the off-chain port of Predict's `pricing::pricer_at`, which builds a market's pricer
// from signed Pyth and Block Scholes inputs (Predict version 6 keeps no live price on chain).
import { describe, expect, test } from 'vitest';
import { PredictInputError, PredictMoveError } from '../../src/predict/errors.js';
import { pricerAt, type PricingInputs } from '../../src/predict/inputs.js';
import * as pricing from '../../src/predict/pricing.js';

const E9 = 1_000_000_000n;
const NOW = 1_700_000_000_000;
const EXPIRY = BigInt(NOW + 60_000); // a one-minute market
const SVI_MS = NOW - 1_000; // the SVI tuple was fit a second ago

// A 9-decimal SVI tuple: a = 1e-6, b = 2e-4, rho = -0.2, m = 0.001, sigma = 0.01.
const INPUTS: PricingInputs = {
	spot: 100_250n * E9,
	spotMs: NOW,
	bsSpot: 100_000n * E9,
	bsForward: 100_010n * E9,
	valueMs: NOW - 500,
	svi: {
		a: 1_000n,
		b: 200_000n,
		rho: -200_000_000n,
		m: 1_000_000n,
		sigma: 10_000_000n,
		decimals: 9,
	},
	sviMs: SVI_MS,
};

describe('pricerAt', () => {
	test('re-anchors the Block Scholes basis on the Pyth spot, floored, as the chain does', () => {
		const p = pricerAt(INPUTS, { expiryMs: EXPIRY }, NOW);
		expect(p.forwardRaw).toBe((INPUTS.spot * INPUTS.bsForward) / INPUTS.bsSpot);
		expect(p.forward).toBeCloseTo(pricing.forward(100_250, 100_000, 100_010), 6);
		expect(p.pricedAtMs).toBe(BigInt(NOW));
		expect(p.sources).toEqual({
			pythSpotMs: NOW,
			blockScholesSpotMs: NOW - 500,
			blockScholesForwardMs: NOW - 500,
			blockScholesSviMs: SVI_MS,
		});
	});

	test('rolls a and b down by the remaining share of the time the tuple was fit for', () => {
		const p = pricerAt(INPUTS, { expiryMs: EXPIRY }, NOW);
		const rolled = pricing.rollDown(
			{ a: 1e-6, b: 2e-4, rho: -0.2, m: 0.001, sigma: 0.01 },
			Number(EXPIRY) - NOW,
			Number(EXPIRY) - SVI_MS,
		);
		expect(p.svi.a).toBeCloseTo(rolled.a, 15);
		expect(p.svi.b).toBeCloseTo(rolled.b, 15);
		expect(p.svi).toMatchObject({ rho: -0.2, m: 0.001, sigma: 0.01 });
		// Priced later, the surface carries less variance.
		const later = pricerAt(INPUTS, { expiryMs: EXPIRY }, NOW + 30_000);
		expect(later.svi.b).toBeLessThan(p.svi.b);
	});

	test('an 18-decimal tuple prices like its 9-decimal rounding, with a and b at full precision', () => {
		const precise: PricingInputs = {
			...INPUTS,
			svi: {
				a: 1_000n * E9 + 123n,
				b: 200_000n * E9 + 456n,
				rho: -200_000_000n * E9 - 400_000_000n, // rounds half up to -200_000_000
				m: 1_000_000n * E9 + 500_000_000n, // rounds half up to 1_000_001
				sigma: 10_000_000n * E9,
				decimals: 18,
			},
		};
		const p = pricerAt(precise, { expiryMs: EXPIRY }, NOW);
		const nine = pricerAt(INPUTS, { expiryMs: EXPIRY }, NOW);
		expect(p.svi.rho).toBe(-0.2);
		expect(p.svi.m).toBeCloseTo(0.001000001, 12);
		expect(p.svi.b).toBeCloseTo(nine.svi.b, 12);
		expect(pricing.upProbability(p, 100_300)).toBeCloseTo(pricing.upProbability(nine, 100_300), 4);
	});

	test('refuses what the chain refused, with the same names', () => {
		const err = (f: () => unknown) => {
			try {
				f();
			} catch (e) {
				return e;
			}
			return null;
		};
		const expired = err(() => pricerAt(INPUTS, { expiryMs: EXPIRY }, EXPIRY));
		expect(expired).toBeInstanceOf(PredictMoveError);
		expect((expired as PredictMoveError).abortName).toBe('ELivePricingExpired');
		// A forward more than 100x the spot leaves the pricing-safe envelope.
		const wide = err(() =>
			pricerAt({ ...INPUTS, bsForward: 100n * INPUTS.bsSpot + 1n }, { expiryMs: EXPIRY }, NOW),
		);
		expect((wide as PredictMoveError).abortName).toBe('EBlockScholesInputsInvalid');
		// A sigma below the 1e-7 floor too.
		const flat = err(() =>
			pricerAt({ ...INPUTS, svi: { ...INPUTS.svi, sigma: 99n } }, { expiryMs: EXPIRY }, NOW),
		);
		expect((flat as PredictMoveError).abortName).toBe('EBlockScholesInputsInvalid');
		// A negative a that outweighs every strike's variance.
		const negative = err(() =>
			pricerAt({ ...INPUTS, svi: { ...INPUTS.svi, a: -10_000_000n } }, { expiryMs: EXPIRY }, NOW),
		);
		expect((negative as PredictMoveError).abortName).toBe('EBlockScholesMinVarianceInvalid');
		expect(() =>
			pricerAt(
				{ ...INPUTS, svi: { ...INPUTS.svi, decimals: 12 as never } },
				{ expiryMs: EXPIRY },
				NOW,
			),
		).toThrow(PredictInputError);
	});

	test('a board priced from it is monotone in strike', () => {
		const board = pricing.boardPricer(pricerAt(INPUTS, { expiryMs: EXPIRY }, NOW));
		let previous = 1;
		for (let strike = 99_800; strike <= 100_800; strike += 50) {
			const up = board.up(strike);
			expect(up).toBeLessThanOrEqual(previous + 1e-12);
			previous = up;
		}
	});
});
