// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	dts: true,
	sourcemap: true,
});
