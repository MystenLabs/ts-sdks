// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import {
	isCoinReservationDigest,
	normalizeStructTag,
	parseCoinReservationBalance,
} from '@mysten/sui/utils';
import { createAnalyzer } from '../analyzer.js';
import type { TransactionAnalysisIssue } from '../analyzer.js';

import { data } from './core.js';

/**
 * BCS layout of `Coin<T> { id: UID, balance: Balance<T> }` — 32-byte id
 * followed by an 8-byte u64 balance. Exported so the `coins` rule can share
 * the same struct definition.
 */
export const Coin = bcs.struct('Coin', {
	id: bcs.Address,
	balance: bcs.U64,
});

export type AnalyzedObject = SuiClientTypes.Object<{
	content: true;
}> & {
	ownerAddress: string | null;
	/**
	 * True for synthetic entries that stand in for a coin reservation ref.
	 * Reservation "objects" don't exist on-chain — their balance is encoded
	 * in the digest — so consumers should avoid treating `content` / `objectBcs`
	 * as meaningful for these entries.
	 */
	isCoinReservation?: boolean;
};

export const objectIds = createAnalyzer({
	dependencies: { data },
	analyze:
		() =>
		({ data }) => {
			const issues: TransactionAnalysisIssue[] = [];

			const inputs = data.inputs
				.filter((input): input is Extract<typeof input, { $kind: 'Object' }> => {
					switch (input.$kind) {
						case 'UnresolvedObject':
						case 'UnresolvedPure':
							issues.push({ message: `Unexpected unresolved input: ${JSON.stringify(input)}` });
							return false;
						case 'Pure':
						case 'FundsWithdrawal':
							return false;
						case 'Object':
							return true;
						default:
							issues.push({ message: `Unknown input type: ${JSON.stringify(input)}` });
							return false;
					}
				})
				.map((input) => {
					switch (input.Object.$kind) {
						case 'ImmOrOwnedObject':
							return input.Object.ImmOrOwnedObject.objectId;
						case 'SharedObject':
							return input.Object.SharedObject.objectId;
						case 'Receiving':
							return input.Object.Receiving.objectId;
						default:
							throw new Error(`Unknown object type: ${JSON.stringify(input)}`);
					}
				});

			if (issues.length) {
				return { issues };
			}

			// Exclude synthetic coin-reservation refs from the on-chain fetch —
			// they don't exist as objects and are synthesized in `objects`.
			const gasObjects =
				data.gasData.payment
					?.filter((obj) => !isCoinReservationDigest(obj.digest))
					.map((obj) => obj.objectId) || [];

			return {
				result: Array.from(new Set([...inputs, ...gasObjects])),
			};
		},
});

function makeReservationObject(
	ref: { objectId: string; digest: string; version?: string | number | null },
	owner: string | null,
): AnalyzedObject {
	// A reservation's balance is encoded in the digest; we can synthesize
	// valid Coin BCS content for it so downstream `Coin.parse(content)` works
	// uniformly with real coins.
	const balance = parseCoinReservationBalance(ref.digest);
	const content = Coin.serialize({ id: ref.objectId, balance }).toBytes();
	return {
		objectId: ref.objectId,
		version: String(ref.version ?? '0'),
		digest: ref.digest,
		type: normalizeStructTag('0x2::coin::Coin<0x2::sui::SUI>'),
		owner: { $kind: 'AddressOwner', AddressOwner: owner ?? '' },
		content,
		previousTransaction: undefined,
		objectBcs: undefined,
		json: undefined,
		display: undefined,
		ownerAddress: owner,
		isCoinReservation: true,
	};
}

export const objects = createAnalyzer({
	cacheKey: 'objects@1.0.0',
	dependencies: { objectIds, data },
	analyze:
		({ client }: { client: ClientWithCoreApi }) =>
		async ({ objectIds, data }) => {
			const { objects } = await client.core.getObjects({
				objectIds,
				include: {
					content: true,
				},
			});

			const issues: TransactionAnalysisIssue[] = [];

			const foundObjects = objects.filter(
				(
					obj,
				): obj is SuiClientTypes.Object<{
					content: true;
				}> => {
					if (obj instanceof Error) {
						issues.push({ message: `Failed to fetch object: ${obj.message}`, error: obj });
						return false;
					}

					return true;
				},
			);

			const result: AnalyzedObject[] = foundObjects.map((obj) => {
				let ownerAddress: string | null = null;
				switch (obj.owner.$kind) {
					case 'AddressOwner':
						ownerAddress = obj.owner.AddressOwner;
						break;
					case 'ObjectOwner':
						ownerAddress = obj.owner.ObjectOwner;
						break;
					case 'ConsensusAddressOwner':
						ownerAddress = obj.owner.ConsensusAddressOwner.owner;
						break;
					case 'Shared':
					case 'Immutable':
						ownerAddress = null;
						break;
					default:
						issues.push({ message: `Unknown owner type: ${JSON.stringify(obj.owner)}` });
				}

				return { ...obj, ownerAddress };
			});

			// Synthesize AnalyzedObject entries for coin reservation refs so
			// downstream consumers can iterate `objects` / look up `objectsById`
			// uniformly without special-casing reservations.
			const gasOwner = data.gasData.owner ?? data.sender ?? null;
			const seen = new Set(result.map((o) => o.objectId));
			for (const ref of data.gasData.payment ?? []) {
				if (!ref.digest || !isCoinReservationDigest(ref.digest)) continue;
				if (seen.has(ref.objectId)) continue;
				result.push(
					makeReservationObject(
						{ objectId: ref.objectId, digest: ref.digest, version: ref.version },
						gasOwner,
					),
				);
				seen.add(ref.objectId);
			}

			if (issues.length) {
				return { issues };
			}

			return { result };
		},
});

export const ownedObjects = createAnalyzer({
	dependencies: { objects },
	analyze:
		() =>
		({ objects }) => {
			return { result: objects.filter((obj) => obj.ownerAddress !== null) };
		},
});

export const objectsById = createAnalyzer({
	dependencies: { objects },
	analyze:
		() =>
		({ objects }) => ({
			result: new Map(objects.map((obj) => [obj.objectId, obj])),
		}),
});
