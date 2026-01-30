// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import { graphql } from '@mysten/sui/graphql/schema';
import { isSuiGraphQLClient } from '@mysten/sui/graphql';
import { isSuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { normalizeStructTag } from '@mysten/sui/utils';
import { chunk, fromBase64 } from '@mysten/utils';

import type { KioskDisplay, ObjectWithDisplay } from '../types/kiosk.js';
import type { KioskCompatibleClient } from '../types/index.js';

const DEFAULT_QUERY_LIMIT = 50;

const FetchObjectsWithDisplayQuery = graphql(`
	query FetchObjectsWithDisplay($objectKeys: [ObjectKey!]!) {
		multiGetObjects(keys: $objectKeys) {
			address
			digest
			version
			asMoveObject {
				contents {
					bcs
					type {
						repr
					}
					display {
						output
						errors
					}
				}
			}
			asMovePackage {
				__typename
			}
			owner {
				__typename
				... on AddressOwner {
					address {
						address
					}
				}
				... on ObjectOwner {
					address {
						address
					}
				}
				... on Shared {
					initialSharedVersion
				}
				... on ConsensusAddressOwner {
					startVersion
					address {
						address
					}
				}
			}
			previousTransaction {
				digest
			}
		}
	}
`);

export async function getAllObjects(
	client: KioskCompatibleClient,
	ids: string[],
): Promise<ObjectWithDisplay[]> {
	if (ids.length === 0) return [];

	const chunks = chunk(ids, DEFAULT_QUERY_LIMIT);
	const results: ObjectWithDisplay[] = [];

	if (isSuiGraphQLClient(client)) {
		for (const batch of chunks) {
			const { data } = await client.query({
				query: FetchObjectsWithDisplayQuery,
				variables: {
					objectKeys: batch.map((address) => ({ address })),
				},
			});

			if (data?.multiGetObjects) {
				for (const obj of data.multiGetObjects) {
					if (!obj) continue;

					let type: string;
					if (obj.asMovePackage) {
						type = 'package';
					} else if (obj.asMoveObject?.contents?.type?.repr) {
						type = obj.asMoveObject.contents.type.repr;
					} else {
						type = '';
					}

					const bcsContent = obj.asMoveObject?.contents?.bcs
						? fromBase64(obj.asMoveObject.contents.bcs)
						: undefined;

					const displayData = obj.asMoveObject?.contents?.display;
					const display: KioskDisplay | undefined = displayData
						? {
								data: (displayData.output as Record<string, string> | null) ?? null,
								error: displayData.errors ? JSON.stringify(displayData.errors) : null,
							}
						: undefined;

					results.push({
						objectId: obj.address,
						version: obj.version?.toString()!,
						digest: obj.digest!,
						type,
						content: bcsContent!,
						owner: mapGraphQLOwner(obj.owner!),
						previousTransaction: (obj.previousTransaction?.digest ?? null)!,
						objectBcs: undefined,
						json: undefined,
						display,
					});
				}
			}
		}

		return results;
	}

	if (isSuiJsonRpcClient(client)) {
		for (const batch of chunks) {
			const responses = await client.multiGetObjects({
				ids: batch,
				options: {
					showDisplay: true,
					showBcs: true,
					showType: true,
					showOwner: true,
					showPreviousTransaction: true,
				},
			});

			for (const resp of responses) {
				if (!resp.data) continue;
				const obj = resp.data;

				const bcsContent =
					obj.bcs?.dataType === 'moveObject' ? fromBase64(obj.bcs.bcsBytes) : undefined;

				const type =
					obj.type && obj.type.includes('::') ? normalizeStructTag(obj.type) : (obj.type ?? '');

				const display: KioskDisplay | undefined = obj.display
					? {
							data: obj.display.data ?? null,
							error: obj.display.error ? JSON.stringify(obj.display.error) : null,
						}
					: undefined;

				results.push({
					objectId: obj.objectId,
					version: obj.version,
					digest: obj.digest,
					type,
					content: bcsContent!,
					owner: parseJsonRpcOwner(obj.owner!),
					previousTransaction: (obj.previousTransaction ?? null)!,
					objectBcs: undefined,
					json: undefined,
					display,
				});
			}
		}

		return results;
	}

	throw new Error(
		'Object fetching requires a JSON-RPC or GraphQL client. ' +
			'gRPC clients are not supported by the kiosk SDK.',
	);
}

function parseJsonRpcOwner(owner: NonNullable<unknown>): SuiClientTypes.ObjectOwner {
	if (owner === 'Immutable') {
		return { $kind: 'Immutable', Immutable: true } as SuiClientTypes.ObjectOwner;
	}

	const ownerObj = owner as Record<string, any>;

	if ('ConsensusAddressOwner' in ownerObj) {
		return {
			$kind: 'ConsensusAddressOwner',
			ConsensusAddressOwner: {
				owner: ownerObj.ConsensusAddressOwner.owner,
				startVersion: ownerObj.ConsensusAddressOwner.start_version,
			},
		} as SuiClientTypes.ObjectOwner;
	}

	if ('AddressOwner' in ownerObj) {
		return {
			$kind: 'AddressOwner',
			AddressOwner: ownerObj.AddressOwner,
		} as SuiClientTypes.ObjectOwner;
	}

	if ('ObjectOwner' in ownerObj) {
		return {
			$kind: 'ObjectOwner',
			ObjectOwner: ownerObj.ObjectOwner,
		} as SuiClientTypes.ObjectOwner;
	}

	if ('Shared' in ownerObj) {
		return {
			$kind: 'Shared',
			Shared: {
				initialSharedVersion: ownerObj.Shared.initial_shared_version,
			},
		} as SuiClientTypes.ObjectOwner;
	}

	throw new Error(`Unknown owner type: ${JSON.stringify(owner)}`);
}

function mapGraphQLOwner(
	owner: NonNullable<unknown> & { __typename?: string },
): SuiClientTypes.ObjectOwner {
	const o = owner as Record<string, any>;
	switch (o.__typename) {
		case 'AddressOwner':
			return {
				$kind: 'AddressOwner',
				AddressOwner: o.address?.address!,
			} as SuiClientTypes.ObjectOwner;
		case 'ObjectOwner':
			return {
				$kind: 'ObjectOwner',
				ObjectOwner: o.address?.address!,
			} as SuiClientTypes.ObjectOwner;
		case 'Immutable':
			return { $kind: 'Immutable', Immutable: true } as SuiClientTypes.ObjectOwner;
		case 'Shared':
			return {
				$kind: 'Shared',
				Shared: { initialSharedVersion: String(o.initialSharedVersion) },
			} as SuiClientTypes.ObjectOwner;
		case 'ConsensusAddressOwner':
			return {
				$kind: 'ConsensusAddressOwner',
				ConsensusAddressOwner: {
					owner: o.address?.address!,
					startVersion: String(o.startVersion),
				},
			} as SuiClientTypes.ObjectOwner;
		default:
			throw new Error(`Unknown GraphQL owner type: ${o.__typename}`);
	}
}

export async function queryEvents(
	client: KioskCompatibleClient,
	eventType: string,
): Promise<{ json: unknown }[]> {
	if (isSuiGraphQLClient(client)) {
		const query = graphql(`
			query QueryEvents($eventType: String!) {
				events(filter: { eventType: $eventType }, first: 50) {
					nodes {
						contents {
							json
						}
					}
				}
			}
		`);

		const result = await client.query({
			query,
			variables: { eventType },
		});

		return (
			result.data?.events?.nodes.map((event) => ({
				json: event.contents?.json,
			})) ?? []
		);
	}

	if (isSuiJsonRpcClient(client)) {
		const events = await client.queryEvents({
			query: { MoveEventType: eventType },
		});

		return events.data?.map((d) => ({ json: d.parsedJson })) ?? [];
	}

	throw new Error(
		'Event querying is not supported by this client type. ' +
			'JSON-RPC and GraphQL clients support event querying, but gRPC does not. ' +
			'Please use a JSON-RPC or GraphQL client, or provide the required IDs directly.',
	);
}
