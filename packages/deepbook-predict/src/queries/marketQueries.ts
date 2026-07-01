// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';

import * as expiryMarket from '../contracts/deepbook_predict/expiry_market.js';
import * as propbookRegistry from '../contracts/propbook/registry.js';
import type { PricerFeeds } from '../transactions/trade.js';
import type { QueryContext } from './context.js';
import {
	parseBool,
	parseOptionAddress,
	parseU32,
	parseU64,
	type SimulateResult,
} from './decode.js';

/** Decoded scalar state of an expiry market (raw on-chain units). */
export interface MarketState {
	propbookUnderlyingId: number;
	expiry: bigint;
	tickSize: bigint;
	cashBalance: bigint;
	requiredCash: bigint;
	mintPaused: boolean;
}

/**
 * On-chain reads of expiry-market state via `client.core.simulateTransaction`. These
 * getters take the market object directly (no `&Account` borrow), so they compose in
 * a single inspect PTB.
 */
export class MarketQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	get #predictPackageId() {
		return this.#ctx.config.ids.predictPackageId;
	}

	async #simulate(tx: Transaction): Promise<SimulateResult> {
		return this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});
	}

	/** Read the scalar state fields of a market in one inspect. */
	async getMarketState(market: string): Promise<MarketState> {
		const pkg = this.#predictPackageId;
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(expiryMarket.propbookUnderlyingId({ package: pkg, arguments: { market } }));
		tx.add(expiryMarket.expiry({ package: pkg, arguments: { market } }));
		tx.add(expiryMarket.tickSize({ package: pkg, arguments: { market } }));
		tx.add(expiryMarket.cashBalance({ package: pkg, arguments: { market } }));
		tx.add(expiryMarket.requiredCash({ package: pkg, arguments: { market } }));
		tx.add(expiryMarket.mintPaused({ package: pkg, arguments: { market } }));

		const res = await this.#simulate(tx);
		return {
			propbookUnderlyingId: parseU32(res, 0),
			expiry: parseU64(res, 1),
			tickSize: parseU64(res, 2),
			cashBalance: parseU64(res, 3),
			requiredCash: parseU64(res, 4),
			mintPaused: parseBool(res, 5),
		};
	}

	/**
	 * Resolve the four canonical propbook feed ids for a market's underlying (for
	 * {@link PricerFeeds}). Throws if any feed is unbound.
	 */
	async resolveFeeds(market: string, propbookUnderlyingId?: number): Promise<PricerFeeds> {
		const underlyingId =
			propbookUnderlyingId ?? (await this.getMarketState(market)).propbookUnderlyingId;
		const pkg = this.#ctx.config.ids.propbookPackageId;
		const registry = this.#ctx.config.ids.oracleRegistryId;
		const args = { registry, propbookUnderlyingId: underlyingId };

		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(propbookRegistry.propbookPythIdForUnderlying({ package: pkg, arguments: args }));
		tx.add(
			propbookRegistry.propbookBlockScholesSpotIdForUnderlying({ package: pkg, arguments: args }),
		);
		tx.add(
			propbookRegistry.propbookBlockScholesForwardIdForUnderlying({
				package: pkg,
				arguments: args,
			}),
		);
		tx.add(
			propbookRegistry.propbookBlockScholesSviIdForUnderlying({ package: pkg, arguments: args }),
		);

		const res = await this.#simulate(tx);
		const pyth = parseOptionAddress(res, 0);
		const bsSpot = parseOptionAddress(res, 1);
		const bsForward = parseOptionAddress(res, 2);
		const bsSvi = parseOptionAddress(res, 3);
		if (!pyth || !bsSpot || !bsForward || !bsSvi) {
			throw new Error(`market ${market} has unbound propbook feeds for underlying ${underlyingId}`);
		}
		return { pyth, bsSpot, bsForward, bsSvi };
	}

	/**
	 * Exact live NAV of a market. Loads a pricer and reads `current_nav` in one inspect.
	 * Pass `feeds` to skip the feed-resolution round trip.
	 */
	async currentNav(market: string, feeds?: PricerFeeds): Promise<bigint> {
		const resolved = feeds ?? (await this.resolveFeeds(market));
		const pkg = this.#predictPackageId;
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		const pricer = tx.add(
			expiryMarket.loadLivePricer({
				package: pkg,
				arguments: {
					market,
					config: this.#ctx.config.ids.protocolConfigId,
					propbookRegistry: this.#ctx.config.ids.oracleRegistryId,
					pyth: resolved.pyth,
					bsSpot: resolved.bsSpot,
					bsForward: resolved.bsForward,
					bsSvi: resolved.bsSvi,
				},
			}),
		);
		tx.add(expiryMarket.currentNav({ package: pkg, arguments: { market, pricer } }));

		const res = await this.#simulate(tx);
		return parseU64(res, 1);
	}
}
