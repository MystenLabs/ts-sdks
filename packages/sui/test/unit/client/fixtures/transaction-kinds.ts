// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PartialMessage } from '@protobuf-ts/runtime';

import { bcs } from '../../../../src/bcs/index.js';
import type { SuiClientTypes } from '../../../../src/client/types.js';
import { Argument_ArgumentKind } from '../../../../src/grpc/proto/sui/rpc/v2/argument.js';
import { Input_InputKind, Input_Mutability } from '../../../../src/grpc/proto/sui/rpc/v2/input.js';
import {
	EndOfEpochTransactionKind_Kind as EndOfEpochKind,
	ExecutionTimeObservation_ExecutionTimeObservationKind as ObservationKind,
	Transaction as GrpcTransaction,
	TransactionExpiration_TransactionExpirationKind as ExpirationKind,
	TransactionKind_Kind as Kind,
} from '../../../../src/grpc/proto/sui/rpc/v2/transaction.js';

export type GrpcKind = NonNullable<PartialMessage<GrpcTransaction>['kind']>;
export type BcsKind = typeof bcs.TransactionKind.$inferInput;

export const address = `0x${'11'.repeat(32)}`;
export const digest = '11111111111111111111111111111111';

export const header = {
	sender: address,
	gasPayment: {
		objects: [{ objectId: address, version: 9007199254740993n, digest }],
		owner: address,
		price: 9007199254740994n,
		budget: 9007199254740995n,
	},
	expiration: { kind: ExpirationKind.NONE },
} satisfies PartialMessage<GrpcTransaction>;

export function grpcTransaction(kind: GrpcKind) {
	return GrpcTransaction.create({ ...header, kind });
}

export function bcsTransaction(kind: BcsKind) {
	return bcs.TransactionData.serialize({
		V1: {
			sender: address,
			gasData: {
				owner: address,
				payment: [{ objectId: address, version: '9007199254740993', digest }],
				price: '9007199254740994',
				budget: '9007199254740995',
			},
			expiration: { None: true },
			kind,
		},
	}).toBytes();
}

const changeEpoch = {
	grpc: {
		epoch: 5n,
		protocolVersion: 100n,
		storageCharge: 11n,
		computationCharge: 12n,
		storageRebate: 13n,
		nonRefundableStorageFee: 14n,
		epochStartTimestamp: { seconds: 1n, nanos: 15_000_000 },
		systemPackages: [
			{ version: 9n, modules: [new Uint8Array([1, 2, 3])], dependencies: [address] },
		],
	},
	bcs: {
		epoch: '5',
		protocolVersion: '100',
		storageCharge: '11',
		computationCharge: '12',
		storageRebate: '13',
		nonRefundableStorageFee: '14',
		epochStartTimestampMs: '1015',
		systemPackages: [['9', [new Uint8Array([1, 2, 3])], [address]]] as [
			string,
			Uint8Array[],
			string[],
		][],
	},
};

export const prologue = {
	epoch: 5n,
	round: 7n,
	commitTimestamp: { seconds: 1n, nanos: 234_000_000 },
	consensusCommitDigest: digest,
	subDagIndex: 2n,
	additionalStateDigest: digest,
};
const bcsPrologue = { epoch: '5', round: '7', commitTimestampMs: '1234' };
const bcsPrologueV3 = {
	...bcsPrologue,
	consensusCommitDigest: digest,
	subDagIndex: '2',
	consensusDeterminedVersionAssignments: {
		CancelledTransactionsV2: [[digest, [[[address, '3'], '10']]]] as [
			string,
			[[string, string], string][],
		][],
	},
};
const grpcAssignments = {
	version: 2,
	canceledTransactions: [
		{ digest, versionAssignments: [{ objectId: address, startVersion: 3n, version: 10n }] },
	],
};

export const programmable = {
	grpc: {
		inputs: [
			{ kind: Input_InputKind.PURE, pure: new Uint8Array([1]) },
			{
				kind: Input_InputKind.SHARED,
				objectId: address,
				version: 1n,
				mutable: false,
				mutability: Input_Mutability.NON_EXCLUSIVE_WRITE,
			},
			{
				kind: Input_InputKind.SHARED,
				objectId: address,
				version: 1n,
				mutable: true,
				mutability: Input_Mutability.MUTABLE,
			},
		],
		commands: [
			{
				command: {
					oneofKind: 'moveCall' as const,
					moveCall: {
						package: address,
						module: 'example',
						function: 'run',
						typeArguments: ['u64'],
						arguments: [
							{ kind: Argument_ArgumentKind.INPUT, input: 0 },
							{ kind: Argument_ArgumentKind.GAS },
						],
					},
				},
			},
		],
	},
	bcs: {
		inputs: [
			{ Pure: { bytes: 'AQ==' } },
			{
				Object: {
					SharedObject: {
						objectId: address,
						initialSharedVersion: '1',
						mutable: false,
						mutability: 'NonExclusiveWrite' as const,
					},
				},
			},
			{ Object: { SharedObject: { objectId: address, initialSharedVersion: '1', mutable: true } } },
		],
		commands: [
			{
				MoveCall: {
					package: address,
					module: 'example',
					function: 'run',
					typeArguments: ['u64'],
					arguments: [{ Input: 0 }, { GasCoin: true }],
				},
			},
		],
	},
};

/** Every known transaction kind, as gRPC sends it and as BCS encodes it. */
export const cases: Record<
	Exclude<SuiClientTypes.TransactionKind['$kind'], 'Unknown'>,
	{ grpc: GrpcKind; bcs: BcsKind }
> = {
	ProgrammableTransaction: {
		grpc: {
			kind: Kind.PROGRAMMABLE_TRANSACTION,
			data: { oneofKind: 'programmableTransaction', programmableTransaction: programmable.grpc },
		},
		bcs: { ProgrammableTransaction: programmable.bcs },
	},
	ProgrammableSystemTransaction: {
		grpc: {
			kind: Kind.PROGRAMMABLE_SYSTEM_TRANSACTION,
			data: { oneofKind: 'programmableTransaction', programmableTransaction: programmable.grpc },
		},
		bcs: { ProgrammableSystemTransaction: programmable.bcs },
	},
	ChangeEpoch: {
		grpc: {
			kind: Kind.CHANGE_EPOCH,
			data: { oneofKind: 'changeEpoch', changeEpoch: changeEpoch.grpc },
		},
		bcs: { ChangeEpoch: changeEpoch.bcs },
	},
	Genesis: {
		grpc: { kind: Kind.GENESIS, data: { oneofKind: 'genesis', genesis: { objects: [] } } },
		bcs: { Genesis: { objects: [] } },
	},
	ConsensusCommitPrologue: {
		grpc: {
			kind: Kind.CONSENSUS_COMMIT_PROLOGUE_V1,
			data: { oneofKind: 'consensusCommitPrologue', consensusCommitPrologue: prologue },
		},
		bcs: { ConsensusCommitPrologue: bcsPrologue },
	},
	ConsensusCommitPrologueV2: {
		grpc: {
			kind: Kind.CONSENSUS_COMMIT_PROLOGUE_V2,
			data: { oneofKind: 'consensusCommitPrologue', consensusCommitPrologue: prologue },
		},
		bcs: { ConsensusCommitPrologueV2: { ...bcsPrologue, consensusCommitDigest: digest } },
	},
	ConsensusCommitPrologueV3: {
		grpc: {
			kind: Kind.CONSENSUS_COMMIT_PROLOGUE_V3,
			data: {
				oneofKind: 'consensusCommitPrologue',
				consensusCommitPrologue: {
					...prologue,
					consensusDeterminedVersionAssignments: {
						version: 1,
						canceledTransactions: [
							{ digest, versionAssignments: [{ objectId: address, version: 10n }] },
						],
					},
				},
			},
		},
		bcs: {
			ConsensusCommitPrologueV3: {
				...bcsPrologueV3,
				consensusDeterminedVersionAssignments: {
					CancelledTransactions: [[digest, [[address, '10']]]],
				},
			},
		},
	},
	ConsensusCommitPrologueV4: {
		grpc: {
			kind: Kind.CONSENSUS_COMMIT_PROLOGUE_V4,
			data: {
				oneofKind: 'consensusCommitPrologue',
				consensusCommitPrologue: {
					...prologue,
					consensusDeterminedVersionAssignments: grpcAssignments,
				},
			},
		},
		bcs: { ConsensusCommitPrologueV4: { ...bcsPrologueV3, additionalStateDigest: digest } },
	},
	AuthenticatorStateUpdate: {
		grpc: {
			kind: Kind.AUTHENTICATOR_STATE_UPDATE,
			data: {
				oneofKind: 'authenticatorStateUpdate',
				authenticatorStateUpdate: {
					epoch: 5n,
					round: 7n,
					newActiveJwks: [
						{
							id: { iss: 'issuer', kid: 'key' },
							jwk: { kty: 'RSA', e: 'AQAB', n: 'modulus', alg: 'RS256' },
							epoch: 5n,
						},
					],
					authenticatorObjectInitialSharedVersion: 1n,
				},
			},
		},
		bcs: {
			AuthenticatorStateUpdate: {
				epoch: '5',
				round: '7',
				newActiveJwks: [
					{
						jwkId: { iss: 'issuer', kid: 'key' },
						jwk: { kty: 'RSA', e: 'AQAB', n: 'modulus', alg: 'RS256' },
						epoch: '5',
					},
				],
				authenticatorObjInitialSharedVersion: '1',
			},
		},
	},
	RandomnessStateUpdate: {
		grpc: {
			kind: Kind.RANDOMNESS_STATE_UPDATE,
			data: {
				oneofKind: 'randomnessStateUpdate',
				randomnessStateUpdate: {
					epoch: 5n,
					randomnessRound: 8n,
					randomBytes: new Uint8Array([1, 2, 3]),
					randomnessObjectInitialSharedVersion: 2n,
				},
			},
		},
		bcs: {
			RandomnessStateUpdate: {
				epoch: '5',
				randomnessRound: '8',
				randomBytes: new Uint8Array([1, 2, 3]),
				randomnessObjInitialSharedVersion: '2',
			},
		},
	},
	EndOfEpochTransaction: {
		grpc: {
			kind: Kind.END_OF_EPOCH,
			data: {
				oneofKind: 'endOfEpoch',
				endOfEpoch: {
					transactions: [
						{
							kind: EndOfEpochKind.CHANGE_EPOCH,
							data: { oneofKind: 'changeEpoch', changeEpoch: changeEpoch.grpc },
						},
						{ kind: EndOfEpochKind.AUTHENTICATOR_STATE_CREATE, data: { oneofKind: undefined } },
						{
							kind: EndOfEpochKind.AUTHENTICATOR_STATE_EXPIRE,
							data: {
								oneofKind: 'authenticatorStateExpire',
								authenticatorStateExpire: {
									minEpoch: 3n,
									authenticatorObjectInitialSharedVersion: 1n,
								},
							},
						},
						{ kind: EndOfEpochKind.RANDOMNESS_STATE_CREATE, data: { oneofKind: undefined } },
						{ kind: EndOfEpochKind.DENY_LIST_STATE_CREATE, data: { oneofKind: undefined } },
						{
							kind: EndOfEpochKind.BRIDGE_STATE_CREATE,
							// The RPC APIs report the first 4 bytes of the chain identifier digest.
							data: { oneofKind: 'bridgeChainId', bridgeChainId: '00000000' },
						},
						{
							kind: EndOfEpochKind.BRIDGE_COMMITTEE_INIT,
							data: { oneofKind: 'bridgeObjectVersion', bridgeObjectVersion: 5n },
						},
						{
							kind: EndOfEpochKind.STORE_EXECUTION_TIME_OBSERVATIONS,
							data: {
								oneofKind: 'executionTimeObservations',
								executionTimeObservations: {
									version: 1,
									observations: [
										{
											kind: ObservationKind.MOVE_ENTRY_POINT,
											moveEntryPoint: {
												package: address,
												module: 'example',
												function: 'run',
												typeArguments: ['u64'],
												arguments: [],
											},
											validatorObservations: [
												{
													validator: new Uint8Array([4, 5]),
													duration: { seconds: 6n, nanos: 7 },
												},
											],
										},
										{ kind: ObservationKind.TRANSFER_OBJECTS, validatorObservations: [] },
									],
								},
							},
						},
						{ kind: EndOfEpochKind.ACCUMULATOR_ROOT_CREATE, data: { oneofKind: undefined } },
						{ kind: EndOfEpochKind.COIN_REGISTRY_CREATE, data: { oneofKind: undefined } },
						{ kind: EndOfEpochKind.DISPLAY_REGISTRY_CREATE, data: { oneofKind: undefined } },
						{ kind: EndOfEpochKind.ADDRESS_ALIAS_STATE_CREATE, data: { oneofKind: undefined } },
						{
							kind: EndOfEpochKind.WRITE_ACCUMULATOR_STORAGE_COST,
							data: { oneofKind: 'storageCost', storageCost: 123n },
						},
						{
							kind: EndOfEpochKind.FORWARDING_ADDRESS_REGISTRY_CREATE,
							data: { oneofKind: undefined },
						},
					],
				},
			},
		},
		bcs: {
			EndOfEpochTransaction: [
				{ ChangeEpoch: changeEpoch.bcs },
				{ AuthenticatorStateCreate: true },
				{ AuthenticatorStateExpire: { minEpoch: '3', authenticatorObjInitialSharedVersion: '1' } },
				{ RandomnessStateCreate: true },
				{ DenyListStateCreate: true },
				{ BridgeStateCreate: digest },
				{ BridgeCommitteeInit: '5' },
				{
					StoreExecutionTimeObservations: {
						V1: [
							[
								{
									MoveEntryPoint: {
										package: address,
										module: 'example',
										function: 'run',
										typeArguments: ['u64'],
									},
								},
								[[new Uint8Array([4, 5]), { secs: '6', nanos: 7 }]],
							],
							[{ TransferObjects: true }, []],
						],
					},
				},
				{ AccumulatorRootCreate: true },
				{ CoinRegistryCreate: true },
				{ DisplayRegistryCreate: true },
				{ AddressAliasStateCreate: true },
				{ WriteAccumulatorStorageCost: { storageCost: '123' } },
				{ ForwardingAddressRegistryCreate: true },
			],
		},
	},
};
