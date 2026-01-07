// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';

describe('Core API - Chain Identifier', () => {
	let toolbox: TestToolbox;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
	});

	describe('getChainIdentifier', () => {
		it('all clients return same data: getChainIdentifier', { retry: 3 }, async () => {
			await toolbox.expectAllClientsReturnSameData((client) => client.core.getChainIdentifier());
		});

		testWithAllClients('should get chain identifier', async (client) => {
			const result = await client.core.getChainIdentifier();

			expect(result.chainIdentifier).toBeDefined();
			expect(typeof result.chainIdentifier).toBe('string');

			// Chain identifier is a 32-byte digest, base58 encoded
			// Base58 encoding of 32 bytes is typically 43-44 characters
			expect(result.chainIdentifier.length).toBeGreaterThanOrEqual(40);
			expect(result.chainIdentifier.length).toBeLessThanOrEqual(50);
		});

		testWithAllClients(
			'should return consistent chain identifier across multiple calls',
			async (client) => {
				const result1 = await client.core.getChainIdentifier();
				const result2 = await client.core.getChainIdentifier();

				// Chain identifier should never change for a network
				expect(result1.chainIdentifier).toBe(result2.chainIdentifier);
			},
		);

		testWithAllClients('should be cached', async (client) => {
			// First call
			const result1 = await client.core.getChainIdentifier();

			// Second call should return the same cached value
			const result2 = await client.core.getChainIdentifier();

			expect(result1.chainIdentifier).toBe(result2.chainIdentifier);
		});
	});
});
