// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildSchema, introspectionFromSchema } from 'graphql';

const { values } = parseArgs({
	options: {
		schema: { type: 'string' },
		check: { type: 'boolean', default: false },
	},
});

// Subscriptions currently live in the upstream staging schema. Using the default
// schema.graphql would remove their types even though the SDK implements them.
const source =
	values.schema ??
	'https://raw.githubusercontent.com/MystenLabs/sui/refs/heads/main/crates/sui-indexer-alt-graphql/staging.graphql';
const schemaContent = await loadSchema(source);
const schema = buildSchema(schemaContent);
const subscriptions = schema.getSubscriptionType()?.getFields();
for (const field of ['checkpoints', 'transactions', 'events']) {
	if (!subscriptions?.[field]) {
		throw new Error(
			`GraphQL schema ${source} is missing Subscription.${field}; no files were updated`,
		);
	}
}

// Use the same serializer as gql.tada's CLI without its TypeScript-config loader,
// which currently requires compiler APIs that are unavailable in TypeScript 7.
// Resolve through gql.tada so its installed version owns the matching internal API.
const require = createRequire(import.meta.url);
const { minifyIntrospection, outputIntrospectionFile } = createRequire(require.resolve('gql.tada'))(
	'@gql.tada/internal',
);
const introspection = outputIntrospectionFile(
	minifyIntrospection(introspectionFromSchema(schema)),
	{
		fileType: '.ts',
	},
);
const generatedDir = resolve(import.meta.dirname, '../src/graphql/generated');
const outputs = new Map<string, string>([
	[resolve(generatedDir, 'schema.graphql'), schemaContent],
	[resolve(generatedDir, 'tada-env.ts'), introspection],
	[
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
	],
]);

const schemaDir = resolve(import.meta.dirname, '../src/graphql/schema');
outputs.set(
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

// Prepare every output before writing, including rejecting a schema without the
// subscription API. --check never changes generated files.
if (values.check) {
	for (const [path, expected] of outputs) {
		const actual = await readFile(path, 'utf8').catch(() => null);
		if (actual !== expected) throw new Error(`Generated GraphQL file is out of date: ${path}`);
	}
	console.log(`GraphQL schema and types match ${source}`);
} else {
	await mkdir(generatedDir, { recursive: true });
	await mkdir(schemaDir, { recursive: true });
	for (const [path, content] of outputs) await writeFile(path, content);
	console.log(`Updated GraphQL schema and types from ${source}`);
}

async function loadSchema(source: string): Promise<string> {
	if (!/^https?:\/\//.test(source)) return readFile(resolve(source), 'utf8');
	const response = await fetch(source);
	if (!response.ok)
		throw new Error(`Failed to fetch GraphQL schema: ${response.status} ${response.statusText}`);
	return response.text();
}
