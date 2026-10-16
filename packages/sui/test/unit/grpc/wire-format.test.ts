// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SuiGrpcClient } from '../../../src/grpc/index.js';

async function sentContentType(format?: 'text' | 'binary') {
	let headers: Headers | undefined;
	const client = new SuiGrpcClient({
		baseUrl: 'http://localhost',
		network: 'testnet',
		...(format ? { format } : {}),
		fetch: (async (_input: unknown, init: RequestInit) => {
			headers = new Headers(init.headers);
			return new Response(null, {
				status: 200,
				headers: { 'content-type': 'application/grpc-web+proto', 'grpc-status': '5' },
			});
		}) as unknown as typeof globalThis.fetch,
	});

	await client.ledgerService.getServiceInfo({}).response.catch(() => {});

	return headers!.get('content-type');
}

describe('SuiGrpcClient gRPC-web wire format', () => {
	it('defaults to binary framing', async () => {
		expect(await sentContentType()).toBe('application/grpc-web+proto');
	});

	it('uses base64 text framing when format is text', async () => {
		expect(await sentContentType('text')).toBe('application/grpc-web-text');
	});
});
