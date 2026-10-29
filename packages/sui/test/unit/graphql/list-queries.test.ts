// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { SuiGraphQLClient } from '../../../src/graphql/index.js';

interface PageInfo {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startCursor: string | null;
	endCursor: string | null;
}

function event(n: number) {
	return {
		sequenceNumber: n,
		transaction: { digest: `digest-${n}`, effects: { checkpoint: { sequenceNumber: 100 + n } } },
		transactionModule: { package: { address: '0x2' }, name: 'test' },
		sender: { address: '0x1' },
		contents: { type: { repr: '0x2::test::Event' }, bcs: '', json: null },
	};
}

function eventsClient(
	pageInfo: PageInfo,
	cursors: string[],
	node: (index: number) => ReturnType<typeof event> | object = event,
) {
	const fetch = vi.fn(async () => {
		return Response.json({
			data: {
				events: {
					pageInfo,
					edges: cursors.map((cursor) => ({ cursor })),
					nodes: cursors.map((_, index) => node(index)),
				},
			},
		});
	});
	return {
		client: new SuiGraphQLClient({
			url: 'https://graphql.test.invalid',
			network: 'unknown',
			fetch,
		}),
	};
}

function page(pageInfo: Partial<PageInfo>): PageInfo {
	return {
		hasNextPage: false,
		hasPreviousPage: false,
		startCursor: null,
		endCursor: null,
		...pageInfo,
	};
}

describe('GraphQL list page cursors', () => {
	it('drops the cursors of an empty final page', async () => {
		const { client } = eventsClient(page({ startCursor: 'scan', endCursor: 'scan' }), []);
		expect(await client.core.listEvents({ filter: { sender: '0x1' } })).toEqual({
			events: [],
			hasNextPage: false,
			startCursor: null,
			endCursor: null,
		});
	});

	it('ends a final page at its last item, not at the scan position', async () => {
		const { client } = eventsClient(page({ startCursor: 'a', endCursor: 'scan' }), ['a', 'b']);
		const result = await client.core.listEvents({});
		expect(result).toMatchObject({ hasNextPage: false, startCursor: 'a', endCursor: 'b' });
	});

	it('reports an event without a checkpoint as null', async () => {
		const { client } = eventsClient(page({ startCursor: 'a', endCursor: 'a' }), ['a'], (n) => ({
			...event(n),
			transaction: { digest: `digest-${n}`, effects: { checkpoint: null } },
		}));
		const { events } = await client.core.listEvents({});
		expect(events[0].checkpoint).toBeNull();
	});

	it('continues a page that stopped early from the scan position', async () => {
		const { client } = eventsClient(page({ hasNextPage: true, endCursor: 'scan' }), []);
		expect(await client.core.listEvents({})).toMatchObject({
			hasNextPage: true,
			startCursor: null,
			endCursor: 'scan',
		});
	});

	it('continues a descending page that stopped early from the scan position', async () => {
		const { client } = eventsClient(page({ hasPreviousPage: true, startCursor: 'scan' }), []);
		expect(await client.core.listEvents({ order: 'descending', before: 'y' })).toMatchObject({
			hasNextPage: true,
			startCursor: null,
			endCursor: 'scan',
		});
	});

	it('takes descending cursors from the start of the page', async () => {
		const { client } = eventsClient(
			page({ hasPreviousPage: true, startCursor: 'a', endCursor: 'scan' }),
			['a', 'b'],
		);
		expect(await client.core.listEvents({ order: 'descending', limit: 2 })).toMatchObject({
			hasNextPage: true,
			startCursor: 'b',
			endCursor: 'a',
		});
	});

	it('ends an empty page that returns the cursor it was sent', async () => {
		const ascending = eventsClient(page({ hasNextPage: true, endCursor: 'x' }), []);
		expect(await ascending.client.core.listEvents({ after: 'x', before: 'y' })).toMatchObject({
			hasNextPage: false,
			endCursor: null,
		});

		const descending = eventsClient(page({ hasPreviousPage: true, startCursor: 'y' }), []);
		expect(
			await descending.client.core.listEvents({ after: 'x', before: 'y', order: 'descending' }),
		).toMatchObject({ hasNextPage: false, endCursor: null });
	});
});
