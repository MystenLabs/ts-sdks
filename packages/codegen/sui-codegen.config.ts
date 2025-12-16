// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from './src/config.js';

const config: SuiCodegenConfig = {
	output: './tests/generated',
	packages: [
		{
			package: '@local-pkg/walrus_subsidies',
			path: './tests/move/subsidies',
		},
		{
			package: '@local-pkg/wal',
			path: './tests/move/wal',
		},
		{
			package: '@local-pkg/wal_exchange',
			path: './tests/move/wal_exchange',
		},
		{
			package: '@local-pkg/walrus',
			path: './tests/move/walrus',
		},
		{
			package: '@local-pkg/conflict_test',
			path: './tests/move/conflict_test',
		},
	],
};

export default config;
