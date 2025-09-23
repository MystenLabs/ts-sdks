// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/dist/cjs/bcs/index.js';
import type { AnalyzedObject } from './objects.js';
import type { Analyzer } from '../analyzer.js';
import { normalizeStructTag, parseStructTag } from '@mysten/sui/dist/cjs/utils/index.js';

export type AnalyzedCoin = AnalyzedObject & { balance: bigint; coinType: string };

export const Coin = bcs.struct('Coin', {
	id: bcs.Address,
	balance: bcs.U64,
});

export const coinsAnalyzer: Analyzer<Record<string, AnalyzedCoin>> = () => {
	const parsedCoinType = parseStructTag('0x2::sui::SUI');

	return async ({ get }) => {
		const objects = await get('objects');

		return Object.fromEntries(
			await Promise.all(
				objects
					.filter((obj) => {
						const parsed = parseStructTag(obj.type);
						return parsed.address === parsedCoinType.address &&
							parsed.module === parsedCoinType.module &&
							parsed.name === parsedCoinType.name
							? true
							: false;
					})
					.map(async (obj) => {
						const content = Coin.parse(await obj.content);
						return [
							obj.id,
							{
								...obj,
								coinType: normalizeStructTag(parseStructTag(obj.type).typeParams[0]),
								balance: BigInt(content.balance),
							},
						];
					}),
			),
		);
	};
};

export const gasCoinsAnalyzer: Analyzer<AnalyzedCoin[]> = () => {
	return async ({ getAll }) => {
		const [objects, data] = await getAll('objectsById', 'data');

		return Promise.all(
			(data.gasData.payment ?? []).map(async (coin) => {
				const obj = objects.get(coin.objectId)!;
				const content = Coin.parse(await obj.content);
				return {
					...obj,
					coinType: normalizeStructTag(parseStructTag(obj.type).typeParams[0]),
					balance: BigInt(content.balance),
				};
			}),
		);
	};
};
