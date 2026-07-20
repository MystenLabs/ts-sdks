// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		// The live-testnet suite hits a real deployment; it is excluded from the
		// default `test` lane (which runs on every PR) and runs via `test:e2e`.
		exclude: process.env.PREDICT_SDK_TESTNET ? [] : ['tests/testnet/**'],
		env: {
			NODE_ENV: 'test',
		},
	},
});
