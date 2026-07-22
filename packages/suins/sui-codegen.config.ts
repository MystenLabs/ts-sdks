// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

const config: SuiCodegenConfig = {
	output: './src/contracts',
	configArguments: {
		suins: { type: '@suins/core::suins::SuiNS', parameterName: 'suins' },
	},
	packages: [
		// Local SuiNS contracts
		{
			package: '@suins/core',
			path: '../../../suins-contracts/packages/suins',
			configArguments: {
				packageId: { package: '@suins/core' },
			},
		},
		{
			package: '@suins/payments',
			path: '../../../suins-contracts/packages/payments',
			configArguments: {
				packageId: { package: '@suins/payments' },
				bbbVault: [
					{ function: 'payments::handle_base_payment', parameterName: 'bbb_vault' },
					{ function: 'payments::handle_payment', parameterName: 'bbb_vault' },
				],
			},
		},
		{
			package: '@suins/coupons',
			path: '../../../suins-contracts/packages/coupons',
			configArguments: {
				packageId: { package: '@suins/coupons' },
			},
		},
		{
			package: '@suins/discounts',
			path: '../../../suins-contracts/packages/discounts',
			configArguments: {
				packageId: { package: '@suins/discounts' },
				discountHouseId: { type: 'house::DiscountHouse', parameterName: 'self' },
			},
		},
		{
			package: '@suins/subdomain-proxy',
			path: '../../../suins-contracts/packages/temp_subdomain_proxy',
			configArguments: {
				tempSubdomainsProxyPackageId: { package: '@suins/subdomain-proxy' },
			},
		},
		// Pyth - only need State type to get upgrade_cap.package
		{
			package: '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837',
			packageName: 'pyth',
			network: 'testnet',
			generate: {
				modules: { state: { types: ['State'] } },
			},
		},
		// Wormhole - only need State type to get upgrade_cap.package
		{
			package: '0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94',
			packageName: 'wormhole',
			network: 'testnet',
			generate: {
				modules: { state: { types: ['State'] } },
			},
		},
	],
};

export default config;
