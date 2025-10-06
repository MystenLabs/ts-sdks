// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

const config: SuiCodegenConfig = {
	output: './src/app/contracts',
	packages: [
		{
			package: 'demo.sui/nft',
			path: './move/nft',
		},
		{
			package: 'demo.sui/counter',
			path: './move/counter',
		},
	],
};

export default config;
