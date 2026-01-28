// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { SuiGrpcClient } from '@mysten/sui/grpc';

import { deepbook } from '../src/index.js'; // Adjust import source accordingly

const GRPC_URLS = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
} as const;

/// Example to get open orders for a balance manager for all pools
(async () => {
	const network = 'mainnet';

	const balanceManagers = {
		MANAGER_1: {
			address: '0x344c2734b1d211bd15212bfb7847c66a3b18803f3f5ab00f5ff6f87b6fe6d27d',
			tradeCap: '',
		},
	};

	const client = new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }).$extend(
		deepbook({
			address: '0x0',
			balanceManagers: balanceManagers,
		}),
	);

	const manager = 'MANAGER_1'; // Update the manager accordingly
	const pools = ['SUI_USDC', 'DEEP_SUI', 'DEEP_USDC', 'WUSDT_USDC', 'WUSDC_USDC', 'BETH_USDC']; // Live pools, add more if needed
	console.log('Manager:', manager);

	for (const pool of pools) {
		console.log(pool);
		console.log(await client.deepbook.accountOpenOrders(pool, manager));
	}
})();
