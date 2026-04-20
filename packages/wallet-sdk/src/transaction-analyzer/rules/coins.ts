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
		({ objectsById, data }) => {
			const result: AnalyzedCoin[] = [];

			for (const ref of data.gasData.payment ?? []) {
				// Synthetic coin reservation refs don't represent real on-chain coins;
				// they're exposed separately via the `coinReservations` rule.
				if (isCoinReservationDigest(ref.digest)) continue;

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

export interface CoinReservation {
	/** Address that owns the address-balance reservation (the gas payer). */
	owner: string;
	coinType: string;
	balance: bigint;
	ref: { objectId: string; version: string; digest: string };
}

/**
 * Synthetic coin reservation refs that may appear in `gasData.payment`. Each
 * represents a pre-authorized withdrawal from the owner's address balance
 * accumulator. The balance is encoded in the ref's digest, and the object
 * does not exist on-chain — hence why these are kept separate from `gasCoins`.
 */
export const coinReservations = createAnalyzer({
	dependencies: { data },
	analyze:
		() =>
		({ data }) => {
			const result: CoinReservation[] = [];
			// Non-sponsored transactions don't need `gasData.owner` set explicitly —
			// the owner is implicitly the sender. Fall back accordingly.
			const gasOwner = data.gasData.owner ?? data.sender;
			if (!gasOwner) return { result };

			const suiType = normalizeStructTag('0x2::sui::SUI');

			for (const ref of data.gasData.payment ?? []) {
				if (!isCoinReservationDigest(ref.digest)) continue;
				result.push({
					owner: gasOwner,
					coinType: suiType,
					balance: parseCoinReservationBalance(ref.digest),
					ref: {
						objectId: ref.objectId,
						version: String(ref.version),
						digest: ref.digest,
					},
				});
			}

			return { result };
		},
});
