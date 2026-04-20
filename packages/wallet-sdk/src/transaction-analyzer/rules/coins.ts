// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { objects, objectsById } from './objects.js';
import type { AnalyzedObject } from './objects.js';
import { createAnalyzer } from '../analyzer.js';
import {
	isCoinReservationDigest,
	normalizeStructTag,
	parseCoinReservationBalance,
	parseStructTag,
} from '@mysten/sui/utils';
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
			const SUI_TYPE = normalizeStructTag('0x2::sui::SUI');
			const result: AnalyzedCoin[] = [];

			for (const ref of data.gasData.payment ?? []) {
				// Synthetic coin reservation refs encode their balance in the digest
				if (isCoinReservationDigest(ref.digest)) {
					result.push({
						objectId: ref.objectId,
						version: String(ref.version),
						digest: ref.digest,
						type: normalizeStructTag('0x2::coin::Coin<0x2::sui::SUI>'),
						owner: { $kind: 'AddressOwner', AddressOwner: data.sender ?? '' },
						content: new Uint8Array(),
						previousTransaction: undefined,
						objectBcs: undefined,
						json: undefined,
						display: undefined,
						ownerAddress: data.sender ?? null,
						coinType: SUI_TYPE,
						balance: parseCoinReservationBalance(ref.digest),
					});
					continue;
				}

				const obj = objectsById.get(ref.objectId)!;
				const content = Coin.parse(obj.content);
				result.push({
					...obj,
					coinType: normalizeStructTag(parseStructTag(obj.type).typeParams[0]),
					balance: BigInt(content.balance),
				});
			}

			return { result };
		},
});
