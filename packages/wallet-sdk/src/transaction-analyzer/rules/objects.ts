// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { createAnalyzer } from '../analyzer.js';
import type { TransactionAnalysisIssue } from '../analyzer.js';

import { data } from './core.js';

export type AnalyzedObject = SuiClientTypes.ObjectResponse & {
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

			const gasObjects = data.gasData.payment?.map((obj) => obj.objectId) || [];

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
			});

			const issues: TransactionAnalysisIssue[] = [];

			const foundObjects = objects.filter((obj): obj is SuiClientTypes.ObjectResponse => {
				if (obj instanceof Error) {
					issues.push({ message: `Failed to fetch object: ${obj.message}`, error: obj });
					return false;
				}

				return true;
			});

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
			result: new Map(objects.map((obj) => [obj.id, obj])),
		}),
});
