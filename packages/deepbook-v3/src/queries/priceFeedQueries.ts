// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import { PriceInfoObject } from '../contracts/pyth/price_info.js';
import { SuiPriceServiceConnection, SuiPythClient } from '../pyth/pyth.js';
import { PRICE_INFO_OBJECT_MAX_AGE_MS } from '../utils/config.js';
import type { QueryContext } from './context.js';

export class PriceFeedQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	async getPriceInfoObject(tx: Transaction, coinKey: string): Promise<string> {
		this.#ctx.config.requirePyth();
		const currentTime = Date.now();
		const priceInfoObjectAge = await this.getPriceInfoObjectAge(coinKey);
		if (
			priceInfoObjectAge &&
			currentTime - priceInfoObjectAge * 1000 < PRICE_INFO_OBJECT_MAX_AGE_MS
		) {
			return await this.#ctx.config.getCoin(coinKey).priceInfoObjectId!;
		}

		const endpoint =
			this.#ctx.config.network === 'testnet'
				? 'https://hermes-beta.pyth.network'
				: 'https://hermes.pyth.network';
		const connection = new SuiPriceServiceConnection(endpoint);

		const priceIDs = [this.#ctx.config.getCoin(coinKey).feed!];

		const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIDs);

		const wormholeStateId = this.#ctx.config.pyth.wormholeStateId;
		const pythStateId = this.#ctx.config.pyth.pythStateId;

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
			const priceInfoObjectId = this.#ctx.config.getCoin(coinKey).priceInfoObjectId!;
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

		const endpoint =
			this.#ctx.config.network === 'testnet'
				? 'https://hermes-beta.pyth.network'
				: 'https://hermes.pyth.network';
		const connection = new SuiPriceServiceConnection(endpoint);

		const priceUpdateData = await connection.getPriceFeedsUpdateData(staleFeedIds);

		const wormholeStateId = this.#ctx.config.pyth.wormholeStateId;
		const pythStateId = this.#ctx.config.pyth.pythStateId;
		const pythClient = new SuiPythClient(this.#ctx.client, pythStateId, wormholeStateId);

		const updatedObjectIds = await pythClient.updatePriceFeeds(tx, priceUpdateData, staleFeedIds);

		for (let i = 0; i < staleFeedIds.length; i++) {
			const coinKey = feedIdToCoinKey[staleFeedIds[i]];
			result[coinKey] = updatedObjectIds[i];
		}

		return result;
	}

	async getPriceInfoObjectAge(coinKey: string): Promise<number> {
		const priceInfoObjectId = this.#ctx.config.getCoin(coinKey).priceInfoObjectId!;
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
