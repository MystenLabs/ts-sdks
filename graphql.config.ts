// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { IGraphQLConfig } from 'graphql-config';

const config: IGraphQLConfig = {
	projects: {
		tsSDK: {
			schema: './packages/sui/src/graphql/generated/latest/schema.graphql',
			documents: ['./packages/sui/src/graphql/queries/**/*.graphql'],
			include: ['./packages/sui/src/graphql/queries/**/*.graphql'],
		},
	},
};

export default config;
