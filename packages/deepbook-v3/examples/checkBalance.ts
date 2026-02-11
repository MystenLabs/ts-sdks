// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Check USDC balance for a balance manager on mainnet using a direct address.
 *
 * Usage:
 *   npx tsx examples/checkBalance.ts
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';

import { deepbook } from '../src/index.js';

const GRPC_URL = 'https://fullnode.mainnet.sui.io:443';

(async () => {
	const client = new SuiGrpcClient({ network: 'mainnet', baseUrl: GRPC_URL }).$extend(
		deepbook({ address: '0x0' }),
	);

	const result = await client.deepbook.checkManagerBalanceWithAddress(
		'0x344c2734b1d211bd15212bfb7847c66a3b18803f3f5ab00f5ff6f87b6fe6d27d',
		'USDC',
	);
	console.log(result);
})();
