// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: ['tests/browser-ui.test.ts', 'tests/react.test.ts', 'node_modules/**', 'examples/**'],
		hookTimeout: 120_000,
		testTimeout: 120_000,
	},
});
