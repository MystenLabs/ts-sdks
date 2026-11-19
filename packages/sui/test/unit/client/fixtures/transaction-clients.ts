// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest';

import type { SuiClientTypes } from '../../../../src/client/types.js';
import { SuiGraphQLClient } from '../../../../src/graphql/index.js';
import { GrpcTypes, SuiGrpcClient } from '../../../../src/grpc/index.js';
import { address, digest } from './transaction-kinds.js';

/**
 * A gRPC and a GraphQL client whose `getTransaction` answers with a successful transaction, with
 * the given fields of each wire response replaced.
 */
export function transactionClients(overrides: { grpc?: object; graphql?: object } = {}) {
	const grpc = new SuiGrpcClient({ network: 'localnet', baseUrl: 'http://localhost' });
	const grpcRequest = vi.fn(async () => ({
		response: {
			transaction: GrpcTypes.ExecutedTransaction.create({
				digest,
				checkpoint: 10n,
				transaction: { sender: address },
				effects: { status: { success: true } },
				...overrides.grpc,
			}),
		},
	}));
	grpc.ledgerService.getTransaction = grpcRequest as never;

	const graphql = new SuiGraphQLClient({ network: 'localnet', url: 'http://localhost' });
	const graphqlRequest = vi.fn(async () => ({
		data: {
			transaction: {
				digest,
				sender: { address },
				signatures: [],
				effects: { status: 'SUCCESS', checkpoint: { sequenceNumber: 10 } },
				...overrides.graphql,
			},
		},
	}));
	graphql.query = graphqlRequest as never;

	return { grpc, graphql, grpcRequest, graphqlRequest };
}

/** Reads the transaction from both clients, gRPC first. */
export function readFromBoth<Include extends SuiClientTypes.TransactionInclude = {}>(
	overrides: { grpc?: object; graphql?: object },
	include?: Include,
) {
	const { grpc, graphql } = transactionClients(overrides);
	return Promise.all([
		grpc.core.getTransaction({ digest, include }),
		graphql.core.getTransaction({ digest, include }),
	]);
}
