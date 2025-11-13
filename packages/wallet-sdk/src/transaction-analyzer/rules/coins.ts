// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { objects, objectsById } from './objects.js';
import type { AnalyzedObject } from './objects.js';
import { createAnalyzer } from '../analyzer.js';
import { normalizeStructTag, parseStructTag } from '@mysten/sui/utils';
import { data } from './core.js';

export type AnalyzedCoin = AnalyzedObject & { balance: bigint; coinType: string };

export const Coin = bcs.struct('Coin', {
	id: bcs.Address,
	balance: bcs.U64,
});
const parsedCoinStruct = parseStructTag('0x2::coin::Coin<0x2::sui::SUI>');

export const coins = createAnalyzer({
	dependencies: { objects },
	analyze:
		() =>
		async ({ objects }) => {
			return {
				result: Object.fromEntries(
					await Promise.all(
						objects
							.filter((obj) => {
								const parsed = parseStructTag(obj.type);
								return (
									parsed.address === parsedCoinStruct.address &&
									parsed.module === parsedCoinStruct.module &&
									parsed.name === parsedCoinStruct.name &&
									parsed.typeParams.length === 1
								);
							})
							.map(async (obj) => {
								return [
									obj.objectId,
									{
										...obj,
										coinType: normalizeStructTag(parseStructTag(obj.type).typeParams[0]),
										balance: BigInt(Coin.parse(obj.content).balance),
									},
								];
							}),
					),
				),
			};
		},
});

export const gasCoins = createAnalyzer({
	dependencies: { objectsById, data },
	analyze:
		() =>
		async ({ objectsById, data }) => {
			return {
				result: await Promise.all(
					(data.gasData.payment ?? []).map(async (coin) => {
						const obj = objectsById.get(coin.objectId)!;
						const content = Coin.parse(obj.content);
						return {
							...obj,
							coinType: normalizeStructTag(parseStructTag(obj.type).typeParams[0]),
							balance: BigInt(content.balance),
						};
					}),
				),
			};
		},
});
