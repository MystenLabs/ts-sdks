// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { parseTransactionEffectsBcs } from '../../../src/client/utils.js';
import { parseTransactionEffects } from '../../../src/grpc/core.js';
import { UnchangedConsensusObject_UnchangedConsensusObjectKind as UnchangedKind } from '../../../src/grpc/proto/sui/rpc/v2/effects.js';
import {
	CommandArgumentError_CommandArgumentErrorKind as CommandArgumentKind,
	ExecutionError_ExecutionErrorKind as ErrorKind,
	PackageUpgradeError_PackageUpgradeErrorKind as UpgradeKind,
	TypeArgumentError_TypeArgumentErrorKind as TypeArgumentKind,
} from '../../../src/grpc/proto/sui/rpc/v2/execution_status.js';
import { normalizeSuiAddress } from '../../../src/utils/index.js';
import { readFromBoth } from './fixtures/transaction-clients.js';
import { digest } from './fixtures/transaction-kinds.js';

const caller = normalizeSuiAddress('0xabc');
const sender = normalizeSuiAddress('0x5');
const eventType = `${normalizeSuiAddress('0x2')}::token::TokenPolicyCreated<${caller}::coin::C>`;

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
	it('reads an event package and module from the call that emitted it, not from its type', async () => {
		const [fromGrpc, fromGraphQL] = await readFromBoth(
			{
				grpc: {
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
				graphql: {
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
		const [fromGrpc, fromGraphQL] = await readFromBoth({
			grpc: {
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
			graphql: graphqlFailure({
				message: 'Error in 6th command, Insufficient coin balance for operation.',
			}),
		});

		const errors = [fromGrpc, fromGraphQL].map((result) => result.FailedTransaction!.status.error);
		for (const error of errors) {
			expect(error).toMatchObject({ $kind: 'Unknown', command: 5 });
		}
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

describe('execution error names', () => {
	const objectId = normalizeSuiAddress('0x7');
	const errors = [
		{
			name: 'ObjectTooBig',

			bcs: { MoveObjectTooBig: { objectSize: 10n, maxObjectSize: 5n } },
			grpc: {
				kind: ErrorKind.OBJECT_TOO_BIG,
				errorDetails: { oneofKind: 'sizeError', sizeError: { size: 10n, maxSize: 5n } },
			},
		},
		{
			name: 'EffectsTooLarge',

			bcs: { EffectsTooLarge: { currentSize: 10n, maxSize: 5n } },
			grpc: {
				kind: ErrorKind.EFFECTS_TOO_LARGE,
				errorDetails: { oneofKind: 'sizeError', sizeError: { size: 10n, maxSize: 5n } },
			},
		},
		{
			name: 'TypeArgumentError',

			bcs: { TypeArgumentError: { argumentIdx: 1, kind: { ConstraintNotSatisfied: true } } },
			grpc: {
				kind: ErrorKind.TYPE_ARGUMENT_ERROR,
				errorDetails: {
					oneofKind: 'typeArgumentError',
					typeArgumentError: { typeArgument: 1, kind: TypeArgumentKind.CONSTRAINT_NOT_SATISFIED },
				},
			},
		},
		{
			name: 'PackageUpgradeError',

			bcs: { PackageUpgradeError: { upgradeError: { IncompatibleUpgrade: true } } },
			grpc: {
				kind: ErrorKind.PACKAGE_UPGRADE_ERROR,
				errorDetails: {
					oneofKind: 'packageUpgradeError',
					packageUpgradeError: { kind: UpgradeKind.INCOMPATIBLE_UPGRADE },
				},
			},
		},
		{
			name: 'CoinTypeGlobalPause',

			bcs: { CoinTypeGlobalPause: { coinType: '0x2::sui::SUI' } },
			grpc: {
				kind: ErrorKind.COIN_TYPE_GLOBAL_PAUSE,
				errorDetails: {
					oneofKind: 'coinDenyListError',
					coinDenyListError: { coinType: '0x2::sui::SUI' },
				},
			},
		},
		{
			name: 'CongestedObjects',

			bcs: { ExecutionCancelledDueToSharedObjectCongestion: { congested_objects: [objectId] } },
			grpc: {
				kind: ErrorKind.EXECUTION_CANCELED_DUE_TO_CONSENSUS_OBJECT_CONGESTION,
				errorDetails: { oneofKind: 'congestedObjects', congestedObjects: { objects: [objectId] } },
			},
		},
		{
			name: 'CircularObjectOwnership',

			bcs: { CircularObjectOwnership: { object: objectId } },
			grpc: {
				kind: ErrorKind.CIRCULAR_OBJECT_OWNERSHIP,
				errorDetails: { oneofKind: 'objectId', objectId },
			},
		},
		{
			name: 'InvalidBcsBytes',
			bcs: { CommandArgumentError: { argIdx: 1, kind: { InvalidBCSBytes: true } } },
			grpc: {
				kind: ErrorKind.COMMAND_ARGUMENT_ERROR,
				errorDetails: {
					oneofKind: 'commandArgumentError',
					commandArgumentError: { argument: 1, kind: CommandArgumentKind.INVALID_BCS_BYTES },
				},
			},
		},
		{
			name: 'InvalidUsageOfPureArgument',
			bcs: { CommandArgumentError: { argIdx: 1, kind: { InvalidUsageOfPureArg: true } } },
			grpc: {
				kind: ErrorKind.COMMAND_ARGUMENT_ERROR,
				errorDetails: {
					oneofKind: 'commandArgumentError',
					commandArgumentError: {
						argument: 1,
						kind: CommandArgumentKind.INVALID_USAGE_OF_PURE_ARGUMENT,
					},
				},
			},
		},
		{
			name: 'ConsensusObjectOperationNotAllowed',
			bcs: { CommandArgumentError: { argIdx: 1, kind: { SharedObjectOperationNotAllowed: true } } },
			grpc: {
				kind: ErrorKind.COMMAND_ARGUMENT_ERROR,
				errorDetails: {
					oneofKind: 'commandArgumentError',
					commandArgumentError: {
						argument: 1,
						kind: CommandArgumentKind.CONSENSUS_OBJECT_OPERATION_NOT_ALLOWED,
					},
				},
			},
		},
		{
			name: 'PackageIdDoesNotMatch',
			bcs: {
				PackageUpgradeError: {
					upgradeError: { PackageIDDoesNotMatch: { packageId: objectId, ticketId: objectId } },
				},
			},
			grpc: {
				kind: ErrorKind.PACKAGE_UPGRADE_ERROR,
				errorDetails: {
					oneofKind: 'packageUpgradeError',
					packageUpgradeError: { kind: UpgradeKind.PACKAGE_ID_DOES_NOT_MATCH },
				},
			},
		},
	];

	it.each(errors)('match BCS from gRPC for $name', ({ bcs: error, grpc }) => {
		const fromBcs = parseTransactionEffectsBcs(
			bcs.TransactionEffects.serialize({
				V2: {
					status: { Failure: { error: error as never, command: null } },
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
					unchangedConsensusObjects: [],
					auxDataDigest: null,
				},
			}).toBytes(),
		);
		const fromGrpc = parseTransactionEffects({
			effects: {
				status: { success: false, error: grpc as never },
				changedObjects: [],
				dependencies: [],
				unchangedLoadedRuntimeObjects: [],
				unchangedConsensusObjects: [],
			},
		});

		const { message: _bcsMessage, ...expected } = fromBcs.status.error!;
		const { message: _grpcMessage, ...actual } = fromGrpc!.status.error!;
		expect(actual).toEqual(expected);
	});
});
