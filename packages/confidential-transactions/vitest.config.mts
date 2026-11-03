// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		minWorkers: 1,
		maxWorkers: 4,
		hookTimeout: 60000,
		testTimeout: 60000,
		env: {
			NODE_ENV: 'test',
		},
		pool: 'threads',
	},
});
