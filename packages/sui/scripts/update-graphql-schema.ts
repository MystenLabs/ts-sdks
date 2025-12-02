// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process';
import { readFile } from 'fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

await addSchema(
	'https://raw.githubusercontent.com/MystenLabs/sui/refs/heads/main/crates/sui-indexer-alt-graphql/schema.graphql',
);

await addExportsToPackageJson();

async function addExportsToPackageJson() {
	const packageJsonPath = resolve(import.meta.url.slice(5), '../../package.json');
	const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

	packageJson.exports[`./graphql/schema`] = {
		import: `./dist/esm/graphql/schema/index.js`,
		require: `./dist/cjs/graphql/schema/index.js`,
	};

	await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, '\t')}\n`);
}

async function addSchema(schema: string) {
	const res = await fetch(schema);

	if (!res.ok) {
		throw new Error(`Failed to fetch schema from ${schema}`);
	}
	const schemaContent = await res.text();

	const filePath = resolve(import.meta.url.slice(5), `../../src/graphql/generated/schema.graphql`);

	await mkdir(resolve(filePath, '..'), { recursive: true });
	await writeFile(filePath, schemaContent);

	await writeFile(
		resolve(filePath, '..', 'tsconfig.tada.json'),
		`
{
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
`.trimStart(),
	);

	execSync(`pnpm gql.tada generate-output -c ${resolve(filePath, '..', 'tsconfig.tada.json')}`, {
		stdio: 'inherit',
	});

	await mkdir(resolve(filePath, '../../../schemas'), { recursive: true });
	await writeFile(
		resolve(filePath, `../../schema/index.ts`),
		`
// Copyright (c) Mysten Labs, Inc.
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
`.trimStart(),
	);
}
