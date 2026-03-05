// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Vite build config for the standalone wallet app served by `npx @mysten/dev-wallet serve`.
 *
 * This pre-builds the wallet UI at `pnpm build` time so the CLI can serve
 * static files without needing Vite at runtime.
 *
 * Build: src/app/index.html → dist/standalone/ (HTML + JS/CSS)
 */

import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

const root = resolve(import.meta.dirname, 'src', 'app');
const outDir = resolve(import.meta.dirname, 'dist', 'standalone');

/**
 * Marks all local source modules as having side effects so Rolldown
 * preserves Lit @customElement() decorator calls (which register
 * custom elements as a top-level side effect).
 */
function forceSideEffects(): Plugin {
	const pkgRoot = resolve(import.meta.dirname);
	return {
		name: 'force-side-effects',
		transform(_code, id) {
			if (id.startsWith(pkgRoot) && /\.[jt]sx?$/.test(id)) {
				return { moduleSideEffects: true };
			}
		},
	};
}

export default defineConfig({
	root,
	plugins: [forceSideEffects()],
	build: {
		outDir,
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: resolve(root, 'index.html'),
			},
		},
	},
	esbuild: {
		tsconfigRaw: {
			compilerOptions: {
				experimentalDecorators: true,
				useDefineForClassFields: false,
			},
		},
	},
	resolve: {
		conditions: ['import', 'module', 'browser', 'default'],
	},
});
