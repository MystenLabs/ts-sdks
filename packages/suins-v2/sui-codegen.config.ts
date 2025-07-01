// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '@suins/core',
			path: '../../../suins-contracts/packages/suins',
		},
		{
			package: '@suins/payments',
			path: '../../../suins-contracts/packages/payments',
		},
		{
			package: '@suins/coupons',
			path: '../../../suins-contracts/packages/coupons',
		},
		{
			package: '@suins/discounts',
			path: '../../../suins-contracts/packages/discounts',
		},
		{
			package: '@suins/subdomain-proxy',
			path: '../../../suins-contracts/packages/temp_subdomain_proxy',
		},
	],
};

export default config;
