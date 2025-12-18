// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';
import { setup, TestToolbox, createTestWithAllClients } from '../../utils/setup.js';
import { SUI_TYPE_ARG } from '../../../../src/utils/index.js';
import { Ed25519Keypair } from '../../../../src/keypairs/ed25519/keypair.js';
import { Transaction } from '../../../../src/transactions/index.js';

describe('Core API - Coins', () => {
	let toolbox: TestToolbox;
	let testAddress: string;
	let testPackageId: string;

	const testWithAllClients = createTestWithAllClients(() => toolbox);

	beforeAll(async () => {
		toolbox = await setup();
		testAddress = toolbox.address();

		// Get the package ID for custom coin tests
		testPackageId = await toolbox.getPackage('test_data');

		// Mint custom TEST_COIN coins using the shared TreasuryCap
		const treasuryCapId = toolbox.getSharedObject('test_data', 'TreasuryCap<TEST_COIN>');
		if (!treasuryCapId) {
			throw new Error('TreasuryCap<TEST_COIN> not found in pre-published package');
		}

		const tx = new Transaction();
		const [coin] = tx.moveCall({
			target: `${testPackageId}::test_coin::mint`,
			arguments: [tx.object(treasuryCapId), tx.pure.u64(1000000)],
		});
		tx.transferObjects([coin], tx.pure.address(testAddress));

		const result = await toolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: tx,
			signer: toolbox.keypair,
			options: {
				showEffects: true,
			},
		});

		await toolbox.jsonRpcClient.waitForTransaction({ digest: result.digest });
	});

	describe('getCoins', () => {
		it('all clients return same data: getCoins', async () => {
			await toolbox.expectAllClientsReturnSameData(async (client) => {
				const { cursor: _, ...res } = await client.core.listCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
					limit: 5,
				});

				return res;
			});
		});

		testWithAllClients('should get coins for an address', async (client) => {
			const result = await client.core.listCoins({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
			});

			expect(result.objects.length).toBeGreaterThan(0);
			expect(result.hasNextPage).toBeDefined();
			expect(result.cursor).toBeDefined();

			// Verify each coin
			for (const coin of result.objects) {
				expect(coin.type).toContain('Coin<');
				expect(coin.type).toContain('sui::SUI');
				expect(coin.balance).toBeDefined();
				expect(BigInt(coin.balance)).toBeGreaterThan(0n);
			}
		});

		testWithAllClients('should paginate coins', async (client) => {
			// Get first page with limit
			const firstPage = await client.core.listCoins({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
				limit: 2,
			});

			expect(firstPage.objects.length).toBeLessThanOrEqual(2);

			if (firstPage.hasNextPage && firstPage.cursor) {
				// Get second page
				const secondPage = await client.core.listCoins({
					owner: testAddress,
					coinType: SUI_TYPE_ARG,
					limit: 2,
					cursor: firstPage.cursor,
				});

				// Verify different coins on second page
				const firstPageIds = new Set(firstPage.objects.map((coin) => coin.objectId));
				const secondPageIds = secondPage.objects.map((coin) => coin.objectId);

				for (const id of secondPageIds) {
					expect(firstPageIds.has(id)).toBe(false);
				}
			}
		});

		testWithAllClients('should return empty for address with no coins', async (client) => {
			// Use a new keypair address that has no coins
			const emptyAddress = new Ed25519Keypair().toSuiAddress();
			const result = await client.core.listCoins({
				owner: emptyAddress,
				coinType: SUI_TYPE_ARG,
			});

			expect(result.objects).toEqual([]);
			expect(result.hasNextPage).toBe(false);
		});
	});

	describe('getBalance', () => {
		it('all clients return same data: getBalance', async () => {
			await toolbox.expectAllClientsReturnSameData((client) =>
				client.core.getBalance({ owner: testAddress, coinType: SUI_TYPE_ARG }),
			);
		});

		testWithAllClients('should get balance for an address', async (client) => {
			const result = await client.core.getBalance({
				owner: testAddress,
				coinType: SUI_TYPE_ARG,
			});

			expect(result.balance.balance).toBeDefined();
			// All implementations should return normalized format
			expect(result.balance.coinType).toContain('::sui::SUI');
			expect(BigInt(result.balance.balance)).toBeGreaterThan(0n);
		});

		testWithAllClients('should return zero balance for empty address', async (client) => {
			// Use a new keypair address that has no coins
			const emptyAddress = new Ed25519Keypair().toSuiAddress();
			const result = await client.core.getBalance({
				owner: emptyAddress,
				coinType: SUI_TYPE_ARG,
			});

			expect(result.balance.balance).toBe('0');
			// Coin type might be normalized differently across clients
			expect(result.balance.coinType).toContain('sui::SUI');
		});
	});

	describe('getAllBalances', () => {
		it('all clients return same data: getAllBalances', async () => {
			await toolbox.expectAllClientsReturnSameData(
				(client) => client.core.listBalances({ owner: testAddress, limit: 5 }),
				// Normalize: ignore cursor and sort by coinType (order may vary across APIs)
				(result) => ({
					...result,
					cursor: null,
					balances: result.balances.sort((a, b) => a.coinType.localeCompare(b.coinType)),
				}),
			);
		});

		testWithAllClients('should get all balances for an address', async (client) => {
			const result = await client.core.listBalances({
				owner: testAddress,
			});

			expect(result.balances.length).toBeGreaterThan(0);
			expect(result.hasNextPage).toBeDefined();
			expect(result.cursor).toBeDefined();

			// Should have at least one balance
			const firstBalance = result.balances[0];
			expect(firstBalance).toBeDefined();
			expect(firstBalance.coinType).toBeDefined();
			expect(BigInt(firstBalance.balance)).toBeGreaterThan(0n);
		});

		testWithAllClients('should paginate all balances', async (client) => {
			// Get first page with limit
			const firstPage = await client.core.listBalances({
				owner: testAddress,
				limit: 1,
			});

			expect(firstPage.balances.length).toBeGreaterThan(0);

			if (firstPage.hasNextPage && firstPage.cursor) {
				// Get second page
				const secondPage = await client.core.listBalances({
					owner: testAddress,
					limit: 1,
					cursor: firstPage.cursor,
				});

				// Verify different coin types on second page
				const firstPageTypes = new Set(firstPage.balances.map((b) => b.coinType));
				const secondPageTypes = secondPage.balances.map((b) => b.coinType);

				for (const coinType of secondPageTypes) {
					expect(firstPageTypes.has(coinType)).toBe(false);
				}
			}
		});

		testWithAllClients('should return empty for address with no balances', async (client) => {
			// Use a new keypair address that has no coins
			const emptyAddress = new Ed25519Keypair().toSuiAddress();
			const result = await client.core.listBalances({
				owner: emptyAddress,
			});

			expect(result.balances).toEqual([]);
			expect(result.hasNextPage).toBe(false);
		});
	});

	describe('Custom Coin Type', () => {
		testWithAllClients('should see custom coin in getAllBalances', async (client) => {
			const result = await client.core.listBalances({
				owner: testAddress,
			});

			// Find the custom coin (minted in beforeAll)
			const customCoin = result.balances.find((b) => b.coinType.includes('test_coin::TEST_COIN'));
			expect(customCoin).toBeDefined();
			expect(customCoin!.coinType).toContain('test_coin::TEST_COIN');
			// Balance should be at least 1000000
			expect(BigInt(customCoin!.balance)).toBeGreaterThanOrEqual(1000000n);
		});

		testWithAllClients('should find custom coins with getCoins', async (client) => {
			const result = await client.core.listCoins({
				owner: testAddress,
				coinType: `${testPackageId}::test_coin::TEST_COIN`,
			});

			expect(result.objects.length).toBeGreaterThan(0);
			for (const coin of result.objects) {
				expect(coin.type).toContain('test_coin::TEST_COIN');
				expect(BigInt(coin.balance)).toBeGreaterThan(0n);
			}
		});
	});
});
