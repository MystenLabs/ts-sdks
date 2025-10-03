// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { analyze } from '../../src/transaction-analyzer/analyzer';
import { coinValues } from '../../src/transaction-analyzer/rules/coin-value.js';
import { MockSuiClient } from '../mocks/MockSuiClient';
import {
	DEFAULT_SENDER,
	createAddressOwner,
	TEST_COIN_1_ID,
	TEST_USDC_COIN_ID,
	TEST_WETH_COIN_ID,
} from '../mocks/mockData';

describe('TransactionAnalyzer - Coin Value Rule', () => {
	// Mock price provider function
	const mockGetCoinPrices = async (coinTypes: string[]) => {
		const priceMap: Record<string, { decimals: number; price: number | null }> = {
			'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI': {
				decimals: 9,
				price: 2.5, // $2.50 per SUI
			},
			'0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC': {
				decimals: 6,
				price: 1.0, // $1.00 per USDC
			},
			'0x0000000000000000000000000000000000000000000000000000000000000b0c::weth::WETH': {
				decimals: 18,
				price: 3000.0, // $3000 per WETH
			},
			// Unknown token without price
			'0x0000000000000000000000000000000000000000000000000000000000000999::unknown::TOKEN': {
				decimals: 8,
				price: null,
			},
		};

		return coinTypes.map((coinType) => ({
			coinType,
			decimals: priceMap[coinType]?.decimals ?? 0,
			price: priceMap[coinType]?.price ?? null,
		}));
	};

	it('should calculate coin values for transactions with known prices', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Create a transaction that uses multiple coin types
		const suiCoin = tx.object(TEST_COIN_1_ID); // 5 SUI
		const usdcCoin = tx.object(TEST_USDC_COIN_ID); // 500 USDC from default mock
		const wethCoin = tx.object(TEST_WETH_COIN_ID); // 2.5 WETH from default mock

		// Transfer 1 SUI, 100 USDC, and 0.5 WETH
		const [suiSplit] = tx.splitCoins(suiCoin, [1000000000n]); // 1 SUI
		const [usdcSplit] = tx.splitCoins(usdcCoin, [100000000n]); // 100 USDC
		const [wethSplit] = tx.splitCoins(wethCoin, [500000000000000000n]); // 0.5 WETH

		tx.transferObjects([suiSplit, usdcSplit, wethSplit], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinValues },
			{
				client,
				transaction: await tx.toJSON(),
				getCoinPrices: mockGetCoinPrices,
			},
		);

		// Verify coin value analysis
		expect(results.coinValues.result).toMatchInlineSnapshot(`
			{
			  "coinTypes": [
			    {
			      "amount": 1010000000n,
			      "coinType": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			      "convertedAmount": 2.525,
			      "decimals": 9,
			      "price": 2.5,
			    },
			    {
			      "amount": 100000000n,
			      "coinType": "0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC",
			      "convertedAmount": 100,
			      "decimals": 6,
			      "price": 1,
			    },
			    {
			      "amount": 500000000000000000n,
			      "coinType": "0x0000000000000000000000000000000000000000000000000000000000000b0c::weth::WETH",
			      "convertedAmount": 1500,
			      "decimals": 18,
			      "price": 3000,
			    },
			  ],
			  "coinTypesWithoutPrice": [],
			  "total": 1602.525,
			}
		`);
	});

	it('should handle transactions with no coin flows', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Empty transaction - no coin flows except gas budget
		const results = await analyze(
			{ coinValues },
			{
				client,
				transaction: await tx.toJSON(),
				getCoinPrices: mockGetCoinPrices,
			},
		);

		// Should have no value calculations for empty transaction
		expect(results.coinValues.result).toEqual({
			coinTypes: [
				{
					coinType: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
					decimals: 9,
					price: 2.5,
					amount: 10000000n,
					convertedAmount: 0.025,
				},
			],
			coinTypesWithoutPrice: [],
			total: 0.025,
		});
	});

	it('should handle coins without known prices', async () => {
		const client = new MockSuiClient();

		// Add an unknown token
		client.addCoin({
			objectId: '0xa5c020',
			coinType: '0x999::unknown::TOKEN',
			balance: 1000000000n,
			owner: createAddressOwner(DEFAULT_SENDER),
		});

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Transfer some SUI (known price) and unknown token (no price)
		const suiCoin = tx.object(TEST_COIN_1_ID);
		const unknownCoin = tx.object('0xa5c020');

		const [suiSplit] = tx.splitCoins(suiCoin, [500000000n]); // 0.5 SUI
		tx.transferObjects([suiSplit, unknownCoin], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinValues },
			{
				client,
				transaction: await tx.toJSON(),
				getCoinPrices: mockGetCoinPrices,
			},
		);

		// Should track coins without prices separately
		expect(results.coinValues.result?.coinTypesWithoutPrice).toContain(
			'0x0000000000000000000000000000000000000000000000000000000000000999::unknown::TOKEN',
		);
	});

	it('should calculate correct USD values with proper decimals', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Create precise amounts for calculation testing
		const suiCoin = tx.object(TEST_COIN_1_ID);

		// Split exactly 2.5 SUI (2500000000 = 2.5 * 10^9)
		// At $2.50 per SUI, this should be $6.25 total
		const [suiSplit] = tx.splitCoins(suiCoin, [2500000000n]);
		tx.transferObjects([suiSplit], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinValues },
			{
				client,
				transaction: await tx.toJSON(),
				getCoinPrices: mockGetCoinPrices,
			},
		);

		expect(results.coinValues.result).toMatchInlineSnapshot(`
			{
			  "coinTypes": [
			    {
			      "amount": 2510000000n,
			      "coinType": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			      "convertedAmount": 6.2749999999999995,
			      "decimals": 9,
			      "price": 2.5,
			    },
			  ],
			  "coinTypesWithoutPrice": [],
			  "total": 6.2749999999999995,
			}
		`);
	});

	it('should handle mixed scenarios with some priced and some unpriced coins', async () => {
		const client = new MockSuiClient();

		// Add coins with and without prices
		client.addCoin({
			objectId: '0xa5c021',
			coinType: '0x999::unknown::TOKEN',
			balance: 1000000000n,
			owner: createAddressOwner(DEFAULT_SENDER),
		});

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Use both types
		const suiCoin = tx.object(TEST_COIN_1_ID); // Has price
		const usdcCoin = tx.object(TEST_USDC_COIN_ID); // Has price
		const unknownCoin = tx.object('0xa5c021'); // No price

		const [suiSplit] = tx.splitCoins(suiCoin, [1000000000n]); // 1 SUI = $2.50
		const [usdcSplit] = tx.splitCoins(usdcCoin, [50000000n]); // 50 USDC = $50.00

		tx.transferObjects([suiSplit, usdcSplit, unknownCoin], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinValues },
			{
				client,
				transaction: await tx.toJSON(),
				getCoinPrices: mockGetCoinPrices,
			},
		);

		// Should have mixed results - some with prices, some without
		expect(results.coinValues.result?.coinTypesWithoutPrice).toContain(
			'0x0000000000000000000000000000000000000000000000000000000000000999::unknown::TOKEN',
		);
	});

	it('should handle price provider errors gracefully', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const suiCoin = tx.object(TEST_COIN_1_ID);
		const [suiSplit] = tx.splitCoins(suiCoin, [1000000000n]);
		tx.transferObjects([suiSplit], tx.pure.address('0x456'));

		// Price provider that throws an error
		const errorGetCoinPrices = async () => {
			throw new Error('Price provider unavailable');
		};

		// Should handle the error gracefully by returning issues
		const results = await analyze(
			{ coinValues },
			{
				client,
				transaction: await tx.toJSON(),
				getCoinPrices: errorGetCoinPrices,
			},
		);

		expect(results.coinValues.issues).toBeDefined();
		expect(results.coinValues.result).toBeUndefined();
		expect(results.coinValues.issues).toMatchInlineSnapshot(`
			[
			  {
			    "message": "Unexpected error while analyzing transaction: Price provider unavailable",
			  },
			]
		`);
	});

	it('should only calculate values for outflow coins (spent coins)', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const suiCoin = tx.object(TEST_COIN_1_ID);

		// Split and transfer back to sender (should not create outflow)
		const [suiSplit] = tx.splitCoins(suiCoin, [1000000000n]);
		tx.transferObjects([suiSplit], tx.pure.address(DEFAULT_SENDER));

		const results = await analyze(
			{ coinValues },
			{
				client,
				transaction: await tx.toJSON(),
				getCoinPrices: mockGetCoinPrices,
			},
		);

		// Should have no value calculation since coins weren't actually spent
		expect(results.coinValues.result?.total).toBe(0.025);
		expect(results.coinValues.result?.coinTypes).toHaveLength(1);
	});
});
