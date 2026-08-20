// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '@local-pkg/account',
			path: '../../../deepbookv3/packages/account',
			// The package address and the per-network `AccountRegistry` singleton come from a
			// config object instead of being threaded through every call site. The generated
			// `AccountConfig` interface makes a deployment id that stops matching the deployed
			// signature a compile error rather than a runtime abort.
			configArguments: {
				accountPackageId: { package: '@local-pkg/account' },
				accountRegistry: { type: 'account_registry::AccountRegistry' },
			},
			// Parse `u64`/`u128`/`u256` straight to bigint rather than the decimal strings
			// `@mysten/sui/bcs` yields. Representation only — no scaling is applied.
			bcsOverrides: [
				{ type: 'u64', source: './src/bcs/integers.ts#U64' },
				{ type: 'u128', source: './src/bcs/integers.ts#U128' },
				{ type: 'u256', source: './src/bcs/integers.ts#U256' },
			],
		},
	],
};

export default config;
