// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Object reads the off-chain quotes and NAV need (`quotes.ts`): a market's own object, its fee
// bands and its payout tree. No simulate: from Predict version 6 the views that combined these with
// a live pricer are retired, so the SDK reads the state and prices it locally.
import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { FeePolicy } from '../cost.js';
import { feeBandsFromTriples, type FeeBand, type PayoutBoundary } from '../quotes.js';
import * as expiryMarket from '../../contracts/deepbook_predict/expiry_market.js';
import { PayoutNode } from '../../contracts/deepbook_predict/strike_payout_tree.js';

/** A market's own state, from one object read. */
export interface MarketObject {
	marketId: string;
	/** The object version read. Every trade, fill and settlement takes the market mutably and bumps it. */
	version: string | null;
	propbookUnderlyingId: number;
	expiryMs: bigint;
	tickSizeRaw: bigint;
	admissionTickSizeRaw: bigint;
	referenceTickRaw: bigint | null;
	mintPaused: boolean;
	settled: boolean;
	/** The fee and exposure policy the market snapshotted at creation. */
	fees: FeePolicy;
	/** Sponsor-funded USDC left to subsidize this market's trading fees. */
	feeIncentiveBalance: bigint;
	cashBalance: bigint;
	inventoryImpactReserve: bigint;
	payout: {
		/** The payout tree's node `Table`. */
		tableId: string;
		base: bigint;
		nodeCount: bigint;
	};
}

/**
 * Read and decode an `ExpiryMarket` object. Its layout is frozen across package upgrades, so the
 * generated binding decodes every version's markets.
 */
export async function readMarketObject(
	client: ClientWithCoreApi,
	marketId: string,
): Promise<MarketObject> {
	const { object } = await client.core.getObject({
		objectId: marketId,
		include: { content: true },
	});
	if (!object.content) throw new Error(`ExpiryMarket ${marketId} returned no content`);
	const m = expiryMarket.ExpiryMarket.parse(object.content);
	const x = m.strike_exposure;
	const c = x.config;
	return {
		marketId: normalizeSuiAddress(m.id),
		version: object.version == null ? null : String(object.version),
		propbookUnderlyingId: m.propbook_underlying_id,
		expiryMs: BigInt(m.expiry),
		tickSizeRaw: BigInt(x.tick_size),
		admissionTickSizeRaw: BigInt(x.admission_tick_size),
		referenceTickRaw: x.reference_tick == null ? null : BigInt(x.reference_tick),
		mintPaused: m.mint_paused,
		settled: x.settlement_price != null,
		fees: {
			baseFee: BigInt(c.base_fee),
			minFee: BigInt(c.min_fee),
			expiryFeeWindowMs: BigInt(c.expiry_fee_window_ms),
			expiryFeeMaxMultiplier: BigInt(c.expiry_fee_max_multiplier),
			minEntryProbability: BigInt(c.min_entry_probability),
			maxEntryProbability: BigInt(c.max_entry_probability),
			inventoryImpactMaxRate: BigInt(c.inventory_impact_max_rate),
			inventoryImpactScale: BigInt(x.inventory_impact_scale),
			backingBufferLambda: BigInt(c.backing_buffer_lambda),
		},
		feeIncentiveBalance: BigInt(m.fee_incentive_balance.value),
		cashBalance: BigInt(m.cash.cash_balance.value),
		inventoryImpactReserve: BigInt(m.cash.inventory_impact_reserve),
		payout: {
			tableId: normalizeSuiAddress(x.payout.nodes.id),
			base: BigInt(x.payout.base),
			nodeCount: BigInt(x.payout.node_count),
		},
	};
}

// A market's fee bands live in a dynamic field on its UID under `protocol_config::FeeBandsKey`,
// whose type is defined by the Predict version that added fee bands (version 5). The key is found
// by its module and name rather than by that version's ID.
const FEE_BANDS_KEY = /::protocol_config::FeeBandsKey$/;

/**
 * A market's fee bands (the template it copied at creation, kept for life), or `[]` when it has
 * none, which charges every price 1x.
 */
export async function readFeeBands(
	client: ClientWithCoreApi,
	marketId: string,
): Promise<FeeBand[]> {
	let cursor: string | null = null;
	for (let page = 0; page < 20; page++) {
		const res = await client.core.listDynamicFields({ parentId: marketId, cursor, limit: 50 });
		const entry = res.dynamicFields.find((f) => FEE_BANDS_KEY.test(f.name.type));
		if (entry) {
			const { dynamicField } = await client.core.getDynamicField({
				parentId: marketId,
				name: entry.name,
			});
			return feeBandsFromTriples(
				bcs
					.vector(bcs.u64())
					.parse(dynamicField.value.bcs)
					.map((v) => BigInt(v)),
			);
		}
		if (!res.hasNextPage || !res.cursor) return [];
		cursor = res.cursor;
	}
	throw new Error(`market ${marketId} lists too many dynamic fields to find its fee bands`);
}

const PayoutNodeField = bcs.struct('Field<u64,PayoutNode>', {
	id: bcs.Address,
	name: bcs.u64(),
	value: PayoutNode,
});

/**
 * Every finite boundary of a market's payout tree, in ascending tick order: one listing page per
 * 50 nodes plus one batched object read per page. Empty boundaries (both quantities zero, kept
 * while a waiting order pins them) are included.
 */
export async function readPayoutBoundaries(
	client: ClientWithCoreApi,
	tableId: string,
	opts: { maxPages?: number } = {},
): Promise<PayoutBoundary[]> {
	const maxPages = opts.maxPages ?? 100;
	const out: PayoutBoundary[] = [];
	let cursor: string | null = null;
	for (let page = 0; page < maxPages; page++) {
		const res = await client.core.listDynamicFields({ parentId: tableId, cursor, limit: 50 });
		const ids = res.dynamicFields.map((f) => f.fieldId);
		if (ids.length > 0) {
			const { objects } = await client.core.getObjects({
				objectIds: ids,
				include: { content: true },
			});
			for (const [i, obj] of objects.entries()) {
				if (obj instanceof Error || !obj.content) {
					throw new Error(`payout node ${ids[i]} could not be read`);
				}
				const field = PayoutNodeField.parse(obj.content);
				out.push({
					tick: BigInt(field.name),
					localStart: BigInt(field.value.local_start),
					localEnd: BigInt(field.value.local_end),
				});
			}
		}
		if (!res.hasNextPage || !res.cursor) {
			return out.sort((a, b) => (a.tick < b.tick ? -1 : a.tick > b.tick ? 1 : 0));
		}
		cursor = res.cursor;
	}
	throw new Error(`payout tree ${tableId} exceeded ${maxPages} pages: raise maxPages`);
}

/**
 * A market's object and its whole payout tree as one consistent state. The tree's nodes are
 * separate objects read page by page, so a trade landing between the reads could pair the cash of
 * one state with the liability of another. Every trade, fill and settlement takes the market
 * mutably, which bumps its version, so the read is kept only when the market's version is the same
 * before and after the nodes, and retried otherwise (`attempts`, default 3).
 */
export async function readMarketWithBook(
	client: ClientWithCoreApi,
	marketId: string,
	opts: { attempts?: number } = {},
): Promise<MarketObject & { boundaries: PayoutBoundary[] }> {
	const attempts = opts.attempts ?? 3;
	for (let attempt = 0; attempt < attempts; attempt++) {
		const market = await readMarketObject(client, marketId);
		const boundaries = await readPayoutBoundaries(client, market.payout.tableId);
		const { object } = await client.core.getObject({ objectId: marketId });
		const after = object.version == null ? null : String(object.version);
		if (after === market.version) return { ...market, boundaries };
	}
	throw new Error(
		`market ${marketId} changed while its payout tree was read, ${attempts} times: retry the read`,
	);
}
