// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { initGraphQLTada as InitGraphQLTada } from 'gql.tada';
import { initGraphQLTada } from 'gql.tada';

import type { introspection } from '../generated/tada-env.js';
import type { CustomScalars } from '../types.js';

export type * from '../types.js';

export type { FragmentOf, ResultOf, VariablesOf, TadaDocumentNode } from 'gql.tada';
export { readFragment, maskFragments } from 'gql.tada';

export const graphql: InitGraphQLTada<{
	introspection: typeof introspection;
	scalars: CustomScalars;
}> = initGraphQLTada<{
	introspection: typeof introspection;
	scalars: CustomScalars;
}>();
