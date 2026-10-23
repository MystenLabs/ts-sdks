// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';

// Opt-in suite (`pnpm test:stress`): tests that need V8 flags, real sockets or `openssl`, and that
// measure runtime behaviour rather than SDK logic. Kept out of the default unit run.
export default defineConfig({
	test: {
		include: ['test/stress/**/*.test.ts'],
		pool: 'forks',
		execArgv: ['--expose-gc'],
		testTimeout: 60_000,
		env: {
			NODE_ENV: 'test',
		},
	},
	resolve: {
		alias: {
			'@mysten/bcs': new URL('../../../bcs/src', import.meta.url).pathname,
			'@mysten/utils': new URL('../../../utils/src', import.meta.url).pathname,
		},
	},
});
