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

export interface CoinReservation {
	/** Address that owns the address-balance reservation (the gas payer). */
	owner: string;
	coinType: string;
	balance: bigint;
	ref: { objectId: string; version: string; digest: string };
}

/**
 * A coin-like value tracked by the analyzer. Real on-chain coin objects
 * have `reservation` absent; synthetic entries that come from a coin
 * reservation ref in `gasData.payment` have the full `CoinReservation`
 * attached so consumers can distinguish them.
 */
export type AnalyzedCoin = AnalyzedObject & {
	balance: bigint;
	coinType: string;
	reservation?: CoinReservation;
};

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

function makeReservationCoin(
	ref: { objectId: string; version: string | number; digest: string },
	owner: string | null,
): AnalyzedCoin {
	const suiType = normalizeStructTag('0x2::sui::SUI');
	const balance = parseCoinReservationBalance(ref.digest);
	return {
		objectId: ref.objectId,
		version: String(ref.version),
		digest: ref.digest,
		type: normalizeStructTag('0x2::coin::Coin<0x2::sui::SUI>'),
		owner: { $kind: 'AddressOwner', AddressOwner: owner ?? '' },
		content: new Uint8Array(),
		previousTransaction: undefined,
		objectBcs: undefined,
		json: undefined,
		display: undefined,
		ownerAddress: owner,
		coinType: suiType,
		balance,
		reservation: {
			owner: owner ?? '',
			coinType: suiType,
			balance,
			ref: {
				objectId: ref.objectId,
				version: String(ref.version),
				digest: ref.digest,
			},
		},
	};
}

export const gasCoins = createAnalyzer({
	dependencies: { objectsById, data },
	analyze:
		() =>
		({ objectsById, data }) => {
			const result: AnalyzedCoin[] = [];
			// Non-sponsored transactions don't need `gasData.owner` set
			// explicitly — the owner is implicitly the sender.
			const gasOwner = data.gasData.owner ?? data.sender ?? null;

			for (const ref of data.gasData.payment ?? []) {
				if (isCoinReservationDigest(ref.digest)) {
					result.push(makeReservationCoin(ref, gasOwner));
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

export const coins = createAnalyzer({
	dependencies: { objects, gasCoins, data },
	analyze:
		() =>
		({ objects, gasCoins, data }) => {
			const result: Record<string, AnalyzedCoin> = {};
			for (const obj of objects) {
				if (!isCoinObject(obj)) continue;
				result[obj.objectId] = {
					...obj,
					coinType: normalizeStructTag(parseStructTag(obj.type).typeParams[0]),
					balance: BigInt(Coin.parse(obj.content).balance),
				};
			}
			// Synthetic reservations can also appear as regular Object inputs
			// (not just in gas payment); they don't resolve on-chain so they
			// won't be in `objects`. Pick them up directly from data.inputs.
			const gasOwner = data.gasData.owner ?? data.sender ?? null;
			for (const input of data.inputs) {
				if (input.$kind !== 'Object') continue;
				const ref =
					input.Object.ImmOrOwnedObject ??
					input.Object.Receiving ??
					input.Object.SharedObject ??
					null;
				if (ref && 'digest' in ref && ref.digest && isCoinReservationDigest(ref.digest)) {
					result[ref.objectId] = makeReservationCoin(
						{
							objectId: ref.objectId,
							version: String(ref.version ?? '0'),
							digest: ref.digest,
						},
						gasOwner,
					);
				}
			}
			// Synthetic coin reservations from gasData.payment.
			for (const gc of gasCoins) {
				if (gc.reservation) {
					result[gc.objectId] = gc;
				}
			}
			return { result };
		},
});

/** Convenience view over {@link gasCoins} filtered to just the reservations. */
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
