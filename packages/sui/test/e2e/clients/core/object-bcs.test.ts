// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { bcs } from '../../../../src/bcs/index.js';
import { Transaction } from '../../../../src/transactions/index.js';

describe('Core API - Object BCS Serialization', () => {
	let toolbox: TestToolbox;
	let testObjectId: string;
	let setupTxDigest: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();

		const tx = new Transaction();
		const [coin] = tx.splitCoins(tx.gas, [1000]);
		tx.transferObjects([coin], toolbox.address());

		const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
			options: { showObjectChanges: true },
		});

		setupTxDigest = result.digest;

		const createdCoin = result.objectChanges?.find(
			(change) => change.type === 'created' && change.objectType.includes('Coin'),
		);
		expect(createdCoin).toBeDefined();
		testObjectId = (createdCoin as { objectId: string }).objectId;

		await Promise.all([
			toolbox.jsonRpcClient.core.waitForTransaction({ digest: setupTxDigest }),

			toolbox.graphqlClient.core.waitForTransaction({ digest: setupTxDigest }),
		]);
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
