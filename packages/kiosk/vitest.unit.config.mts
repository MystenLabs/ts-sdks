// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/unit/**/*.test.ts'],
	},
	resolve: {
		alias: {
			'@mysten/bcs': new URL('../bcs/src', import.meta.url).pathname,
			'@mysten/sui': new URL('../sui/src', import.meta.url).pathname,
		},
	},
});
