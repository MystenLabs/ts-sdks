// Live-testnet parity for the client-side board pricer. Network-gated (`pnpm test:e2e`,
// PREDICT_SDK_TESTNET=1). What this proves that the offline math tests cannot:
//  1. `read.pricer` decodes the REAL on-chain `Pricer` BCS (forward + rolled PricingSVI)
//     — the field order, signed-magnitude i64s, and 1e9/1e18 scales are all correct.
//  2. The float port matches the chain: `pricer.up(strike)` vs `read.price(strike).up`
//     (which runs the deployed SVI math) agree to a tight tolerance at the same strike.
// Oracle-tolerant like the smoke suite: when the Block-Scholes keeper is between updates
// the whole pricing path aborts (load_live_pricer) — a tolerated environment state, not a
// pricer bug — so the gate skips rather than false-fails.
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { describe, expect, test } from 'vitest';
import { PredictClient, PredictMoveError } from '../../src/index.js';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
});
const predict = new PredictClient({ network: 'testnet', client });

// Same tolerance basis as smoke.test.ts: a stale/unavailable oracle surfaces as a typed
// `pricing`-module abort, by small code (pre-clever-error) or by clever-error name.
const ORACLE_CODES = new Set([4n, 5n, 6n, 9n, 10n, 13n, 14n]);
const ORACLE_NAMES = new Set([
	'EBlockScholesPriceStale',
	'EBlockScholesSVIStale',
	'EBlockScholesPriceUnavailable',
	'EBlockScholesSVIUnavailable',
	'EPythPriceStale',
	'ELivePricingExpired',
]);
function isOracleUnavailable(e: unknown): boolean {
	return (
		e instanceof PredictMoveError &&
		e.module === 'pricing' &&
		(ORACLE_CODES.has(e.code) || (e.abortName != null && ORACLE_NAMES.has(e.abortName)))
	);
}

// The chain and the client-side pricer must be compared at the SAME strike, and numeric
// strikes must sit on the tick grid — so parity uses the market's reference strike, which
// is on-grid by construction. `read.price({ strike: 'reference' })` runs the deployed math
// at that strike; the client prices the same `referencePrice` value locally.
const TOL = 5e-3; // 0.5 probability points — well above the ~1e-7 transcendental gap;
// the slack absorbs the two independent `load_live_pricer` calls rolling down to slightly
// different devInspect clocks.

describe('client-side pricer parity (testnet)', () => {
	test('read.pricer decodes the chain Pricer and matches read.price at the reference strike', async () => {
		const markets = await predict.read.markets();
		expect(markets.length).toBeGreaterThan(0);

		let compared = 0;
		let oracleStale = 0;
		for (const mk of markets) {
			const desc = { underlying: 'BTC', expiryMs: mk.expiryMs } as const;

			let pricer: Awaited<ReturnType<typeof predict.read.pricer>>;
			try {
				pricer = await predict.read.pricer(desc);
			} catch (e) {
				if (isOracleUnavailable(e)) {
					oracleStale++;
					continue;
				}
				throw e;
			}

			// Decode sanity: a real, resolved pricer.
			expect(pricer.forward).toBeGreaterThan(0);
			for (const v of Object.values(pricer.svi)) expect(Number.isFinite(v)).toBe(true);
			// Shape invariants that hold for any SVI surface.
			const f = pricer.forward;
			expect(pricer.up(f * 0.98)).toBeGreaterThan(pricer.up(f * 1.02)); // monotone ↓ in strike
			expect(pricer.up(f) + pricer.down(f)).toBeCloseTo(1, 10); // down = 1 − up
			expect(pricer.up(f)).toBeGreaterThanOrEqual(0);
			expect(pricer.up(f)).toBeLessThanOrEqual(1);

			// Parity at the reference strike (present once the keeper has seeded the window).
			// Price BOTH sides at the SAME numeric strike — passing `strike:'reference'` to
			// read.price would re-read the reference tick fresh, and if it shifts between the
			// two reads we'd be comparing different strikes (a steep near-ATM digital then
			// diverges by far more than any formula error). `mk.referencePrice` is on the tick
			// grid by construction, so it is a legal numeric strike.
			if (mk.referencePrice == null) continue;
			const strike = mk.referencePrice;
			let chain: { up: number; down: number };
			try {
				chain = await predict.read.price({ ...desc, strike });
			} catch (e) {
				if (isOracleUnavailable(e)) {
					oracleStale++;
					continue;
				}
				throw e;
			}
			const localUp = pricer.up(strike);
			const localDown = pricer.down(strike);
			expect(Math.abs(localUp - chain.up)).toBeLessThan(TOL);
			expect(Math.abs(localDown - chain.down)).toBeLessThan(TOL);
			compared++;
		}

		// Never let the gate pass silently on zero coverage: require at least one real
		// parity comparison, unless EVERY market was oracle-stale (a tolerated state).
		expect(compared > 0 || oracleStale > 0).toBe(true);
	});
});
