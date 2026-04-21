// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import {
	isCoinReservationDigest,
	normalizeStructTag,
	normalizeSuiAddress,
	parseAccumulatorFieldCoinType,
	parseCoinReservationBalance,
	unmaskCoinReservationObjectId,
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
	coinType: string,
	owner: string | null,
): AnalyzedObject {
	const balance = parseCoinReservationBalance(ref.digest);
	const content = Coin.serialize({ id: ref.objectId, balance }).toBytes();
	return {
		objectId: ref.objectId,
		version: String(ref.version ?? '0'),
		digest: ref.digest,
		type: normalizeStructTag(`0x2::coin::Coin<${coinType}>`),
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

const SUI_TYPE = normalizeStructTag('0x2::sui::SUI');

interface InputReservation {
	maskedId: string;
	digest: string;
	version?: string | number | null;
	unmaskedId: string;
}

export const objects = createAnalyzer({
	cacheKey: 'objects@1.0.0',
	dependencies: { objectIds, data },
	analyze:
		({ client }: { client: ClientWithCoreApi }) =>
		async ({ objectIds, data }) => {
			const issues: TransactionAnalysisIssue[] = [];

			// Gather input reservation refs; their coin type has to be resolved by
			// fetching the underlying accumulator field (unmasked id). We batch
			// those lookups into the same `getObjects` request as the regular inputs.
			const inputReservations: InputReservation[] = [];
			let chainIdentifier: string | null = null;
			for (const input of data.inputs) {
				if (input.$kind !== 'Object') continue;
				if (input.Object.$kind !== 'ImmOrOwnedObject') continue;
				const { objectId, digest, version } = input.Object.ImmOrOwnedObject;
				if (!digest || !isCoinReservationDigest(digest)) continue;
				if (chainIdentifier == null) {
					chainIdentifier = (await client.core.getChainIdentifier()).chainIdentifier;
				}
				inputReservations.push({
					maskedId: objectId,
					digest,
					version,
					unmaskedId: unmaskCoinReservationObjectId(objectId, chainIdentifier),
				});
			}

			const unmaskedIds = inputReservations.map((r) => r.unmaskedId);
			const combinedIds = Array.from(new Set([...objectIds, ...unmaskedIds]));

			const { objects: fetched } = await client.core.getObjects({
				objectIds: combinedIds,
				include: { content: true },
			});

			const fetchedById = new Map<string, SuiClientTypes.Object<{ content: true }>>();
			combinedIds.forEach((id, i) => {
				const obj = fetched[i];
				if (obj instanceof Error) {
					// Skip missing accumulator objects silently — they just mean the
					// reservation can't be resolved and will be reported below.
					if (!unmaskedIds.includes(id)) {
						issues.push({ message: `Failed to fetch object: ${obj.message}`, error: obj });
					}
					return;
				}
				fetchedById.set(id, obj);
			});

			const result: AnalyzedObject[] = [];
			const seen = new Set<string>();

			for (const id of objectIds) {
				const obj = fetchedById.get(id);
				if (!obj) continue;
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
				result.push({ ...obj, ownerAddress });
				seen.add(id);
			}

			// Input reservation refs are owned by the sender at execution
			// (`CoinReservationResolver::resolve_funds_withdrawal` rejects otherwise).
			const senderAddress = data.sender ? normalizeSuiAddress(data.sender) : null;
			for (const reservation of inputReservations) {
				if (seen.has(reservation.maskedId)) continue;
				const accumulator = fetchedById.get(reservation.unmaskedId);
				if (!accumulator) {
					issues.push({
						message: `Coin reservation object ${reservation.maskedId} could not be resolved`,
					});
					continue;
				}
				const coinType = parseAccumulatorFieldCoinType(accumulator.type);
				if (!coinType) {
					issues.push({
						message: `Object at unmasked reservation id ${reservation.unmaskedId} is not a balance accumulator field (type ${accumulator.type})`,
					});
					continue;
				}
				result.push(
					makeReservationObject(
						{
							objectId: reservation.maskedId,
							digest: reservation.digest,
							version: reservation.version,
						},
						coinType,
						senderAddress,
					),
				);
				seen.add(reservation.maskedId);
			}

			// Gas-payment reservations are always Coin<SUI> (gas is SUI-only) and
			// owned by the gas payer; synthesized locally without a lookup.
			const gasReservationOwner = data.gasData.owner ?? data.sender ?? null;
			for (const ref of data.gasData.payment ?? []) {
				if (!ref.digest || !isCoinReservationDigest(ref.digest)) continue;
				if (seen.has(ref.objectId)) continue;
				result.push(
					makeReservationObject(
						{ objectId: ref.objectId, digest: ref.digest, version: ref.version },
						SUI_TYPE,
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
