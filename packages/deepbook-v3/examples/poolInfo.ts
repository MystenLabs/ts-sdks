// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This example demonstrates how to query pool information:
 * - Pool ID
 * - Whitelisted / stable / registered status
 * - DEEP price for the pool
 * - Trade and book params
 * - Vault balances
 *
 * Usage:
 *   npx tsx examples/poolInfo.ts
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
	console.log(`Querying pool info for: ${poolKey} (${network})\n`);

	// 1. Pool ID
	const poolId = await client.deepbook.poolId(poolKey);
	console.log('Pool ID:', poolId);

	// 2. Whitelisted
	const isWhitelisted = await client.deepbook.whitelisted(poolKey);
	console.log('Whitelisted:', isWhitelisted);

	// 3. Stable pool
	const isStable = await client.deepbook.stablePool(poolKey);
	console.log('Stable pool:', isStable);

	// 4. Registered pool
	const isRegistered = await client.deepbook.registeredPool(poolKey);
	console.log('Registered:', isRegistered);

	// 5. DEEP price
	const deepPrice = await client.deepbook.getPoolDeepPrice(poolKey);
	console.log('DEEP price:', deepPrice);

	// 6. Trade params
	const tradeParams = await client.deepbook.poolTradeParams(poolKey);
	console.log('Trade params:', tradeParams);

	// 7. Book params
	const bookParams = await client.deepbook.poolBookParams(poolKey);
	console.log('Book params:', bookParams);

	// 8. Vault balances
	const vaults = await client.deepbook.vaultBalances(poolKey);
	console.log('Vault balances:', vaults);

	// 9. Mid price
	const mid = await client.deepbook.midPrice(poolKey);
	console.log('Mid price:', mid);
})();
