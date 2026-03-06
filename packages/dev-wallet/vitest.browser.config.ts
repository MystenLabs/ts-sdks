// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			instances: [{ browser: 'chromium' }],
		},
		include: ['tests/browser-ui.test.ts', 'tests/react.test.ts'],
		hookTimeout: 120_000,
		testTimeout: 120_000,
	},
});
