// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

// Predict is not yet published, so we generate from the local Move source in the
// sibling `deepbookv3` checkout (same pattern deepbook-v3 uses for `@deepbook/core`).
// The generated `src/contracts/**` is used primarily as a BCS-schema source; the
// hand-written `src/transactions/**` layer builds moveCalls against package IDs
// resolved at runtime from `PredictConfig`.
//
// Oracle is read-only for v1: trade entrypoints read feeds by reference, so we do
// not generate `block_scholes_oracle` / `pyth_lazer` (they are only needed to
// *construct* oracle updates, which is out of scope for the v1 SDK).
const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '@local-pkg/deepbook_predict',
			path: '../../../deepbookv3/packages/predict',
		},
		{
			package: '@local-pkg/account',
			path: '../../../deepbookv3/packages/account',
		},
		{
			package: '@local-pkg/propbook',
			path: '../../../deepbookv3/packages/propbook',
		},
	],
};

export default config;
