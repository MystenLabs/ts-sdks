// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SuiGrpcClient } from '../../../src/grpc/index.js';
import {
	CLIENT_PROTOCOL_VERSION_HEADER,
	MAX_PROTOCOL_VERSION,
} from '../../../src/grpc/transport.js';

async function sentHeaders(meta?: Record<string, string>) {
	let headers: Headers | undefined;
	const client = new SuiGrpcClient({
		baseUrl: 'http://localhost',
		network: 'testnet',
		fetch: (async (_input: unknown, init: RequestInit) => {
			headers = new Headers(init.headers);

			return new Response(null, {
				status: 200,
				headers: { 'content-type': 'application/grpc-web+proto', 'grpc-status': '5' },
			});
		}) as unknown as typeof globalThis.fetch,
		meta,
	});

	await client.ledgerService.getServiceInfo({}).response.catch(() => {});

	return headers!;
}

describe('client protocol version header', () => {
	it('sends the max protocol version', async () => {
		const headers = await sentHeaders();

		expect(headers.get(CLIENT_PROTOCOL_VERSION_HEADER)).toBe(String(MAX_PROTOCOL_VERSION));
	});

	it('lets caller-supplied meta override it', async () => {
		const headers = await sentHeaders({ [CLIENT_PROTOCOL_VERSION_HEADER]: '7' });

		expect(headers.get(CLIENT_PROTOCOL_VERSION_HEADER)).toBe('7');
	});
});
