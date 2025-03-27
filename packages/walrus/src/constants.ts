// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BlobStatus } from './storage-node/types.js';
import type { WalrusPackageConfig } from './types.js';

export const TESTNET_WALRUS_PACKAGE_CONFIG = {
	systemObjectId: '0x98ebc47370603fe81d9e15491b2f1443d619d1dab720d586e429ed233e1255c1',
	stakingPoolId: '0x20266a17b4f1a216727f3eef5772f8d486a9e3b5e319af80a5b75809c035561d',
	exchange: {
		packageId: '0x17365683421a6242d21cc795298cfd61de541618a8dc9d03a12642571808821b',
		exchangeIds: [
			'0x59ab926eb0d94d0d6d6139f11094ea7861914ad2ecffc7411529c60019133997',
			'0x89127f53890840ab6c52fca96b4a5cf853d7de52318d236807ad733f976eef7b',
			'0x9f9b4f113862e8b1a3591d7955fadd7c52ecc07cf24be9e3492ce56eb8087805',
			'0xb60118f86ecb38ec79e74586f1bb184939640911ee1d63a84138d080632ee28a',
		],
	},
} satisfies WalrusPackageConfig;

export const MAINNET_WALRUS_PACKAGE_CONFIG = {
	systemObjectId: '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2',
	stakingPoolId: '0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904',
	subsidiesObjectId: '0xb606eb177899edc2130c93bf65985af7ec959a2755dc126c953755e59324209e',
} satisfies WalrusPackageConfig;

// Ranking of blob status types from earliest -> latest in the lifecycle of a blob.
export const statusLifecycleRank: Record<BlobStatus['type'], number> = {
	nonexistent: 0,
	deletable: 1,
	permanent: 2,
	invalid: 3,
};
