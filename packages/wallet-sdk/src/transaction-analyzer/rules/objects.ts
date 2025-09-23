// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { Analyzer } from '../analyzer.js';

// SPDX-License-Identifier: Apache-2.0
export type AnalyzedObject = Experimental_SuiClientTypes.ObjectResponse & {
	ownerAddress: string | null;
};

export const objectAnalyzers: {
	objects: Analyzer<AnalyzedObject[]>;
	ownedObjects: Analyzer<AnalyzedObject[]>;
	objectsById: Analyzer<Map<string, AnalyzedObject>>;
	objectIds: Analyzer<string[]>;
} = {
	objectIds:
		() =>
		async ({ get, addIssue }) => {
			const data = await get('data');

			const inputs = data.inputs
				.filter((input): input is Extract<typeof input, { $kind: 'Object' }> => {
					switch (input.$kind) {
						case 'UnresolvedObject':
						case 'UnresolvedPure':
							addIssue({ message: `Unexpected unresolved input: ${JSON.stringify(input)}` });
							return false;
						case 'Pure':
							return false;
						case 'Object':
							return true;
						default:
							addIssue({ message: `Unknown input type: ${JSON.stringify(input)}` });
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

			const gasObjects = data.gasData.payment?.map((obj) => obj.objectId) || [];

			return Array.from(new Set([...inputs, ...gasObjects]));
		},
	objects:
		(_tx, client) =>
		async ({ get, addIssue }) => {
			const { objects } = await client.core.getObjects({
				objectIds: await get('objectIds'),
			});

			const foundObjects = objects.filter(
				(obj): obj is Experimental_SuiClientTypes.ObjectResponse => {
					if (obj instanceof Error) {
						addIssue({ message: `Failed to fetch object: ${obj.message}`, error: obj });
						return false;
					}

					return true;
				},
			);

			return foundObjects.map((obj) => {
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
						addIssue({ message: `Unknown owner type: ${JSON.stringify(obj.owner)}` });
				}

				return { ...obj, ownerAddress };
			});
		},
	ownedObjects:
		() =>
		async ({ get, addIssue }) => {
			const objects = await get('objects');

			return objects.filter((obj) => {
				switch (obj.owner.$kind) {
					case 'AddressOwner':
					case 'ObjectOwner':
					case 'ConsensusAddressOwner':
						return true;
					case 'Shared':
					case 'Immutable':
						return false;
					default:
						addIssue({ message: `Unknown owner type: ${JSON.stringify(obj.owner)}` });
						return false;
				}
			});
		},
	objectsById:
		() =>
		async ({ get }) =>
			new Map((await get('objects')).map((obj) => [obj.id, obj])),
};
