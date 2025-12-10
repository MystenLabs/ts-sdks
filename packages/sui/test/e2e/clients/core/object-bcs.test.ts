// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { bcs } from '../../../../src/bcs/index.js';
import { SUI_TYPE_ARG } from '../../../../src/utils/index.js';

describe('Core API - Object BCS Serialization', () => {
	let toolbox: TestToolbox;
	let testObjectId: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();

		// Get a coin object to test with
		const coins = await toolbox.jsonRpcClient.core.listCoins({
			owner: toolbox.address(),
			limit: 1,
			coinType: SUI_TYPE_ARG,
		});

		expect(coins.objects.length).toBeGreaterThan(0);
		testObjectId = coins.objects[0].objectId;
	});

	describe('Cross-client consistency', () => {
		it('all clients return same data: getObject with objectBcs', async () => {
			await toolbox.expectAllClientsReturnSameData((client) =>
				client.core.getObject({
					objectId: testObjectId,
					include: { objectBcs: true },
				}),
			);
		});

		testWithAllClients('should return valid objectBcs bytes', async (client) => {
			const result = await client.core.getObject({
				objectId: testObjectId,
				include: { objectBcs: true },
			});

			expect(result.object.objectBcs).toBeDefined();

			const objectBcs = result.object.objectBcs!;
			expect(objectBcs.length).toBeGreaterThan(0);

			// Verify we can deserialize the bytes
			const deserialized = bcs.Object.parse(objectBcs);
			expect(deserialized.data.$kind).toBe('Move');
			expect(deserialized.owner).toBeDefined();
			expect(deserialized.previousTransaction).toBeDefined();
			expect(typeof deserialized.storageRebate).toBe('string');
			expect(BigInt(deserialized.storageRebate)).toBeGreaterThanOrEqual(0n);
		});
	});
});
