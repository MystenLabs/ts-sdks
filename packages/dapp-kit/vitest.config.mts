// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// <reference types="vitest" />

import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [vanillaExtractPlugin() as never],
	test: {
		exclude: [...configDefaults.exclude, 'tests/**'],
		environment: 'happy-dom',
		restoreMocks: true,
		globals: true,
		setupFiles: ['./test/setup.ts'],
	},
	resolve: {
		alias: {
			// TODO: Figure out a better way to run tests that avoids these aliases:
			'@mysten/wallet-standard': new URL('../wallet-standard/src', import.meta.url).pathname,
			'@mysten/bcs': new URL('../bcs/src', import.meta.url).pathname,
			'@mysten/utils': new URL('../utils/src', import.meta.url).pathname,
			'@mysten/sui/keypairs/ed25519': new URL('../sui/src/keypairs/ed25519', import.meta.url)
				.pathname,
			'@mysten/sui/jsonRpc': new URL('../sui/src/jsonRpc', import.meta.url).pathname,
			'@mysten/sui/utils': new URL('../sui/src/utils', import.meta.url).pathname,
			'@mysten/sui/transactions': new URL('../sui/src/transactions', import.meta.url).pathname,
		},
	},
});
