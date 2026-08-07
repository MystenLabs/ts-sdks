// Faithful float port of the deployed `deepbook_predict::pricing::compute_nd2`
// (testnet `predict-testnet-7-29`, sourceCommit a92ceb01) — the SVI-adjusted digital
// probability, WITH the skew-correction term. It operates on the pricer's
// ALREADY-RESOLVED forward and ALREADY-ROLLED-DOWN SVI, exactly as `load_live_pricer`
// returns them (decoded by `reads/pricing.ts`). So the two on-chain steps that pick the
// forward (Pyth-spot vs Block-Scholes, admin flag + freshness) and roll `a`/`b` down by
// remaining/anchored time already happened on-chain — this module never re-derives them,
// which is what keeps it faithful.
//
// This is the fast client-side board pricer: read one `Pricer` snapshot, then price every
// strike locally with no further chain calls. `read.price` / `read.quoteMint` (a chain
// dry-run) stay the authoritative quote at trade time. Divergence vs the chain is ~1e-7 in
// probability — std-lib `erf` here vs the chain's Cody/Taylor fixed-point `normal_cdf`/
// `normal_pdf` — negligible for display; `tests/testnet/pricing-parity` bounds it live.
//
// The on-chain formula (pricing.move `compute_nd2`, a92ceb01):
//   k  = ln(strike / forward)
//   x  = k - m
//   w  = a + b·(ρ·x + √(x² + σ²))            // a, b already rolled down
//   d2 = −(k + w/2) / √w                       // clamped to ±8
//   w′ = b·(ρ + x/√(x² + σ²))                  // SVI slope
//   price = N(d2) − φ(d2)·w′ / (2·√w)          // the skew correction, clamped [0,1]

/** Rolled-down SVI parameters for one expiry, in decimal (NOT the chain's 1e9/1e18 integer
 * scaling) — the surface AFTER Predict's remaining-time roll-down, as carried by the
 * on-chain `Pricer`. `a`, `rho`, `m` are signed; `b`, `sigma` are non-negative. */
export interface Svi {
	a: number;
	b: number;
	rho: number;
	m: number;
	sigma: number;
}

/** A resolved pricer snapshot: the forward the contract prices against and its rolled SVI
 * surface, both in decimal. Produced by `read.pricer(market)`; consume via {@link boardPricer}
 * or the pure functions below. */
export interface PricerInputs {
	/** Forward price the digital settles against, in decimal (same units as `strike`). */
	forward: number;
	svi: Svi;
}

/** Standard normal CDF via erf (Abramowitz–Stegun 7.1.26, |err| < 1.5e-7). */
function normalCdf(x: number): number {
	return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Standard normal PDF. */
function normalPdf(x: number): number {
	return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function erf(x: number): number {
	const sign = x >= 0 ? 1 : -1;
	const ax = Math.abs(x);
	const t = 1 / (1 + 0.3275911 * ax);
	const y =
		1 -
		((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
			t *
			Math.exp(-ax * ax);
	return sign * y;
}

// Clamp |d2| at 8, matching the chain (`normal_cdf`/`normal_pdf` saturate beyond that).
function clampD2(d2: number): number {
	return d2 > 8 ? 8 : d2 < -8 ? -8 : d2;
}

/** P(settle > strike) — the UP digital, with the SVI skew correction. `inputs.svi` is the
 * already-rolled surface (no roll-down applied here). `forward` and `strike` share units.
 * Returns a probability in [0, 1]. */
export function upProbability(inputs: PricerInputs, strike: number): number {
	const { forward, svi } = inputs;
	if (!(forward > 0)) return 0;
	if (strike <= 0) return 1; // neg-inf limit
	const { a, b, rho, m, sigma } = svi;
	const k = Math.log(strike / forward);
	const km = k - m;
	const root = Math.sqrt(km * km + sigma * sigma);
	const inner = rho * km + root; // >= 0 for |rho| <= 1
	const w = a + b * inner; // total variance
	// The chain guarantees w > 0 at every strike (assert_min_total_variance_positive at
	// load time), so this branch is unreachable in practice; return the variance→0 tail
	// limit rather than throw, so a UI never crashes on a degenerate snapshot.
	if (w <= 0) return k < 0 ? 1 : 0;
	const sq = Math.sqrt(w);
	const d2 = clampD2(-((k + w / 2) / sq));
	const nd2 = normalCdf(d2);
	const wPrime = b * (rho + km / root); // SVI slope × b
	const price = nd2 - (normalPdf(d2) * wPrime) / (2 * sq); // skew correction
	return price < 0 ? 0 : price > 1 ? 1 : price;
}

/** P(settle < strike) — the DOWN digital. Exactly `1 − up`, matching the chain's
 * `range_price(-inf, strike] = up(-inf) − up(strike) = 1 − up(strike)`. */
export function downProbability(inputs: PricerInputs, strike: number): number {
	return 1 - upProbability(inputs, strike);
}

/** Probability mass in `(lower, higher]`, floored at 0 (matches `compute_range_price`'s
 * saturating subtraction). Use `lower <= 0` for the −∞ bound and `higher = Infinity` for +∞. */
export function rangeProbability(inputs: PricerInputs, lower: number, higher: number): number {
	// up(lower) − up(higher), where up(+inf) = 0 and up(<= 0) = 1.
	const upLower = lower <= 0 ? 1 : upProbability(inputs, lower);
	const upHigher = higher === Infinity ? 0 : upProbability(inputs, higher);
	const d = upLower - upHigher;
	return d < 0 ? 0 : d;
}

/** Binary probability at `strike` for the given side (`up` = P(>strike), `down` = 1 − up). */
export function probability(inputs: PricerInputs, strike: number, side: 'up' | 'down'): number {
	const up = upProbability(inputs, strike);
	return side === 'up' ? up : 1 - up;
}

/** Strike where P(settle > strike) = `p`, by bisection (UP is monotone-decreasing in
 * strike). Null when no crossing exists within ±64% of forward. */
export function strikeAtProbability(inputs: PricerInputs, p: number): number | null {
	const { forward } = inputs;
	if (!(forward > 0) || !(p > 0 && p < 1)) return null;
	const up = (strike: number) => upProbability(inputs, strike);
	let r = 0.01;
	while (up(forward * (1 - r)) < p || up(forward * (1 + r)) > p) {
		r *= 2;
		if (r > 0.64) return null;
	}
	let lo = forward * (1 - r);
	let hi = forward * (1 + r);
	for (let i = 0; i < 64; i++) {
		const mid = (lo + hi) / 2;
		if (up(mid) > p) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
}

// --- Resolving raw feed data client-side (for consumers that hold their own live oracle
// feed and want to price with NO chain call, e.g. deepbook-app). The turnkey path is
// `read.pricer(market)`, which reads these already resolved from the chain's `Pricer`;
// these two helpers reproduce the on-chain resolution when you'd rather not read the chain.

/** Roll `a` and `b` down by the fraction of anchored time remaining, matching the chain's
 * `roll_down_svi` (variance decays toward expiry). `remainingMs` = expiry − now;
 * `anchorTteMs` = expiry − the SVI observation's source timestamp. `rho`, `m`, `sigma` are
 * unchanged. Feed an UNrolled provider surface; the result is what {@link upProbability}
 * expects. */
export function rollDown(svi: Svi, remainingMs: number, anchorTteMs: number): Svi {
	const frac = anchorTteMs > 0 ? remainingMs / anchorTteMs : 0;
	return { ...svi, a: svi.a * frac, b: svi.b * frac };
}

/** The forward the contract prices against: Pyth spot re-anchored by the Block-Scholes
 * basis (`spot · forward/bsSpot`), falling back to the Block-Scholes forward when Pyth is
 * absent. Pass `pythSpot <= 0` to force the fallback. NOTE: on-chain this branch is also
 * gated by the admin flag `use_pyth_spot_for_forward` (default on) and a Pyth freshness
 * window — when the flag is off or the Pyth spot is stale, the chain uses `bsForward`. If
 * you track that config/freshness, apply it before calling (or use `read.pricer`, which
 * gets the resolved forward from the chain). */
export function forward(pythSpot: number, bsSpot: number, bsForward: number): number {
	if (pythSpot > 0 && bsSpot > 0) return pythSpot * (bsForward / bsSpot);
	return bsForward;
}

/** A pricer bound to one resolved snapshot: price a whole board of strikes locally, no
 * chain calls. Returned by `read.pricer(market)`; also constructable directly from inputs
 * you already hold (e.g. from a `Pricer` snapshot decoded elsewhere). */
export interface BoardPricer extends PricerInputs {
	/** P(settle > strike). */
	up(strike: number): number;
	/** P(settle < strike) = 1 − up. */
	down(strike: number): number;
	/** P(side wins at strike). */
	probability(strike: number, side: 'up' | 'down'): number;
	/** Probability mass in `(lower, higher]` (use `lower<=0`/`higher=Infinity` for the tails). */
	range(lower: number, higher: number): number;
	/** Strike where P(> strike) = `p`, or null if outside ±64% of forward. */
	strikeAtProbability(p: number): number | null;
}

/** Build a {@link BoardPricer} from a resolved snapshot (decimal forward + rolled SVI). Pure. */
export function boardPricer(inputs: PricerInputs): BoardPricer {
	return {
		forward: inputs.forward,
		svi: inputs.svi,
		up: (strike) => upProbability(inputs, strike),
		down: (strike) => downProbability(inputs, strike),
		probability: (strike, side) => probability(inputs, strike, side),
		range: (lower, higher) => rangeProbability(inputs, lower, higher),
		strikeAtProbability: (p) => strikeAtProbability(inputs, p),
	};
}
