// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from '@mysten/sui/transactions';
import { type GeneratedConfig } from '../config/generated.js';
import { type UnderlyingConfig } from '../config/index.js';
import { type FeePolicy } from '../cost.js';
import { PredictMoveError } from '../errors.js';
import * as expiryMarket from '../../contracts/deepbook_predict/expiry_market.js';
import * as plp from '../../contracts/deepbook_predict/plp.js';
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

/**
 * The fee and exposure policy a market snapshotted at creation, from its `ExpiryMarket` object:
 * `strike_exposure.config` and `strike_exposure.inventory_impact_scale`. It is the policy the
 * market charges for its whole life, whatever the protocol template says now, and the `cost`
 * functions take it as `fees`. One object read, no simulate. The struct layout is fixed across
 * package upgrades, so the v1 binding decodes every version's markets.
 */
export async function marketFeePolicy(client: ReadClient, marketId: string): Promise<FeePolicy> {
	const { object } = await client.core.getObject({
		objectId: marketId,
		include: { content: true },
	});
	if (!object.content) throw new Error(`ExpiryMarket ${marketId} returned no content`);
	const { config, inventory_impact_scale } = expiryMarket.ExpiryMarket.parse(
		object.content,
	).strike_exposure;
	return {
		baseFee: BigInt(config.base_fee),
		minFee: BigInt(config.min_fee),
		expiryFeeWindowMs: BigInt(config.expiry_fee_window_ms),
		expiryFeeMaxMultiplier: BigInt(config.expiry_fee_max_multiplier),
		minEntryProbability: BigInt(config.min_entry_probability),
		maxEntryProbability: BigInt(config.max_entry_probability),
		inventoryImpactMaxRate: BigInt(config.inventory_impact_max_rate),
		inventoryImpactScale: BigInt(inventory_impact_scale),
		backingBufferLambda: BigInt(config.backing_buffer_lambda),
	};
}
