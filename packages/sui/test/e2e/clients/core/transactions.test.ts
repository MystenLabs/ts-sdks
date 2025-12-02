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

		const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
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
		await toolbox.jsonRpcClient.waitForTransaction({ digest: executedTxDigest });
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

			expect(result.Transaction!.digest).toBe(executedTxDigest);
			expect(result.Transaction!.effects).toBeDefined();
			expect(result.Transaction!.effects?.status).toBeDefined();
			if (result.Transaction!.effects && 'success' in result.Transaction!.effects.status) {
				expect(result.Transaction!.effects.status.success).toBe(true);
			}
		});

		testWithAllClients('should get transaction with balance changes', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { balanceChanges: true },
			});

			expect(result.Transaction!.balanceChanges).toBeDefined();
			expect(Array.isArray(result.Transaction!.balanceChanges)).toBe(true);
		});

		testWithAllClients('should verify transaction structure', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { effects: true },
			});

			expect(result.Transaction!.signatures).toBeDefined();
			expect(Array.isArray(result.Transaction!.signatures)).toBe(true);
			expect(result.Transaction!.effects?.changedObjects).toBeDefined();
			expect(Array.isArray(result.Transaction!.effects?.changedObjects)).toBe(true);
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
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: { effects: true },
			});

			expect(result.Transaction!.digest).toBeDefined();
			expect(result.Transaction!.effects).toBeDefined();
			expect(result.Transaction!.effects?.status).toBeDefined();
			if (result.Transaction!.effects && 'success' in result.Transaction!.effects.status) {
				expect(result.Transaction!.effects.status.success).toBe(true);
			}

			// Wait for transaction to be indexed to avoid races with subsequent tests
			await client.core.waitForTransaction({ digest: result.Transaction!.digest });
		});

		testWithAllClients('should execute transaction and return balance changes', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [500])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: { balanceChanges: true, effects: true },
			});

			expect(result.Transaction!.digest).toBeDefined();
			expect(result.Transaction!.balanceChanges).toBeDefined();
			expect(Array.isArray(result.Transaction!.balanceChanges)).toBe(true);
			expect(result.Transaction!.effects?.changedObjects).toBeDefined();
			expect(Array.isArray(result.Transaction!.effects?.changedObjects)).toBe(true);

			// Wait for transaction to be indexed to avoid races with subsequent tests
			await client.core.waitForTransaction({ digest: result.Transaction!.digest });
		});

		testWithAllClients('should fail for invalid signature', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });

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
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });
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
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: { effects: true, balanceChanges: true },
			});

			expect(result.Transaction!.effects).toBeDefined();
			expect(result.Transaction!.effects?.status).toBeDefined();
			if (result.Transaction!.effects && 'success' in result.Transaction!.effects.status) {
				expect(result.Transaction!.effects.status.success).toBe(true);
			}
			expect(result.Transaction!.balanceChanges).toBeDefined();
			expect(Array.isArray(result.Transaction!.balanceChanges)).toBe(true);
		});

		testWithAllClients('should estimate gas for transaction', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: { effects: true },
			});

			expect(result.Transaction!.effects?.gasUsed).toBeDefined();
			expect(result.Transaction!.effects?.gasUsed?.computationCost).toBeDefined();
			expect(result.Transaction!.effects?.gasUsed?.storageCost).toBeDefined();
			expect(result.Transaction!.effects?.gasUsed?.storageRebate).toBeDefined();
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
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });

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
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const executeResult = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
			});

			// Wait for it to be indexed
			const waitResult = await client.core.waitForTransaction({
				digest: executeResult.Transaction!.digest,
				include: { effects: true },
			});

			expect(waitResult.Transaction!.digest).toBe(executeResult.Transaction!.digest);
			expect(waitResult.Transaction!.effects).toBeDefined();
			expect(waitResult.Transaction!.effects?.status).toBeDefined();
			if (waitResult.Transaction!.effects && 'success' in waitResult.Transaction!.effects.status) {
				expect(waitResult.Transaction!.effects.status.success).toBe(true);
			}
		});

		testWithAllClients('should wait for transaction and return balance changes', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const executeResult = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
			});

			const waitResult = await client.core.waitForTransaction({
				digest: executeResult.Transaction!.digest,
				include: { balanceChanges: true },
			});

			expect(waitResult.Transaction!.balanceChanges).toBeDefined();
			expect(Array.isArray(waitResult.Transaction!.balanceChanges)).toBe(true);
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
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: { events: true },
			});

			// Verify events field exists
			expect(result.Transaction!.events).toBeDefined();
			expect(Array.isArray(result.Transaction!.events)).toBe(true);
			expect(result.Transaction!.events?.length).toBeGreaterThan(0);

			// Verify event structure
			const event = result.Transaction!.events?.[0];
			expect(event?.packageId).toBe(packageId);
			expect(event?.module).toBe('test_objects');
			expect(event?.sender).toBe(testAddress);
			expect(event?.eventType).toContain('ObjectCreated');
			expect(event?.bcs).toBeInstanceOf(Uint8Array);

			// Wait for transaction to be indexed
			await client.core.waitForTransaction({ digest: result.Transaction!.digest });
		});

		testWithAllClients(
			'should return empty events array for transactions without events',
			async (client) => {
				// Simple transfer without events
				const tx = new Transaction();
				tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

				tx.setSender(testAddress);
				const bytes = await tx.build({ client: toolbox.jsonRpcClient });
				const signature = await toolbox.keypair.signTransaction(bytes);

				const result = await client.core.executeTransaction({
					transaction: bytes,
					signatures: [signature.signature],
					include: { events: true },
				});

				expect(result.Transaction!.events).toBeDefined();
				expect(Array.isArray(result.Transaction!.events)).toBe(true);
				expect(result.Transaction!.events?.length).toBe(0);

				// Wait for transaction to be indexed
				await client.core.waitForTransaction({ digest: result.Transaction!.digest });
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
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const executeResult = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
			});

			// Wait for it to be indexed
			await client.core.waitForTransaction({
				digest: executeResult.Transaction!.digest,
			});

			// Get the transaction and verify events are included
			const getResult = await client.core.getTransaction({
				digest: executeResult.Transaction!.digest,
				include: { events: true },
			});

			expect(getResult.Transaction!.events).toBeDefined();
			expect(Array.isArray(getResult.Transaction!.events)).toBe(true);
			expect(getResult.Transaction!.events?.length).toBeGreaterThan(0);
			expect(getResult.Transaction!.events?.[0]?.eventType).toContain('ObjectCreated');
		});

		testWithAllClients('should include events in simulateTransaction response', async (client) => {
			const tx = new Transaction();
			tx.moveCall({
				target: `${packageId}::test_objects::create_object_with_event`,
				arguments: [tx.pure.u64(999)],
			});

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: { events: true },
			});

			expect(result.Transaction!.events).toBeDefined();
			expect(Array.isArray(result.Transaction!.events)).toBe(true);
			expect(result.Transaction!.events?.length).toBeGreaterThan(0);
			expect(result.Transaction!.events?.[0]?.packageId).toBe(packageId);
			expect(result.Transaction!.events?.[0]?.eventType).toContain('ObjectCreated');
		});
	});

	describe('getTransaction - Include Options', () => {
		testWithAllClients('should work with no includes', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: {},
			});

			expect(result.Transaction!.digest).toBe(executedTxDigest);

			// Status should always be present even with no includes
			expect(result.Transaction!.status).toBeDefined();
			expect(result.Transaction!.status.success).toBe(true);
			expect(result.Transaction!.status.error).toBeNull();

			// All optional fields should be undefined when not included
			expect(result.Transaction!.transaction).toBeUndefined();
			expect(result.Transaction!.balanceChanges).toBeUndefined();
			expect(result.Transaction!.events).toBeUndefined();
			expect(result.Transaction!.effects).toBeUndefined();
		});

		testWithAllClients(
			'should always return status even without include options',
			async (client) => {
				const result = await client.core.getTransaction({
					digest: executedTxDigest,
				});

				// Status should always be present
				expect(result.Transaction!.status).toBeDefined();
				expect(typeof result.Transaction!.status.success).toBe('boolean');
				expect(result.Transaction!.status.success).toBe(true);
			},
		);

		testWithAllClients('should include transaction when requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { transaction: true },
			});

			expect(result.Transaction!.digest).toBe(executedTxDigest);
			expect(result.Transaction!.transaction).toBeDefined();
			expect(result.Transaction!.transaction?.sender).toBe(testAddress);

			// Other optional fields should still be undefined
			expect(result.Transaction!.balanceChanges).toBeUndefined();
			expect(result.Transaction!.events).toBeUndefined();
			expect(result.Transaction!.effects).toBeUndefined();
		});

		testWithAllClients('should include effects when requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { effects: true },
			});

			expect(result.Transaction!.digest).toBe(executedTxDigest);
			expect(result.Transaction!.effects).toBeDefined();
			expect(result.Transaction!.effects?.bcs).toBeInstanceOf(Uint8Array);

			// Other optional fields should still be undefined
			expect(result.Transaction!.transaction).toBeUndefined();
			expect(result.Transaction!.balanceChanges).toBeUndefined();
			expect(result.Transaction!.events).toBeUndefined();
		});

		testWithAllClients('should include events when requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { events: true },
			});

			expect(result.Transaction!.digest).toBe(executedTxDigest);
			expect(result.Transaction!.events).toBeDefined();
			expect(Array.isArray(result.Transaction!.events)).toBe(true);

			// Other optional fields should still be undefined
			expect(result.Transaction!.transaction).toBeUndefined();
			expect(result.Transaction!.balanceChanges).toBeUndefined();
			expect(result.Transaction!.effects).toBeUndefined();
		});

		testWithAllClients('should include balanceChanges when requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { balanceChanges: true },
			});

			expect(result.Transaction!.digest).toBe(executedTxDigest);
			expect(result.Transaction!.balanceChanges).toBeDefined();
			expect(Array.isArray(result.Transaction!.balanceChanges)).toBe(true);

			// Other optional fields should still be undefined
			expect(result.Transaction!.transaction).toBeUndefined();
			expect(result.Transaction!.events).toBeUndefined();
			expect(result.Transaction!.effects).toBeUndefined();
		});

		testWithAllClients('should include objectTypes when requested', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
				include: { objectTypes: true },
			});

			expect(result.Transaction!.digest).toBe(executedTxDigest);
			const objectTypes = await result.Transaction!.objectTypes;
			expect(objectTypes).toBeDefined();

			// Other optional fields should still be undefined
			expect(result.Transaction!.transaction).toBeUndefined();
			expect(result.Transaction!.balanceChanges).toBeUndefined();
			expect(result.Transaction!.events).toBeUndefined();
			expect(result.Transaction!.effects).toBeUndefined();
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

			expect(result.Transaction!.digest).toBe(executedTxDigest);
			expect(result.Transaction!.transaction).toBeDefined();
			expect(result.Transaction!.effects).toBeDefined();
			expect(result.Transaction!.effects?.bcs).toBeDefined();
			expect(result.Transaction!.events).toBeDefined();
			expect(result.Transaction!.balanceChanges).toBeDefined();
			const objectTypes = await result.Transaction!.objectTypes;
			expect(objectTypes).toBeDefined();
		});
	});

	describe('executeTransaction - Include Options', () => {
		testWithAllClients('should work with no includes', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: {},
			});

			expect(result.Transaction!.digest).toBeDefined();

			// Status should always be present even with no includes
			expect(result.Transaction!.status).toBeDefined();
			expect(result.Transaction!.status.success).toBe(true);
			expect(result.Transaction!.status.error).toBeNull();

			// All optional fields should be undefined
			expect(result.Transaction!.transaction).toBeUndefined();
			expect(result.Transaction!.balanceChanges).toBeUndefined();
			expect(result.Transaction!.events).toBeUndefined();
			expect(result.Transaction!.effects).toBeUndefined();

			await client.core.waitForTransaction({ digest: result.Transaction!.digest });
		});

		testWithAllClients(
			'should always return status even without include options',
			async (client) => {
				const tx = new Transaction();
				tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

				tx.setSender(testAddress);
				const bytes = await tx.build({ client: toolbox.jsonRpcClient });
				const signature = await toolbox.keypair.signTransaction(bytes);

				const result = await client.core.executeTransaction({
					transaction: bytes,
					signatures: [signature.signature],
				});

				// Status should always be present
				expect(result.Transaction!.status).toBeDefined();
				expect(typeof result.Transaction!.status.success).toBe('boolean');
				expect(result.Transaction!.status.success).toBe(true);

				await client.core.waitForTransaction({ digest: result.Transaction!.digest });
			},
		);

		testWithAllClients('should include transaction when requested', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });
			const signature = await toolbox.keypair.signTransaction(bytes);

			const result = await client.core.executeTransaction({
				transaction: bytes,
				signatures: [signature.signature],
				include: { transaction: true },
			});

			expect(result.Transaction!.transaction).toBeDefined();
			expect(result.Transaction!.transaction?.sender).toBe(testAddress);
			expect(result.Transaction!.balanceChanges).toBeUndefined();
			expect(result.Transaction!.events).toBeUndefined();
			expect(result.Transaction!.effects).toBeUndefined();

			await client.core.waitForTransaction({ digest: result.Transaction!.digest });
		});

		testWithAllClients('should include all fields when all includes requested', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });
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

			expect(result.Transaction!.transaction).toBeDefined();
			expect(result.Transaction!.effects).toBeDefined();
			expect(result.Transaction!.effects?.bcs).toBeDefined();
			expect(result.Transaction!.events).toBeDefined();
			expect(result.Transaction!.balanceChanges).toBeDefined();
			const objectTypes = await result.Transaction!.objectTypes;
			expect(objectTypes).toBeDefined();

			await client.core.waitForTransaction({ digest: result.Transaction!.digest });
		});
	});

	describe('simulateTransaction - Include Options', () => {
		testWithAllClients('should work with no includes', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: {},
			});

			// Status should always be present even with no includes
			expect(result.Transaction!.status).toBeDefined();
			expect(result.Transaction!.status.success).toBe(true);
			expect(result.Transaction!.status.error).toBeNull();

			// All optional fields should be undefined when not included
			expect(result.Transaction!.transaction).toBeUndefined();
			expect(result.Transaction!.balanceChanges).toBeUndefined();
			expect(result.Transaction!.events).toBeUndefined();
			expect(result.Transaction!.effects).toBeUndefined();
		});

		testWithAllClients(
			'should always return status even without include options',
			async (client) => {
				const tx = new Transaction();
				tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

				tx.setSender(testAddress);
				const bytes = await tx.build({ client: toolbox.jsonRpcClient });

				const result = await client.core.simulateTransaction({
					transaction: bytes,
				});

				// Status should always be present
				expect(result.Transaction!.status).toBeDefined();
				expect(typeof result.Transaction!.status.success).toBe('boolean');
				expect(result.Transaction!.status.success).toBe(true);
			},
		);

		testWithAllClients('should include transaction when requested', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });

			const result = await client.core.simulateTransaction({
				transaction: bytes,
				include: { transaction: true },
			});

			expect(result.Transaction!.transaction).toBeDefined();
			expect(result.Transaction!.transaction?.sender).toBe(testAddress);
			expect(result.Transaction!.balanceChanges).toBeUndefined();
			expect(result.Transaction!.events).toBeUndefined();
		});

		testWithAllClients('should include all fields when all includes requested', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.jsonRpcClient });

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

			expect(result.Transaction!.transaction).toBeDefined();
			expect(result.Transaction!.effects).toBeDefined();
			expect(result.Transaction!.effects?.bcs).toBeDefined();
			expect(result.Transaction!.events).toBeDefined();
			expect(result.Transaction!.balanceChanges).toBeDefined();
			const objectTypes = await result.Transaction!.objectTypes;
			expect(objectTypes).toBeDefined();
		});
	});

	describe('FailedTransaction handling', () => {
		testWithAllClients(
			'executeTransaction should return FailedTransaction for execution failures',
			async (client) => {
				// Get coins - we need separate coins for gas and for the operation
				const coins = await toolbox.jsonRpcClient.getCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
				});

				// Use first coin for gas, second coin for the failing operation
				const gasCoin = coins.data[0];
				const opCoin = coins.data[1];

				// Create a transaction that will fail at execution time
				// We'll try to split more than the coin's balance
				const tx = new Transaction();
				const hugeAmount = BigInt(opCoin.balance) * 1000n; // Way more than available
				tx.splitCoins(tx.object(opCoin.coinObjectId), [tx.pure.u64(hugeAmount)]);

				// Manually set gas to avoid resolution issues - use a DIFFERENT coin for gas
				tx.setSender(testAddress);
				tx.setGasOwner(testAddress);
				tx.setGasPayment([
					{
						objectId: gasCoin.coinObjectId,
						version: gasCoin.version,
						digest: gasCoin.digest,
					},
				]);
				tx.setGasBudget(50_000_000);
				tx.setGasPrice(1000);

				// Build without client resolution (fully resolved)
				const bytes = await tx.build({});
				const signature = await toolbox.keypair.signTransaction(bytes);

				const result = await client.core.executeTransaction({
					transaction: bytes,
					signatures: [signature.signature],
					include: { effects: true },
				});

				// Should be a FailedTransaction
				expect(result.$kind).toBe('FailedTransaction');
				expect(result.FailedTransaction).toBeDefined();
				expect(result.FailedTransaction!.status.success).toBe(false);
				expect(result.FailedTransaction!.status.error).toBeDefined();
				expect(result.FailedTransaction!.digest).toBeDefined();
			},
			{ skip: ['graphql'] }, // GraphQL doesn't support transaction resolution
		);

		testWithAllClients(
			'simulateTransaction should return FailedTransaction for execution failures',
			async (client) => {
				// Create a transaction that calls a function that aborts
				// We need to fully resolve it to avoid the budget calculation failing
				const tx = new Transaction();
				tx.moveCall({
					target: `${packageId}::test_objects::abort_always`,
					arguments: [],
				});

				// Manually configure gas to bypass the resolution that fails on abort
				tx.setSender(testAddress);
				tx.setGasOwner(testAddress);
				tx.setGasBudget(50_000_000);
				tx.setGasPrice(1000);

				// Get a coin for gas
				const coins = await toolbox.jsonRpcClient.getCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
				});
				tx.setGasPayment([
					{
						objectId: coins.data[0].coinObjectId,
						version: coins.data[0].version,
						digest: coins.data[0].digest,
					},
				]);

				const bytes = await tx.build({});

				const result = await client.core.simulateTransaction({
					transaction: bytes,
					include: { effects: true },
				});

				// Should be a FailedTransaction
				expect(result.$kind).toBe('FailedTransaction');
				expect(result.FailedTransaction).toBeDefined();
				expect(result.FailedTransaction!.status.success).toBe(false);
				expect(result.FailedTransaction!.status.error).toBeDefined();
			},
		);

		testWithAllClients(
			'TransactionResult discriminated union allows type-safe access',
			async (client) => {
				const tx = new Transaction();
				tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

				tx.setSender(testAddress);
				const bytes = await tx.build({});

				const result = await client.core.simulateTransaction({
					transaction: bytes,
					include: { effects: true },
				});

				// Type-safe access pattern using discriminated union
				if (result.$kind === 'Transaction') {
					expect(result.Transaction!.status.success).toBe(true);
					// Note: digest may not be available in all simulate responses (e.g., gRPC)
					expect(result.Transaction!.effects).toBeDefined();
				} else {
					// This branch would handle FailedTransaction
					expect(result.FailedTransaction.status.success).toBe(false);
				}
			},
		);
	});
});
