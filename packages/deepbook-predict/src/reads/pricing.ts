import { Transaction } from '@mysten/sui/transactions';
import { type GeneratedConfig } from '../config/generated.js';
import { Pricer } from '../contracts/deepbook_predict/pricing.js';
import type { PricerInputs, Svi } from '../pricing.js';
import { loadLivePricer, type MarketFeeds } from '../tx/trade.js';
import { inspectReturns, type ReadClient } from './inspect.js';

// The chain's fixed-point scales for the rolled `PricingSVI` (see the generated
// `Pricer`/`PricingSVI` struct): forward and rho/m/sigma at 1e9; the rolled `a`/`b` land
// at 1e18 (roll_down multiplies the 1e9 raw by an extra 1e9). Converting to `number`
// (float) is deliberate — this is a display pricer; a is a variance ~O(1e-2), so f64's
// ~15 significant digits are ample and, per pricing.ts, more precise than the chain's
// fixed point on the short-dated surfaces this prices.
const FORWARD_SCALE = 1e9;
const AB_SCALE = 1e18;
const RMS_SCALE = 1e9; // rho, m, sigma

const i64 = (v: { magnitude: string | number | bigint; is_negative: boolean }): number =>
	(v.is_negative ? -1 : 1) * Number(v.magnitude);

/** A resolved pricer snapshot read from the chain: the decimal forward + rolled SVI the
 * client-side math consumes, plus the oracle source timestamps behind it (ms; for
 * staleness display — Pyth is 0 when no usable spot existed). The Block-Scholes entries are
 * batch ENVELOPE times (what freshness and the SVI roll-down anchor on), not model times. */
export interface PricerSnapshot extends PricerInputs {
	sources: {
		pythSpotMs: number;
		blockScholesSpotMs: number;
		blockScholesForwardMs: number;
		blockScholesSviMs: number;
	};
}

// Decode a `Pricer` (already forward-resolved + roll-down-applied on-chain) into decimal
// `PricerInputs`. Signed fields (`a`, `rho`, `m`) carry the magnitude/flag pair the chain
// uses; `b`/`sigma` are non-negative.
function decodePricer(pricer: ReturnType<typeof Pricer.parse>): PricerSnapshot {
	const s = pricer.svi;
	const svi: Svi = {
		a: ((s.a_is_negative ? -1 : 1) * Number(s.a_magnitude)) / AB_SCALE,
		b: Number(s.b) / AB_SCALE,
		rho: i64(s.rho) / RMS_SCALE,
		m: i64(s.m) / RMS_SCALE,
		sigma: Number(s.sigma) / RMS_SCALE,
	};
	return {
		forward: Number(pricer.forward) / FORWARD_SCALE,
		svi,
		sources: {
			pythSpotMs: Number(pricer.pyth_spot_source_timestamp_ms),
			blockScholesSpotMs: Number(pricer.block_scholes_spot_source_timestamp_ms),
			blockScholesForwardMs: Number(pricer.block_scholes_forward_source_timestamp_ms),
			blockScholesSviMs: Number(pricer.block_scholes_svi_source_timestamp_ms),
		},
	};
}

// Read one live pricer snapshot for `marketId`: a single simulate of
// `load_live_pricer` — the chain reads the oracle feeds, picks the forward
// (Pyth-vs-Block-Scholes admin policy + freshness), and rolls the SVI down to now, then
// returns the whole `Pricer` by value (copy+drop), whose BCS we decode. One round trip;
// then a `boardPricer` prices every strike locally.
//
// `load_live_pricer` ABORTS (a typed PredictMoveError) when the market is expired, a feed
// is stale, or the surface fails the pricing-safe envelope — i.e. exactly when the chain
// itself cannot quote. Callers surface that the same way `read.price` does.
export async function readPricerSnapshot(
	client: ReadClient,
	config: GeneratedConfig,
	marketId: string,
	feeds: MarketFeeds,
): Promise<PricerSnapshot> {
	const tx = new Transaction();
	tx.add(loadLivePricer(config, { expiryMarketId: marketId, ...feeds }));
	const [cmd0] = await inspectReturns(client, tx);
	return decodePricer(Pricer.parse(cmd0[0]));
}
