// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		testTimeout: 30000,
	},
	resolve: {
		alias: {
			'@mysten/bcs': new URL('../bcs/src', import.meta.url).pathname,
			'@mysten/sui': new URL('../sui/src', import.meta.url).pathname,
			'@mysten/utils': new URL('../utils/src', import.meta.url).pathname,
			'@mysten/walrus-wasm': new URL('../walrus-wasm', import.meta.url).pathname,
		},
	},
});
