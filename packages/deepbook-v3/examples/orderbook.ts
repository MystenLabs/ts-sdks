// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This example demonstrates how to read orderbook data:
 * - Mid price
 * - Level 2 order book (bids and asks within a price range)
 * - Level 2 ticks from mid price
 * - Swap quantity quotes
 *
 * Usage:
 *   npx tsx examples/orderbook.ts
 */

import { execSync } from 'child_process';

import { SuiGrpcClient } from '@mysten/sui/grpc';

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

(async () => {
	const network = getActiveNetwork();

	const client = new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }).$extend(
		deepbook({ address: '0x0' }),
	);

	const poolKey = network === 'mainnet' ? 'SUI_USDC' : 'SUI_DBUSDC';
	console.log(`Pool: ${poolKey} (${network})\n`);

	// 1. Mid price
	const mid = await client.deepbook.midPrice(poolKey);
	console.log('Mid price:', mid);

	// 2. Level 2 order book - bids
	console.log('\nTop bids (price range 0.01 to mid):');
	const bids = await client.deepbook.getLevel2Range(poolKey, 0.01, Number(mid), true);
	console.log(bids);

	// 3. Level 2 order book - asks
	console.log('\nTop asks (price range mid to 1000):');
	const asks = await client.deepbook.getLevel2Range(poolKey, Number(mid), 1000, false);
	console.log(asks);

	// 4. Level 2 ticks from mid
	console.log('\n5 ticks from mid:');
	const ticks = await client.deepbook.getLevel2TicksFromMid(poolKey, 5);
	console.log(ticks);

	// 5. Get quote for selling 1 base asset
	console.log('\nQuote quantity out for 1 base:');
	const quoteOut = await client.deepbook.getQuoteQuantityOut(poolKey, 1);
	console.log(quoteOut);

	// 6. Get quote for buying with 10 quote asset
	console.log('\nBase quantity out for 10 quote:');
	const baseOut = await client.deepbook.getBaseQuantityOut(poolKey, 10);
	console.log(baseOut);

	// 7. Vault balances
	console.log('\nVault balances:');
	const vaults = await client.deepbook.vaultBalances(poolKey);
	console.log(vaults);

	// 8. Pool trade params
	console.log('\nPool trade params:');
	const tradeParams = await client.deepbook.poolTradeParams(poolKey);
	console.log(tradeParams);

	// 9. Pool book params
	console.log('\nPool book params:');
	const bookParams = await client.deepbook.poolBookParams(poolKey);
	console.log(bookParams);
})();
