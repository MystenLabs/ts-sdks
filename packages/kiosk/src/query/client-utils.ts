// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { graphql } from '@mysten/sui/graphql/schema';
import { isSuiGraphQLClient } from '@mysten/sui/graphql';
import { isSuiJsonRpcClient } from '@mysten/sui/jsonRpc';

export async function queryEvents(
	client: ClientWithCoreApi,
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
