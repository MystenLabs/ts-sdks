// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';

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
	const { events } = await client.core.listEvents({
		filter: { eventType },
		limit: DEFAULT_QUERY_LIMIT,
		order: 'descending',
	});

	return events.map((event) => ({ json: event.json }));
}
