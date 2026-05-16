// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui/utils';
import {
	isCoinReservationDigest,
	parseAccumulatorFieldCoinType,
	parseCoinReservationBalance,
	xorCoinReservationObjectId,
} from '../coin-reservation.js';
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
	owner: string,
): AnalyzedObject {
	const balance = parseCoinReservationBalance(ref.digest);
	const content = Coin.serialize({ id: ref.objectId, balance }).toBytes();
	return {
		objectId: ref.objectId,
		version: String(ref.version ?? '0'),
		digest: ref.digest,
		type: normalizeStructTag(`0x2::coin::Coin<${coinType}>`),
		owner: { $kind: 'AddressOwner', AddressOwner: owner },
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

type FetchRequest =
	| { kind: 'regular'; id: string }
	| {
			kind: 'reservation';
			maskedId: string;
			unmaskedId: string;
			digest: string;
			version?: string | number | null;
	  };

function ownerAddressOf(
	owner: SuiClientTypes.ObjectOwner,
	issues: TransactionAnalysisIssue[],
): string | null {
	switch (owner.$kind) {
		case 'AddressOwner':
			return owner.AddressOwner;
		case 'ObjectOwner':
			return owner.ObjectOwner;
		case 'ConsensusAddressOwner':
			return owner.ConsensusAddressOwner.owner;
		case 'Shared':
		case 'Immutable':
			return null;
		default:
			issues.push({ message: `Unknown owner type: ${JSON.stringify(owner)}` });
			return null;
	}
}

export const objects = createAnalyzer({
	cacheKey: 'objects@1.0.0',
	dependencies: { objectIds, data },
	analyze:
		({ client }: { client: ClientWithCoreApi }) =>
		async ({ objectIds, data }) => {
			const issues: TransactionAnalysisIssue[] = [];
			const result: AnalyzedObject[] = [];
			const senderAddress = data.sender ? normalizeSuiAddress(data.sender) : null;

			// Input reservation refs need an accumulator-field lookup to resolve
			// their coin type; batch it into the same getObjects call.
			const requests: FetchRequest[] = objectIds.map((id) => ({ kind: 'regular', id }));
			let chainIdentifier: string | null = null;
			for (const input of data.inputs) {
				if (input.$kind !== 'Object' || input.Object.$kind !== 'ImmOrOwnedObject') continue;
				const { objectId, digest, version } = input.Object.ImmOrOwnedObject;
				if (!digest || !isCoinReservationDigest(digest)) continue;
				if (chainIdentifier == null) {
					chainIdentifier = (await client.core.getChainIdentifier()).chainIdentifier;
				}
				requests.push({
					kind: 'reservation',
					maskedId: objectId,
					unmaskedId: xorCoinReservationObjectId(objectId, chainIdentifier),
					digest,
					version,
				});
			}

			const fetchIds = Array.from(
				new Set(requests.map((r) => (r.kind === 'regular' ? r.id : r.unmaskedId))),
			);
			const { objects: fetched } = await client.core.getObjects({
				objectIds: fetchIds,
				include: { content: true },
			});
			const fetchedById = new Map(fetchIds.map((id, i) => [id, fetched[i]]));

			for (const req of requests) {
				if (req.kind === 'regular') {
					const obj = fetchedById.get(req.id);
					if (obj instanceof Error) {
						issues.push({ message: `Failed to fetch object: ${obj.message}`, error: obj });
						continue;
					}
					if (!obj) continue;
					result.push({ ...obj, ownerAddress: ownerAddressOf(obj.owner, issues) });
					continue;
				}

				const obj = fetchedById.get(req.unmaskedId);
				if (!obj || obj instanceof Error) {
					issues.push({
						message: `Coin reservation object ${req.maskedId} could not be resolved`,
					});
					continue;
				}
				const coinType = parseAccumulatorFieldCoinType(obj.type);
				if (!coinType) {
					issues.push({
						message: `Coin reservation object ${req.maskedId} (accumulator id ${req.unmaskedId}) is not a balance accumulator field (type ${obj.type})`,
					});
					continue;
				}
				if (!senderAddress) {
					issues.push({
						message: `Coin reservation input ${req.maskedId} present but transaction has no sender`,
					});
					continue;
				}
				result.push(
					makeReservationObject(
						{ objectId: req.maskedId, digest: req.digest, version: req.version },
						coinType,
						senderAddress,
					),
				);
			}

			// Gas-payment reservations: always Coin<SUI>, owned by the gas payer.
			const gasReservationOwner = data.gasData.owner
				? normalizeSuiAddress(data.gasData.owner)
				: senderAddress;
			for (const ref of data.gasData.payment ?? []) {
				if (!ref.digest || !isCoinReservationDigest(ref.digest)) continue;
				if (!gasReservationOwner) {
					issues.push({
						message: `Gas payment includes a coin reservation but the transaction has no gas owner or sender`,
					});
					continue;
				}
				result.push(
					makeReservationObject(
						{ objectId: ref.objectId, digest: ref.digest, version: ref.version },
						SUI_TYPE,
						gasReservationOwner,
					),
				);
			}

			if (issues.length) return { issues };
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
