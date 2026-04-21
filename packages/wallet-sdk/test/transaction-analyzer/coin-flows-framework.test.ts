// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';
import { analyze } from '../../src/transaction-analyzer/analyzer.js';
import { balanceFlows } from '../../src/transaction-analyzer/rules/balance-flows.js';
import { coinFlows, sponsorFlows } from '../../src/transaction-analyzer/rules/coin-flows.js';
import { MockSuiClient } from '../mocks/MockSuiClient.js';
import {
	DEFAULT_SENDER,
	TEST_COIN_1_ID,
	TEST_COIN_2_ID,
	TEST_USDC_COIN_ID,
} from '../mocks/mockData.js';

const SUI = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
const USDC = '0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC';

// A distinct sponsor address used by sponsored tests.
const SPONSOR = '0x00000000000000000000000000000000000000000000000000000000000005b0';

/**
 * Flip FundsWithdrawal inputs to sponsor-funded and patch gas data so the
 * analyzer sees a real sponsored transaction. Add a sponsor-owned SUI coin
 * to the client for gas payment. Returns the patched JSON string.
 */
function sponsorize(client: MockSuiClient, txJson: string, sponsor: string = SPONSOR): string {
	const json = JSON.parse(txJson);
	for (const input of json.inputs) {
		if (input.FundsWithdrawal) {
			input.FundsWithdrawal.withdrawFrom = { Sponsor: true };
		}
	}
	const sponsorGasId = `0xabcdef${sponsor.slice(-4)}`;
	client.addCoin({
		objectId: sponsorGasId,
		coinType: '0x2::sui::SUI',
		balance: 5000000000n,
		owner: { $kind: 'AddressOwner', AddressOwner: sponsor },
	});
	json.gasData.owner = sponsor;
	json.gasData.payment = [
		{ objectId: sponsorGasId, version: '1', digest: '11111111111111111111111111111111' },
	];
	return JSON.stringify(json);
}

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

		const results = await analyze(
			{ coinFlows },
			{ client, transaction: sponsorize(client, await tx.toJSON()) },
		);

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

		// Sender withdrew and sent back to themselves — touched USDC, net 0.
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

describe('Coin Flows - Sponsor withdrawal in the same transaction', () => {
	it('sponsor-redeemed coin transferred to sender counts as sender inflow, sponsor outflow', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Sender owns 500M USDC; split 200M and send to another address.
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

		const results = await analyze(
			{ coinFlows, sponsorFlows },
			{ client, transaction: sponsorize(client, await tx.toJSON()) },
		);

		// Sender net: -200M (sent to 0x456) + 100M (sponsor transfer) = -100M.
		const usdcOut = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcOut?.amount).toBe(100000000n);
		// Sponsor net: -100M.
		const sponsorOut = results.sponsorFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(sponsorOut?.amount).toBe(100000000n);
	});

	it('sponsor-redeemed coin sent to sender via send_funds produces the same deltas', async () => {
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

		const results = await analyze(
			{ coinFlows, sponsorFlows },
			{ client, transaction: sponsorize(client, await tx.toJSON()) },
		);

		const usdcOut = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(usdcOut?.amount).toBe(100000000n);
		const sponsorOut = results.sponsorFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(sponsorOut?.amount).toBe(100000000n);
	});
});

describe('Coin Flows - Per-party tracking', () => {
	it('tracks sponsor outflow when sponsor-redeemed value goes to a third party', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const sponsorRedeem = tx.moveCall({
			target: '0x2::coin::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [tx.withdrawal({ amount: 150000000n, type: '0xa0b::usdc::USDC' })],
		});
		tx.transferObjects([sponsorRedeem], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinFlows, sponsorFlows },
			{ client, transaction: sponsorize(client, await tx.toJSON()) },
		);

		expect(results.coinFlows.result?.outflows.find((f) => f.coinType === USDC)).toBeUndefined();
		const sponsorUsdc = results.sponsorFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(sponsorUsdc?.amount).toBe(150000000n);
	});

	it('sponsored gas is attributed to sponsor, not sender', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// A sender-owned outflow so we can see both parties in the result.
		const owned = tx.object(TEST_USDC_COIN_ID);
		const [chunk] = tx.splitCoins(owned, [75000000n]);
		tx.transferObjects([chunk], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinFlows, sponsorFlows },
			{ client, transaction: sponsorize(client, await tx.toJSON()) },
		);

		const senderUsdc = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(senderUsdc?.amount).toBe(75000000n);
		expect(results.coinFlows.result?.outflows.find((f) => f.coinType === SUI)).toBeUndefined();

		const sponsorSui = results.sponsorFlows.result?.outflows.find((f) => f.coinType === SUI);
		expect(sponsorSui?.amount).toBe(10000000n); // gas budget only
	});

	it('coin::put of sponsor balance into sender coin charges sponsor only', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Sender-owned USDC coin
		const senderUsdc = tx.object(TEST_USDC_COIN_ID); // 500M USDC
		const senderBal = tx.moveCall({
			target: '0x2::coin::into_balance',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [senderUsdc],
		});
		const senderCoin = tx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [senderBal],
		});

		// Sponsor withdraws 100M USDC as Balance
		const sponsorBal = tx.moveCall({
			target: '0x2::balance::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [tx.withdrawal({ amount: 100000000n, type: '0xa0b::usdc::USDC' })],
		});

		// Put sponsor balance into sender coin's underlying balance via coin::put.
		// We first need the sender coin's balance to be mutable, so convert it back.
		const senderBal2 = tx.moveCall({
			target: '0x2::coin::into_balance',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [senderCoin],
		});
		tx.moveCall({
			target: '0x2::balance::join',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [senderBal2, sponsorBal],
		});

		// Transfer the merged sender balance to a third party.
		const mergedCoin = tx.moveCall({
			target: '0x2::coin::from_balance',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [senderBal2],
		});
		tx.transferObjects([mergedCoin], tx.pure.address('0x456'));

		const results = await analyze(
			{ coinFlows, sponsorFlows },
			{ client, transaction: sponsorize(client, await tx.toJSON()) },
		);

		// Sender only pays for their own 500M; sponsor pays for the 100M they put in.
		const senderFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(senderFlow?.amount).toBe(500000000n);

		const sponsorFlow = results.sponsorFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(sponsorFlow?.amount).toBe(100000000n);
	});

	it('coin::join of sender balance into sponsor-redeemed coin preserves origin segments', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Sender splits 200M USDC off an owned coin.
		const senderUsdc = tx.object(TEST_USDC_COIN_ID);
		const [senderSlice] = tx.splitCoins(senderUsdc, [200000000n]);

		// Sponsor redeems 300M USDC.
		const sponsorCoin = tx.moveCall({
			target: '0x2::coin::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [tx.withdrawal({ amount: 300000000n, type: '0xa0b::usdc::USDC' })],
		});

		// Join the sender slice into the sponsor coin; then transfer sponsor coin to
		// sender (a round-trip on the sponsor side, a cost on the sender side).
		tx.moveCall({
			target: '0x2::coin::join',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [sponsorCoin, senderSlice],
		});
		tx.transferObjects([sponsorCoin], tx.pure.address(DEFAULT_SENDER));

		const results = await analyze(
			{ coinFlows, sponsorFlows },
			{ client, transaction: sponsorize(client, await tx.toJSON()) },
		);

		// Sender's own slice was round-tripped and sponsor's 300M ended up with
		// sender: net +300M USDC for sender → shows as a negative outflow.
		const senderFlow = results.coinFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(senderFlow?.amount).toBe(-300000000n);

		// Sponsor paid 300M: positive sponsor outflow.
		const sponsorFlow = results.sponsorFlows.result?.outflows.find((f) => f.coinType === USDC);
		expect(sponsorFlow?.amount).toBe(300000000n);
	});
});

describe('Coin Flows - Mixed-owner merge recipient inflow', () => {
	const RECIPIENT = '0x0000000000000000000000000000000000000000000000000000000000000456';

	it('PTB mergeCoins: recipient sees full merged balance across origins', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Sender's 500M USDC coin.
		const senderUsdc = tx.object(TEST_USDC_COIN_ID);
		// Sponsor redeems 100M USDC as a Coin.
		const sponsorCoin = tx.moveCall({
			target: '0x2::coin::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [tx.withdrawal({ amount: 100000000n, type: '0xa0b::usdc::USDC' })],
		});
		// Mixed-owner merge: sponsor 100M folded into sender 500M coin.
		tx.mergeCoins(senderUsdc, [sponsorCoin]);
		// Transfer the merged 600M to a third party.
		tx.transferObjects([senderUsdc], tx.pure.address(RECIPIENT));

		const results = await analyze(
			{ balanceFlows },
			{ client, transaction: sponsorize(client, await tx.toJSON()) },
		);

		const byAddress = results.balanceFlows.result?.byAddress ?? {};

		// Signed per-address deltas: sender -500M, sponsor -100M, recipient +600M.
		expect(byAddress[DEFAULT_SENDER]?.find((f) => f.coinType === USDC)?.amount).toBe(-500000000n);
		expect(byAddress[SPONSOR]?.find((f) => f.coinType === USDC)?.amount).toBe(-100000000n);
		expect(byAddress[RECIPIENT]?.find((f) => f.coinType === USDC)?.amount).toBe(600000000n);
	});

	it('coin::join: recipient sees full merged balance across origins', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const senderUsdc = tx.object(TEST_USDC_COIN_ID);
		const sponsorCoin = tx.moveCall({
			target: '0x2::coin::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [tx.withdrawal({ amount: 100000000n, type: '0xa0b::usdc::USDC' })],
		});
		tx.moveCall({
			target: '0x2::coin::join',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [senderUsdc, sponsorCoin],
		});
		tx.transferObjects([senderUsdc], tx.pure.address(RECIPIENT));

		const results = await analyze(
			{ balanceFlows },
			{ client, transaction: sponsorize(client, await tx.toJSON()) },
		);

		const byAddress = results.balanceFlows.result?.byAddress ?? {};

		expect(byAddress[DEFAULT_SENDER]?.find((f) => f.coinType === USDC)?.amount).toBe(-500000000n);
		expect(byAddress[SPONSOR]?.find((f) => f.coinType === USDC)?.amount).toBe(-100000000n);
		expect(byAddress[RECIPIENT]?.find((f) => f.coinType === USDC)?.amount).toBe(600000000n);
	});

	it('per-coinType deltas sum to zero across all addresses', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const senderUsdc = tx.object(TEST_USDC_COIN_ID);
		const sponsorCoin = tx.moveCall({
			target: '0x2::coin::redeem_funds',
			typeArguments: ['0xa0b::usdc::USDC'],
			arguments: [tx.withdrawal({ amount: 100000000n, type: '0xa0b::usdc::USDC' })],
		});
		tx.mergeCoins(senderUsdc, [sponsorCoin]);
		tx.transferObjects([senderUsdc], tx.pure.address(RECIPIENT));

		const results = await analyze(
			{ balanceFlows },
			{ client, transaction: sponsorize(client, await tx.toJSON()) },
		);

		// Signed deltas must sum to zero per coin type (value is conserved:
		// every outflow has a matching inflow somewhere).
		const byAddress = results.balanceFlows.result?.byAddress ?? {};
		const perType = new Map<string, bigint>();
		for (const flows of Object.values(byAddress)) {
			for (const f of flows) {
				perType.set(f.coinType, (perType.get(f.coinType) ?? 0n) + f.amount);
			}
		}
		expect(perType.get(USDC)).toBe(0n);
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
