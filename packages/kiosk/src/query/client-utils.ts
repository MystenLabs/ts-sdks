// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import { isSuiGraphQLClient } from '@mysten/sui/graphql';

import type { ObjectWithDisplay } from '../types/kiosk.js';
import type { KioskCompatibleClient } from '../types/index.js';

const DEFAULT_QUERY_LIMIT = 50;

export async function getAllObjects(
	client: KioskCompatibleClient,
	ids: string[],
): Promise<ObjectWithDisplay[]> {
	if (ids.length === 0) return [];

	const { objects } = await client.core.getObjects({
		objectIds: ids,
		include: {
			content: true,
			previousTransaction: true,
			display: true,
		},
	});

	return objects
		.filter(
			(
				object,
			): object is SuiClientTypes.Object<{
				content: true;
				previousTransaction: true;
				display: true;
			}> => !(object instanceof Error),
		)
		.map((object) => ({
			...object,
			previousTransaction: object.previousTransaction ?? null,
			display: object.display
				? {
						data: object.display.output,
						error: object.display.errors ? JSON.stringify(object.display.errors) : null,
					}
				: undefined,
		}));
}

export async function queryEvents(
	client: KioskCompatibleClient,
	eventType: string,
): Promise<{ json: unknown }[]> {
	// Preserve the windows returned by the previously transport-specific implementations.
	const order = isSuiGraphQLClient(client) ? 'ascending' : 'descending';
	const events: SuiClientTypes.EventEntry[] = [];
	let cursor: string | null = null;

	while (true) {
		const page = await client.core.listEvents({
			filter: { eventType },
			limit: DEFAULT_QUERY_LIMIT,
			order,
			...(cursor ? (order === 'descending' ? { before: cursor } : { after: cursor }) : {}),
		});

		events.push(...page.events);
		if (!page.hasNextPage) break;

		if (!page.endCursor || page.endCursor === cursor) {
			throw new Error('Event query did not return a cursor for the next page');
		}
		cursor = page.endCursor;
	}

	return events.map((event) => ({ json: event.json }));
}
