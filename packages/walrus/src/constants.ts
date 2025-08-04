// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BlobStatus } from './storage-node/types.js';
import type { WalrusPackageConfig } from './types.js';

export const TESTNET_WALRUS_PACKAGE_CONFIG = {
	systemObjectId: '0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af',
	stakingPoolId: '0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3',
	exchangeIds: [
		'0xf4d164ea2def5fe07dc573992a029e010dba09b1a8dcbc44c5c2e79567f39073',
		'0x19825121c52080bb1073662231cfea5c0e4d905fd13e95f21e9a018f2ef41862',
		'0x83b454e524c71f30803f4d6c302a86fb6a39e96cdfb873c2d1e93bc1c26a3bc5',
		'0x8d63209cf8589ce7aef8f262437163c67577ed09f3e636a9d8e0813843fb8bf1',
	],
} satisfies WalrusPackageConfig;

export const MAINNET_WALRUS_PACKAGE_CONFIG = {
	systemObjectId: '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2',
	stakingPoolId: '0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904',
} satisfies WalrusPackageConfig;

// Ranking of blob status types from earliest -> latest in the lifecycle of a blob.
export const statusLifecycleRank: Record<BlobStatus['type'], number> = {
	nonexistent: 0,
	deletable: 1,
	permanent: 2,
	invalid: 3,
};
