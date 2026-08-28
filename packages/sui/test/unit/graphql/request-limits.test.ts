// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { SuiGraphQLClient } from '../../../src/graphql/index.js';

function createClient() {
	const requests: Array<{ query: string; variables?: Record<string, unknown> }> = [];
	const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
		const request = JSON.parse(String(init?.body));
		requests.push(request);

		if (request.query.includes('query multiGetObjects')) {
			return Response.json({ data: { multiGetObjects: [] } });
		}

		throw new Error(`Unexpected GraphQL request: ${request.query}`);
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

describe('GraphQL request limits', () => {
	it('uses a conservative getObjects batch size', async () => {
		const { client, requests } = createClient();
		const objectIds = Array.from(
			{ length: 50 },
			(_, index) => `0x${index.toString(16).padStart(64, '0')}`,
		);

		const result = await client.core.getObjects({
			objectIds,
			include: { display: true, objectBcs: true },
		});

		expect(result.objects).toHaveLength(50);
		const objectRequests = requests.filter(({ query }) => query.includes('query multiGetObjects'));
		expect(objectRequests).toHaveLength(2);
		expect(
			objectRequests.map(
				({ variables }) =>
					(variables?.objectKeys as Array<{ address: string }> | undefined)?.length,
			),
		).toEqual([40, 10]);
		for (const request of objectRequests) {
			expect(new TextEncoder().encode(JSON.stringify(request)).byteLength).toBeLessThan(5_000);
		}
	});
});
