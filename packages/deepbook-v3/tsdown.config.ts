// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts', 'src/account.ts', 'src/sessions.ts', 'src/predict/index.ts'],
	format: 'esm',
	dts: true,
	outDir: 'dist',
	unbundle: true,
});
