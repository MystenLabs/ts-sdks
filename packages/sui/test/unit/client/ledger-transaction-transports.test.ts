// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { GrpcTypes, SuiGrpcClient } from '../../../src/grpc/index.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { Input_InputKind, Input_Mutability } from '../../../src/grpc/proto/sui/rpc/v2/input.js';
import {
	EndOfEpochTransactionKind_Kind as EndOfEpochKind,
	Transaction as GrpcTransaction,
	TransactionExpiration_TransactionExpirationKind as ExpirationKind,
	TransactionKind_Kind as Kind,
} from '../../../src/grpc/proto/sui/rpc/v2/transaction.js';

const address = `0x${'11'.repeat(32)}`;
const digest = '11111111111111111111111111111111';

function transaction(kind: GrpcTransaction['kind']) {
	return GrpcTransaction.create({
		sender: address,
		gasPayment: {
			objects: [{ objectId: address, version: 3n, digest }],
			owner: address,
			price: 1000n,
			budget: 5000n,
		},
		expiration: { kind: ExpirationKind.EPOCH, epoch: 7n },
		kind,
	});
}

const programmable = transaction({
	kind: Kind.PROGRAMMABLE_TRANSACTION,
	data: {
		oneofKind: 'programmableTransaction',
		programmableTransaction: {
			inputs: [
				{ kind: Input_InputKind.PURE, pure: new Uint8Array([1]) },
				{
					kind: Input_InputKind.SHARED,
					objectId: '0xacc',
					version: 1n,
					mutable: false,
					mutability: Input_Mutability.NON_EXCLUSIVE_WRITE,
				},
			],
			commands: [],
		},
	},
});

const endOfEpoch = transaction({
	kind: Kind.END_OF_EPOCH,
	data: {
		oneofKind: 'endOfEpoch',
		endOfEpoch: {
			transactions: [
				{ kind: EndOfEpochKind.COIN_REGISTRY_CREATE, data: { oneofKind: undefined } },
				{
					kind: EndOfEpochKind.BRIDGE_STATE_CREATE,
					data: { oneofKind: 'bridgeChainId', bridgeChainId: '4c78adac' },
				},
			],
		},
	},
});

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

function clients(
	tx: GrpcTransaction | undefined,
	json: unknown = tx ? GrpcTransaction.toJson(tx) : undefined,
) {
	const grpc = new SuiGrpcClient({ network: 'localnet', baseUrl: 'http://localhost' });
	const grpcRequest = vi.fn(async () => ({
		response: {
			transaction: GrpcTypes.ExecutedTransaction.create({
				digest,
				checkpoint: 10n,
				transaction: tx,
				effects: { status: { success: true } },
			}),
		},
	}));
	grpc.ledgerService.getTransaction = grpcRequest as never;
	const graphql = new SuiGraphQLClient({ network: 'localnet', url: 'http://localhost' });
	const graphqlRequest = vi.fn(async () => ({
		data: {
			transaction: {
				digest,
				transactionJson: json,
				signatures: [],
				effects: { status: 'SUCCESS', checkpoint: { sequenceNumber: 10 } },
			},
		},
	}));
	graphql.query = graphqlRequest as never;
	return { grpc, graphql, grpcRequest, graphqlRequest };
}

async function readBoth(tx: GrpcTransaction | undefined, json?: unknown) {
	const { grpc, graphql } = clients(tx, json);
	return Promise.all(
		[grpc, graphql].map(async (client) => {
			const result = await client.core.getTransaction({
				digest,
				include: { transaction: true },
			});
			return result.Transaction!.transaction;
		}),
	);
}

describe('ledger transaction data across transports', () => {
	it('requests structured transaction data rather than BCS', async () => {
		const { grpc, graphql, grpcRequest, graphqlRequest } = clients(programmable);
		for (const client of [grpc, graphql]) {
			const result = await client.core.getTransaction({ digest, include: { transaction: true } });
			expect(result.Transaction?.bcs).toBeUndefined();
		}
		const [[grpcOptions]] = grpcRequest.mock.calls as unknown as [[{ readMask: { paths: [] } }]];
		expect(grpcOptions.readMask.paths).toEqual(
			expect.arrayContaining([
				'transaction.sender',
				'transaction.gas_payment',
				'transaction.expiration',
				'transaction.kind',
			]),
		);
		expect(grpcOptions.readMask.paths).not.toContain('transaction.bcs');
		expect(graphqlRequest).toHaveBeenCalledTimes(1);
		expect(graphqlRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				variables: expect.objectContaining({ includeTransaction: true, includeBcs: false }),
			}),
		);
	});

	it('maps programmable transactions identically, including shared object mutability', async () => {
		const [fromGrpc, fromGraphQL] = await readBoth(programmable);
		expect(fromGraphQL).toEqual(fromGrpc);
		expect(fromGrpc).toEqual({
			version: 2,
			sender: address,
			gasData: {
				owner: address,
				payment: [{ objectId: address, version: '3', digest }],
				price: '1000',
				budget: '5000',
			},
			expiration: { $kind: 'Epoch', Epoch: '7' },
			kind: {
				$kind: 'ProgrammableTransaction',
				ProgrammableTransaction: {
					inputs: [
						{ $kind: 'Pure', Pure: { bytes: 'AQ==' } },
						{
							$kind: 'Object',
							Object: {
								$kind: 'SharedObject',
								SharedObject: {
									objectId: `0x${'0'.repeat(61)}acc`,
									initialSharedVersion: '1',
									mutable: false,
									mutability: 'NonExclusiveWrite',
								},
							},
						},
					],
					commands: [],
				},
			},
		});
	});

	it('maps system transactions identically', async () => {
		const [fromGrpc, fromGraphQL] = await readBoth(endOfEpoch);
		expect(fromGraphQL).toEqual(fromGrpc);
		expect(fromGrpc.kind).toEqual({
			$kind: 'EndOfEpochTransaction',
			EndOfEpochTransaction: [
				{ $kind: 'CoinRegistryCreate', CoinRegistryCreate: true },
				{ $kind: 'BridgeStateCreate', BridgeStateCreate: { chainId: '4c78adac' } },
			],
		});
	});

	it('returns Unknown for a newer transaction kind on both transports', async () => {
		const [fromGrpc, fromGraphQL] = await readBoth(newerKind.grpc, newerKind.json);
		expect(fromGraphQL).toEqual(fromGrpc);
		expect(fromGrpc.kind).toEqual({ $kind: 'Unknown', Unknown: true });
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
		const { grpc, graphql } = clients(undefined);
		for (const client of [grpc, graphql]) {
			await expect(
				client.core.getTransaction({ digest, include: { transaction: true } }),
			).rejects.toThrow('Transaction data is required but missing');
		}
	});
});
