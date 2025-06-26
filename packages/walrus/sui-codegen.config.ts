// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '@local-pkg/walrus_subsidies',
			path: '../../../walrus/contracts/subsidies',
		},
		{
			package: '@local-pkg/wal',
			path: '../../../walrus/contracts/wal',
		},
		{
			package: '@local-pkg/wal_exchange',
			path: '../../../walrus/contracts/wal_exchange',
		},
		{
			package: '@local-pkg/walrus',
			path: '../../../walrus/contracts/walrus',
		},
	],
};

export default config;
