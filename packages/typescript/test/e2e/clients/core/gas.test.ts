// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';

describe('Core API - Gas', () => {
	let toolbox: TestToolbox;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
	});

	describe('getReferenceGasPrice', () => {
		it('all clients return same data: getReferenceGasPrice', async () => {
			await toolbox.expectAllClientsReturnSameData((client) => client.core.getReferenceGasPrice());
		});

		testWithAllClients('should get reference gas price', async (client) => {
			const result = await client.core.getReferenceGasPrice();

			expect(result.referenceGasPrice).toBeDefined();
			expect(typeof result.referenceGasPrice).toBe('string');

			// Gas price should be a valid number string
			const gasPrice = BigInt(result.referenceGasPrice);
			expect(gasPrice).toBeGreaterThan(0n);
		});

		testWithAllClients(
			'should return consistent gas price across multiple calls',
			async (client) => {
				const result1 = await client.core.getReferenceGasPrice();
				const result2 = await client.core.getReferenceGasPrice();

				// Gas price should be consistent within a short time frame
				// (may change between epochs, but should be stable for consecutive calls)
				expect(result1.referenceGasPrice).toBe(result2.referenceGasPrice);
			},
		);
	});
});
