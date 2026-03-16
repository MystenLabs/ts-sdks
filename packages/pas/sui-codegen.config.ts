// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '@mysten/pas',
			path: '../../../pas/packages/pas',
		},
		{
			package: '@mysten/ptb',
			path: '../../../pas/packages/ptb',
		},
		{
			package: '0x0000000000000000000000000000000000000000000000000000000000000002',
			packageName: 'sui',
			network: 'testnet',
			generate: {
				modules: ['dynamic_field'],
			},
		},
	],
};

export default config;
