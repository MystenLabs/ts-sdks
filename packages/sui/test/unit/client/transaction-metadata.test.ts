// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import type {
	JsonRpcTransport,
	JsonRpcTransportRequestOptions,
} from '../../../src/jsonRpc/index.js';
import { SuiJsonRpcClient } from '../../../src/jsonRpc/index.js';

const DIGEST = 'DyNVCcweVUBz7g3vxiKHF6SuoxynYbr6d8AJyDL1dhMm';
const CHECKPOINT = '15000000';
const TIMESTAMP_MS = 1_696_734_547_028;

describe('core transaction metadata', () => {
	it('maps checkpoint and timestamp from GraphQL ledger reads', async () => {
		const client = new SuiGraphQLClient({
			url: 'http://localhost/graphql',
			network: 'mainnet',
			fetch: async () =>
				Response.json({
					data: {
						transaction: {
							digest: DIGEST,
							signatures: [],
							effects: {
								status: 'SUCCESS',
								executionError: null,
								epoch: { epochId: 178 },
								timestamp: '2023-10-08T03:09:07.028Z',
								checkpoint: { sequenceNumber: 15_000_000 },
							},
						},
					},
				}),
		});

		const result = await client.core.getTransaction({ digest: DIGEST });

		expect(result.Transaction).toMatchObject({
			timestampMs: TIMESTAMP_MS,
			checkpoint: CHECKPOINT,
		});
	});

	it('returns null checkpoint and timestamp from GraphQL execution', async () => {
		const client = new SuiGraphQLClient({
			url: 'http://localhost/graphql',
			network: 'mainnet',
			fetch: async () =>
				Response.json({
					data: {
						executeTransaction: {
							effects: {
								transaction: {
									digest: DIGEST,
									signatures: [],
									effects: {
										status: 'SUCCESS',
										executionError: null,
										epoch: { epochId: 178 },
										timestamp: null,
										checkpoint: null,
									},
								},
							},
						},
					},
				}),
		});

		const result = await client.core.executeTransaction({
			transaction: new Uint8Array(),
			signatures: [],
		});

		expect(result.Transaction).toMatchObject({ timestampMs: null, checkpoint: null });
	});

	it('maps checkpoint and timestamp from JSON-RPC ledger reads', async () => {
		const transport: JsonRpcTransport = {
			async request<T>(input: JsonRpcTransportRequestOptions) {
				expect(input.method).toBe('sui_getTransactionBlock');
				return {
					digest: DIGEST,
					effects: {
						status: { status: 'success' },
						executedEpoch: '178',
					},
					timestampMs: TIMESTAMP_MS.toString(),
					checkpoint: CHECKPOINT,
					errors: [],
				} as T;
			},
		};
		const client = new SuiJsonRpcClient({ network: 'mainnet', transport });

		const result = await client.core.getTransaction({ digest: DIGEST });

		expect(result.Transaction).toMatchObject({
			timestampMs: TIMESTAMP_MS,
			checkpoint: CHECKPOINT,
		});
	});

	it('returns null checkpoint and timestamp from JSON-RPC execution', async () => {
		const transport: JsonRpcTransport = {
			async request<T>(input: JsonRpcTransportRequestOptions) {
				expect(input.method).toBe('sui_executeTransactionBlock');
				return {
					digest: DIGEST,
					effects: {
						status: { status: 'success' },
						executedEpoch: '178',
					},
					errors: [],
				} as T;
			},
		};
		const client = new SuiJsonRpcClient({ network: 'mainnet', transport });

		const result = await client.core.executeTransaction({
			transaction: new Uint8Array(),
			signatures: [],
		});

		expect(result.Transaction).toMatchObject({ timestampMs: null, checkpoint: null });
	});
});
