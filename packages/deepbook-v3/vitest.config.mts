// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// The Predict live-testnet suite hits a real deployment; keep it out of the
		// default `test` lane (which runs on every PR) and run it via `test:e2e`.
		exclude: process.env.PREDICT_SDK_TESTNET
			? ['**/node_modules/**', '**/dist/**']
			: ['**/node_modules/**', '**/dist/**', 'test/predict/testnet/**'],
		maxConcurrency: 8,
		hookTimeout: 1000000,
		testTimeout: 1000000,
		env: {
			NODE_ENV: 'test',
		},
	},
	resolve: {
		alias: {},
	},
});
