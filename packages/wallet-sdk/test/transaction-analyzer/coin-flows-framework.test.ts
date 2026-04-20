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
	TEST_COIN_1_ID,
	TEST_COIN_2_ID,
	TEST_USDC_COIN_ID,
} from '../mocks/mockData.js';

const SUI = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
const USDC = '0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC';

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
		// 300M split (consumed via into_balance -> generic consume) + gas budget
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

	it('handles coin::from_balance -> transfer to self (no outflow)', async () => {
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

	it('handles coin::take (Balance -> Coin split)', async () => {
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

	it('handles coin::put (Coin -> Balance merge)', async () => {
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
	it('redeem -> from_balance -> split -> transfer + send_funds remainder', async () => {
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

	it('redeem + owned coin merge -> split -> into_balance -> consume', async () => {
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

	it('into_balance -> balance::join -> balance::send_funds to self (no outflow)', async () => {
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

describe('Coin Flows - Sponsor withdrawal returned to sender', () => {
	it('sponsor-redeemed coin transferred to sender does not offset sender outflow', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Sender owns 500M USDC; split 200M and send to another address (real 200M outflow).
		const ownedUsdc = tx.object(TEST_USDC_COIN_ID);
		const [sendOut] = tx.splitCoins(ownedUsdc, [200000000n]);
		tx.transferObjects([sendOut], tx.pure.address('0x456'));

		// Sponsor redeems 100M USDC and the result is transferred to the sender.
		const sponsorRedeem = tx.moveCall({
			target: '0x2::coin::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [tx.withdrawal({ amount: 100000000n, type: '0xa0b::usdc::USDC' })],
		});
		tx.transferObjects([sponsorRedeem], tx.pure.address(DEFAULT_SENDER));

		// Patch the sponsor withdrawal to be from Sponsor rather than Sender.
		const json = JSON.parse(await tx.toJSON());
		for (const input of json.inputs) {
			if (input.FundsWithdrawal) {
				input.FundsWithdrawal.withdrawFrom = { Sponsor: true };
			}
		}

		const results = await analyze({ coinFlows }, { client, transaction: JSON.stringify(json) });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(200000000n);
	});

	it('sponsor-redeemed coin sent to sender via send_funds does not offset sender outflow', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const ownedUsdc = tx.object(TEST_USDC_COIN_ID);
		const [sendOut] = tx.splitCoins(ownedUsdc, [200000000n]);
		tx.transferObjects([sendOut], tx.pure.address('0x456'));

		const sponsorRedeem = tx.moveCall({
			target: '0x2::coin::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [tx.withdrawal({ amount: 100000000n, type: '0xa0b::usdc::USDC' })],
		});
		tx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [sponsorRedeem, tx.pure.address(DEFAULT_SENDER)],
		});

		const json = JSON.parse(await tx.toJSON());
		for (const input of json.inputs) {
			if (input.FundsWithdrawal) {
				input.FundsWithdrawal.withdrawFrom = { Sponsor: true };
			}
		}

		const results = await analyze({ coinFlows }, { client, transaction: JSON.stringify(json) });

		const usdcFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcFlow?.amount).toBe(200000000n);
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
