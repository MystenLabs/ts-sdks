// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: [
		'src/index.ts',
		'src/adapters/browser.ts',
		'src/adapters/node.ts',
		'src/ui/index.ts',
		'src/react/index.ts',
		'src/client/index.ts',
		'src/server/index.ts',
		'src/bin/cli.ts',
	],
	format: 'esm',
	dts: true,
	outDir: 'dist',
	unbundle: true,
	treeshake: false,
	external: ['vite'],
});
