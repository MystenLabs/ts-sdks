// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/e2e/**/*.test.ts'],
		// Live-network round trips (faucet funding, finality) are slow.
		testTimeout: 120_000,
		hookTimeout: 120_000,
		// Faucet rate limits make parallel funding flaky; run e2e serially.
		fileParallelism: false,
	},
});
