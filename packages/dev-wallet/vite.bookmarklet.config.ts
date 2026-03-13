// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Vite build config for the bookmarklet IIFE bundle.
 * Output: dist/standalone/bookmarklet.js
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const packageRoot = import.meta.dirname;

export default defineConfig({
	root: packageRoot,
	build: {
		outDir: resolve(packageRoot, 'dist', 'standalone'),
		emptyOutDir: false,
		lib: {
			entry: resolve(packageRoot, 'src', 'app', 'bookmarklet-entry.ts'),
			formats: ['iife'],
			name: 'DevWalletBookmarklet',
			fileName: () => 'bookmarklet.js',
		},
		rollupOptions: {
			output: {
				inlineDynamicImports: true,
			},
		},
		minify: 'esbuild',
	},
	resolve: {
		conditions: ['import', 'module', 'browser', 'default'],
	},
});
