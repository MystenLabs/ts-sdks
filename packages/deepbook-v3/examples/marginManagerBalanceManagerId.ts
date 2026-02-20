// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This example demonstrates how to get the balance manager ID
 * for a margin manager.
 *
 * Usage:
 *   npx tsx examples/marginManagerBalanceManagerId.ts
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

	// Replace with your margin manager object ID
	const marginManagerId = '0x8239fac61f466526112bb00a116e07b910040504328ff67083049c220fe7bfcd';

	const client = new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }).$extend(
		deepbook({ address: '0x0' }),
	);

	try {
		const balanceManagerId =
			await client.deepbook.getMarginManagerBalanceManagerId(marginManagerId);
		console.log('Margin Manager ID:', marginManagerId);
		console.log('Balance Manager ID:', balanceManagerId);
	} catch (error) {
		console.error('Error:', error);
	}
})();
