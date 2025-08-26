// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		restoreMocks: true,
		testTimeout: 30000,
		hookTimeout: 30000,
	},
	resolve: {
		alias: {
			'@dappkit/core': resolve(__dirname, './src'),
			'@dappkit/core/test-utils': resolve(__dirname, './test/test-utils'),
			'@mysten/sui': resolve(__dirname, '../../../typescript/src'),
			'@mysten/wallet-standard': resolve(__dirname, '../../../wallet-standard/src'),
		},
	},
});
