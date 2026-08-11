import { describe, expect, test } from 'vitest';
import { toGeneratedConfig } from '../src/config/generated.js';
import { TESTNET_CONFIG } from '../src/config/index.js';
import { Pricer } from '../src/contracts/deepbook_predict/pricing.js';
import type { ReadClient } from '../src/reads/inspect.js';
import { readPricerSnapshot } from '../src/reads/pricing.js';

// A mock ReadClient whose simulate returns one command result carrying the given Pricer BCS
// bytes — exercises the real inspect → Pricer.parse → decode → scale path OFFLINE. This is
// the regression guard for the fixed-point scaling and signed-magnitude decoding that the
// live parity test otherwise covers only against a live oracle.
function clientReturning(bytes: Uint8Array): ReadClient {
	return {
		core: {
			async simulateTransaction() {
				return {
					$kind: 'Transaction',
					Transaction: {},
					commandResults: [{ returnValues: [{ bcs: bytes }], mutatedReferences: [] }],
				};
			},
		},
	} as unknown as ReadClient;
}

const config = toGeneratedConfig(TESTNET_CONFIG);
const FEEDS = { pythFeed: '0x1', blockScholesValueStore: '0x2', blockScholesSviStore: '0x3' };
const MARKET = '0x' + 'ab'.repeat(32);

const E9 = 1_000_000_000n;
const E18 = 1_000_000_000_000_000_000n;

async function decode(pricer: Parameters<typeof Pricer.serialize>[0]) {
	return readPricerSnapshot(
		clientReturning(Pricer.serialize(pricer).toBytes()),
		config,
		MARKET,
		FEEDS,
	);
}

describe('readPricerSnapshot — Pricer decode (scaling + signs)', () => {
	test('forward @1e9, a/b @1e18, rho/m/sigma @1e9; signed a/rho/m via magnitude+flag', async () => {
		const snap = await decode({
			expiry_market_id: MARKET,
			forward: 100_000n * E9, // $100,000
			svi: {
				a_magnitude: 2n * (E18 / 100n), // 0.02 @ 1e18
				a_is_negative: true, // → a = −0.02
				b: E18 / 10n, // 0.1 @ 1e18
				rho: { magnitude: (3n * E9) / 10n, is_negative: true }, // −0.3 @ 1e9
				m: { magnitude: (5n * E9) / 100n, is_negative: false }, // +0.05 @ 1e9
				sigma: E9 / 10n, // 0.1 @ 1e9
			},
			pyth_spot_source_timestamp_ms: 1000n,
			block_scholes_spot_source_timestamp_ms: 2000n,
			block_scholes_forward_source_timestamp_ms: 3000n,
			block_scholes_svi_source_timestamp_ms: 4000n,
		});
		expect(snap.forward).toBeCloseTo(100_000, 6);
		expect(snap.svi.a).toBeCloseTo(-0.02, 12); // signed via a_is_negative, /1e18
		expect(snap.svi.b).toBeCloseTo(0.1, 12); // unsigned, /1e18
		expect(snap.svi.rho).toBeCloseTo(-0.3, 12); // signed i64, /1e9
		expect(snap.svi.m).toBeCloseTo(0.05, 12); // signed i64, /1e9
		expect(snap.svi.sigma).toBeCloseTo(0.1, 12); // unsigned, /1e9
		expect(snap.sources).toEqual({
			pythSpotMs: 1000,
			blockScholesSpotMs: 2000,
			blockScholesForwardMs: 3000,
			blockScholesSviMs: 4000,
		});
	});

	test('positive a and negative m decode with the right sign', async () => {
		const snap = await decode({
			expiry_market_id: MARKET,
			forward: E9,
			svi: {
				a_magnitude: 2n * (E18 / 100n),
				a_is_negative: false, // → +0.02
				b: 0n,
				rho: { magnitude: 0n, is_negative: false },
				m: { magnitude: E9 / 100n, is_negative: true }, // −0.01
				sigma: E9 / 1000n,
			},
			pyth_spot_source_timestamp_ms: 0n,
			block_scholes_spot_source_timestamp_ms: 0n,
			block_scholes_forward_source_timestamp_ms: 0n,
			block_scholes_svi_source_timestamp_ms: 0n,
		});
		expect(snap.svi.a).toBeCloseTo(0.02, 12);
		expect(snap.svi.m).toBeCloseTo(-0.01, 12);
	});
});
