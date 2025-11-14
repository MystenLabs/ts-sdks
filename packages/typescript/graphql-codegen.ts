// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { CodegenConfig } from '@graphql-codegen/cli';

const header = `
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable */
`.trimStart();

const config: CodegenConfig = {
	overwrite: true,
	schema:
		'https://raw.githubusercontent.com/MystenLabs/sui/refs/heads/main/crates/sui-indexer-alt-graphql/schema.graphql',
	documents: ['src/graphql/queries/*.graphql'],
	ignoreNoDocuments: true,
	generates: {
		'src/graphql/generated/queries.ts': {
			config: {
				scalars: {
					BigInt: 'string',
					Base64: 'string',
					DateTime: 'string',
					ObjectID: 'string',
					SuiAddress: 'string',
					JSON: 'unknown',
					UInt53: 'number',
					MoveData: '../types.js#MoveData',
					MoveTypeLayout: '../types.js#MoveTypeLayout',
					MoveTypeSignature: '../types.js#MoveTypeSignature',
					OpenMoveTypeSignature: '../types.js#OpenMoveTypeSignature',
				},
			},
			plugins: [
				{
					add: {
						content: header,
					},
				},
				'typescript',
				'typescript-operations',
				{
					'typed-document-node': {
						documentMode: 'string',
					},
				},
			],
		},
	},
};

export default config;
