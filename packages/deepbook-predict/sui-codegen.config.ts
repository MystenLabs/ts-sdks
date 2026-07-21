// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

// Predict is not yet registered on MVR, so we generate from the local Move source
// in the sibling `deepbookv3` checkout (same pattern `deepbook-v3` uses for
// `@deepbook/core`). Generate against the COMMIT THAT GETS DEPLOYED — deployed
// truth beats repo truth; the generated bindings are the signature authority the
// hand-written facade builds on.
//
// Oracle is read-only for this SDK: trade entrypoints read feeds by reference, so
// we do not generate the oracle-construction packages (`block_scholes_oracle` /
// `pyth_lazer`) — they are only needed to *produce* oracle updates, out of scope.
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
