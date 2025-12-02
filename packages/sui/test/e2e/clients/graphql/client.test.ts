// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';

import { SuiGraphQLClient } from '../../../../src/graphql';
import { graphql } from '../../../../src/graphql/schema';

const DEFAULT_GRAPHQL_URL = import.meta.env.GRAPHQL_URL ?? 'http://127.0.0.1:9125/graphql';

const queries = {
	getFirstTransactionBlock: graphql(`
		query getEpochs($limit: Int!) {
			transactions(first: $limit, filter: { atCheckpoint: 0 }) {
				pageInfo {
					hasNextPage
					hasPreviousPage
					endCursor
					startCursor
				}
				edges {
					node {
						kind {
							__typename
						}
						gasInput {
							gasBudget
						}
					}
				}
			}
		}
	`),
};

const client = new SuiGraphQLClient({
	url: DEFAULT_GRAPHQL_URL,
	network: 'localnet',
	queries,
});

describe('GraphQL client', () => {
	it('executes predefined queries', async () => {
		const response = await client.execute('getFirstTransactionBlock', {
			variables: {
				limit: 1,
			},
		});

		expect(response.data?.transactions?.edges[0].node.kind?.__typename).toEqual(
			'GenesisTransaction',
		);
	});

	it('executes inline queries', async () => {
		const response = await client.query({
			query: graphql(`
				query getEpochs($limit: Int!) {
					transactions(first: $limit, filter: { atCheckpoint: 0 }) {
						edges {
							node {
								kind {
									__typename
									... on GenesisTransaction {
										objects(first: 1) {
											nodes {
												asMovePackage {
													version
													modules(first: 3) {
														nodes {
															name
														}
													}
												}
											}
										}
									}
								}
								gasInput {
									gasBudget
								}
							}
						}
					}
				}
			`),
			variables: {
				limit: 1,
			},
		});

		expect(response.data?.transactions?.edges[0].node.kind?.__typename).toEqual(
			'GenesisTransaction',
		);

		expect(response).toEqual({
			data: {
				transactions: {
					edges: [
						{
							node: {
								kind: {
									__typename: 'GenesisTransaction',
									objects: {
										nodes: [
											{
												asMovePackage: {
													version: 1,
													modules: {
														nodes: [
															{
																name: 'address',
															},
															{
																name: 'ascii',
															},
															{
																name: 'bcs',
															},
														],
													},
												},
											},
										],
									},
								},
								gasInput: {
									gasBudget: '0',
								},
							},
						},
					],
				},
			},
		});
	});
});
