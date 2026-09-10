// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase64 } from '@mysten/utils';
import { describe, expect, it, vi } from 'vitest';
import { bcs } from '../../../src/bcs/index.js';
import { GrpcTypes, SuiGrpcClient } from '../../../src/grpc/index.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { SuiJsonRpcClient } from '../../../src/jsonRpc/index.js';

const bytes = bcs.TransactionData.serialize({
	V1: {
		kind: { Genesis: { objects: [] } },
		sender: '0x0',
		gasData: { payment: [], owner: '0x0', price: '0', budget: '0' },
		expiration: { None: true },
	},
}).toBytes();

function clients(data: Uint8Array | undefined = bytes) {
	const grpc = new SuiGrpcClient({ network: 'localnet', baseUrl: 'http://localhost' });
	const grpcRequest = vi.fn(async () => ({
		response: {
			transaction: GrpcTypes.ExecutedTransaction.create({
				digest: 'genesis',
				checkpoint: 0n,
				transaction: data ? { bcs: { value: data } } : {},
				effects: { status: { success: true } },
			}),
		},
	}));
	grpc.ledgerService.getTransaction = grpcRequest as never;
	const graphql = new SuiGraphQLClient({ network: 'localnet', url: 'http://localhost' });
	const graphqlRequest = vi.fn(async () => ({
		data: {
			transaction: {
				digest: 'genesis',
				transactionBcs: data ? toBase64(data) : null,
				signatures: [],
				effects: { status: 'SUCCESS', checkpoint: { sequenceNumber: 0 } },
			},
		},
	}));
	graphql.query = graphqlRequest as never;
	const jsonRpc = new SuiJsonRpcClient({ network: 'localnet', url: 'http://localhost' });
	jsonRpc.getTransactionBlock = vi.fn(async () => ({
		digest: 'genesis',
		rawTransaction: data
			? toBase64(
					bcs.SenderSignedData.serialize([
						{
							intentMessage: {
								intent: {
									scope: { TransactionData: true },
									version: { V0: true },
									appId: { Sui: true },
								},
								value: bcs.TransactionData.parse(data),
							},
							txSignatures: [],
						},
					]).toBytes(),
				)
			: undefined,
		effects: { status: { status: 'success' } },
	})) as never;
	return { grpc, graphql, jsonRpc, grpcRequest, graphqlRequest };
}

describe('ledger transaction data across transports', () => {
	it('returns genesis data without exposing unrequested BCS', async () => {
		const { grpc, graphql, jsonRpc, grpcRequest, graphqlRequest } = clients();
		for (const client of [grpc, graphql, jsonRpc]) {
			const result = await client.core.getTransaction({
				digest: 'genesis',
				include: { transaction: true },
			});
			expect(result.Transaction?.transaction).toMatchObject({
				version: 2,
				inputs: [],
				commands: [],
				kind: bcs.TransactionData.parse(bytes).V1.kind,
			});
			expect(result.Transaction?.bcs).toBeUndefined();
		}
		expect(grpcRequest).toHaveBeenCalledWith(
			expect.objectContaining({ readMask: { paths: expect.arrayContaining(['transaction.bcs']) } }),
			expect.anything(),
		);
		expect(graphqlRequest).toHaveBeenCalledWith(
			expect.objectContaining({ variables: expect.objectContaining({ includeBcs: true }) }),
		);
	});

	it('returns both selections when requested', async () => {
		const { grpc, graphql, jsonRpc } = clients();
		for (const client of [grpc, graphql, jsonRpc]) {
			const result = await client.core.getTransaction({
				digest: 'genesis',
				include: { transaction: true, bcs: true },
			});
			expect(result.Transaction?.transaction.kind.$kind).toBe('Genesis');
			expect(result.Transaction?.bcs).toEqual(bytes);
		}
	});

	it('rejects missing requested transaction data', async () => {
		const { grpc, graphql, jsonRpc } = clients();
		grpc.ledgerService.getTransaction = (async () => ({
			response: { transaction: GrpcTypes.ExecutedTransaction.create({ digest: 'genesis' }) },
		})) as never;
		graphql.query = (async () => ({
			data: { transaction: { digest: 'genesis', signatures: [] } },
		})) as never;
		jsonRpc.getTransactionBlock = (async () => ({ digest: 'genesis' })) as never;
		for (const client of [grpc, graphql, jsonRpc]) {
			await expect(
				client.core.getTransaction({ digest: 'genesis', include: { transaction: true } }),
			).rejects.toThrow('Transaction BCS is required');
		}
	});
});
