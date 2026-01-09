// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const res = await fetch(
	'https://raw.githubusercontent.com/MystenLabs/sui/refs/heads/main/crates/sui-indexer-alt-graphql/schema.graphql',
);

if (!res.ok) {
	throw new Error(`Failed to fetch schema`);
}

const schemaContent = await res.text();
const generatedDir = resolve(import.meta.dirname, '../src/graphql/generated');

await mkdir(generatedDir, { recursive: true });
await writeFile(resolve(generatedDir, 'schema.graphql'), schemaContent);

await writeFile(
	resolve(generatedDir, 'tsconfig.tada.json'),
	`{
    "compilerOptions": {
        "plugins": [
            {
                "name": "@0no-co/graphqlsp",
                "schema": "./schema.graphql",
                "tadaOutputLocation": "src/graphql/generated/tada-env.ts"
            }
        ]
    }
}
`,
);

execSync(`pnpm gql.tada generate-output -c ${resolve(generatedDir, 'tsconfig.tada.json')}`, {
	stdio: 'inherit',
});

const schemaDir = resolve(import.meta.dirname, '../src/graphql/schema');
await mkdir(schemaDir, { recursive: true });
await writeFile(
	resolve(schemaDir, 'index.ts'),
	`// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { initGraphQLTada } from 'gql.tada';

import type { introspection } from '../generated/tada-env.js';
import type { CustomScalars } from '../types.js';

export type * from '../types.js';

export type { FragmentOf, ResultOf, VariablesOf, TadaDocumentNode } from 'gql.tada';
export { readFragment, maskFragments } from 'gql.tada';

export const graphql = initGraphQLTada<{
	introspection: typeof introspection;
	scalars: CustomScalars;
}>();
`,
);
