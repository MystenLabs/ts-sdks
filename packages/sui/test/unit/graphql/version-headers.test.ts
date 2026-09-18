// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { CLIENT_VERSION_HEADERS } from '../../../src/client/version-headers.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';

describe('GraphQL client version headers', () => {
	it('sends authoritative SDK and schema version headers', async () => {
		let headers: Headers | undefined;
		const client = new SuiGraphQLClient({
			url: 'http://localhost/graphql',
			network: 'testnet',
			headers: {
				'client-sdk-type': 'spoofed',
				'client-rpc-schema-date': '1970-01-01',
			},
			fetch: async (_input, init) => {
				headers = new Headers(init?.headers);
				return Response.json({ data: { chainIdentifier: 'test' } });
			},
		});

		await client.query({ query: '{ chainIdentifier }' });

		for (const [name, value] of Object.entries(CLIENT_VERSION_HEADERS)) {
			expect(headers?.get(name)).toBe(value);
		}
	});
});
