// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { Ed25519Keypair } from '../../../../src/keypairs/ed25519/index.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { normalizeSuiAddress, SUI_TYPE_ARG } from '../../../../src/utils/index.js';
import { bcs } from '../../../../src/bcs/index.js';

const SimpleObject = bcs.struct('SimpleObject', {
	id: bcs.Address,
	value: bcs.u64(),
});

describe('Core API - Objects', () => {
	let toolbox: TestToolbox;
	let testPackageId: string;
	let testObjectId: string;
	let testAddress: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();

		// Publish test package
		testPackageId = await toolbox.getPackage('core_test');

		// Create a test object
		const tx = new Transaction();
		const [obj] = tx.moveCall({
			target: `${testPackageId}::test_objects::create_simple_object`,
			arguments: [tx.pure.u64(42)],
		});
		tx.transferObjects([obj], tx.pure.address(testAddress));

		const result = await toolbox.client.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
			options: {
				showEffects: true,
				showObjectChanges: true,
			},
		});

		// Wait for the transaction to be indexed
		await toolbox.client.waitForTransaction({
			digest: result.digest,
		});

		// Get the created object ID
		const createdObject = result.objectChanges?.find(
			(change) => change.type === 'created' && change.objectType.includes('SimpleObject'),
		);
		if (createdObject && createdObject.type === 'created') {
			testObjectId = createdObject.objectId;
		}

		expect(testObjectId).toBeDefined();
	});

	describe('getObject', () => {
		it('all clients return same data: getObject', async () => {
			await toolbox.expectAllClientsReturnSameData((client) =>
				client.core.getObject({ objectId: testObjectId }),
			);
		});

		testWithAllClients(
			'should get an existing object',
			async (client) => {
				const { object } = await client.core.getObject({ objectId: testObjectId });

				expect(object.objectId).toBe(normalizeSuiAddress(testObjectId));
				expect(object.type).toContain('SimpleObject');
				expect(object.owner).toBeDefined();
				expect(object.previousTransaction).toBeDefined();

				// Verify content is available
				const content = await object.content;
				expect(content).toBeInstanceOf(Uint8Array);
				expect(content.length).toBeGreaterThan(0);
			},
			{ skip: [] }, // Test with all clients
		);

		testWithAllClients('should parse BCS content correctly', async (client) => {
			const { object } = await client.core.getObject({ objectId: testObjectId });
			const content = await object.content;

			// Parse BCS and verify the value field
			const parsed = SimpleObject.parse(content);
			expect(BigInt(parsed.value)).toBe(42n);
		});

		testWithAllClients('should throw error for non-existent object', async (client) => {
			const fakeObjectId = normalizeSuiAddress('0x9999');
			await expect(client.core.getObject({ objectId: fakeObjectId })).rejects.toThrow();
		});

		testWithAllClients('should verify owner is correct', async (client) => {
			const { object } = await client.core.getObject({ objectId: testObjectId });

			expect(object.owner.$kind).toBe('AddressOwner');
			if (object.owner.$kind === 'AddressOwner') {
				expect(object.owner.AddressOwner).toBe(testAddress);
			}
		});
	});

	describe('getObjects', () => {
		testWithAllClients('should get multiple objects', async (client) => {
			// Get multiple gas coins from the test address
			const coins = await toolbox.client.getCoins({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
				limit: 3,
			});

			expect(coins.data.length).toBeGreaterThan(0);

			const coinIds = coins.data.map((coin) => coin.coinObjectId);
			const { objects } = await client.core.listObjects({ objectIds: coinIds });

			expect(objects.length).toBe(coinIds.length);

			// Verify each object
			for (let i = 0; i < objects.length; i++) {
				const result = objects[i];
				expect(result).not.toBeInstanceOf(Error);

				if (!(result instanceof Error)) {
					expect(result.objectId).toBe(normalizeSuiAddress(coinIds[i]));
					expect(result.type).toContain('Coin<');
					expect(result.owner).toBeDefined();
				}
			}
		});

		testWithAllClients('should handle mix of valid and invalid object IDs', async (client) => {
			const objectIds = [testObjectId, normalizeSuiAddress('0x9999')];
			const { objects } = await client.core.listObjects({ objectIds });

			expect(objects.length).toBe(2);

			// First should be valid
			expect(objects[0]).not.toBeInstanceOf(Error);

			// Second should be error
			expect(objects[1]).toBeInstanceOf(Error);
		});

		testWithAllClients('should handle empty array', async (client) => {
			const { objects } = await client.core.listObjects({ objectIds: [] });
			expect(objects).toEqual([]);
		});
	});

	describe('listOwnedObjects', () => {
		it('all clients return same data: listOwnedObjects', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) => client.core.listOwnedObjects({ owner: testAddress, limit: 5 }),
				// Normalize: ignore cursor and sort by id (order may vary across APIs)
				(result) => ({
					...result,
					cursor: null,
					objects: result.objects.sort((a, b) => a.objectId.localeCompare(b.objectId)),
				}),
			);
		});

		testWithAllClients('should get owned objects for an address', async (client) => {
			const result = await client.core.listOwnedObjects({
				owner: testAddress,
			});

			expect(result.objects.length).toBeGreaterThan(0);
			expect(result.hasNextPage).toBeDefined();
			expect(result.cursor).toBeDefined();

			// Verify objects belong to the address
			for (const obj of result.objects) {
				expect(obj.owner.$kind).toBe('AddressOwner');
				if (obj.owner.$kind === 'AddressOwner') {
					expect(obj.owner.AddressOwner).toBe(testAddress);
				}
			}
		});

		testWithAllClients('should filter owned objects by type', async (client) => {
			// Filter by SUI coin type
			const result = await client.core.listOwnedObjects({
				owner: testAddress,
				type: `0x2::coin::Coin<${SUI_TYPE_ARG}>`,
			});

			expect(result.objects.length).toBeGreaterThan(0);

			// Verify all objects are SUI coins
			for (const obj of result.objects) {
				expect(obj.type).toContain('Coin<');
				expect(obj.type).toContain('sui::SUI');
			}
		});

		testWithAllClients('should paginate owned objects', async (client) => {
			// Get first page with limit
			const firstPage = await client.core.listOwnedObjects({
				owner: testAddress,
				limit: 2,
			});

			expect(firstPage.objects.length).toBeLessThanOrEqual(2);
			// Assert that pagination is needed (multiple pages exist)
			expect(firstPage.hasNextPage).toBe(true);
			expect(firstPage.cursor).toBeDefined();

			// Get second page
			const secondPage = await client.core.listOwnedObjects({
				owner: testAddress,
				limit: 2,
				cursor: firstPage.cursor!,
			});

			// Verify different objects on second page
			const firstPageIds = new Set(firstPage.objects.map((obj) => obj.objectId));
			const secondPageIds = secondPage.objects.map((obj) => obj.objectId);

			for (const id of secondPageIds) {
				expect(firstPageIds.has(id)).toBe(false);
			}

			// Navigate to the last page
			let currentPage = secondPage;
			while (currentPage.hasNextPage && currentPage.cursor) {
				currentPage = await client.core.listOwnedObjects({
					owner: testAddress,
					limit: 2,
					cursor: currentPage.cursor,
				});
			}

			// Verify last page
			expect(currentPage.hasNextPage).toBe(false);
			expect(currentPage.objects.length).toBeGreaterThan(0);
		});

		testWithAllClients('should return empty array for address with no objects', async (client) => {
			const emptyAddress = Ed25519Keypair.generate().getPublicKey().toSuiAddress();
			const result = await client.core.listOwnedObjects({
				owner: emptyAddress,
			});

			expect(result.objects).toEqual([]);
			expect(result.hasNextPage).toBe(false);
		});
	});

	describe('getObject - Package Objects', () => {
		testWithAllClients('should fetch package object correctly', async (client) => {
			// Fetch the test package as an object
			const { object } = await client.core.getObject({ objectId: testPackageId });

			expect(object.objectId).toBe(normalizeSuiAddress(testPackageId));
			expect(object.type).toBe('package');
			expect(object.version).toBe('1'); // First version of published package
			expect(object.owner).toBeDefined();
		});

		testWithAllClients('should handle multiple package objects', async (client) => {
			// Fetch multiple packages including the framework
			const { objects } = await client.core.listObjects({
				objectIds: ['0x2', testPackageId],
			});

			expect(objects.length).toBe(2);

			// Both should be packages
			for (const obj of objects) {
				expect(obj).not.toBeInstanceOf(Error);
				if (!(obj instanceof Error)) {
					expect(obj.type).toBe('package');
				}
			}
		});
	});
});
