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
	 * Reservations don't exist on-chain — their balance is encoded in the
	 * digest — so `objectBcs` is undefined and `content` is synthesized.
	 */
	isCoinReservation?: boolean;
};

export const objectIds = createAnalyzer({
	dependencies: { data },
	analyze:
		() =>
		({ data }) => {
			const issues: TransactionAnalysisIssue[] = [];

			const inputObjectIds: string[] = [];
			for (const input of data.inputs) {
				switch (input.$kind) {
					case 'UnresolvedObject':
					case 'UnresolvedPure':
						issues.push({ message: `Unexpected unresolved input: ${JSON.stringify(input)}` });
						continue;
					case 'Pure':
					case 'FundsWithdrawal':
						continue;
					case 'Object': {
						let objectId: string;
						let digest: string | null | undefined;
						switch (input.Object.$kind) {
							case 'ImmOrOwnedObject':
								objectId = input.Object.ImmOrOwnedObject.objectId;
								digest = input.Object.ImmOrOwnedObject.digest;
								break;
							case 'SharedObject':
								objectId = input.Object.SharedObject.objectId;
								digest = null;
								break;
							case 'Receiving':
								objectId = input.Object.Receiving.objectId;
								digest = input.Object.Receiving.digest;
								break;
							default:
								throw new Error(`Unknown object type: ${JSON.stringify(input)}`);
						}
						if (digest && isCoinReservationDigest(digest)) continue;
						inputObjectIds.push(objectId);
						continue;
					}
					default:
						issues.push({ message: `Unknown input type: ${JSON.stringify(input)}` });
				}
			}

			if (issues.length) return { issues };

			const gasObjectIds =
				data.gasData.payment
					?.filter((obj) => !isCoinReservationDigest(obj.digest))
					.map((obj) => obj.objectId) ?? [];

			return {
				result: Array.from(new Set([...inputObjectIds, ...gasObjectIds])),
			};
		},
});

function makeReservationObject(
	ref: { objectId: string; digest: string; version?: string | number | null },
	owner: string | null,
): AnalyzedObject {
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

			// Gas payment is always SUI, so reservation refs in gas payment are
			// always Coin<SUI>. Reservation refs as regular Object inputs are a
			// legacy form that would require an on-chain accumulator lookup to
			// resolve their type — modern PTBs use typed `FundsWithdrawal` inputs.
			const gasReservationOwner = data.gasData.owner ?? data.sender ?? null;
			const seen = new Set(result.map((o) => o.objectId));
			for (const ref of data.gasData.payment ?? []) {
				if (!ref.digest || !isCoinReservationDigest(ref.digest)) continue;
				if (seen.has(ref.objectId)) continue;
				result.push(
					makeReservationObject(
						{ objectId: ref.objectId, digest: ref.digest, version: ref.version },
						gasReservationOwner,
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
