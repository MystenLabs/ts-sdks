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
	const balances = await client.deepbook.checkManagerBalancesWithAddress(
		[
			'0x344c2734b1d211bd15212bfb7847c66a3b18803f3f5ab00f5ff6f87b6fe6d27d',
			'0x705ac1ce9eafab73b885051e458c5b4d8480f44f709abf4cc297df1d20ec6581',
		],
		[
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
		],
	);

	console.log(balances);

	// 2. Fetch base/quote/deep balances for margin managers in one dry run
	// Example response:
	// {
	//   '0xca5c...cc0d': { base: '0.097675', quote: '5.611957', deep: '0' },
	//   '0xd0d8...1fc8': { base: '0.0985', quote: '3.605957', deep: '0' }
	// }
	const marginBalances = await client.deepbook.getMarginManagerBalances({
		'0xca5c45c165dc239192abc0d9dedd137cc692d659556a8e933b445faa795dcc0d': 'SUI_USDC',
		'0xd0d87e56e95248087656632c3f14b5636e8df6cbcfc8257e5556aaa4675b1fc8': 'SUI_USDC',
	});

	console.log(marginBalances);
})();
