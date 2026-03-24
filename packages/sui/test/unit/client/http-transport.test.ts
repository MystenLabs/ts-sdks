// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JsonRpcHTTPTransport } from '../../../src/jsonRpc/index.js';
import { PACKAGE_VERSION, TARGETED_RPC_VERSION } from '../../../src/version.js';

describe('JsonRpcHTTPTransport', () => {
	describe('rpc requests', () => {
		const mockResult = { data: 123 };
		let requestId = 0;

		const fetch = vi.fn(() => {
			requestId += 1;
			return Promise.resolve(
				new Response(
					new TextEncoder().encode(
						JSON.stringify({
							jsonrpc: '2.0',
							result: mockResult,
							id: requestId,
						}),
					),
					{
						status: 200,
					},
				),
			);
		});

		const transport = new JsonRpcHTTPTransport({
			url: 'http://localhost:4000',
			rpc: {
				url: 'http://localhost:4000',
			},
			fetch,
		});

		beforeEach(() => {
			fetch.mockClear();
		});

		it('should make a request', async () => {
			const result = await transport.request({
				method: 'getAllBalances',
				params: ['0x1234'],
			});

			expect(fetch).toHaveBeenCalledTimes(1);

			expect(fetch).toHaveBeenCalledWith('http://localhost:4000', {
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: requestId,
					method: 'getAllBalances',
					params: ['0x1234'],
				}),
				headers: {
					'Content-Type': 'application/json',
					'Client-Sdk-Type': 'typescript',
					'Client-Sdk-Version': PACKAGE_VERSION,
					'Client-Target-Api-Version': TARGETED_RPC_VERSION,
					'Client-Request-Method': 'getAllBalances',
				},
				method: 'POST',
			});

			expect(result).toEqual(mockResult);
		});
	});
});
