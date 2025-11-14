// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '@mysten/payment-kit',
			path: '../../../sui-payment-kit',
		},
	],
};

export default config;
