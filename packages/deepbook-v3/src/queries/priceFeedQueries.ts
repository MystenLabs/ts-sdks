// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import { PriceInfoObject } from '../contracts/pyth/price_info.js';
import { SuiPriceServiceConnection, SuiPythClient } from '../pyth/pyth.js';
import { PRICE_INFO_OBJECT_MAX_AGE_MS } from '../utils/config.js';
import { DEEPBOOK_HERMES_PROXY, PYTH_UPGRADED_HERMES } from '../utils/constants.js';
import { ConfigurationError } from '../utils/errors.js';
import type { QueryContext } from './context.js';

export class PriceFeedQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	/**
	 * The Hermes endpoint serving the Pyth deployment margin is configured against.
	 *
	 * In `'upgraded'` mode there are two routes, chosen by whether the caller brought
	 * credentials. With `hermesHeaders` set, the SDK talks to Pyth directly and no DeepBook
	 * infrastructure is in the path — note the token is then sent to Pyth's own host, so a
	 * token minted for some other endpoint must be paired with an explicit `hermesEndpoint`.
	 * Without headers it falls back to the DeepBook-operated proxy, which supplies
	 * credentials server-side; that proxy is not deployed yet, so today this path throws a
	 * `ConfigurationError` instead. An explicit `hermesEndpoint` overrides both.
	 */
	#hermesEndpoint(): string {
		const { hermesEndpoint, hermesHeaders } = this.#ctx.config.pyth;
		if (hermesEndpoint) {
			return hermesEndpoint;
		}

		if (hermesHeaders) {
			return PYTH_UPGRADED_HERMES;
		}
		if (DEEPBOOK_HERMES_PROXY) {
			return DEEPBOOK_HERMES_PROXY;
		}

		throw new ConfigurationError(
			"Pushing price updates against Pyth's upgraded Core needs credentials: its Hermes answers 401 unauthenticated. Set 'pyth.hermesHeaders' to { Authorization: `Bearer <pyth-token>` }, or set 'pyth.hermesEndpoint' to an endpoint that supplies them.",
		);
	}

	/**
	 * A Hermes connection for the active Pyth deployment, carrying any configured auth
	 * headers. The endpoint serving the upgraded Core requires an `Authorization` header
	 * and answers 401 without one.
	 */
	#connection(): SuiPriceServiceConnection {
		const { hermesHeaders } = this.#ctx.config.pyth;
		return new SuiPriceServiceConnection(
			this.#hermesEndpoint(),
			hermesHeaders ? { headers: hermesHeaders } : undefined,
		);
	}

	async getPriceInfoObject(tx: Transaction, coinKey: string): Promise<string> {
		this.#ctx.config.requirePyth();
		const currentTime = Date.now();
		const priceInfoObjectAge = await this.getPriceInfoObjectAge(coinKey);
		if (
			priceInfoObjectAge &&
			currentTime - priceInfoObjectAge * 1000 < PRICE_INFO_OBJECT_MAX_AGE_MS
		) {
			return this.#ctx.config.getPriceInfoObjectId(coinKey);
		}

		const connection = this.#connection();

		const priceIDs = [this.#ctx.config.getFeedId(coinKey)];

		const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIDs);

		const { pythStateId, wormholeStateId } = this.#ctx.config.pyth;

		const client = new SuiPythClient(this.#ctx.client, pythStateId, wormholeStateId);

		return (await client.updatePriceFeeds(tx, priceUpdateData, priceIDs))[0];
	}

	async getPriceInfoObjects(tx: Transaction, coinKeys: string[]): Promise<Record<string, string>> {
		this.#ctx.config.requirePyth();
		if (coinKeys.length === 0) {
			return {};
		}

		const currentTime = Date.now();

		const coinToObjectId: Record<string, string> = {};
		const objectIds: string[] = [];
		for (const coinKey of coinKeys) {
			const priceInfoObjectId = this.#ctx.config.getPriceInfoObjectId(coinKey);
			coinToObjectId[coinKey] = priceInfoObjectId;
			objectIds.push(priceInfoObjectId);
		}

		const res = await this.#ctx.client.core.getObjects({
			objectIds,
			include: { content: true },
		});

		const staleCoinKeys: string[] = [];
		const result: Record<string, string> = {};

		for (let i = 0; i < coinKeys.length; i++) {
			const coinKey = coinKeys[i];
			const obj = res.objects[i];

			if (obj instanceof Error || !obj?.content) {
				staleCoinKeys.push(coinKey);
				continue;
			}

			const priceInfoObject = PriceInfoObject.parse(obj.content);
			const arrivalTime = Number(priceInfoObject.price_info.arrival_time);
			const age = currentTime - arrivalTime * 1000;

			if (age >= PRICE_INFO_OBJECT_MAX_AGE_MS) {
				staleCoinKeys.push(coinKey);
			} else {
				result[coinKey] = coinToObjectId[coinKey];
			}
		}

		if (staleCoinKeys.length === 0) {
			return result;
		}

		// Distinct coins can share a feed. No shipped map has a collision today, but `coins`
		// is a public constructor option and coins that track the same underlying are the
		// normal case for it — testnet DBTC already prices off the generic BTC/USD feed.
		// Deduplicate before building the update:
		// a feed listed twice would emit two `update_single_price_feed` calls against the same
		// object off one hot-potato vector, and pay two update fees for it. One feed can also
		// map to several coins, so the reverse index holds a list, not a single key.
		const staleFeedIds: string[] = [];
		const feedIdToCoinKeys: Record<string, string[]> = {};
		for (const coinKey of staleCoinKeys) {
			const feedId = this.#ctx.config.getFeedId(coinKey);
			if (!feedIdToCoinKeys[feedId]) {
				feedIdToCoinKeys[feedId] = [];
				staleFeedIds.push(feedId);
			}
			feedIdToCoinKeys[feedId].push(coinKey);
		}

		const connection = this.#connection();

		const priceUpdateData = await connection.getPriceFeedsUpdateData(staleFeedIds);

		const { pythStateId, wormholeStateId } = this.#ctx.config.pyth;
		const pythClient = new SuiPythClient(this.#ctx.client, pythStateId, wormholeStateId);

		const updatedObjectIds = await pythClient.updatePriceFeeds(tx, priceUpdateData, staleFeedIds);

		for (let i = 0; i < staleFeedIds.length; i++) {
			for (const coinKey of feedIdToCoinKeys[staleFeedIds[i]]) {
				result[coinKey] = updatedObjectIds[i];
			}
		}

		return result;
	}

	async getPriceInfoObjectAge(coinKey: string): Promise<number> {
		const priceInfoObjectId = this.#ctx.config.getPriceInfoObjectId(coinKey);
		const res = await this.#ctx.client.core.getObject({
			objectId: priceInfoObjectId,
			include: {
				content: true,
			},
		});

		if (!res.object?.content) {
			throw new Error(`Price info object not found for ${coinKey}`);
		}

		const priceInfoObject = PriceInfoObject.parse(res.object.content);
		return Number(priceInfoObject.price_info.arrival_time);
	}
}
