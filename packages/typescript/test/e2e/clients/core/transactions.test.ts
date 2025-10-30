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

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();

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
				client.core.getTransaction({ digest: executedTxDigest }),
			);
		});

		testWithAllClients('should get transaction by digest', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
			});

			expect(result.transaction.digest).toBe(executedTxDigest);
			expect(result.transaction.effects).toBeDefined();
			expect(result.transaction.effects.status).toBeDefined();
			if ('success' in result.transaction.effects.status) {
				expect(result.transaction.effects.status.success).toBe(true);
			}
		});

		testWithAllClients('should get transaction with balance changes', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
			});

			expect(result.transaction.balanceChanges).toBeDefined();
			expect(Array.isArray(result.transaction.balanceChanges)).toBe(true);
		});

		testWithAllClients('should verify transaction structure', async (client) => {
			const result = await client.core.getTransaction({
				digest: executedTxDigest,
			});

			expect(result.transaction.signatures).toBeDefined();
			expect(Array.isArray(result.transaction.signatures)).toBe(true);
			expect(result.transaction.effects.changedObjects).toBeDefined();
			expect(Array.isArray(result.transaction.effects.changedObjects)).toBe(true);
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
			});

			expect(result.transaction.digest).toBeDefined();
			expect(result.transaction.effects).toBeDefined();
			expect(result.transaction.effects.status).toBeDefined();
			if ('success' in result.transaction.effects.status) {
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
			});

			expect(result.transaction.digest).toBeDefined();
			expect(result.transaction.balanceChanges).toBeDefined();
			expect(Array.isArray(result.transaction.balanceChanges)).toBe(true);
			expect(result.transaction.effects.changedObjects).toBeDefined();
			expect(Array.isArray(result.transaction.effects.changedObjects)).toBe(true);

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

	describe('dryRunTransaction', () => {
		testWithAllClients('should dry run a valid transaction', async (client) => {
			const tx = new Transaction();
			tx.transferObjects([tx.splitCoins(tx.gas, [1000])], tx.pure.address(testAddress));

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });

			const result = await client.core.dryRunTransaction({
				transaction: bytes,
			});

			expect(result.transaction.effects).toBeDefined();
			expect(result.transaction.effects.status).toBeDefined();
			if ('success' in result.transaction.effects.status) {
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

			const result = await client.core.dryRunTransaction({
				transaction: bytes,
			});

			expect(result.transaction.effects.gasUsed).toBeDefined();
			expect(result.transaction.effects.gasUsed.computationCost).toBeDefined();
			expect(result.transaction.effects.gasUsed.storageCost).toBeDefined();
			expect(result.transaction.effects.gasUsed.storageRebate).toBeDefined();
		});

		testWithAllClients('should detect transaction failure in dry run', async (client) => {
			// Create a transaction that will fail (try to transfer more than we have)
			const tx = new Transaction();
			const coins = await client.core.getCoins({
				address: testAddress,
				coinType: SUI_TYPE_ARG,
			});

			if (coins.objects.length > 0) {
				const firstCoin = coins.objects[0];
				const tooMuchAmount = BigInt(firstCoin.balance) * BigInt(2);

				tx.transferObjects(
					[tx.splitCoins(tx.object(firstCoin.id), [tooMuchAmount])],
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
				address: testAddress,
				coinType: SUI_TYPE_ARG,
			});

			const tx = new Transaction();
			tx.transferObjects(
				[tx.splitCoins(tx.gas, [5000])],
				tx.pure.address(Ed25519Keypair.generate().toSuiAddress()),
			);

			tx.setSender(testAddress);
			const bytes = await tx.build({ client: toolbox.client });

			await client.core.dryRunTransaction({
				transaction: bytes,
			});

			// Balance should be unchanged after dry run
			const balanceAfter = await client.core.getBalance({
				address: testAddress,
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
			});

			expect(waitResult.transaction.digest).toBe(executeResult.transaction.digest);
			expect(waitResult.transaction.effects).toBeDefined();
			expect(waitResult.transaction.effects.status).toBeDefined();
			if ('success' in waitResult.transaction.effects.status) {
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
});
