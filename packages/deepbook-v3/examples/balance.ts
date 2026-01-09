// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { SuiGrpcClient } from '@mysten/sui/grpc';

import { deepbook } from '../src/index.js'; // Adjust import source accordingly

const GRPC_URLS = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
} as const;

/// Example to check balance for a balance manager
(async () => {
	const env = 'mainnet';

	const balanceManagers = {
		MANAGER_1: {
			address: '0x344c2734b1d211bd15212bfb7847c66a3b18803f3f5ab00f5ff6f87b6fe6d27d',
			tradeCap: '',
		},
	};

	const client = new SuiGrpcClient({ network: env, baseUrl: GRPC_URLS[env] }).$extend(
		deepbook({
			address: '0x0',
			env: env,
			balanceManagers: balanceManagers,
		}),
	);

	const assets = ['SUI', 'USDC', 'WUSDT', 'WUSDC', 'BETH', 'DEEP']; // Update assets as needed
	const manager = 'MANAGER_1'; // Update the manager accordingly
	console.log('Manager:', manager);
	for (const asset of assets) {
		console.log(await client.deepbook.checkManagerBalance(manager, asset));
	}
})();
