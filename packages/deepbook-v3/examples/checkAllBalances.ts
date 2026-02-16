// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Fetch multiple coin balances for balance managers and margin manager
 * balances in single dry run calls.
 *
 * Usage:
 *   npx tsx examples/checkAllBalances.ts
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

	// 1. Fetch all coin balances for multiple balance managers in one dry run
	// Example response:
	// {
	//   '0x344c...d27d': {
	//     '0xdeeb...::deep::DEEP': 142027.888639,
	//     '0x0000...::sui::SUI': 793052.598384511,
	//     '0xdba3...::usdc::USDC': 863270.964879,
	//     ...
	//   },
	//   '0x705a...6581': {
	//     '0xdeeb...::deep::DEEP': 57542.587118,
	//     '0x0000...::sui::SUI': 82488.361906133,
	//     '0xdba3...::usdc::USDC': 54561.821692,
	//     ...
	//   }
	// }
	const balanceManagerAddresses = ['<BALANCE_MANAGER_ADDRESS_1>', '<BALANCE_MANAGER_ADDRESS_2>'];

	const balances = await client.deepbook.checkManagerBalancesWithAddress(balanceManagerAddresses, [
		'DEEP',
		'SUI',
		'USDC',
		'WUSDC',
		'WETH',
		'BETH',
		'WBTC',
		'WUSDT',
		'NS',
		'TYPUS',
		'AUSD',
		'WAL',
		'SUIUSDE',
		'DRF',
		'SEND',
		'XBTC',
		'IKA',
		'ALKIMI',
		'LZWBTC',
		'USDT',
		'WGIGA',
	]);

	console.log(balances);

	// 2. Fetch base/quote/deep balances for margin managers in one dry run
	// Example response:
	// {
	//   '0xca5c...cc0d': { base: '0.097675', quote: '5.611957', deep: '0' },
	//   '0xd0d8...1fc8': { base: '0.0985', quote: '3.605957', deep: '0' }
	// }
	const marginBalances = await client.deepbook.getMarginManagerBalances({
		'<MARGIN_MANAGER_ADDRESS_1>': 'SUI_USDC',
		'<MARGIN_MANAGER_ADDRESS_2>': 'SUI_USDC',
	});

	console.log(marginBalances);
})();
