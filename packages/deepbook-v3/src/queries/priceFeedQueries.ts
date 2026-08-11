// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import { PriceInfoObject } from '../contracts/pyth/price_info.js';
import { SuiPriceServiceConnection, SuiPythClient } from '../pyth/pyth.js';
import { PRICE_INFO_OBJECT_MAX_AGE_MS } from '../utils/config.js';
import { ConfigurationError } from '../utils/errors.js';
import type { QueryContext } from './context.js';

export class PriceFeedQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	/**
	 * The Hermes endpoint serving the Pyth deployment margin is configured against. The
	 * upgraded deployment is served by a different Hermes than legacy Core, so it must be
	 * set explicitly on the `pythUpgraded` config — there is no network-derived default
	 * for it.
	 */
	#hermesEndpoint(): string {
		const configured = this.#ctx.config.activePyth.hermesEndpoint;
		if (configured) {
			return configured;
		}

		if (this.#ctx.config.usesUpgradedPyth) {
			throw new ConfigurationError(
				"No hermesEndpoint configured for Pyth's upgraded Core. Set 'pythUpgraded.hermesEndpoint' to the endpoint serving the upgraded deployment before pushing price updates.",
			);
		}

		return this.#ctx.config.network === 'testnet'
			? 'https://hermes-beta.pyth.network'
			: 'https://hermes.pyth.network';
	}

	/**
	 * A Hermes connection for the active Pyth deployment, carrying any configured auth
	 * headers. The endpoint serving the upgraded Core requires an `Authorization` header
	 * and answers 401 without one.
	 */
	#connection(): SuiPriceServiceConnection {
		const { hermesHeaders } = this.#ctx.config.activePyth;
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

		const priceIDs = [this.#ctx.config.getCoin(coinKey).feed!];

		const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIDs);

		const { pythStateId, wormholeStateId } = this.#ctx.config.activePyth;

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

		const staleFeedIds: string[] = [];
		const feedIdToCoinKey: Record<string, string> = {};
		for (const coinKey of staleCoinKeys) {
			const feedId = this.#ctx.config.getCoin(coinKey).feed!;
			staleFeedIds.push(feedId);
			feedIdToCoinKey[feedId] = coinKey;
		}

		const connection = this.#connection();

		const priceUpdateData = await connection.getPriceFeedsUpdateData(staleFeedIds);

		const { pythStateId, wormholeStateId } = this.#ctx.config.activePyth;
		const pythClient = new SuiPythClient(this.#ctx.client, pythStateId, wormholeStateId);

		const updatedObjectIds = await pythClient.updatePriceFeeds(tx, priceUpdateData, staleFeedIds);

		for (let i = 0; i < staleFeedIds.length; i++) {
			const coinKey = feedIdToCoinKey[staleFeedIds[i]];
			result[coinKey] = updatedObjectIds[i];
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
