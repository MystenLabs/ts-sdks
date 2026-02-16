// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This example demonstrates different ways to deposit into a margin manager:
 * 1. During initialization (before sharing) - using amount
 * 2. During initialization (before sharing) - using coin TransactionArgument
 * 3. After initialization (shared manager) - using amount
 * 4. After initialization (shared manager) - using coin TransactionArgument
 */

import { execSync } from 'child_process';

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';

import { deepbook } from '../src/index.js';

const SUI = process.env.SUI_BINARY ?? `sui`;

const GRPC_URLS = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
} as const;

type Network = 'mainnet' | 'testnet';

const getActiveNetwork = (): Network => {
	const env = execSync(`${SUI} client active-env`, { encoding: 'utf8' }).trim();
	if (env !== 'mainnet' && env !== 'testnet') {
		throw new Error(`Unsupported network: ${env}. Only 'mainnet' and 'testnet' are supported.`);
	}
	return env;
};

async function main() {
	const network = getActiveNetwork();

	const client = new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }).$extend(
		deepbook({
			address: '0xYOUR_ADDRESS_HERE', // Replace with your address
		}),
	);

	const poolKey = 'SUI_DBUSDC';

	// ============================================================
	// PART 1: Deposit during initialization
	// ============================================================
	console.log('=== Part 1: Deposit During Initialization ===\n');

	const tx1 = new Transaction();

	// Create a new margin manager with initializer
	const { manager, initializer } =
		client.deepbook.marginManager.newMarginManagerWithInitializer(poolKey)(tx1);

	// 1a. Deposit during initialization using AMOUNT
	// coinType should be the actual coin key (e.g., 'SUI', 'DBUSDC', 'DEEP')
	client.deepbook.marginManager.depositDuringInitialization({
		manager,
		poolKey,
		coinType: 'SUI',
		amount: 1.0, // 1 SUI
	})(tx1);
	console.log('1a. Deposit SUI during init with amount: 1.0');

	client.deepbook.marginManager.depositDuringInitialization({
		manager,
		poolKey,
		coinType: 'DBUSDC',
		amount: 100.0, // 100 DBUSDC
	})(tx1);
	console.log('1b. Deposit DBUSDC during init with amount: 100.0');

	client.deepbook.marginManager.depositDuringInitialization({
		manager,
		poolKey,
		coinType: 'DEEP',
		amount: 10.0, // 10 DEEP
	})(tx1);
	console.log('1c. Deposit DEEP during init with amount: 10.0');

	// 1d. Deposit during initialization using COIN TransactionArgument
	// Useful when you have a coin from a previous operation (e.g., splitCoins)
	// const [suiCoinToDeposit] = tx1.splitCoins(tx1.gas, [tx1.pure.u64(500000000)]); // 0.5 SUI
	// client.deepbook.marginManager.depositDuringInitialization({
	// 	manager,
	// 	poolKey,
	// 	coinType: 'SUI',
	// 	coin: suiCoinToDeposit,
	// })(tx1);
	// console.log('1d. Deposit SUI during init with coin TransactionArgument');

	// Share the margin manager
	client.deepbook.marginManager.shareMarginManager(poolKey, manager, initializer)(tx1);
	console.log('1e. Share margin manager\n');

	// ============================================================
	// PART 2: Deposit after initialization (existing shared manager)
	// ============================================================
	console.log('=== Part 2: Deposit After Initialization ===\n');

	// Assume you have a margin manager already configured in dbClient
	// with managerKey pointing to a shared margin manager
	const managerKey = 'MY_MARGIN_MANAGER'; // Replace with actual manager key

	const tx2 = new Transaction();

	// 2a. Deposit using AMOUNT (creates coinWithBalance internally)
	client.deepbook.marginManager.depositBase({
		managerKey,
		amount: 1.0, // 1 SUI (base coin)
	})(tx2);
	console.log('2a. depositBase with amount: 1.0');

	client.deepbook.marginManager.depositQuote({
		managerKey,
		amount: 100.0, // 100 DBUSDC (quote coin)
	})(tx2);
	console.log('2b. depositQuote with amount: 100.0');

	client.deepbook.marginManager.depositDeep({
		managerKey,
		amount: 10.0, // 10 DEEP
	})(tx2);
	console.log('2c. depositDeep with amount: 10.0');

	// 2d. Deposit using COIN TransactionArgument
	// Useful when you have coins from previous operations
	// const [splitBaseCoin] = tx2.splitCoins(tx2.gas, [tx2.pure.u64(500000000)]); // 0.5 SUI
	// client.deepbook.marginManager.depositBase({
	// 	managerKey,
	// 	coin: splitBaseCoin,
	// })(tx2);
	// console.log('2d. depositBase with coin TransactionArgument');

	// const [splitQuoteCoin] = tx2.splitCoins(someQuoteCoinObject, [tx2.pure.u64(50000000)]); // 50 DBUSDC
	// client.deepbook.marginManager.depositQuote({
	// 	managerKey,
	// 	coin: splitQuoteCoin,
	// })(tx2);
	// console.log('2e. depositQuote with coin TransactionArgument');

	// const [splitDeepCoin] = tx2.splitCoins(someDeepCoinObject, [tx2.pure.u64(5000000)]); // 5 DEEP
	// client.deepbook.marginManager.depositDeep({
	// 	managerKey,
	// 	coin: splitDeepCoin,
	// })(tx2);
	// console.log('2f. depositDeep with coin TransactionArgument');

	console.log('\n=== Summary ===');
	console.log('Deposit methods:');
	console.log('  - depositDuringInitialization: Use before sharing a new margin manager');
	console.log('    - coinType: Use actual coin key (e.g., "SUI", "DBUSDC", "DEEP")');
	console.log('  - depositBase/Quote/Deep: Use for existing shared margin managers');
	console.log('');
	console.log('Input options:');
	console.log('  - amount (number): SDK creates coinWithBalance internally');
	console.log('  - coin (TransactionArgument): Pass a coin from previous tx operations');
}

main().catch(console.error);
