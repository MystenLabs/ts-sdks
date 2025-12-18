// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

// Generates BCS types for:
// 1. Sui framework kiosk types from testnet (0x2 package)
// 2. Local kiosk package (if exists at ../../../apps/kiosk)

const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '0x0000000000000000000000000000000000000000000000000000000000000002',
			packageName: '0x2',
			network: 'testnet',
			modules: ['kiosk', 'kiosk_extension', 'transfer_policy'],
		},
		{
			package: '@local-pkg/kiosk',
			path: '../../../apps/kiosk',
		},
	],
};

export default config;
