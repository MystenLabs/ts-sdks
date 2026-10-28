// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { parseTransactionEffectsBcs } from '../../../src/client/utils.js';
import { SuiGraphQLClient } from '../../../src/graphql/index.js';
import { parseTransactionEffects } from '../../../src/grpc/core.js';
import { GrpcTypes, SuiGrpcClient } from '../../../src/grpc/index.js';
import { UnchangedConsensusObject_UnchangedConsensusObjectKind as UnchangedKind } from '../../../src/grpc/proto/sui/rpc/v2/effects.js';
import { ExecutionError_ExecutionErrorKind as ErrorKind } from '../../../src/grpc/proto/sui/rpc/v2/execution_status.js';
import { normalizeSuiAddress } from '../../../src/utils/index.js';

const digest = '11111111111111111111111111111111';
const caller = normalizeSuiAddress('0xabc');
const sender = normalizeSuiAddress('0x5');
const eventType = `${normalizeSuiAddress('0x2')}::token::TokenPolicyCreated<${caller}::coin::C>`;

/** Both clients, each answering `getTransaction` with the given wire data. */
function clients(grpcTransaction: object, graphqlTransaction: object) {
	const grpc = new SuiGrpcClient({ network: 'localnet', baseUrl: 'http://localhost' });
	grpc.ledgerService.getTransaction = vi.fn(async () => ({
		response: {
			transaction: GrpcTypes.ExecutedTransaction.create({
				digest,
				checkpoint: 10n,
				transaction: { sender },
				...grpcTransaction,
			}),
		},
	})) as never;
	const graphql = new SuiGraphQLClient({ network: 'localnet', url: 'http://localhost' });
	graphql.query = vi.fn(async () => ({
		data: {
			transaction: { digest, sender: { address: sender }, signatures: [], ...graphqlTransaction },
		},
	})) as never;
	return [grpc, graphql] as const;
}

async function readBoth(grpcTransaction: object, graphqlTransaction: object, include = {}) {
	return Promise.all(
		clients(grpcTransaction, graphqlTransaction).map((client) =>
			client.core.getTransaction({ digest, include }),
		),
	);
}

function graphqlFailure(executionError: object) {
	return {
		effects: {
			status: 'FAILURE',
			checkpoint: { sequenceNumber: 10 },
			executionError: {
				abortCode: null,
				identifier: null,
				constant: null,
				sourceLineNumber: null,
				instructionOffset: null,
				module: null,
				function: null,
				...executionError,
			},
		},
	};
}

describe('transaction mappers across transports', () => {
	it('reports the sender, and 0x0 for a system transaction', async () => {
		const success = { effects: { status: { success: true } } };
		const graphqlSuccess = { effects: { status: 'SUCCESS', checkpoint: { sequenceNumber: 10 } } };
		const sent = await readBoth(success, graphqlSuccess);
		expect(sent.map((result) => result.Transaction!.sender)).toEqual([sender, sender]);

		// GraphQL reports no sender for system transactions; gRPC reports 0x0.
		const system = await readBoth(
			{ ...success, transaction: { sender: '0x0' } },
			{ ...graphqlSuccess, sender: null },
		);
		expect(system.map((result) => result.Transaction!.sender)).toEqual([
			normalizeSuiAddress('0x0'),
			normalizeSuiAddress('0x0'),
		]);
	});

	it('reads an event package and module from the call that emitted it, not from its type', async () => {
		const [fromGrpc, fromGraphQL] = await readBoth(
			{
				effects: { status: { success: true } },
				events: {
					events: [
						{
							packageId: caller,
							module: 'caller',
							sender,
							eventType,
							contents: { value: new Uint8Array([1]) },
						},
					],
				},
			},
			{
				effects: {
					status: 'SUCCESS',
					checkpoint: { sequenceNumber: 10 },
					events: {
						pageInfo: { hasNextPage: false },
						nodes: [
							{
								transactionModule: { name: 'caller', package: { address: '0xabc' } },
								sender: { address: sender },
								contents: { type: { repr: eventType }, bcs: 'AQ==', json: null },
							},
						],
					},
				},
			},
			{ events: true },
		);

		expect(fromGraphQL.Transaction!.events).toEqual(fromGrpc.Transaction!.events);
		expect(fromGrpc.Transaction!.events).toEqual([
			{
				packageId: caller,
				module: 'caller',
				sender,
				eventType,
				bcs: new Uint8Array([1]),
				json: null,
			},
		]);
	});

	it('reports the failing command of errors other than Move aborts', async () => {
		const [fromGrpc, fromGraphQL] = await readBoth(
			{
				effects: {
					status: {
						success: false,
						error: {
							description: 'InsufficientCoinBalance in command 5',
							command: 5n,
							kind: ErrorKind.INSUFFICIENT_COIN_BALANCE,
						},
					},
				},
			},
			graphqlFailure({ message: 'Error in 6th command, Insufficient coin balance for operation.' }),
		);

		const errors = [fromGrpc, fromGraphQL].map((result) => result.FailedTransaction!.status.error);
		for (const error of errors) {
			expect(error).toMatchObject({ $kind: 'Unknown', command: 5 });
		}
	});

	it('reports the same Move abort location, without the function index', async () => {
		const [fromGrpc, fromGraphQL] = await readBoth(
			{
				effects: {
					status: {
						success: false,
						error: {
							description: 'MoveAbort',
							command: 3n,
							kind: ErrorKind.MOVE_ABORT,
							errorDetails: {
								oneofKind: 'abort',
								abort: {
									abortCode: 0n,
									location: {
										package: caller,
										module: 'balance',
										function: 9,
										functionName: 'destroy_zero',
										instruction: 8,
									},
								},
							},
						},
					},
				},
			},
			graphqlFailure({
				message: 'Error in 4th command, abort code: 0',
				abortCode: '0',
				instructionOffset: 8,
				module: { name: 'balance', package: { address: caller } },
				function: { name: 'destroy_zero' },
			}),
		);

		const [grpcError, graphqlError] = [fromGrpc, fromGraphQL].map(
			(result) => result.FailedTransaction!.status.error,
		);
		expect(graphqlError).toEqual(grpcError);
		expect(grpcError).toMatchObject({
			command: 3,
			MoveAbort: {
				location: { package: caller, module: 'balance', functionName: 'destroy_zero' },
			},
		});
		expect(grpcError?.MoveAbort?.location).not.toHaveProperty('function');
	});
});

describe('unchanged consensus objects', () => {
	const perEpochConfig = normalizeSuiAddress('0x403');
	const cancelled = normalizeSuiAddress('0x6');

	it('report no version for unit kinds, from BCS and from gRPC alike', () => {
		const fromBcs = parseTransactionEffectsBcs(
			bcs.TransactionEffects.serialize({
				V2: {
					status: { Success: true },
					executedEpoch: 1n,
					gasUsed: {
						computationCost: 1n,
						storageCost: 1n,
						storageRebate: 0n,
						nonRefundableStorageFee: 0n,
					},
					transactionDigest: digest,
					gasObjectIndex: null,
					eventsDigest: null,
					dependencies: [],
					lamportVersion: 2n,
					changedObjects: [],
					unchangedConsensusObjects: [
						[perEpochConfig, { PerEpochConfig: true }],
						[cancelled, { Cancelled: 5n }],
					],
					auxDataDigest: null,
				},
			}).toBytes(),
		);
		const fromGrpc = parseTransactionEffects({
			effects: {
				status: { success: true },
				changedObjects: [],
				dependencies: [],
				unchangedLoadedRuntimeObjects: [],
				unchangedConsensusObjects: [
					{ kind: UnchangedKind.PER_EPOCH_CONFIG, objectId: perEpochConfig },
					{ kind: UnchangedKind.CANCELED, objectId: cancelled, version: 5n },
				],
			},
		});

		expect(fromBcs.unchangedConsensusObjects).toEqual([
			{ kind: 'PerEpochConfig', objectId: perEpochConfig, version: null, digest: null },
			{ kind: 'Cancelled', objectId: cancelled, version: '5', digest: null },
		]);
		expect(fromGrpc!.unchangedConsensusObjects).toEqual(fromBcs.unchangedConsensusObjects);
	});
});
