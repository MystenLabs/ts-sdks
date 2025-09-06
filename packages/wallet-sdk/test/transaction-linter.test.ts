// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { SuiClient } from '@mysten/sui/client';

import { CoinStruct, lintTransaction, extractCoinFlows } from '../src/transaction-linter';

function mockCoin(id: string, type: string, balance: number) {
	return {
		type: type,
		balance: balance,
		digest: '',
		objectId: normalizeSuiAddress(id),
		version: 0,
	};
}

const COINS = {
	'0xAA': mockCoin('0xAA', '0x2::sui::SUI', 100),
	'0xBB': mockCoin('0xBB', '0x2::sui::SUI', 100),
	'0xCC': mockCoin('0xCC', '0x2::sui::SUI', 100),
	'0xA': mockCoin('0xA', '0x2::sui::SUI', 10_001),
	'0xB': mockCoin('0xB', '0x2::sui::SUI', 20_002),
	'0xC': mockCoin('0xC', '0x2::sui::SUI', 30_003),
	'0xD': mockCoin('0xD', '0x2::fake::SUID', 99_000),
	'0xE': mockCoin('0xE', '0x2::fake::SUIE', 99_001),
	'0xF': mockCoin('0xF', '0x2::fake::SUIF', 99_002),
};

const NORMALIZED_COIN_MAP = Object.entries(COINS).reduce(
	(acc, [id, coin]) => {
		acc[normalizeSuiAddress(id)] = coin;
		return acc;
	},
	{} as Record<string, { type: string; balance: number }>,
);

export const handlers = [
	http.post('https://sui-testnet-rpc.mainnet.sui.io/', async ({ request }) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data = (await request.json()) as any;

		if (data.method === 'sui_multiGetObjects') {
			return HttpResponse.json({
				id: data.id,
				jsonrpc: '2.0',
				result: data.params[0].map((id: string) => {
					const normalizedId = normalizeSuiAddress(id);
					const coin = NORMALIZED_COIN_MAP[normalizedId];
					if (!coin) {
						return null;
					}

					const type = `0x2::coin::Coin<${coin.type}>`;

					return {
						data: {
							objectId: normalizedId,
							version: Math.floor(Math.random() * 100000),
							digest: '',
							type,
							bcs: {
								dataType: 'moveObject',
								type,
								hasPublicTransfer: true,
								version: 0,
								bcsBytes: CoinStruct.serialize({
									id: normalizedId,
									balance: { value: coin.balance },
								}).toBase64(),
							},
						},
					};
				}),
			});
		}

		if (data.method === 'sui_getObject') {
			const objectId = data.params[0];
			const normalizedId = normalizeSuiAddress(objectId);
			const coin = NORMALIZED_COIN_MAP[normalizedId];

			if (!coin) {
				return HttpResponse.json({
					id: data.id,
					jsonrpc: '2.0',
					result: null,
				});
			}

			const type = `0x2::coin::Coin<${coin.type}>`;

			return HttpResponse.json({
				id: data.id,
				jsonrpc: '2.0',
				result: {
					data: {
						objectId: normalizedId,
						version: Math.floor(Math.random() * 100000),
						digest: '',
						type,
						bcs: {
							dataType: 'moveObject',
							type,
							hasPublicTransfer: true,
							version: 0,
							bcsBytes: CoinStruct.serialize({
								id: normalizedId,
								balance: { value: coin.balance },
							}).toBase64(),
						},
					},
				},
			});
		}

		if (data.method === 'suix_getCoinMetadata') {
			const coinType = data.params[0];

			// Mock metadata responses (handle both normalized and short forms)
			if (
				coinType === '0x2::sui::SUI' ||
				coinType === '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
			) {
				return HttpResponse.json({
					id: data.id,
					jsonrpc: '2.0',
					result: {
						decimals: 9,
						symbol: 'SUI',
						name: 'Sui',
						description: 'Native token of Sui blockchain',
					},
				});
			} else if (
				coinType === '0x2::fake::SUID' ||
				coinType ===
					'0x0000000000000000000000000000000000000000000000000000000000000002::fake::SUID'
			) {
				return HttpResponse.json({
					id: data.id,
					jsonrpc: '2.0',
					result: {
						decimals: 6,
						symbol: 'SUID',
						name: 'Fake SUI D',
						description: 'Test token D',
					},
				});
			} else {
				// Return null for unknown tokens
				return HttpResponse.json({
					id: data.id,
					jsonrpc: '2.0',
					result: null,
				});
			}
		}

		return HttpResponse.error();
	}),
];

const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

//  Close server after all tests
afterAll(() => server.close());

// Reset handlers after each test `important for test isolation`
afterEach(() => server.resetHandlers());

function getTransaction() {
	const tx = new Transaction();
	tx.setSender('0x2');
	tx.setGasPayment([COINS['0xAA'], COINS['0xBB'], COINS['0xCC']]);
	return tx;
}

function getSuiClient() {
	return new SuiClient({ url: 'https://sui-testnet-rpc.mainnet.sui.io/' });
}

test('does nothing for empty transactions', async () => {
	const tx = getTransaction();
	const result = await lintTransaction(tx, getSuiClient());

	expect(result).toMatchObject({
		coins: expect.any(Map),
		usage: expect.any(Map),
	});

	// Check that gas coin is tracked
	const gasEntry = Array.from(result.coins.entries()).find(([key]) => key === 'gas');
	expect(gasEntry).toBeDefined();
	expect(gasEntry![1]).toMatchObject({
		balance: 300n,
		consumed: false,
		type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	});

	// No usage for empty transaction
	expect(result.usage.size).toBe(0);
});

test('split object reference coins into multiple coins', async () => {
	const tx = getTransaction();
	const [coinB, coinC] = tx.splitCoins(tx.objectRef(COINS['0xA']), [100, 200]);
	tx.transferObjects([coinB, coinC], '0x3');

	const result = await lintTransaction(tx, getSuiClient());

	// Check usage map has the transferred coins
	const suiUsage = result.usage.get(
		'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	);
	expect(suiUsage).toBe(300n); // 100 + 200 from splits

	// Check coin tracking
	const inputCoin = result.coins.get('input-0');
	expect(inputCoin).toMatchObject({
		balance: 9701n, // 10001 - 100 - 200
		consumed: false,
	});

	const splitCoinA = result.coins.get('result-0-0');
	expect(splitCoinA).toMatchObject({
		balance: 100n,
		consumed: true,
	});

	const splitCoinB = result.coins.get('result-0-1');
	expect(splitCoinB).toMatchObject({
		balance: 200n,
		consumed: true,
	});
});

test('merge coins and multiple split coin commands', async () => {
	const tx = getTransaction();

	const coinA = tx.mergeCoins(tx.objectRef(COINS['0xA']), [tx.objectRef(COINS['0xB'])]);
	const coinB = tx.splitCoins(coinA, [100]);
	const coinC = tx.splitCoins(coinB, [1]);
	tx.transferObjects([coinB, coinC], '0x3');

	const result = await lintTransaction(tx, getSuiClient());

	const suiUsage = result.usage.get(
		'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	);
	expect(suiUsage).toBe(100n); // Only the final transferred amount
});

test('tracks usage of gas coins with splits', async () => {
	const tx = getTransaction();

	const coinB = tx.splitCoins(tx.gas, [100]);
	tx.transferObjects([coinB], '0x3');

	const result = await lintTransaction(tx, getSuiClient());

	const suiUsage = result.usage.get(
		'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	);
	expect(suiUsage).toBe(100n);

	const gasCoin = result.coins.get('gas');
	expect(gasCoin).toMatchObject({
		balance: 200n, // 300 - 100
		consumed: false,
	});
});

test('tracks usage of gas coins transferred', async () => {
	const tx = getTransaction();

	tx.transferObjects([tx.gas], '0x3');

	const result = await lintTransaction(tx, getSuiClient());

	const suiUsage = result.usage.get(
		'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	);
	expect(suiUsage).toBe(300n);

	const gasCoin = result.coins.get('gas');
	expect(gasCoin).toMatchObject({
		balance: 300n,
		consumed: true,
	});
});

test('does not break when using split coin of a move call result', async () => {
	const tx = getTransaction();

	const [coin] = tx.moveCall({
		package: '0x2',
		module: 'test',
		function: 'test',
	});

	// Move call result as coin:
	tx.splitCoins(coin, [100]);
	// Move call result as value:
	const coinA = tx.splitCoins(tx.gas, [coin]);

	tx.transferObjects([coinA], '0x3');

	const result = await lintTransaction(tx, getSuiClient());

	const suiUsage = result.usage.get(
		'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	);
	expect(suiUsage).toBe(300n);

	const gasCoin = result.coins.get('gas');
	expect(gasCoin).toMatchObject({
		balance: 0n, // All balance consumed in split
		consumed: false,
	});
});

test('considers coins consumed when used in move functions', async () => {
	const tx = getTransaction();

	const coinA = tx.splitCoins(tx.objectRef(COINS['0xA']), [100]);

	tx.moveCall({
		package: '0x2',
		module: 'test',
		function: 'test',
		arguments: [tx.gas, coinA],
	});

	const result = await lintTransaction(tx, getSuiClient());

	const suiUsage = result.usage.get(
		'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	);
	expect(suiUsage).toBe(400n); // 300 (gas) + 100 (split coin)

	const gasCoin = result.coins.get('gas');
	expect(gasCoin).toMatchObject({
		consumed: true,
	});
});

test('considers coins consumed when used in move vecs', async () => {
	const tx = getTransaction();

	const coinA = tx.splitCoins(tx.objectRef(COINS['0xA']), [100]);

	tx.makeMoveVec({
		elements: [tx.gas, coinA],
	});

	const result = await lintTransaction(tx, getSuiClient());

	const suiUsage = result.usage.get(
		'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	);
	expect(suiUsage).toBe(400n); // 300 (gas) + 100 (split coin)

	const gasCoin = result.coins.get('gas');
	expect(gasCoin).toMatchObject({
		consumed: true,
	});
});

test('does not double count coins when split and merged', async () => {
	const tx = getTransaction();

	const [coinA] = tx.splitCoins(tx.objectRef(COINS['0xA']), [100]);
	const [coinB] = tx.mergeCoins(coinA, [tx.objectRef(COINS['0xB'])]);

	tx.transferObjects([coinB], '0x3');

	const result = await lintTransaction(tx, getSuiClient());

	// Should only count the final merged amount once
	const suiUsage = result.usage.get(
		'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	);
	expect(suiUsage).toBe(20102n); // 100 + 20002 from merge
});

test('extractCoinFlows includes metadata', async () => {
	const tx = getTransaction();

	// Create a transaction that uses SUI and a fake token
	const coinA = tx.splitCoins(tx.objectRef(COINS['0xA']), [1000]);
	const coinB = tx.splitCoins(tx.objectRef(COINS['0xD']), [5000]);
	tx.transferObjects([coinA, coinB], '0x3');

	const result = await extractCoinFlows(tx, getSuiClient());

	// Should have outflows for both tokens
	expect(result.outflows).toHaveLength(2);

	// Find SUI outflow
	const suiFlow = result.outflows.find(
		(flow) =>
			flow.coinType ===
			'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	);
	expect(suiFlow).toBeDefined();
	expect(suiFlow!.decimals).toBe(9);
	expect(suiFlow!.symbol).toBe('SUI');
	expect(suiFlow!.isRecognized).toBe(true);
	expect(suiFlow!.amount).toBe('1000');

	// Find fake token outflow
	const fakeFlow = result.outflows.find(
		(flow) =>
			flow.coinType ===
			'0x0000000000000000000000000000000000000000000000000000000000000002::fake::SUID',
	);
	expect(fakeFlow).toBeDefined();
	expect(fakeFlow!.decimals).toBe(6);
	expect(fakeFlow!.symbol).toBe('SUID');
	expect(fakeFlow!.isRecognized).toBe(true);
	expect(fakeFlow!.amount).toBe('5000');

	// Should have no inflows for now
	expect(result.inflows).toHaveLength(0);
});
