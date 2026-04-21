// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { isCoinReservationDigest } from '@mysten/sui/utils';
import { createAnalyzer } from '../analyzer.js';
import type { TransactionAnalysisIssue } from '../analyzer.js';

import { data } from './core.js';

export type AnalyzedObject = SuiClientTypes.Object<{
	content: true;
}> & {
	ownerAddress: string | null;
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
				.flatMap((input): string[] => {
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
					// Synthetic reservation refs don't exist on-chain — skip them.
					if (digest && isCoinReservationDigest(digest)) return [];
					return [objectId];
				});

			if (issues.length) {
				return { issues };
			}

			// Exclude synthetic coin reservation refs (they don't exist on-chain)
			const gasObjects =
				data.gasData.payment
					?.filter((obj) => !isCoinReservationDigest(obj.digest))
					.map((obj) => obj.objectId) || [];

			return {
				result: Array.from(new Set([...inputs, ...gasObjects])),
			};
		},
});

export const objects = createAnalyzer({
	cacheKey: 'objects@1.0.0',
	dependencies: { objectIds },
	analyze:
		({ client }: { client: ClientWithCoreApi }) =>
		async ({ objectIds }) => {
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

			const result = foundObjects.map((obj) => {
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
