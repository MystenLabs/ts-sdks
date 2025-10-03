// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { objects, objectsById } from './objects.js';
import type { AnalyzedObject } from './objects.js';
import { createAnalyzer } from '../analyzer.js';
import { normalizeStructTag, parseStructTag } from '@mysten/sui/utils';
import { data } from '../core.js';

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
			if (objects.issues) {
				return { issues: objects.issues };
			}

			return {
				result: Object.fromEntries(
					await Promise.all(
						objects.result
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
									obj.id,
									{
										...obj,
										coinType: normalizeStructTag(parseStructTag(obj.type).typeParams[0]),
										balance: BigInt(Coin.parse(await obj.content).balance),
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
			if (objectsById.issues || data.issues) {
				return { issues: [...(objectsById.issues ?? []), ...(data.issues ?? [])] };
			}

			return {
				result: await Promise.all(
					(data.result.gasData.payment ?? []).map(async (coin) => {
						const obj = objectsById.result.get(coin.objectId)!;
						const content = Coin.parse(await obj.content);
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
