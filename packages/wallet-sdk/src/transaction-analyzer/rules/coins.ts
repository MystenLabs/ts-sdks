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

function isCoinObject(obj: AnalyzedObject): boolean {
	const parsed = parseStructTag(obj.type);
	return (
		parsed.address === parsedCoinStruct.address &&
		parsed.module === parsedCoinStruct.module &&
		parsed.name === parsedCoinStruct.name &&
		parsed.typeParams.length === 1
	);
}

function toAnalyzedCoin(obj: AnalyzedObject): AnalyzedCoin {
	return {
		...obj,
		coinType: normalizeStructTag(parseStructTag(obj.type).typeParams[0]),
		balance: BigInt(Coin.parse(obj.content).balance),
	};
}

export const coins = createAnalyzer({
	dependencies: { objects },
	analyze:
		() =>
		({ objects }) => {
			const result: Record<string, AnalyzedCoin> = {};
			for (const obj of objects) {
				if (!isCoinObject(obj)) continue;
				result[obj.objectId] = toAnalyzedCoin(obj);
			}
			return { result };
		},
});

export const gasCoins = createAnalyzer({
	dependencies: { objectsById, data },
	analyze:
		() =>
		({ objectsById, data }) => {
			const result: AnalyzedCoin[] = [];
			for (const ref of data.gasData.payment ?? []) {
				const obj = objectsById.get(ref.objectId);
				if (!obj) continue;
				result.push(toAnalyzedCoin(obj));
			}
			return { result };
		},
});
