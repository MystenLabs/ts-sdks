// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi } from '@mysten/sui/client';
import { graphql } from '@mysten/sui/graphql/schema';

export function isJsonRpcClient(client: ClientWithCoreApi): client is ClientWithCoreApi & {
	queryEvents: (params: { query: { MoveEventType: string } }) => Promise<{
		data: Array<{ parsedJson: unknown }>;
	}>;
} {
	return 'queryEvents' in client && typeof client.queryEvents === 'function';
}

export function isGraphQLClient(client: ClientWithCoreApi): client is ClientWithCoreApi & {
	query: <Result = unknown>(options: {
		query: unknown;
		variables?: Record<string, unknown>;
	}) => Promise<{ data?: Result; errors?: unknown[] }>;
} {
	return 'query' in client && typeof client.query === 'function';
}

export async function queryEvents(
	client: ClientWithCoreApi,
	eventType: string,
): Promise<{ json: unknown }[]> {
	if (isJsonRpcClient(client)) {
		const events = await client.queryEvents({
			query: { MoveEventType: eventType },
		});

		return events.data?.map((d) => ({ json: d.parsedJson })) ?? [];
	}

	if (isGraphQLClient(client)) {
		type GraphQLEventsResponse = {
			events: {
				nodes: Array<{
					contents: {
						json: unknown;
					} | null;
				}>;
			} | null;
		};

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

		const result = await client.query<GraphQLEventsResponse>({
			query,
			variables: { eventType },
		});

		return (
			result.data?.events?.nodes.map((event) => ({
				json: event.contents?.json,
			})) ?? []
		);
	}

	throw new Error(
		'Event querying is not supported by this client type. ' +
			'JSON-RPC and GraphQL clients support event querying, but gRPC does not. ' +
			'Please use a JSON-RPC or GraphQL client, or provide the required IDs directly.',
	);
}
