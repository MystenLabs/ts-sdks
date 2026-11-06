// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { SuiGraphQLClient } from '../../../src/graphql/index.js';

const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);

function event(n: number) {
	return {
		transactionModule: { package: { address: '0x2' }, name: 'test' },
		sender: { address: '0x1' },
		contents: { type: { repr: `0x2::test::E${n}` }, bcs: '', json: null },
	};
}

function objectChange(n: number) {
	return {
		address: `0x${n}`,
		outputState: { asMoveObject: { contents: { type: { repr: `0x2::test::O${n}` } } } },
	};
}

const page = <Node>(nodes: Node[], endCursor: string | null) => ({
	pageInfo: { hasNextPage: endCursor !== null, endCursor },
	nodes,
});

function transaction(digest: string, effects: Record<string, unknown>) {
	return {
		digest,
		signatures: [],
		effects: { status: 'SUCCESS', checkpoint: { sequenceNumber: 10 }, ...effects },
	};
}

// A nested list holds at most 50 entries and no page info, so a full one is read again by digest.
const transactions: Record<string, ReturnType<typeof transaction>> = {
	manyEvents: transaction('manyEvents', { events: { nodes: range(0, 50).map(event) } }),
	fiftyEvents: transaction('fiftyEvents', { events: { nodes: range(0, 50).map(event) } }),
	oneEvent: transaction('oneEvent', { events: { nodes: [event(0)] } }),
	manyObjects: transaction('manyObjects', {
		objectChanges: { nodes: range(0, 50).map(objectChange) },
	}),
};
const eventPages: Record<string, Record<string, ReturnType<typeof page>>> = {
	manyEvents: { start: page(range(0, 50).map(event), 'c1'), c1: page([event(50)], null) },
	fiftyEvents: { start: page(range(0, 50).map(event), null) },
};
const objectChangePages: Record<string, ReturnType<typeof page>> = {
	start: page(range(0, 50).map(objectChange), 'o1'),
	o1: page([objectChange(50)], null),
};

function client() {
	const requests: { query: string; variables: Record<string, any> }[] = [];
	const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
		const request = JSON.parse(init!.body as string);
		requests.push(request);
		const { digest, after } = request.variables;
		if (request.query.includes('query getTransactionObjectChanges')) {
			const objectChanges = objectChangePages[after ?? 'start'];
			return Response.json({ data: { transaction: { effects: { objectChanges } } } });
		}
		if (request.query.includes('query getTransactionEvents')) {
			const events = eventPages[digest][after ?? 'start'];
			return Response.json({ data: { transaction: { effects: { events } } } });
		}
		if (request.query.includes('query listTransactions')) {
			return Response.json({
				data: {
					transactions: {
						pageInfo: {
							hasNextPage: false,
							hasPreviousPage: false,
							startCursor: 'a',
							endCursor: 'b',
						},
						edges: [{ cursor: 'a' }, { cursor: 'b' }],
						nodes: [transactions.manyEvents, transactions.oneEvent],
					},
				},
			});
		}
		return Response.json({ data: { transaction: transactions[digest] } });
	});
	return {
		client: new SuiGraphQLClient({
			url: 'https://graphql.test.invalid',
			network: 'unknown',
			fetch,
		}),
		requests,
	};
}

const eventCount = (result: { Transaction?: { events?: unknown[] } }) =>
	result.Transaction?.events?.length;

describe('GraphQL transaction events and object changes', () => {
	it('reads every page of events for getTransaction', async () => {
		const { client: graphql, requests } = client();
		const result = await graphql.core.getTransaction({
			digest: 'manyEvents',
			include: { events: true },
		});
		expect(result.Transaction?.events.map(({ eventType }) => eventType.split('::').at(-1))).toEqual(
			range(0, 51).map((n) => `E${n}`),
		);
		expect(requests).toHaveLength(3);
	});

	it('reads every page of events for listTransactions', async () => {
		const { client: graphql, requests } = client();
		const result = await graphql.core.listTransactions({ include: { events: true } });
		expect(result.transactions.map(eventCount)).toEqual([51, 1]);
		expect(requests).toHaveLength(3);
	});

	it('reads a transaction with exactly 50 events once more', async () => {
		const { client: graphql, requests } = client();
		const result = await graphql.core.getTransaction({
			digest: 'fiftyEvents',
			include: { events: true },
		});
		expect(eventCount(result)).toBe(50);
		expect(requests).toHaveLength(2);
	});

	it('makes no extra request for a list shorter than a page', async () => {
		const { client: graphql, requests } = client();
		const result = await graphql.core.getTransaction({
			digest: 'oneEvent',
			include: { events: true },
		});
		expect(eventCount(result)).toBe(1);
		expect(requests).toHaveLength(1);
	});

	it('reads every page of object changes for objectTypes', async () => {
		const { client: graphql, requests } = client();
		const result = await graphql.core.getTransaction({
			digest: 'manyObjects',
			include: { objectTypes: true },
		});
		expect(Object.keys(result.Transaction!.objectTypes)).toHaveLength(51);
		expect(result.Transaction!.objectTypes['0x50']).toBe('0x2::test::O50');
		expect(requests).toHaveLength(3);
	});
});
