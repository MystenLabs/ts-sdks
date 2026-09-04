// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from '@mysten/sui/transactions';
import { type GeneratedConfig } from '../config/generated.js';
import { type UnderlyingConfig } from '../config/index.js';
import { PredictMoveError } from '../errors.js';
import { POS_INF_TICK } from '../ticks.js';
import { loadLivePricer, type MarketFeeds } from '../tx/trade.js';
import * as expiryMarket from '../../contracts/deepbook_predict/expiry_market.js';
import * as plp from '../../contracts/deepbook_predict/plp.js';
import * as pricing from '../../contracts/deepbook_predict/pricing.js';
import * as rangeCodec from '../../contracts/deepbook_predict/range_codec.js';
import * as registry from '../../contracts/deepbook_predict/registry.js';
import { inspectReturns, type ReadClient } from './inspect.js';
import { parseOptionalId, parseOptionalU64, parseU64LE, parseVectorOfIds } from './parse.js';

// On-chain ids of the pool's active (live, not-yet-settled) expiry markets.
// `plp::active_expiry_markets(vault)` — see packages/predict/sources/plp/plp.move:179.
export async function activeMarketIds(
	client: ReadClient,
	config: GeneratedConfig,
): Promise<string[]> {
	const tx = new Transaction();
	tx.add(plp.activeExpiryMarkets({ config }));
	const [cmd0] = await inspectReturns(client, tx);
	return parseVectorOfIds(cmd0[0]);
}

// The expiry market id for one underlying at one expiry, or null if none exists.
// `registry::expiry_market_id(registry, propbook_underlying_id: u32, expiry: u64):
// Option<ID>` — see packages/predict/sources/registry/registry.move:58.
export async function expiryMarketId(
	client: ReadClient,
	config: GeneratedConfig,
	underlying: UnderlyingConfig,
	expiryMs: bigint,
): Promise<string | null> {
	const tx = new Transaction();
	tx.add(
		registry.expiryMarketId({
			config,
			arguments: { propbookUnderlyingId: underlying.propbookUnderlyingId, expiry: expiryMs },
		}),
	);
	const [cmd0] = await inspectReturns(client, tx);
	return parseOptionalId(cmd0[0]);
}

export interface MarketState {
	expiryMs: bigint;
	tickSizeRaw: bigint;
	/**
	 * The COARSER raw-price step new finite mint boundaries must align to
	 * (`expiry_market::admission_tick_size`). A numeric strike must be a whole
	 * multiple of this — the fine `tickSizeRaw` grid alone is not sufficient — or
	 * the chain aborts `EInvalidAdmissionTick`. The market's reference tick is the
	 * one finite boundary allowed to bypass it.
	 */
	admissionTickSizeRaw: bigint;
	mintPaused: boolean;
	/**
	 * The reference fine-grid tick (Polymarket-style anchor strike: derived
	 * on-chain from the exact previous-window oracle observation), or null while
	 * the keeper has not seeded it. Reference PRICE raw = tick * tickSizeRaw.
	 */
	referenceTickRaw: bigint | null;
}

// The per-market state getters, in fixed order. `expiry_market::{expiry,
// tick_size, mint_paused, reference_tick}` — see
// packages/predict/sources/expiry_market.move:{101,177,259,187}. reference_tick
// returns Option (no abort risk). settlement is read separately via
// `settlementPrice` (its own non-batched getter below).
const STATE_FNS = [
	expiryMarket.expiry,
	expiryMarket.tickSize,
	expiryMarket.admissionTickSize,
	expiryMarket.mintPaused,
	expiryMarket.referenceTick,
] as const;

function parseStateAt(cmds: Uint8Array[][], base: number): MarketState {
	return {
		expiryMs: parseU64LE(cmds[base][0]),
		tickSizeRaw: parseU64LE(cmds[base + 1][0]),
		admissionTickSizeRaw: parseU64LE(cmds[base + 2][0]),
		mintPaused: (cmds[base + 3][0][0] ?? 0) !== 0, // BCS bool: 1 byte
		referenceTickRaw: parseOptionalU64(cmds[base + 4][0]),
	};
}

export async function marketState(
	client: ReadClient,
	config: GeneratedConfig,
	marketId: string,
): Promise<MarketState> {
	const [state] = await marketStates(client, config, [marketId]);
	return state;
}

// Batched marketState for N markets in ONE PTB (STATE_FNS.length commands per
// market, same order). Returns states aligned with `marketIds`.
export async function marketStates(
	client: ReadClient,
	config: GeneratedConfig,
	marketIds: readonly string[],
): Promise<MarketState[]> {
	if (marketIds.length === 0) return [];
	const tx = new Transaction();
	for (const id of marketIds) {
		for (const fn of STATE_FNS) {
			tx.add(fn({ config, arguments: { market: id } }));
		}
	}
	const cmds = await inspectReturns(client, tx);
	return marketIds.map((_, i) => parseStateAt(cmds, STATE_FNS.length * i));
}

// Anonymous both-sides pricing for one strike: the chain's own probability for
// (strike, +inf] and (-inf, strike]. Deployed `pricing::range_price` takes typed
// `range_codec::Strike`s (NOT raw u64) — each boundary is built via
// `range_codec::strike_from_tick(tick, tick_size)`, which maps tick 0 → -inf,
// POS_INF_TICK → +inf, and any finite tick → tick*tick_size. `range_price` is a
// public fun on the deployed package. Both sides read the SAME pricer in one PTB, so
// `down` is the chain's number, not 1 − up.
export async function rangePrices(
	client: ReadClient,
	config: GeneratedConfig,
	marketId: string,
	feeds: MarketFeeds,
	strikeRaw: bigint,
	tickSizeRaw: bigint,
): Promise<{ upRaw: bigint; downRaw: bigint }> {
	const tx = new Transaction();
	const pricer = tx.add(loadLivePricer(config, { expiryMarketId: marketId, ...feeds }));
	// strikeRaw is a whole tick multiple (the caller validates divisibility), so the
	// finite boundary is `strike_from_tick(strikeRaw / tickSize, tickSize)`.
	const strikeTick = strikeRaw / tickSizeRaw;
	const mkStrike = (tick: bigint) =>
		tx.add(rangeCodec.strikeFromTick({ config, arguments: { tick, tickSize: tickSizeRaw } }));
	const strike = mkStrike(strikeTick);
	const posInf = mkStrike(POS_INF_TICK);
	const negInf = mkStrike(0n);
	// UP: (strike, +inf], then DOWN: (-inf, strike] — the last two commands.
	tx.add(pricing.rangePrice({ config, arguments: { pricer, lower: strike, higher: posInf } }));
	tx.add(pricing.rangePrice({ config, arguments: { pricer, lower: negInf, higher: strike } }));
	const cmds = await inspectReturns(client, tx);
	return {
		upRaw: parseU64LE(cmds[cmds.length - 2][0]),
		downRaw: parseU64LE(cmds[cmds.length - 1][0]),
	};
}

// Fresh single read of the reference tick — used by mint-at-reference, which
// must not trust a cached state (the reference is unset early in a window
// until the keeper seeds it).
export async function referenceTick(
	client: ReadClient,
	config: GeneratedConfig,
	marketId: string,
): Promise<bigint | null> {
	const tx = new Transaction();
	tx.add(expiryMarket.referenceTick({ config, arguments: { market: marketId } }));
	const [cmd0] = await inspectReturns(client, tx);
	return parseOptionalU64(cmd0[0]);
}

// The recorded settlement price, or null while the market is unsettled.
//
// On the deployed package `expiry_market::settlement_price` is public and
// `destroy_some`s the stored Option — callable here only because simulate runs with
// checksEnabled:false, and it aborts in std::option (EOPTION_NOT_SET) when the
// market has not settled; we map exactly that abort (and the public
// EMarketNotSettled variant, should a future package guard it directly) to null.
// (A non-aborting `try_settlement_price` also exists on-chain if this ever wants to
// drop the abort-catch.)
export async function settlementPrice(
	client: ReadClient,
	config: GeneratedConfig,
	marketId: string,
): Promise<bigint | null> {
	const tx = new Transaction();
	tx.add(expiryMarket.settlementPrice({ config, arguments: { market: marketId } }));
	try {
		const [cmd0] = await inspectReturns(client, tx);
		return parseU64LE(cmd0[0]);
	} catch (e) {
		if (
			e instanceof PredictMoveError &&
			(e.module === 'option' ||
				(e.module === 'expiry_market' && e.abortName === 'EMarketNotSettled'))
		) {
			return null;
		}
		throw e;
	}
}

// A market's current NAV mark (the per-expiry recoverable value the flush prices
// against). Loads a fresh live pricer, then reads `current_nav(market, &pricer)` —
// see packages/predict/sources/expiry_market.move:236. `Pricer` has copy+drop, so
// the unconsumed borrow is fine in a read-only inspect.
export async function currentNav(
	client: ReadClient,
	config: GeneratedConfig,
	marketId: string,
	underlying: UnderlyingConfig,
): Promise<bigint> {
	const tx = new Transaction();
	const pricer = tx.add(
		loadLivePricer(config, {
			expiryMarketId: marketId,
			pythFeed: underlying.pythFeed,
			blockScholesValueStore: underlying.blockScholesValueStore,
			blockScholesSviStore: underlying.blockScholesSviStore,
		}),
	);
	tx.add(expiryMarket.currentNav({ config, arguments: { market: marketId, pricer } }));
	const cmds = await inspectReturns(client, tx);
	// current_nav is the last command; load_live_pricer precedes it.
	return parseU64LE(cmds[cmds.length - 1][0]);
}
