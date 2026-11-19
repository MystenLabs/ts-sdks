// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { Input_Mutability } from '../../../src/grpc/proto/sui/rpc/v2/input.js';
import {
	EndOfEpochTransactionKind_Kind as EndOfEpochKind,
	Transaction as GrpcTransaction,
	TransactionExpiration_TransactionExpirationKind as ExpirationKind,
	TransactionKind_Kind as Kind,
} from '../../../src/grpc/proto/sui/rpc/v2/transaction.js';
import { readFromBoth, transactionClients } from './fixtures/transaction-clients.js';
import { address, cases, digest, header } from './fixtures/transaction-kinds.js';
import type { GrpcKind } from './fixtures/transaction-kinds.js';

/** Uses an epoch expiration so that reads also cover mapping one. */
function transaction(kind: GrpcKind | undefined) {
	return GrpcTransaction.create({
		...header,
		expiration: { kind: ExpirationKind.EPOCH, epoch: 7n },
		kind,
	});
}

const programmable = transaction(cases.ProgrammableTransaction.grpc);

/**
 * A transaction from a newer protocol: the gRPC encoding carries an enum value and a oneof field
 * this SDK does not know, which binary decoding leaves as a bare number and an unset oneof.
 */
const newerKind = {
	grpc: transaction({ kind: 99 as Kind, data: { oneofKind: undefined } }),
	json: {
		...(GrpcTransaction.toJson(transaction(undefined)) as object),
		kind: { kind: 'SOME_NEWER_KIND', someNewerKind: { field: 1 } },
	},
};

const newerEndOfEpoch = {
	grpc: transaction({
		kind: Kind.END_OF_EPOCH,
		data: {
			oneofKind: 'endOfEpoch',
			endOfEpoch: {
				transactions: [
					{ kind: 99 as EndOfEpochKind, data: { oneofKind: undefined } },
					{ kind: EndOfEpochKind.ACCUMULATOR_ROOT_CREATE, data: { oneofKind: undefined } },
				],
			},
		},
	}),
	json: {
		...(GrpcTransaction.toJson(transaction(undefined)) as object),
		kind: {
			kind: 'END_OF_EPOCH',
			endOfEpoch: {
				transactions: [
					{ kind: 'SOME_NEWER_OPERATION', someNewerOperation: 'x' },
					{ kind: 'ACCUMULATOR_ROOT_CREATE' },
				],
			},
		},
	},
};

/** Wire responses carrying `tx`, as gRPC and as GraphQL's `transactionJson`. */
function responses(
	tx: GrpcTransaction | undefined,
	json: unknown = tx ? GrpcTransaction.toJson(tx) : undefined,
) {
	return { grpc: { transaction: tx }, graphql: { transactionJson: json } };
}

async function readBoth(tx: GrpcTransaction | undefined, json?: unknown) {
	const [fromGrpc, fromGraphQL] = await readFromBoth(responses(tx, json), { transaction: true });
	return [fromGrpc.Transaction!.transaction, fromGraphQL.Transaction!.transaction] as const;
}

describe('ledger transaction data across transports', () => {
	it('does not request BCS unless asked', async () => {
		const { grpc, graphql, grpcRequest, graphqlRequest } = transactionClients(
			responses(programmable),
		);
		for (const client of [grpc, graphql]) {
			await client.core.getTransaction({ digest, include: { transaction: true } });
		}
		const [[grpcOptions]] = grpcRequest.mock.calls as unknown as [[{ readMask: { paths: [] } }]];
		expect(grpcOptions.readMask.paths).not.toContain('transaction.bcs');
		expect(graphqlRequest).toHaveBeenCalledWith(
			expect.objectContaining({ variables: expect.objectContaining({ includeBcs: false }) }),
		);
	});

	it('returns Unknown for a newer transaction kind on both transports', async () => {
		const [fromGrpc, fromGraphQL] = await readBoth(newerKind.grpc, newerKind.json);
		expect(fromGraphQL).toEqual(fromGrpc);
		expect(fromGrpc.kind).toEqual({ $kind: 'Unknown', Unknown: true });
		expect(fromGrpc.inputs).toEqual([]);
		expect(fromGrpc.commands).toEqual([]);
		expect(fromGrpc.sender).toBe(address);
		expect(fromGrpc.expiration).toEqual({ $kind: 'Epoch', Epoch: '7' });
	});

	it('returns Unknown for a newer end-of-epoch operation on both transports', async () => {
		const [fromGrpc, fromGraphQL] = await readBoth(newerEndOfEpoch.grpc, newerEndOfEpoch.json);
		expect(fromGraphQL).toEqual(fromGrpc);
		expect(fromGrpc.kind).toEqual({
			$kind: 'EndOfEpochTransaction',
			EndOfEpochTransaction: [
				{ $kind: 'Unknown', Unknown: true },
				{ $kind: 'AccumulatorRootCreate', AccumulatorRootCreate: true },
			],
		});
	});

	it('returns Unknown for a newer shared object mutability on both transports', async () => {
		const grpcTx = GrpcTransaction.clone(programmable);
		const grpcKind = grpcTx.kind!.data;
		if (grpcKind.oneofKind !== 'programmableTransaction') throw new Error('expected programmable');
		grpcKind.programmableTransaction.inputs[1].mutability = 99 as Input_Mutability;

		const json = GrpcTransaction.toJson(programmable) as {
			kind: { programmableTransaction: { inputs: Record<string, unknown>[] } };
		};
		json.kind.programmableTransaction.inputs[1].mutability = 'FUTURE_WRITE_MODE';

		const [fromGrpc, fromGraphQL] = await readBoth(grpcTx, json);
		expect(fromGraphQL).toEqual(fromGrpc);
		expect(fromGrpc.kind).toEqual({ $kind: 'Unknown', Unknown: true });
	});

	it('ignores newer fields inside a programmable transaction on both transports', async () => {
		const withCall = GrpcTransaction.clone(programmable);
		const data = withCall.kind!.data;
		if (data.oneofKind !== 'programmableTransaction') throw new Error('expected programmable');
		data.programmableTransaction.commands = [
			{
				command: {
					oneofKind: 'moveCall',
					moveCall: {
						package: address,
						module: 'm',
						function: 'f',
						typeArguments: [],
						arguments: [],
					},
				},
			},
		];
		const json = GrpcTransaction.toJson(withCall) as {
			kind: {
				programmableTransaction: {
					inputs: Record<string, unknown>[];
					commands: { moveCall: Record<string, unknown> }[];
				};
			};
		};
		json.kind.programmableTransaction.inputs[1].someNewerField = { nested: 'NEWER_VALUE' };
		json.kind.programmableTransaction.commands[0].moveCall.someNewerField = 'NEWER_VALUE';

		const [fromGrpc, fromGraphQL] = await readBoth(withCall, json);
		expect(fromGraphQL).toEqual(fromGrpc);
		expect(fromGrpc.kind.$kind).toBe('ProgrammableTransaction');
	});

	it('returns Unknown for a newer funds withdrawal source over GraphQL', async () => {
		const json = GrpcTransaction.toJson(programmable) as {
			kind: { programmableTransaction: { inputs: Record<string, unknown>[] } };
		};
		json.kind.programmableTransaction.inputs = [
			{
				kind: 'FUNDS_WITHDRAWAL',
				fundsWithdrawal: { amount: '1', coinType: '0x2::sui::SUI', source: 'FUTURE' },
			},
		];

		const [, fromGraphQL] = await readBoth(programmable, json);
		expect(fromGraphQL.kind).toEqual({ $kind: 'Unknown', Unknown: true });
	});

	it('returns null for a newer expiration kind on both transports', async () => {
		const grpcTx = GrpcTransaction.create({
			...programmable,
			expiration: { kind: 99 as ExpirationKind },
		});
		const json = {
			...(GrpcTransaction.toJson(programmable) as object),
			expiration: { kind: 'SOME_NEWER_EXPIRATION', someNewerField: 1 },
		};
		const [fromGrpc, fromGraphQL] = await readBoth(grpcTx, json);
		expect(fromGraphQL).toEqual(fromGrpc);
		expect(fromGrpc.expiration).toBeNull();
		expect(fromGrpc.kind.$kind).toBe('ProgrammableTransaction');
	});

	it('rejects missing requested transaction data', async () => {
		const { grpc, graphql } = transactionClients(responses(undefined));
		for (const client of [grpc, graphql]) {
			await expect(
				client.core.getTransaction({ digest, include: { transaction: true } }),
			).rejects.toThrow('Transaction data is required but missing');
		}
	});
});
