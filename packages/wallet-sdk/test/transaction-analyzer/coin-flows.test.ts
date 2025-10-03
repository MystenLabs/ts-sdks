// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { analyze } from '../../src/transaction-analyzer/analyzer';
import { coinFlows } from '../../src/transaction-analyzer/rules/coin-flows';
import { MockSuiClient } from '../mocks/MockSuiClient';
import {
	DEFAULT_SENDER,
	createAddressOwner,
	TEST_COIN_1_ID,
	TEST_COIN_2_ID,
	TEST_USDC_COIN_ID,
	TEST_WETH_COIN_ID,
} from '../mocks/mockData';

describe('TransactionAnalyzer - Coin Flows Rule', () => {
	it('should handle empty transactions with no coin flows', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Empty transaction - gas coin is tracked but no actual flows
		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Gas coin is tracked with gas budget usage in empty transaction
		expect(results.coinFlows.result?.outflows).toEqual([
			{
				coinType: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
				amount: 10000000n, // Gas budget
			},
		]);
	});

	it('should track gas coin flows when splitting and transferring', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Split gas coin and transfer it
		const [gasSplit] = tx.splitCoins(tx.gas, [100000000n]); // 0.1 SUI from gas
		tx.transferObjects([gasSplit], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Should have SUI outflow of 0.1 SUI
		expect(results.coinFlows.result?.outflows).toHaveLength(1);
		const suiFlow = results.coinFlows.result?.outflows[0];
		expect(suiFlow?.coinType).toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
		);
		expect(suiFlow?.amount).toBe(110000000n); // 0.1 SUI + 0.01 SUI gas budget
	});

	it('should track full gas coin transfer', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Transfer entire gas coin
		tx.transferObjects([tx.gas], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Should have SUI outflow of full gas amount
		expect(results.coinFlows.result?.outflows).toHaveLength(1);
		const suiFlow = results.coinFlows.result?.outflows[0];
		expect(suiFlow?.coinType).toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
		);
		expect(suiFlow?.amount).toBe(5000000000n); // Full gas balance transferred
	});

	it('should handle merge and split operations correctly', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin1 = tx.object(TEST_COIN_1_ID); // 5 SUI
		const coin2 = tx.object(TEST_COIN_2_ID); // 2.5 SUI

		// Merge coins
		tx.mergeCoins(coin1, [coin2]); // Now coin1 has 7.5 SUI

		// Split merged coin
		const [splitCoin1, splitCoin2, splitCoin3] = tx.splitCoins(coin1, [
			1000000000n,
			500000000n,
			250000000n,
		]); // 1 SUI + 0.5 SUI + 0.25 SUI

		const [toTransfer] = tx.mergeCoins(splitCoin1, [splitCoin2]); // 1.5 SUI

		tx.mergeCoins(coin1, [splitCoin3]); // Merge back remaining .25

		// Transfer the split
		tx.transferObjects([toTransfer], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Should only count the transferred amount, not double count the merged coins
		expect(results.coinFlows.result?.outflows).toHaveLength(1);
		const suiFlow = results.coinFlows.result?.outflows[0];
		expect(suiFlow?.amount).toBe(1510000000n); // 1 SUI + 2.5 SUI + 0.01 gas budget
	});

	it('should track coins consumed in Move calls', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin = tx.object(TEST_COIN_1_ID);
		const [splitCoin] = tx.splitCoins(coin, [500000000n]); // 0.5 SUI

		// Use coin in Move call (consumes it)
		tx.moveCall({
			target: '0x999::test::consume_coin',
			arguments: [splitCoin, tx.gas],
		});

		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Should track both the split coin and gas coin as consumed
		expect(results.coinFlows.result?.outflows).toHaveLength(1);
		const suiFlow = results.coinFlows.result?.outflows[0];
		expect(suiFlow?.amount).toBe(5500000000n); // 0.5 SUI (split) + 5 SUI (gas)
	});

	it('should track coins consumed in MakeMoveVec', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin = tx.object(TEST_COIN_1_ID);
		const [splitCoin] = tx.splitCoins(coin, [300000000n]); // 0.3 SUI

		// Create vector with coins (consumes them)
		tx.makeMoveVec({
			elements: [splitCoin, tx.gas],
		});

		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Should track both coins as consumed
		expect(results.coinFlows.result?.outflows).toHaveLength(1);
		const suiFlow = results.coinFlows.result?.outflows[0];
		expect(suiFlow?.amount).toBe(5300000000n); // 0.3 SUI (split) + 5 SUI (gas)
	});

	it('should track coins transferred back to sender (no outflow)', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Split and transfer back to sender (should not create outflow)
		const suiCoin = tx.object(TEST_COIN_1_ID);
		const [splitCoin] = tx.splitCoins(suiCoin, [100000000n]); // 0.1 SUI
		tx.transferObjects([splitCoin], tx.pure.address(DEFAULT_SENDER));

		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Should have no outflows since coin was transferred back to sender
		// But gas budget is still consumed
		expect(results.coinFlows.result?.outflows).toEqual([
			{
				coinType: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
				amount: 10000000n, // Gas budget
			},
		]);
	});

	it('should handle dynamic split amounts (assume full consumption)', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const dynamicAmount = tx.moveCall({ target: '0x999::test::get_dynamic_amount' });

		// Split with dynamic amount - analyzer should assume full consumption
		const [splitCoin] = tx.splitCoins(tx.gas, [dynamicAmount]);
		tx.transferObjects([splitCoin], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Should track the full coin balance as outflow due to dynamic amount
		const suiFlow = results.coinFlows.result?.outflows.find(
			(flow) =>
				flow.coinType ===
				'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
		);
		expect(suiFlow?.amount).toBe(5000000000n); // assume split consumed full gas coin
	});

	it('should handle multiple coin types in single transaction', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Use different coin types
		const suiCoin = tx.object(TEST_COIN_1_ID);
		const usdcCoin = tx.object(TEST_USDC_COIN_ID);
		const wethCoin = tx.object(TEST_WETH_COIN_ID);

		// Transfer each to different addresses
		tx.transferObjects([suiCoin], tx.pure.address('0x111'));
		tx.transferObjects([usdcCoin], tx.pure.address('0x222'));
		tx.transferObjects([wethCoin], tx.pure.address('0x333'));

		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Should have outflows for all three coin types
		expect(results.coinFlows.result?.outflows).toHaveLength(3);

		const coinTypes = results.coinFlows.result?.outflows.map((flow) => flow.coinType).sort();
		expect(coinTypes).toEqual([
			'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
			'0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC',
			'0x0000000000000000000000000000000000000000000000000000000000000b0c::weth::WETH',
		]);

		expect(results.coinFlows.result?.outflows).toMatchInlineSnapshot(`
			[
			  {
			    "amount": 5010000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			  },
			  {
			    "amount": 500000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC",
			  },
			  {
			    "amount": 2500000000000000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000b0c::weth::WETH",
			  },
			]
		`);
	});

	it('should not double count coins in split-merge chains', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin1 = tx.object(TEST_COIN_1_ID); // 5 SUI
		const coin2 = tx.object(TEST_COIN_2_ID); // 2.5 SUI

		// Split first coin
		const [splitCoin] = tx.splitCoins(coin1, [1000000000n]); // 1 SUI

		// Merge split with second coin
		tx.mergeCoins(splitCoin, [coin2]); // splitCoin now has 3.5 SUI

		const [split2, split3] = tx.splitCoins(splitCoin, [1000000000n, 500000000n]); // 1 SUI, 0.5 SUI

		// Transfer the merged result (1.5 SUI)
		tx.transferObjects([split2, split3], tx.pure.address('0x456'));

		tx.mergeCoins(coin1, [splitCoin]); // merge back remaining 6 sui

		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		expect(results.coinFlows.result?.outflows).toHaveLength(1);
		const suiFlow = results.coinFlows.result?.outflows[0];
		expect(suiFlow?.amount).toBe(1510000000n); // 1.5 SUI (split2 + split3) + 0.01 gas budget
	});

	it('should track coin flows when splitting and transferring coins', async () => {
		const client = new MockSuiClient();

		// Add additional coins for comprehensive testing
		client.addCoin({
			objectId: '0xa5c010',
			coinType: '0x2::sui::SUI',
			balance: 5000000000n, // 5 SUI
			owner: createAddressOwner(DEFAULT_SENDER),
		});

		client.addCoin({
			objectId: '0xa5c011',
			coinType: '0x2::sui::SUI',
			balance: 2000000000n, // 2 SUI
			owner: createAddressOwner(DEFAULT_SENDER),
		});

		client.addCoin({
			objectId: '0xa5c012',
			coinType: '0xa0b::usdc::USDC',
			balance: 1000000000n, // 1000 USDC (6 decimals)
			owner: createAddressOwner(DEFAULT_SENDER),
		});

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Test 1: Split coins (should track outflow when transferred)
		const suiCoin = tx.object('0xa5c010');
		const [splitCoin1, splitCoin2] = tx.splitCoins(suiCoin, [1000000000n, 500000000n]); // 1 SUI, 0.5 SUI

		// Test 2: Merge coins (should combine balances)
		const suiCoin2 = tx.object('0xa5c011');
		tx.mergeCoins(suiCoin, [suiCoin2]); // Merge 2 SUI into main coin

		// Test 3: Use gas coin (should track gas usage)
		const [gasSplit] = tx.splitCoins(tx.gas, [100000000n]); // 0.1 SUI from gas

		// Test 4: Transfer different coin types (should track outflows)
		const usdcCoin = tx.object('0xa5c012');
		const [usdcSplit] = tx.splitCoins(usdcCoin, [500000000n]); // 500 USDC

		// Transfer coins to create outflows
		tx.transferObjects([splitCoin1, gasSplit], tx.pure.address('0x456'));
		tx.transferObjects([usdcSplit], tx.pure.address('0x789'));

		// Test 5: Use coins in Move calls (should consume them)
		tx.moveCall({
			target: '0x999::test::consume_coin',
			arguments: [splitCoin2], // This should consume the 0.5 SUI
		});

		// Test 6: Use coins in MakeMoveVec (should consume them)
		const wethCoin = tx.object(TEST_WETH_COIN_ID);
		const coinVec = tx.makeMoveVec({
			elements: [wethCoin],
		});

		tx.moveCall({
			target: '0x999::test::batch_operation',
			arguments: [coinVec],
		});

		const results = await analyze(
			{ coinFlows },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Verify coin flows are tracked correctly
		expect(results.coinFlows.result?.outflows).toMatchInlineSnapshot(`
			[
			  {
			    "amount": 1610000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			  },
			  {
			    "amount": 500000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC",
			  },
			  {
			    "amount": 2500000000000000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000b0c::weth::WETH",
			  },
			]
		`);

		// Verify SUI outflow: 1 SUI (split1) + 0.1 SUI (gas) + 0.5 SUI (consumed in move call) = 1.6 SUI
		const suiFlow = results.coinFlows.result?.outflows.find(
			(flow) =>
				flow.coinType ===
				'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
		);
		expect(suiFlow?.amount).toBe(1610000000n); // 1.6 SUI + 0.01 SUI gas budget

		// Verify USDC outflow: 500 USDC transferred
		const usdcFlow = results.coinFlows.result?.outflows.find(
			(flow) =>
				flow.coinType ===
				'0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC',
		);
		expect(usdcFlow?.amount).toBe(500000000n); // Positive means outflow

		// Verify WETH outflow: entire coin consumed in MakeMoveVec
		const wethFlow = results.coinFlows.result?.outflows.find(
			(flow) =>
				flow.coinType ===
				'0x0000000000000000000000000000000000000000000000000000000000000b0c::weth::WETH',
		);
		expect(wethFlow?.amount).toBe(2500000000000000000n); // WETH balance consumed
	});
});
