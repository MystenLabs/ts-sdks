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

export interface CoinReservation {
	/** Address that owns the address-balance reservation (the gas payer). */
	owner: string;
	coinType: string;
	balance: bigint;
	ref: { objectId: string; version: string; digest: string };
}

/**
 * A coin appearing in `gasData.payment`. Real gas coins are regular
 * `AnalyzedCoin`s; synthetic coin reservations come back with an additional
 * `reservation` field that carries the reservation details — absent on
 * real coins, present on reservations.
 */
export type GasCoin = AnalyzedCoin & { reservation?: CoinReservation };

export const gasCoins = createAnalyzer({
	dependencies: { objectsById, data },
	analyze:
		() =>
		({ objectsById, data }) => {
			const result: GasCoin[] = [];
			// Non-sponsored transactions don't need `gasData.owner` set
			// explicitly — the owner is implicitly the sender.
			const gasOwner = data.gasData.owner ?? data.sender ?? null;
			const suiType = normalizeStructTag('0x2::sui::SUI');

			for (const ref of data.gasData.payment ?? []) {
				if (isCoinReservationDigest(ref.digest)) {
					const balance = parseCoinReservationBalance(ref.digest);
					const reservation: CoinReservation = {
						owner: gasOwner ?? '',
						coinType: suiType,
						balance,
						ref: {
							objectId: ref.objectId,
							version: String(ref.version),
							digest: ref.digest,
						},
					};
					result.push({
						objectId: ref.objectId,
						version: String(ref.version),
						digest: ref.digest,
						type: normalizeStructTag('0x2::coin::Coin<0x2::sui::SUI>'),
						owner: { $kind: 'AddressOwner', AddressOwner: gasOwner ?? '' },
						content: new Uint8Array(),
						previousTransaction: undefined,
						objectBcs: undefined,
						json: undefined,
						display: undefined,
						ownerAddress: gasOwner,
						coinType: suiType,
						balance,
						reservation,
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

/**
 * Just the synthetic coin reservations from `gasData.payment`. A convenience
 * view over `gasCoins` for consumers that only care about reservation
 * metadata (e.g. display / debugging) and don't want to filter the full list.
 */
export const coinReservations = createAnalyzer({
	dependencies: { gasCoins },
	analyze:
		() =>
		({ gasCoins }) => {
			const result: CoinReservation[] = [];
			for (const coin of gasCoins) {
				if (coin.reservation) result.push(coin.reservation);
			}
			return { result };
		},
});
