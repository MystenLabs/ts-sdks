// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiCodegenConfig } from '@mysten/codegen';

const config: SuiCodegenConfig = {
	output: './src/contracts',
	packages: [
		{
			package: '@local-pkg/hashi', // TODO: update this when hashi is published on MVR.
			path: '../../../hashi/packages/hashi',
			configArguments: {
				hashiObjectId: { type: 'hashi::Hashi' },
				packageId: { package: '@local-pkg/hashi' },
			},
		},
	],
};

export default config;
