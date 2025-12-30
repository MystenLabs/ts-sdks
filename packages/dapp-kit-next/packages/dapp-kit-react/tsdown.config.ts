// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: {
		resolve: true,
	},
	sourcemap: true,
	// Nanostores only ships with ESM, so we need to pre-bundle it in the CJS build
	noExternal: ['nanostores', '@nanostores/react'],
	// Don't hash output filenames - ensures types match package.json exports
	hash: false,
});
