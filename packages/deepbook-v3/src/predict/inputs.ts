// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// The signed-data inputs a market prices from, and the pricer they build.
//
// From Predict version 6 the chain keeps no live oracle state: every on-chain price is read from
// signed Pyth Lazer and Block Scholes data carried into the transaction that uses it, and the
// view functions that priced a market at the clock (`load_live_pricer`, `quote_*`, `current_nav`,
// `live_order_value`) are retired. So the SDK's quotes, prices and NAV are computed here, off
// chain, from inputs the caller supplies through a `PricingInputsProvider`: the frontend or a
// quote service that holds its own Pyth and Block Scholes access. The SDK never fetches them.
//
// `pricerAt` is the port of Predict's `pricing::pricer_at`, the function a queued fill prices
// with: the Block Scholes basis re-anchored on the Pyth spot, and the SVI tuple rolled down to the
// pricing time. Its integer steps (the forward, the roll, the pricing-safe envelope and the
// minimum-variance check) are the chain's, and the digital itself is the float port in
// `pricing.ts`, which agrees with the chain to about 1e-4 in probability.

import { sqrtDown } from './cost.js';
import { PredictInputError, PredictMoveError } from './errors.js';
import type { PricerInputs } from './pricing.js';

/**
 * A Block Scholes SVI tuple as Block Scholes signs it: every parameter at `decimals` (`9` or
 * `18`), with `a`, `rho` and `m` signed. The market's oracle binding names the decimals its series
 * is signed at (`read.oracleBinding(...).sviDecimals`).
 */
export interface SignedSvi {
	a: bigint;
	b: bigint;
	rho: bigint;
	m: bigint;
	sigma: bigint;
	decimals: 9 | 18;
}

/**
 * The signed data one market prices from, as the caller's own Pyth Lazer and Block Scholes feeds
 * deliver it. Every price is 1e9-scaled USD. Source times are the providers' own timestamps, in
 * ms since the epoch.
 */
export interface PricingInputs {
	/** The Pyth Lazer spot of the market's binding feed, normalized to 1e9. */
	spot: bigint;
	/** The Lazer update's timestamp, in ms. Reported back on the pricer, not priced with. */
	spotMs: number | bigint;
	/** The Block Scholes spot stamped with `forward`, at 1e9. */
	bsSpot: bigint;
	/** The Block Scholes forward for the market's expiry, at 1e9. */
	bsForward: bigint;
	/** Source time of `bsSpot` and `bsForward`, in ms. */
	valueMs: number | bigint;
	/** The Block Scholes SVI tuple for the market's expiry, under the binding's model. */
	svi: SignedSvi;
	/** Source time of the SVI tuple, in ms. The roll-down anchors on it. */
	sviMs: number | bigint;
}

/** What a provider is asked for: one market, priced now. */
export interface PricingInputsRequest {
	marketId: string;
	/** The config's underlying symbol, e.g. `"BTC"`. */
	underlying: string;
	propbookUnderlyingId: number;
	expiryMs: bigint;
}

/**
 * Supplies the latest signed-data inputs for a market. The caller owns it (the frontend, a quote
 * service, a bot with its own Pyth and Block Scholes access): the SDK never fetches Pyth or Block
 * Scholes data itself. Return the inputs under the market's oracle binding (its Lazer feed, Block
 * Scholes base asset, SVI model and decimals).
 */
export interface PricingInputsProvider {
	pricingInputs(request: PricingInputsRequest): Promise<PricingInputs>;
}

/**
 * How old each input may be when a market is priced, in ms, and how far ahead of the pricing time
 * a source time may sit (clock skew between the provider and this process). The defaults are the
 * freshness windows Predict's version 5 live pricer enforced (`PricingConfig`): 2 s for the Pyth
 * spot and the Block Scholes spot and forward, and 60 s for the SVI tuple.
 */
export interface PricingFreshness {
	spotMaxAgeMs?: number;
	valueMaxAgeMs?: number;
	sviMaxAgeMs?: number;
	maxClockSkewMs?: number;
}

/** The freshness {@link pricerAt} enforces unless told otherwise. */
export const DEFAULT_PRICING_FRESHNESS: Readonly<Required<PricingFreshness>> = Object.freeze({
	spotMaxAgeMs: 2_000,
	valueMaxAgeMs: 2_000,
	sviMaxAgeMs: 60_000,
	maxClockSkewMs: 1_000,
});

/** A pricer built from signed inputs: the decimal forward and rolled SVI, plus their sources. */
export interface ResolvedPricer extends PricerInputs {
	/** The time the SVI was rolled down to and the fees are charged at, in ms. */
	pricedAtMs: bigint;
	/** The forward the digital prices against, at 1e9: `spot · bsForward / bsSpot`, floored. */
	forwardRaw: bigint;
	sources: {
		pythSpotMs: number;
		blockScholesSpotMs: number;
		blockScholesForwardMs: number;
		blockScholesSviMs: number;
	};
}

const SCALE = 1_000_000_000n;
const U64_MAX = (1n << 64n) - 1n;
// `pmath` envelope: `max_basis_factor`, `max_spot`, `min_svi_sigma`, `max_svi_input`.
const MAX_BASIS_FACTOR = 100n;
const MAX_SPOT = U64_MAX / MAX_BASIS_FACTOR;
const MIN_SVI_SIGMA = 100n;
const MAX_SVI_INPUT = 100n * SCALE;

const abs = (x: bigint) => (x < 0n ? -x : x);
const toBig = (v: number | bigint, name: string): bigint => {
	if (typeof v === 'number' && !Number.isSafeInteger(v)) {
		throw new PredictInputError(`${name} must be a safe integer, got ${v}`);
	}
	return BigInt(v);
};

// `block_scholes::narrow`: a value at 1e9, as signed at 9 decimals, or rounded half up from 18.
function narrow(value: bigint, decimals: 9 | 18): bigint {
	if (decimals === 9) return value;
	const q = value / SCALE;
	return value % SCALE > (SCALE - 1n) / 2n ? q + 1n : q;
}

// `pmath::smile_inner`: `sigma · sqrt(1 − rho²)` at 1e9, 0 at |rho| = 1.
function smileInner(rhoMagnitude: bigint, sigma: bigint): bigint {
	if (rhoMagnitude === SCALE) return 0n;
	return (sigma * sqrtDown(SCALE - (rhoMagnitude * rhoMagnitude) / SCALE)) / SCALE;
}

/** The pricing-safe envelope a market's inputs must fit (`pmath::inputs_ok`). */
function inputsOk(
	spot: bigint,
	forward: bigint,
	b: bigint,
	rho: bigint,
	m: bigint,
	sigma: bigint,
): boolean {
	return (
		spot > 0n &&
		forward > 0n &&
		forward <= MAX_SPOT &&
		(forward + MAX_BASIS_FACTOR - 1n) / MAX_BASIS_FACTOR <= spot &&
		b <= MAX_SVI_INPUT &&
		abs(rho) <= SCALE &&
		abs(m) <= MAX_SVI_INPUT &&
		sigma >= MIN_SVI_SIGMA &&
		sigma <= MAX_SVI_INPUT
	);
}

// The chain aborts these reads with the same names, so callers that matched on them keep working.
const invalidInputs = () => new PredictMoveError('pricing', 5n, 'EBlockScholesInputsInvalid');
const nonPositiveVariance = () =>
	new PredictMoveError('pricing', 14n, 'EBlockScholesMinVarianceInvalid');
const expired = () => new PredictMoveError('pricing', 9n, 'ELivePricingExpired');
const spotStale = () => new PredictMoveError('pricing', 18n, 'EPythSpotStale');
const valueStale = () => new PredictMoveError('pricing', 4n, 'EBlockScholesPriceStale');
const sviStale = () => new PredictMoveError('pricing', 10n, 'EBlockScholesSVIStale');

// `pricing::is_fresh`, with room for clock skew: a source time at most `maxAge` before `now`, and
// at most `skew` after it.
function fresh(sourceMs: bigint, nowMs: bigint, maxAgeMs: number, skewMs: number): boolean {
	return (
		sourceMs > 0n && sourceMs <= nowMs + BigInt(skewMs) && nowMs - sourceMs <= BigInt(maxAgeMs)
	);
}

/**
 * Build the pricer a market prices from at `atMs` (default now): Predict's `pricing::pricer_at`
 * on signed inputs. The forward is the Block Scholes basis re-anchored on the Pyth spot,
 * `spot · bsForward / bsSpot` floored, and the SVI `a` and `b` are rolled down by
 * `(expiry − atMs) / (expiry − sviMs)` at 1e18, as the chain rolls them.
 *
 * Each source time must be fresh at `atMs` ({@link PricingFreshness}, the version 5 live
 * pricer's windows by default), and none may sit ahead of it by more than the clock skew. Pass
 * `freshness: false` to price stale or historical inputs on purpose (a backtest).
 *
 * Throws the `PredictMoveError` the chain's own pricer load raised in the same case, so callers
 * that matched on it keep working: `ELivePricingExpired` at or past expiry, `EPythSpotStale`,
 * `EBlockScholesPriceStale` or `EBlockScholesSVIStale` for an input outside its window,
 * `EBlockScholesInputsInvalid` outside the pricing-safe envelope, and
 * `EBlockScholesMinVarianceInvalid` when the rolled surface's minimum variance isn't positive.
 * Throws `PredictInputError` on malformed inputs.
 */
export function pricerAt(
	inputs: PricingInputs,
	market: { expiryMs: bigint },
	atMs: number | bigint = Date.now(),
	freshness: PricingFreshness | false = DEFAULT_PRICING_FRESHNESS,
): ResolvedPricer {
	const nowMs = toBig(atMs, 'atMs');
	const expiry = market.expiryMs;
	if (nowMs >= expiry) throw expired();
	const { svi } = inputs;
	if (svi.decimals !== 9 && svi.decimals !== 18) {
		throw new PredictInputError(`svi.decimals must be 9 or 18, got ${String(svi.decimals)}`);
	}
	for (const [name, v] of Object.entries({
		spot: inputs.spot,
		bsSpot: inputs.bsSpot,
		bsForward: inputs.bsForward,
		'svi.b': svi.b,
		'svi.sigma': svi.sigma,
	})) {
		if (typeof v !== 'bigint' || v < 0n) {
			throw new PredictInputError(`${name} must be a non-negative bigint`);
		}
	}
	const sviMs = toBig(inputs.sviMs, 'sviMs');
	const valueMs = toBig(inputs.valueMs, 'valueMs');
	const spotMs = toBig(inputs.spotMs, 'spotMs');
	if (freshness !== false) {
		const f = { ...DEFAULT_PRICING_FRESHNESS, ...freshness };
		if (!fresh(spotMs, nowMs, f.spotMaxAgeMs, f.maxClockSkewMs)) throw spotStale();
		if (!fresh(valueMs, nowMs, f.valueMaxAgeMs, f.maxClockSkewMs)) throw valueStale();
		if (!fresh(sviMs, nowMs, f.sviMaxAgeMs, f.maxClockSkewMs)) throw sviStale();
	}
	if (sviMs >= expiry) throw invalidInputs();

	// `block_scholes::new_vol`: `a` and `b` at 1e18, `rho`, `m` and `sigma` at 1e9.
	const up = svi.decimals === 9 ? SCALE : 1n;
	const aMagnitude = abs(svi.a) * up;
	const aNegative = svi.a < 0n;
	const b18 = svi.b * up;
	const rho = (svi.rho < 0n ? -1n : 1n) * narrow(abs(svi.rho), svi.decimals);
	const m = (svi.m < 0n ? -1n : 1n) * narrow(abs(svi.m), svi.decimals);
	const sigma = narrow(svi.sigma, svi.decimals);
	// The snapshot narrows `b` to 1e9 for the envelope check (`snap_v2`).
	const b9 = narrow(svi.b, svi.decimals);
	if (!inputsOk(inputs.bsSpot, inputs.bsForward, b9, rho, m, sigma)) throw invalidInputs();
	if (inputs.spot === 0n || inputs.spot > MAX_SPOT) throw invalidInputs();

	const forwardRaw = (inputs.spot * inputs.bsForward) / inputs.bsSpot;
	if (forwardRaw === 0n || forwardRaw > U64_MAX) throw invalidInputs();

	// `roll_svi`: scale `a` and `b` by the remaining fraction of the time the tuple was fit for.
	const remaining = expiry - nowMs;
	const anchor = expiry - sviMs;
	const aRolled = (aMagnitude * remaining) / anchor;
	const bRolled = (b18 * remaining) / anchor;
	// `pmath::var_positive` on the rolled tuple, at 1e18.
	const increment = (bRolled * smileInner(abs(rho), sigma)) / SCALE;
	const varOk = aNegative ? increment > aRolled : increment + aRolled > 0n;
	if (!varOk) throw nonPositiveVariance();

	const E18 = 1e18;
	return {
		forward: Number(forwardRaw) / 1e9,
		forwardRaw,
		svi: {
			a: ((aNegative ? -1 : 1) * Number(aRolled)) / E18,
			b: Number(bRolled) / E18,
			rho: Number(rho) / 1e9,
			m: Number(m) / 1e9,
			sigma: Number(sigma) / 1e9,
		},
		pricedAtMs: nowMs,
		sources: {
			pythSpotMs: Number(spotMs),
			blockScholesSpotMs: Number(valueMs),
			blockScholesForwardMs: Number(valueMs),
			blockScholesSviMs: Number(sviMs),
		},
	};
}
