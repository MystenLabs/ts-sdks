#! /usr/bin/env tsx
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import sveltePlugin from 'esbuild-svelte';
import { sveltePreprocess } from 'svelte-preprocess';

import { buildPackage } from './utils/buildPackage.js';

buildPackage({
	plugins: [
		sveltePlugin({
			compilerOptions: {
				customElement: true,
			},
			preprocess: sveltePreprocess({
				typescript: {
					tsconfigFile: 'tsconfig.svelte.json',
				},
			}),
		}),
	],
	bundle: true,
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
