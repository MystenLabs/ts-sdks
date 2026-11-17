// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Live-testnet parity for the client-side digital. Network-gated (`pnpm test:e2e`,
// PREDICT_SDK_TESTNET=1). The SDK prices off chain from Predict version 6 on, so this pins the
// float digital (`pricing.upProbability`) against the chain's own, at the same strike and the
// same pricer: one simulate loads the chain's `Pricer` (`load_live_pricer`), prices the strike
// with `pricing::range_price`, and returns both.
//
// It reads the version 5 views, so it runs only while the Testnet config's call target is version
// 5: Predict version 6 retires `load_live_pricer` (`EUseV2`). A stale oracle aborts the load in the
// `pricing` module, a tolerated environment state that skips the market rather than failing.
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { describe, expect, test } from 'vitest';
import {
	PredictClient,
	PredictMoveError,
	TESTNET_CONFIG,
	expiryMarketMoveCalls,
	pricing,
	pricingMoveCalls,
	rangeCodecMoveCalls,
	toGeneratedConfig,
	usesPredictV6,
} from '../../../src/predict/index.js';
import { inspectReturns } from '../../../src/predict/reads/inspect.js';
import { readFeeBands, readMarketObject } from '../../../src/predict/reads/book.js';
import { localMintQuote } from '../../../src/predict/quotes.js';
import { parseU64LE } from '../../../src/predict/reads/parse.js';

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: 'https://fullnode.testnet.sui.io:443',
});
const predict = new PredictClient({ network: 'testnet', client });
const config = toGeneratedConfig(TESTNET_CONFIG);
const POS_INF = (1n << 30n) - 1n;
const TOL = 5e-3;

function isOracleUnavailable(e: unknown): boolean {
	return e instanceof PredictMoveError && e.module === 'pricing';
}

// The chain's pricer for a market and its UP probability at `strikeTick`, from one simulate.
async function chainPricerAndUp(marketId: string, strikeTick: bigint, tickSize: bigint) {
	const btc = TESTNET_CONFIG.underlyings.BTC;
	const tx = new Transaction();
	const pricer = tx.add(
		expiryMarketMoveCalls.loadLivePricer({
			config,
			arguments: {
				market: marketId,
				pyth: btc.pythFeed,
				bsValues: btc.blockScholesValueStore,
				bsSvi: btc.blockScholesSviStore,
			},
		}),
	);
	const strike = (tick: bigint) =>
		tx.add(rangeCodecMoveCalls.strikeFromTick({ config, arguments: { tick, tickSize } }));
	const range = tx.add(
		pricingMoveCalls.rangePrice({
			config,
			arguments: { pricer, lower: strike(strikeTick), higher: strike(POS_INF) },
		}),
	);
	tx.add(pricingMoveCalls.probability({ config, arguments: { price: range } }));
	const cmds = await inspectReturns(client, tx);
	const p = pricingMoveCalls.Pricer.parse(cmds[0][0]);
	const i64 = (v: { magnitude: bigint; is_negative: boolean }) =>
		(v.is_negative ? -1 : 1) * Number(v.magnitude);
	const inputs = {
		forward: Number(p.forward) / 1e9,
		svi: {
			a: ((p.svi.a_is_negative ? -1 : 1) * Number(p.svi.a_magnitude)) / 1e18,
			b: Number(p.svi.b) / 1e18,
			rho: i64(p.svi.rho) / 1e9,
			m: i64(p.svi.m) / 1e9,
			sigma: Number(p.svi.sigma) / 1e9,
		},
	};
	const up = Number(parseU64LE(cmds.at(-1)![0])) / 1e9;
	return { inputs, up };
}

describe('client-side digital parity (testnet, version 5 views)', () => {
	test.skipIf(usesPredictV6(TESTNET_CONFIG))(
		"the float digital matches the chain's at the reference strike",
		async () => {
			const markets = await predict.read.markets();
			expect(markets.length).toBeGreaterThan(0);
			let compared = 0;
			let skipped = 0;
			for (const mk of markets) {
				if (mk.referencePrice == null || Number(mk.expiryMs) - Date.now() < 60_000) {
					skipped++;
					continue;
				}
				const tickSize = BigInt(Math.round(mk.tickSize * 1e9));
				const strikeTick = BigInt(Math.round(mk.referencePrice / mk.tickSize));
				let chain: Awaited<ReturnType<typeof chainPricerAndUp>>;
				try {
					chain = await chainPricerAndUp(mk.id, strikeTick, tickSize);
				} catch (e) {
					if (isOracleUnavailable(e)) {
						skipped++;
						continue;
					}
					throw e;
				}
				const board = pricing.boardPricer(chain.inputs);
				expect(board.forward).toBeGreaterThan(0);
				expect(Math.abs(board.up(mk.referencePrice) - chain.up)).toBeLessThan(TOL);
				compared++;
			}
			expect(compared + skipped).toBe(markets.length);
			expect(compared > 0 || skipped > 0).toBe(true);
		},
		30_000,
	);

	// The off-chain mint quote against the chain's version 5 `quote_mint`, on the chain's own
	// pricer: the fee arithmetic, the fee band and the subsidy cap must agree, and the
	// probability to the float digital's precision.
	test.skipIf(usesPredictV6(TESTNET_CONFIG))(
		"the off-chain mint quote matches the chain's quote_mint",
		async () => {
			const btc = TESTNET_CONFIG.underlyings.BTC;
			const markets = (await predict.read.markets()).filter(
				(m) => !m.mintPaused && Number(m.expiryMs) - Date.now() > 10_000,
			);
			let compared = 0;
			for (const mk of markets.slice(0, 3)) {
				const tickSize = BigInt(Math.round(mk.tickSize * 1e9));
				// A strike near the money on the admission grid, from the chain's own forward.
				let forward: number;
				try {
					forward = (await chainPricerAndUp(mk.id, 1n, tickSize)).inputs.forward;
				} catch (e) {
					if (e instanceof PredictMoveError) continue;
					throw e;
				}
				const strike = Math.round(forward / mk.admissionTickSize) * mk.admissionTickSize;
				const strikeTick = BigInt(Math.round(strike / mk.tickSize));
				const tx = new Transaction();
				const pricer = tx.add(
					expiryMarketMoveCalls.loadLivePricer({
						config,
						arguments: {
							market: mk.id,
							pyth: btc.pythFeed,
							bsValues: btc.blockScholesValueStore,
							bsSvi: btc.blockScholesSviStore,
						},
					}),
				);
				tx.add(
					expiryMarketMoveCalls.quoteMint({
						config,
						arguments: {
							market: mk.id,
							pricer,
							lowerTick: strikeTick,
							higherTick: POS_INF,
							maxPremium: 0n,
							minQuantity: 10_000_000n,
							exactQuantity: true,
						},
					}),
				);
				let cmds: Uint8Array[][];
				try {
					cmds = await inspectReturns(client, tx);
				} catch (e) {
					if (e instanceof PredictMoveError) continue; // stale oracle or out of band
					throw e;
				}
				const p = pricingMoveCalls.Pricer.parse(cmds[0][0]);
				const chain = expiryMarketMoveCalls.MintQuote.parse(cmds[1][0]);
				const i64 = (v: { magnitude: bigint; is_negative: boolean }) =>
					(v.is_negative ? -1 : 1) * Number(v.magnitude);
				const [object, feeBands] = await Promise.all([
					readMarketObject(client, mk.id),
					readFeeBands(client, mk.id),
				]);
				// Inside the expiry fee window the fee ramps with the clock, which the simulate reads a
				// moment apart from this process, so compare only outside it.
				if (object.expiryMs - BigInt(Date.now()) < object.fees.expiryFeeWindowMs + 5_000n) continue;
				const rateTx = new Transaction();
				rateTx.add(
					(
						await import('../../../src/contracts/deepbook_predict/protocol_config.js')
					).feeIncentiveSubsidyRate({
						config,
					}),
				);
				const rate = parseU64LE((await inspectReturns(client, rateTx))[0][0]);
				const local = localMintQuote({
					market: { ...object, feeBands },
					pricer: {
						forward: Number(p.forward) / 1e9,
						svi: {
							a: ((p.svi.a_is_negative ? -1 : 1) * Number(p.svi.a_magnitude)) / 1e18,
							b: Number(p.svi.b) / 1e18,
							rho: i64(p.svi.rho) / 1e9,
							m: i64(p.svi.m) / 1e9,
							sigma: Number(p.svi.sigma) / 1e9,
						},
					},
					lowerTick: strikeTick,
					higherTick: POS_INF,
					request: { shape: 'exact-quantity', quantityRaw: 10_000_000n },
					nowMs: BigInt(Date.now()),
					feeIncentiveSubsidyRate: rate,
				});
				const close = (a: bigint, b: bigint, tol: bigint) =>
					expect(a > b ? a - b : b - a).toBeLessThanOrEqual(tol);
				close(local.entryProbability, chain.entry_probability, 200_000n);
				close(local.premium, chain.premium, 3_000n);
				close(local.tradingFee, chain.trading_fee, 3_000n);
				close(local.allInCost, chain.all_in_cost - chain.penalty_fee, 6_000n);
				expect(local.penaltyFee).toBe(0n);
				compared++;
			}
			// Every live market can be stale or out of band at once on Testnet, so zero is tolerated.
			expect(compared).toBeLessThanOrEqual(3);
		},
		60_000,
	);
});
