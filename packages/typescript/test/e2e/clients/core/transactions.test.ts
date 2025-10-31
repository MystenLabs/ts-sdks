// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { Transaction } from '../../../../src/transactions/index.js';
import { SUI_TYPE_ARG } from '../../../../src/utils/index.js';
import { Ed25519Keypair } from '../../../../src/keypairs/ed25519/keypair.js';

describe('Core API - Transactions', () => {
	let toolbox: TestToolbox;
	let testAddress: string;
	let executedTxDigest: string;
	let packageId: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();

		// Publish the test package to get event-emitting functions
		packageId = await toolbox.getPackage('core_test');

		// Execute a simple transaction to use in getTransaction tests
		const tx = new Transaction();
		tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

		const result = await toolbox.client.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
			options: {
				showEffects: true,
				showBalanceChanges: true,
				showObjectChanges: true,
			},
		});

		executedTxDigest = result.digest;

		// Wait for transaction to be indexed
		await toolbox.client.waitForTransaction({ digest: executedTxDigest });
	});

	describe('getTransaction', () => {
		// gRPC ledgerService.getTransaction doesn't support returning transaction BCS data
		it('all clients return same data: getTransaction', async () => {
			await toolbox.expectAllClientsReturnSameData((client) =>
				client.core.getTransaction({
					digest: executedTxDigest,
					include: {
						transaction: true,
						effects: true,
						events: true,
						balanceChanges: true,
						objectTypes: true,
					},
				}),
			);
		});

		testWithAllClients('should get transaction by digest', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { effects: true },
			});

			expect(result.transaction.digest).toBe(executedTxDigest);
			expect(result.transaction.effects).toBeDefined();
			expect(result.transaction.effects?.status).toBeDefined();
			if (result.transaction.effects && 'success' in result.transaction.effects.status) {
				expect(result.transaction.effects.status.success).toBe(true);
			}
		});

		testWithAllClients('should get transaction with balance changes', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { balanceChanges: true },
			});

			expect(result.transaction.balanceChanges).toBeDefined();
			expect(Array.isArray(result.transaction.balanceChanges)).toBe(true);
		});

		testWithAllClients('should verify transaction structure', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { effects: true },
			});

			expect(result.transaction.signatures).toBeDefined();
			expect(Array.isArray(result.transaction.signatures)).toBe(true);
			expect(result.transaction.effects?.changedObjects).toBeDefined();
			expect(Array.isArray(result.transaction.effects?.changedObjects)).toBe(true);
		});

		testWithAllClients('should throw error for non-existent digest', async (client) => {
			const fakeDigest = 'ABCDEFabcdef1234567890123456789012345678901234567890123456789012';

			await expect(client.core.getTransaction({ digest: fakeDigest })).rejects.toThrow();
		});

		testWithAllClients('should throw error for invalid digest format', async (client) => {
			await expect(client.core.getTransaction({ digest: 'invalid' })).rejects.toThrow();
		});
	});

	describe('executeTransaction', () => {
		testWithAllClients('should execute a valid transaction', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			// Build and sign the transaction
			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: { effects: true },
			});

			expect(result.transaction.digest).toBeDefined();
			expect(result.transaction.effects).toBeDefined();
			expect(result.transaction.effects?.status).toBeDefined();
			if (result.transaction.effects && 'success' in result.transaction.effects.status) {
				expect(result.transaction.effects.status.success).toBe(true);
			}

			// Wait for transaction to be indexed to avoid races with subsequent tests
			await client.core.waitForTransaction({ digest: result.transaction.digest });
		});

		testWithAllClients('should execute transaction and return balance changes', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [500])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: { balanceChanges: true, effects: true },
			});

			expect(result.transaction.digest).toBeDefined();
			expect(result.transaction.balanceChanges).toBeDefined();
			expect(Array.isArray(result.transaction.balanceChanges)).toBe(true);
			expect(result.transaction.effects?.changedObjects).toBeDefined();
			expect(Array.isArray(result.transaction.effects?.changedObjects)).toBe(true);

			// Wait for transaction to be indexed to avoid races with subsequent tests
			await client.core.waitForTransaction({ digest: result.transaction.digest });
		});

		testWithAllClients('should fail for invalid signature', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });

			// Use wrong keypair to sign
			const wrongKeypair = Ed25519Keypair.generate();
			const wrongSignature = await wrongKeypair.signTransaction(bytes);

			await expect(
				client.core.executeTransaction({
					transaction: bytes,
					signatures: [wrongSignature.signature],
				}),
			).rejects.toThrow();
		});

		testWithAllClients('should fail for insufficient gas', async (client) => {
			// Create a transaction with gas budget higher than what we have
			const tx = new Transaction();
			tx.setGasBudget(999999999999999);
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });
			const signature = await toolbox.keypair.signTransaction(bytes);

			await expect(
				client.core.executeTransaction({
					transaction: bytes,
					signatures: [signature.signature],
				}),
			).rejects.toThrow();
		});
	});

	describe('simulateTransaction', () => {
		testWithAllClients('should dry run a valid transaction', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: { effects: true, balanceChanges: true },
			});

			expect(result.transaction.effects).toBeDefined();
			expect(result.transaction.effects?.status).toBeDefined();
			if (result.transaction.effects && 'success' in result.transaction.effects.status) {
				expect(result.transaction.effects.status.success).toBe(true);
			}
			expect(result.transaction.balanceChanges).toBeDefined();
			expect(Array.isArray(result.transaction.balanceChanges)).toBe(true);
		});

		testWithAllClients('should estimate gas for transaction', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: { effects: true },
			});

			expect(result.transaction.effects?.gasUsed).toBeDefined();
			expect(result.transaction.effects?.gasUsed?.computationCost).toBeDefined();
			expect(result.transaction.effects?.gasUsed?.storageCost).toBeDefined();
			expect(result.transaction.effects?.gasUsed?.storageRebate).toBeDefined();
		});

		testWithAllClients('should detect transaction failure in dry run', async (client) => {
			// Create a transaction that will fail (try to transfer more than we have)
			const tx = new Transaction();
			const coins = await client.core.listCoins({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
			});

			if (coins.objects.length > 0) {
				const firstCoin = coins.objects[0];
				const tooMuchAmount = BigInt(firstCoin.balance) * BigInt(2);

				tx.transferObjects(
					[tx.splitCoins(tx.object(firstCoin.objectId), [tooMuchAmount])],
					tx.pure.address(testAddress),
				);

				tx.setSender(testAddress);

				// This will throw during build because the transaction is invalid
				await expect(tx.build({ client })).rejects.toThrow();
			}
		});

		testWithAllClients('should not actually execute transaction', async (client) => {
			// Get balance before
			const balanceBefore = await client.core.getBalance({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
			});

			const tx = new Transaction();
			tx.transferObjects(
				[tx.splitCoins(tx.gas, [5000])],
				tx.pure.address(Ed25519Keypair.generate().toSuiAddress()),
			);

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });

			await client.core.simulateTransaction({
				transaction: bytes,
			});

			// Balance should be unchanged after dry run
			const balanceAfter = await client.core.getBalance({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
			});

			expect(balanceAfter.balance.balance).toBe(balanceBefore.balance.balance);
		});
	});

	describe('waitForTransaction', () => {
		testWithAllClients('should wait for executed transaction', async (client) => {
			// Execute a transaction
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const executeResult = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
			});

			// Wait for it to be indexed
			const waitResult = await client.core.waitForTransaction({
				digest: executeResult.transaction.digest,
				include: { effects: true },
			});

			expect(waitResult.transaction.digest).toBe(executeResult.transaction.digest);
			expect(waitResult.transaction.effects).toBeDefined();
			expect(waitResult.transaction.effects?.status).toBeDefined();
			if (waitResult.transaction.effects && 'success' in waitResult.transaction.effects.status) {
				expect(waitResult.transaction.effects.status.success).toBe(true);
			}
		});

		testWithAllClients('should wait for transaction and return balance changes', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const executeResult = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
			});

			const waitResult = await client.core.waitForTransaction({
				digest: executeResult.transaction.digest,
				include: { balanceChanges: true },
			});

			expect(waitResult.transaction.balanceChanges).toBeDefined();
			expect(Array.isArray(waitResult.transaction.balanceChanges)).toBe(true);
		});

		testWithAllClients('should timeout for non-existent transaction', async (client) => {
			const fakeDigest = 'ABCDEFabcdef1234567890123456789012345678901234567890123456789012';

			await expect(
				client.core.waitForTransaction({
					digest: fakeDigest,
					timeout: 500,
				}),
			).rejects.toThrow();
		});

		testWithAllClients('should respect timeout parameter', async (client) => {
			const fakeDigest = 'ABCDEFabcdef1234567890123456789012345678901234567890123456789012';
			const startTime = Date.now();

			try {
				await client.core.waitForTransaction({
					digest: fakeDigest,
					timeout: 300,
				});
			} catch {
				const elapsed = Date.now() - startTime;
				// Should timeout around 300ms, allow some buffer
				expect(elapsed).toBeGreaterThanOrEqual(250);
				expect(elapsed).toBeLessThan(1000);
			}
		});

		testWithAllClients('should handle abort signal', async (client) => {
			const controller = new AbortController();
			const fakeDigest = 'ABCDEFabcdef1234567890123456789012345678901234567890123456789012';

			// Abort after 100ms
			setTimeout(() => controller.abort(), 100);

			await expect(
				client.core.waitForTransaction({
					digest: fakeDigest,
					signal: controller.signal,
				}),
			).rejects.toThrow();
		});
	});

	describe('events', () => {
		testWithAllClients('should return events for transaction that emits events', async (client) => {
			// Call a function that emits events
			const tx = new Transaction();
			tx.moveCall({
				target: `${packageId}::test_objects::create_object_with_event`,
				arguments: [tx.pure.u64(42)],
			});

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: { events: true },
			});

			// Verify events field exists
			expect(result.transaction.events).toBeDefined();
			expect(Array.isArray(result.transaction.events)).toBe(true);
			expect(result.transaction.events?.length).toBeGreaterThan(0);

			// Verify event structure
			const event = result.transaction.events?.[0];
			expect(event?.packageId).toBe(packageId);
			expect(event?.module).toBe('test_objects');
			expect(event?.sender).toBe(testAddress);
			expect(event?.eventType).toContain('ObjectCreated');
			expect(event?.bcs).toBeInstanceOf(Uint8Array);

			// Wait for transaction to be indexed
			await client.core.waitForTransaction({ digest: result.transaction.digest });
		});

		testWithAllClients(
			'should return empty events array for transactions without events',
			async (client) => {
				// Simple transfer without events
				const tx = new Transaction();
				tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

				tx.setSender(testAddress);
				const bytes = await tx.build({ client: toolbox.client });
				const signature = await toolbox.keypair.signTransaction(bytes);

				const result = await client.core.executeTransaction({
					transaction: bytes,
					signatures: [signature.signature],
					include: { events: true },
				});

				expect(result.transaction.events).toBeDefined();
				expect(Array.isArray(result.transaction.events)).toBe(true);
				expect(result.transaction.events?.length).toBe(0);

				// Wait for transaction to be indexed
				await client.core.waitForTransaction({ digest: result.transaction.digest });
			},
		);

		testWithAllClients('should include events in getTransaction response', async (client) => {
			// Execute a transaction with events
			const tx = new Transaction();
			tx.moveCall({
				target: `${packageId}::test_objects::create_object_with_event`,
				arguments: [tx.pure.u64(123)],
			});

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const executeResult = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
			});

			// Wait for it to be indexed
			await client.core.waitForTransaction({ digest: executeResult.transaction.digest });

			// Get the transaction and verify events are included
			const getResult = await client.core.getTransaction({
				digest: executeResult.transaction.digest,
				include: { events: true },
			});

			expect(getResult.transaction.events).toBeDefined();
			expect(Array.isArray(getResult.transaction.events)).toBe(true);
			expect(getResult.transaction.events?.length).toBeGreaterThan(0);
			expect(getResult.transaction.events?.[0]?.eventType).toContain('ObjectCreated');
		});

		testWithAllClients('should include events in simulateTransaction response', async (client) => {
			const tx = new Transaction();
			tx.moveCall({
				target: `${packageId}::test_objects::create_object_with_event`,
				arguments: [tx.pure.u64(999)],
			});

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: { events: true },
			});

			expect(result.transaction.events).toBeDefined();
			expect(Array.isArray(result.transaction.events)).toBe(true);
			expect(result.transaction.events?.length).toBeGreaterThan(0);
			expect(result.transaction.events?.[0]?.packageId).toBe(packageId);
			expect(result.transaction.events?.[0]?.eventType).toContain('ObjectCreated');
		});
	});

	describe('getTransaction - Include Options', () => {
		testWithAllClients('should work with no includes', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: {},
			});

			expect(result.transaction.digest).toBe(executedTxDigest);

			// All optional fields should be undefined when not included
			expect(result.transaction.transaction).toBeUndefined();
			expect(result.transaction.balanceChanges).toBeUndefined();
			expect(result.transaction.events).toBeUndefined();
			expect(result.transaction.effects).toBeUndefined();
		});

		testWithAllClients('should include transaction when requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { transaction: true },
			});

			expect(result.transaction.digest).toBe(executedTxDigest);
			expect(result.transaction.transaction).toBeDefined();
			expect(result.transaction.transaction?.sender).toBe(testAddress);

			// Other optional fields should still be undefined
			expect(result.transaction.balanceChanges).toBeUndefined();
			expect(result.transaction.events).toBeUndefined();
			expect(result.transaction.effects).toBeUndefined();
		});

		testWithAllClients('should include effects when requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { effects: true },
			});

			expect(result.transaction.digest).toBe(executedTxDigest);
			expect(result.transaction.effects).toBeDefined();
			expect(result.transaction.effects?.bcs).toBeInstanceOf(Uint8Array);

			// Other optional fields should still be undefined
			expect(result.transaction.transaction).toBeUndefined();
			expect(result.transaction.balanceChanges).toBeUndefined();
			expect(result.transaction.events).toBeUndefined();
		});

		testWithAllClients('should include events when requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { events: true },
			});

			expect(result.transaction.digest).toBe(executedTxDigest);
			expect(result.transaction.events).toBeDefined();
			expect(Array.isArray(result.transaction.events)).toBe(true);

			// Other optional fields should still be undefined
			expect(result.transaction.transaction).toBeUndefined();
			expect(result.transaction.balanceChanges).toBeUndefined();
			expect(result.transaction.effects).toBeUndefined();
		});

		testWithAllClients('should include balanceChanges when requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { balanceChanges: true },
			});

			expect(result.transaction.digest).toBe(executedTxDigest);
			expect(result.transaction.balanceChanges).toBeDefined();
			expect(Array.isArray(result.transaction.balanceChanges)).toBe(true);

			// Other optional fields should still be undefined
			expect(result.transaction.transaction).toBeUndefined();
			expect(result.transaction.events).toBeUndefined();
			expect(result.transaction.effects).toBeUndefined();
		});

		testWithAllClients('should include objectTypes when requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { objectTypes: true },
			});

			expect(result.transaction.digest).toBe(executedTxDigest);
			const objectTypes = await result.transaction.objectTypes;
			expect(objectTypes).toBeDefined();

			// Other optional fields should still be undefined
			expect(result.transaction.transaction).toBeUndefined();
			expect(result.transaction.balanceChanges).toBeUndefined();
			expect(result.transaction.events).toBeUndefined();
			expect(result.transaction.effects).toBeUndefined();
		});

		testWithAllClients('should include all fields when all includes requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: {
					transaction: true,
					effects: true,
					events: true,
					balanceChanges: true,
					objectTypes: true,
				},
			});

			expect(result.transaction.digest).toBe(executedTxDigest);
			expect(result.transaction.transaction).toBeDefined();
			expect(result.transaction.effects).toBeDefined();
			expect(result.transaction.effects?.bcs).toBeDefined();
			expect(result.transaction.events).toBeDefined();
			expect(result.transaction.balanceChanges).toBeDefined();
			const objectTypes = await result.transaction.objectTypes;
			expect(objectTypes).toBeDefined();
		});
	});

	describe('executeTransaction - Include Options', () => {
		testWithAllClients('should work with no includes', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: {},
			});

			expect(result.transaction.digest).toBeDefined();

			// All optional fields should be undefined
			expect(result.transaction.transaction).toBeUndefined();
			expect(result.transaction.balanceChanges).toBeUndefined();
			expect(result.transaction.events).toBeUndefined();
			expect(result.transaction.effects).toBeUndefined();

			await client.core.waitForTransaction({ digest: result.transaction.digest });
		});

		testWithAllClients('should include transaction when requested', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: { transaction: true },
			});

			expect(result.transaction.transaction).toBeDefined();
			expect(result.transaction.transaction?.sender).toBe(testAddress);
			expect(result.transaction.balanceChanges).toBeUndefined();
			expect(result.transaction.events).toBeUndefined();
			expect(result.transaction.effects).toBeUndefined();

			await client.core.waitForTransaction({ digest: result.transaction.digest });
		});

		testWithAllClients('should include all fields when all includes requested', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: {
					transaction: true,
					effects: true,
					events: true,
					balanceChanges: true,
					objectTypes: true,
				},
			});

			expect(result.transaction.transaction).toBeDefined();
			expect(result.transaction.effects).toBeDefined();
			expect(result.transaction.effects?.bcs).toBeDefined();
			expect(result.transaction.events).toBeDefined();
			expect(result.transaction.balanceChanges).toBeDefined();
			const objectTypes = await result.transaction.objectTypes;
			expect(objectTypes).toBeDefined();

			await client.core.waitForTransaction({ digest: result.transaction.digest });
		});
	});

	describe('simulateTransaction - Include Options', () => {
		testWithAllClients('should work with no includes', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: {},
			});

			// All optional fields should be undefined when not included
			expect(result.transaction.transaction).toBeUndefined();
			expect(result.transaction.balanceChanges).toBeUndefined();
			expect(result.transaction.events).toBeUndefined();
			expect(result.transaction.effects).toBeUndefined();
		});

		testWithAllClients('should include transaction when requested', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: { transaction: true },
			});

			expect(result.transaction.transaction).toBeDefined();
			expect(result.transaction.transaction?.sender).toBe(testAddress);
			expect(result.transaction.balanceChanges).toBeUndefined();
			expect(result.transaction.events).toBeUndefined();
		});

		testWithAllClients('should include all fields when all includes requested', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: {
					transaction: true,
					effects: true,
					events: true,
					balanceChanges: true,
					objectTypes: true,
				},
			});

			expect(result.transaction.transaction).toBeDefined();
			expect(result.transaction.effects).toBeDefined();
			expect(result.transaction.effects?.bcs).toBeDefined();
			expect(result.transaction.events).toBeDefined();
			expect(result.transaction.balanceChanges).toBeDefined();
			const objectTypes = await result.transaction.objectTypes;
			expect(objectTypes).toBeDefined();
		});
	});
});
