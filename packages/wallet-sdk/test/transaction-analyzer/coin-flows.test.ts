// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';
import { analyze } from '../../src/transaction-analyzer/analyzer.js';
import { coinFlows } from '../../src/transaction-analyzer/rules/coin-flows.js';
import { MockSuiClient } from '../mocks/MockSuiClient.js';
import {
	DEFAULT_SENDER,
	createAddressOwner,
	TEST_COIN_1_ID,
	TEST_COIN_2_ID,
	TEST_USDC_COIN_ID,
	TEST_WETH_COIN_ID,
} from '../mocks/mockData.js';

const SUI = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
const USDC = '0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC';

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
				transaction: await tx.toJSON(),
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
				transaction: await tx.toJSON(),
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
				transaction: await tx.toJSON(),
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
				transaction: await tx.toJSON(),
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
				transaction: await tx.toJSON(),
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
				transaction: await tx.toJSON(),
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
				transaction: await tx.toJSON(),
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
				transaction: await tx.toJSON(),
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
				transaction: await tx.toJSON(),
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
				transaction: await tx.toJSON(),
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
				transaction: await tx.toJSON(),
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

// Helper: build a transaction with a FundsWithdrawal input and a redeem MoveCall.
function buildWithdrawalTx(opts: {
	sender?: string;
	withdrawalAmount: bigint;
	coinType: string;
	redeemTarget: '0x2::balance::redeem_funds' | '0x2::coin::redeem_funds';
}) {
	const tx = new Transaction();
	tx.setSender(opts.sender ?? DEFAULT_SENDER);

	const withdrawalInput = tx.withdrawal({
		amount: opts.withdrawalAmount,
		type: opts.coinType,
	});

	const result = tx.moveCall({
		target: opts.redeemTarget,
		typeArguments: [opts.coinType],
		arguments: [withdrawalInput],
	});

	return { tx, result };
}

describe('Coin Flows - Framework MoveCall Tests', () => {
	// --- Address balance operations ---

	it('tracks coin::redeem_funds as an owned coin outflow', async () => {
		const client = new MockSuiClient();
		const { tx, result } = buildWithdrawalTx({
			withdrawalAmount: 500000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::coin::redeem_funds',
		});

		tx.transferObjects([result], tx.pure.address('0x456'));

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(500000000n);
	});

	it('tracks balance::redeem_funds as an owned balance outflow', async () => {
		const client = new MockSuiClient();
		const { tx, result } = buildWithdrawalTx({
			withdrawalAmount: 300000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		// Consume the balance in a generic MoveCall
		tx.moveCall({
			target: '0x999::test::consume_coin',
			typeArguments: [normalizeStructTag('0xa0b::usdc::USDC')],
			arguments: [result, result], // second arg doesn't matter, consume_coin takes 2
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(300000000n);
	});

	it('does not count sponsored withdrawal as sender outflow', async () => {
		const client = new MockSuiClient();

		// Build a simple tx with a Sender withdrawal, then patch the JSON to use Sponsor
		const { tx } = buildWithdrawalTx({
			withdrawalAmount: 500000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::coin::redeem_funds',
		});

		tx.transferObjects(
			[
				tx.moveCall({
					target: '0x2::coin::redeem_funds',
					typeArguments: ['0xa0b::usdc::USDC'],
					arguments: [tx.withdrawal({ amount: 500000000n, type: '0xa0b::usdc::USDC' })],
				}),
			],
			tx.pure.address('0x456'),
		);

		// Get JSON and patch withdrawFrom to Sponsor
		const json = JSON.parse(await tx.toJSON());
		for (const input of json.inputs) {
			if (input.FundsWithdrawal) {
				input.FundsWithdrawal.withdrawFrom = { Sponsor: true };
			}
		}

		const results = await analyze({ coinFlows }, { client, transaction: JSON.stringify(json) });

		// Sponsored withdrawal should not count as sender outflow
		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow).toBeUndefined();
	});

	it('handles coin::send_funds to sender (no outflow)', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin = tx.object(TEST_COIN_1_ID);
		const [splitCoin] = tx.splitCoins(coin, [200000000n]);

		tx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [splitCoin, tx.pure.address(DEFAULT_SENDER)],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(suiFlow?.amount).toBe(10000000n); // gas budget only
	});

	it('handles coin::send_funds to other address (outflow)', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin = tx.object(TEST_COIN_1_ID);
		const [splitCoin] = tx.splitCoins(coin, [200000000n]);

		tx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [splitCoin, tx.pure.address('0x456')],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(suiFlow?.amount).toBe(210000000n); // 200M + gas budget
	});

	it('handles balance::send_funds to sender (no outflow)', async () => {
		const client = new MockSuiClient();
		const { tx, result: balResult } = buildWithdrawalTx({
			withdrawalAmount: 100000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult, tx.pure.address(DEFAULT_SENDER)],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(0n);
	});

	it('handles balance::send_funds to other address (outflow)', async () => {
		const client = new MockSuiClient();
		const { tx, result: balResult } = buildWithdrawalTx({
			withdrawalAmount: 100000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult, tx.pure.address('0x456')],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(100000000n);
	});

	// --- Conversions ---

	it('handles coin::into_balance (value preserved, not double-counted)', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin = tx.object(TEST_COIN_1_ID); // 5 SUI
		const [splitCoin] = tx.splitCoins(coin, [300000000n]);

		const balance = tx.moveCall({
			target: '0x2::coin::into_balance',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [splitCoin],
		});

		// Consume the balance in a generic MoveCall
		tx.moveCall({
			target: '0x999::test::consume_coin',
			typeArguments: [normalizeStructTag('0x2::sui::SUI')],
			arguments: [balance, balance],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		// 300M split (consumed via into_balance → generic consume) + gas budget
		expect(suiFlow?.amount).toBe(310000000n);
	});

	it('handles coin::from_balance conversion', async () => {
		const client = new MockSuiClient();
		const { tx, result: balResult } = buildWithdrawalTx({
			withdrawalAmount: 200000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		const coin = tx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult],
		});

		tx.transferObjects([coin], tx.pure.address('0x456'));

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(200000000n);
	});

	it('handles coin::from_balance → transfer to self (no outflow)', async () => {
		const client = new MockSuiClient();
		const { tx, result: balResult } = buildWithdrawalTx({
			withdrawalAmount: 200000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		const coin = tx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult],
		});

		tx.transferObjects([coin], tx.pure.address(DEFAULT_SENDER));

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(0n);
	});

	// --- Split operations via MoveCall ---

	it('handles coin::split via MoveCall', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin = tx.object(TEST_COIN_1_ID); // 5 SUI

		const splitResult = tx.moveCall({
			target: '0x2::coin::split',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [coin, tx.pure.u64(200000000n)],
		});

		tx.transferObjects([splitResult], tx.pure.address('0x456'));

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(suiFlow?.amount).toBe(210000000n); // 200M + gas budget
	});

	it('handles balance::split via MoveCall', async () => {
		const client = new MockSuiClient();
		const { tx, result: balResult } = buildWithdrawalTx({
			withdrawalAmount: 500000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		const splitBal = tx.moveCall({
			target: '0x2::balance::split',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult, tx.pure.u64(200000000n)],
		});

		// Send original remainder (300M) back to sender
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult, tx.pure.address(DEFAULT_SENDER)],
		});

		// Consume the split balance
		tx.moveCall({
			target: '0x999::test::consume_coin',
			typeArguments: [normalizeStructTag('0xa0b::usdc::USDC')],
			arguments: [splitBal, splitBal],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(200000000n); // Only split amount, remainder returned
	});

	it('handles coin::take (Balance → Coin split)', async () => {
		const client = new MockSuiClient();
		const { tx, result: balResult } = buildWithdrawalTx({
			withdrawalAmount: 500000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		const takenCoin = tx.moveCall({
			target: '0x2::coin::take',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult, tx.pure.u64(150000000n)],
		});

		tx.transferObjects([takenCoin], tx.pure.address('0x456'));

		// Send remaining balance back to sender
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult, tx.pure.address(DEFAULT_SENDER)],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(150000000n);
	});

	it('handles balance::withdraw_all', async () => {
		const client = new MockSuiClient();
		const { tx, result: balResult } = buildWithdrawalTx({
			withdrawalAmount: 500000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		const withdrawn = tx.moveCall({
			target: '0x2::balance::withdraw_all',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult],
		});

		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [withdrawn, tx.pure.address('0x456')],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(500000000n);
	});

	it('handles coin::divide_into_n (assumes full consumption)', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin = tx.object(TEST_COIN_1_ID); // 5 SUI

		tx.moveCall({
			target: '0x2::coin::divide_into_n',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [coin, tx.pure.u64(3n)],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(suiFlow?.amount).toBe(5010000000n); // full coin + gas budget
	});

	// --- Join operations via MoveCall ---

	it('handles coin::join via MoveCall', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin1 = tx.object(TEST_COIN_1_ID); // 5 SUI
		const coin2 = tx.object(TEST_COIN_2_ID); // 2.5 SUI

		tx.moveCall({
			target: '0x2::coin::join',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [coin1, coin2],
		});

		tx.transferObjects([coin1], tx.pure.address('0x456'));

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(suiFlow?.amount).toBe(7510000000n); // 5 + 2.5 SUI + gas
	});

	it('handles balance::join via MoveCall', async () => {
		const client = new MockSuiClient();
		const { tx, result: bal1 } = buildWithdrawalTx({
			withdrawalAmount: 300000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		// Create a second balance from another withdrawal
		const withdrawal2 = tx.withdrawal({ amount: 200000000n, type: '0xa0b::usdc::USDC' });

		const bal2 = tx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [withdrawal2],
		});

		// Join bal2 into bal1
		tx.moveCall({
			target: '0x2::balance::join',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [bal1, bal2],
		});

		// Send joined balance to other
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [bal1, tx.pure.address('0x456')],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(500000000n); // 300M + 200M
	});

	it('handles coin::put (Coin → Balance merge)', async () => {
		const client = new MockSuiClient();
		const { tx, result: balResult } = buildWithdrawalTx({
			withdrawalAmount: 300000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		// Take 100M from balance as a coin
		const takenCoin = tx.moveCall({
			target: '0x2::coin::take',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult, tx.pure.u64(100000000n)],
		});

		// Put it back
		tx.moveCall({
			target: '0x2::coin::put',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult, takenCoin],
		});

		// Send everything back to sender
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult, tx.pure.address(DEFAULT_SENDER)],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(0n); // Everything returned
	});

	// --- Zero operations ---

	it('handles coin::zero and balance::zero', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		tx.moveCall({
			target: '0x2::coin::zero',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [],
		});

		tx.moveCall({
			target: '0x2::balance::zero',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(suiFlow?.amount).toBe(10000000n); // gas budget only

		// No USDC outflow
		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow).toBeUndefined();
	});

	it('handles coin::destroy_zero and balance::destroy_zero', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const zeroCoin = tx.moveCall({
			target: '0x2::coin::zero',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [],
		});

		tx.moveCall({
			target: '0x2::coin::destroy_zero',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [zeroCoin],
		});

		const zeroBal = tx.moveCall({
			target: '0x2::balance::zero',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [],
		});

		tx.moveCall({
			target: '0x2::balance::destroy_zero',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [zeroBal],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(suiFlow?.amount).toBe(10000000n); // gas budget only
	});
});

describe('Coin Flows - Combination Chain Tests', () => {
	it('redeem → from_balance → split → transfer + send_funds remainder', async () => {
		const client = new MockSuiClient();
		const { tx, result: balResult } = buildWithdrawalTx({
			withdrawalAmount: 200000000n,
			coinType: '0xa0b::usdc::USDC',
			redeemTarget: '0x2::balance::redeem_funds',
		});

		// Convert to coin
		const coin = tx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [balResult],
		});

		// Split 150M out
		const splitResult = tx.moveCall({
			target: '0x2::coin::split',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [coin, tx.pure.u64(150000000n)],
		});

		// Transfer split to other
		tx.transferObjects([splitResult], tx.pure.address('0x456'));

		// Send remainder (50M) back to sender
		tx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [coin, tx.pure.address(DEFAULT_SENDER)],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(150000000n);
	});

	it('multiple redeems same type', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// First redeem
		const w1 = tx.withdrawal({ amount: 100000000n, type: '0xa0b::usdc::USDC' });
		const bal1 = tx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [w1],
		});

		// Second redeem
		const w2 = tx.withdrawal({ amount: 100000000n, type: '0xa0b::usdc::USDC' });
		const bal2 = tx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [w2],
		});

		// Consume both
		tx.moveCall({
			target: '0x999::test::consume_coin',
			typeArguments: [normalizeStructTag('0xa0b::usdc::USDC')],
			arguments: [bal1, bal2],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(200000000n);
	});

	it('redeem + owned coin merge → split → into_balance → consume', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Redeem 100M USDC from AB
		const w = tx.withdrawal({ amount: 100000000n, type: '0xa0b::usdc::USDC' });
		const redeemCoin = tx.moveCall({
			target: '0x2::coin::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [w],
		});

		// Owned USDC coin (500M from mockData)
		const ownedCoin = tx.object(TEST_USDC_COIN_ID);

		// Join redeem into owned
		tx.moveCall({
			target: '0x2::coin::join',
			typeArguments: [normalizeStructTag('0xa0b::usdc::USDC')],
			arguments: [ownedCoin, redeemCoin],
		});

		// Split 250M
		const [splitCoin] = tx.splitCoins(ownedCoin, [250000000n]);

		// Convert to balance
		const balance = tx.moveCall({
			target: '0x2::coin::into_balance',
			typeArguments: [normalizeStructTag('0xa0b::usdc::USDC')],
			arguments: [splitCoin],
		});

		// Consume
		tx.moveCall({
			target: '0x999::test::consume_coin',
			typeArguments: [normalizeStructTag('0xa0b::usdc::USDC')],
			arguments: [balance, balance],
		});

		// Send remainder back to sender
		tx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: [normalizeStructTag('0xa0b::usdc::USDC')],
			arguments: [ownedCoin, tx.pure.address(DEFAULT_SENDER)],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		// 500M owned + 100M redeemed = 600M. Split 250M. Remainder 350M returned.
		// Outflow: 600M (raw) - 350M (returned) = 250M
		expect(usdcFlow?.amount).toBe(250000000n);
	});

	it('into_balance → balance::join → balance::send_funds to self (no outflow)', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin1 = tx.object(TEST_COIN_1_ID); // 5 SUI
		const coin2 = tx.object(TEST_COIN_2_ID); // 2.5 SUI

		// Convert both to balances
		const bal1 = tx.moveCall({
			target: '0x2::coin::into_balance',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [coin1],
		});

		const bal2 = tx.moveCall({
			target: '0x2::coin::into_balance',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [coin2],
		});

		// Join bal2 into bal1
		tx.moveCall({
			target: '0x2::balance::join',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [bal1, bal2],
		});

		// Send back to sender
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [bal1, tx.pure.address(DEFAULT_SENDER)],
		});

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(suiFlow?.amount).toBe(10000000n); // gas budget only
	});

	it('mixed coin types with AB withdrawal', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// USDC from AB withdrawal
		const w = tx.withdrawal({ amount: 100000000n, type: '0xa0b::usdc::USDC' });
		const usdcBal = tx.moveCall({
			target: '0x2::coin::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [w],
		});

		// Transfer USDC to other
		tx.transferObjects([usdcBal], tx.pure.address('0x456'));

		// SUI from gas coin, transfer to self
		const [suiSplit] = tx.splitCoins(tx.gas, [50000000n]);
		tx.transferObjects([suiSplit], tx.pure.address(DEFAULT_SENDER));

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(100000000n);

		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(suiFlow?.amount).toBe(10000000n); // gas budget only, SUI returned to self
	});
});

describe('Coin Flows - Transfer to Self Bug Fix', () => {
	it('should not create outflow for non-SUI transfer to self', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const usdcCoin = tx.object(TEST_USDC_COIN_ID); // 500M USDC
		const [splitCoin] = tx.splitCoins(usdcCoin, [200000000n]);

		// Transfer USDC back to sender
		tx.transferObjects([splitCoin], tx.pure.address(DEFAULT_SENDER));

		const results = await analyze({ coinFlows }, { client, transaction: await tx.toJSON() });

		// USDC should have zero outflow (transferred to self)
		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(0n);

		// SUI should have gas budget outflow only
		const suiFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(suiFlow?.amount).toBe(10000000n);
	});
});
