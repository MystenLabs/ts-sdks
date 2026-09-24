// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import {
	CLIENT_PROTOCOL_VERSION_HEADER,
	MAX_PROTOCOL_VERSION,
} from '../../../src/client/protocol-version.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';

describe('client protocol version header', () => {
	it.each<{ headers?: Record<string, string>; expected: string }>([
		{ headers: undefined, expected: String(MAX_PROTOCOL_VERSION) },
		{ headers: { [CLIENT_PROTOCOL_VERSION_HEADER]: '7' }, expected: '7' },
		{ headers: { 'X-Sui-Client-Protocol-Version': '8' }, expected: '8' },
	])('sends protocol version $expected', async ({ headers, expected }) => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockResolvedValue(Response.json({ data: { serviceConfig: {} } }));
		const client = new SuiGraphQLClient({
			url: 'http://localhost/graphql',
			network: 'testnet',
			fetch,
			headers: { Authorization: 'Bearer token', ...headers },
		});

		await client.query({ query: '{ serviceConfig { maxQueryDepth } }', variables: {} });

		const sentHeaders = new Headers(fetch.mock.calls[0][1]?.headers);
		expect(sentHeaders.get(CLIENT_PROTOCOL_VERSION_HEADER)).toBe(expected);
		expect(sentHeaders.get('Authorization')).toBe('Bearer token');
		expect(sentHeaders.get('Content-Type')).toBe('application/json');
	});
});
