// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// e2e tests hit a live network and run under their own config.
		exclude: ['**/node_modules/**', '**/dist/**', 'test/e2e/**'],
	},
});
