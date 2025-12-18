// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/Sui.ts'],
	format: 'esm',
	dts: true,
	outDir: 'dist',
	// Bundle all dependencies
	external: [],
});
