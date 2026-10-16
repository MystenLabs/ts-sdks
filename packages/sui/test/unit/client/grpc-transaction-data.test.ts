// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { gunzipSync } from 'node:zlib';

import { fromBase64, toHex } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { TypeTagSerializer } from '../../../src/bcs/type-tag-serializer.js';
import {
	grpcTransactionToLedgerTransactionData,
	parseTransactionDataBcs,
} from '../../../src/client/transaction-data.js';
import { grpcTransactionToTransactionData } from '../../../src/client/transaction-resolver.js';
import type { SuiClientTypes } from '../../../src/client/types.js';
import { Argument_ArgumentKind } from '../../../src/grpc/proto/sui/rpc/v2/argument.js';
import { Input_InputKind, Input_Mutability } from '../../../src/grpc/proto/sui/rpc/v2/input.js';
import { Owner_OwnerKind as OwnerKind } from '../../../src/grpc/proto/sui/rpc/v2/owner.js';
import type { PartialMessage } from '@protobuf-ts/runtime';
import {
	EndOfEpochTransactionKind_Kind as EndOfEpochKind,
	ExecutionTimeObservation_ExecutionTimeObservationKind as ObservationKind,
	Transaction as GrpcTransaction,
	TransactionExpiration_TransactionExpirationKind as ExpirationKind,
	TransactionKind_Kind as Kind,
} from '../../../src/grpc/proto/sui/rpc/v2/transaction.js';
import { normalizeStructTag, normalizeSuiAddress } from '../../../src/utils/sui-types.js';
import { GENESIS_TRANSACTION_GZIP_BASE64 } from '../bcs/fixtures/genesis-transaction.js';

type GrpcKind = NonNullable<PartialMessage<GrpcTransaction>['kind']>;
type BcsKind = typeof bcs.TransactionKind.$inferInput;

const address = `0x${'11'.repeat(32)}`;
const digest = '11111111111111111111111111111111';

const header = {
	sender: address,
	gasPayment: {
		objects: [{ objectId: address, version: 9007199254740993n, digest }],
		owner: address,
		price: 9007199254740994n,
		budget: 9007199254740995n,
	},
	expiration: { kind: ExpirationKind.NONE },
} satisfies PartialMessage<GrpcTransaction>;

function grpcTransaction(kind: GrpcKind) {
	return GrpcTransaction.create({ ...header, kind });
}

function bcsTransaction(kind: BcsKind) {
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

const prologue = {
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

const programmable = {
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

const cases: Record<
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
			],
		},
	},
};

describe('ledger transaction data from gRPC', () => {
	it.each(Object.entries(cases))('maps %s like the BCS decoder', (name, { grpc, bcs: kind }) => {
		const mapped = grpcTransactionToLedgerTransactionData(grpcTransaction(grpc));
		expect(mapped.kind.$kind).toBe(name);
		expect(mapped).toEqual(parseTransactionDataBcs(bcsTransaction(kind)));
	});

	it('maps genesis objects from their structured fields', () => {
		const genesisBytes = gunzipSync(fromBase64(GENESIS_TRANSACTION_GZIP_BASE64));
		const decoded = parseTransactionDataBcs(genesisBytes);
		if (decoded.kind.$kind !== 'Genesis') throw new Error('Expected genesis');
		const kinds = new Set<string>();
		// The RPC sends genesis objects without BCS, filling only the fields `Object` gets from
		// `MoveObject`/`MovePackage` and the owner.
		const objects = decoded.kind.Genesis.objects.map(({ RawObject: { data, owner } }) => {
			if (data.$kind === 'Package') {
				const pkg = data.Package;
				return {
					objectId: pkg.id,
					version: BigInt(pkg.version),
					owner: grpcOwner(owner),
					objectType: 'package',
					package: {
						modules: [...pkg.moduleMap].map(([name, contents]) => ({
							name,
							contents: new Uint8Array(contents),
						})),
						typeOrigins: pkg.typeOriginTable.map((origin) => ({
							moduleName: origin.moduleName,
							datatypeName: origin.datatypeName,
							packageId: origin.package,
						})),
						linkage: [...pkg.linkageTable].map(([originalId, info]) => ({
							originalId,
							upgradedId: info.upgradedId,
							upgradedVersion: BigInt(info.upgradedVersion),
						})),
					},
				};
			}
			kinds.add(data.Move.type.$kind);
			return {
				objectId: normalizeSuiAddress(toHex(new Uint8Array(data.Move.contents).slice(0, 32))),
				version: BigInt(data.Move.version),
				owner: grpcOwner(owner),
				objectType: moveObjectTypeString(data.Move.type),
				hasPublicTransfer: data.Move.hasPublicTransfer,
				contents: { value: new Uint8Array(data.Move.contents) },
			};
		});
		expect(kinds).toEqual(new Set(['GasCoin', 'StakedSui', 'Other']));
		const mapped = grpcTransactionToLedgerTransactionData(
			GrpcTransaction.create({
				sender: decoded.sender!,
				gasPayment: {
					objects: decoded.gasData.payment!.map((ref) => ({
						...ref,
						version: BigInt(ref.version),
					})),
					owner: decoded.gasData.owner!,
					price: BigInt(decoded.gasData.price!),
					budget: BigInt(decoded.gasData.budget!),
				},
				expiration: { kind: ExpirationKind.NONE },
				kind: { kind: Kind.GENESIS, data: { oneofKind: 'genesis', genesis: { objects } } },
			}),
		);
		expect(mapped).toEqual(decoded);
	});

	it('returns Unknown for a kind this SDK does not know, keeping the header', () => {
		const mapped = grpcTransactionToLedgerTransactionData(
			grpcTransaction({ kind: 99 as Kind, data: { oneofKind: undefined } }),
		);
		expect(mapped.kind).toEqual({ $kind: 'Unknown', Unknown: true });
		expect(mapped.sender).toBe(address);
		expect(mapped.gasData).toEqual({
			owner: address,
			payment: [{ objectId: address, version: '9007199254740993', digest }],
			price: '9007199254740994',
			budget: '9007199254740995',
		});
		expect(mapped.expiration).toEqual({ $kind: 'None', None: true });
	});

	it.each([
		['an unknown input', { kind: 99 as Input_InputKind }, programmable.grpc.commands],
		['an unknown shared object mutability', { ...programmable.grpc.inputs[1], mutability: 99 }, []],
		['an unknown command', programmable.grpc.inputs[0], [{ command: { oneofKind: undefined } }]],
	])('returns Unknown for a programmable transaction with %s', (_, input, commands) => {
		const tx = grpcTransaction({
			kind: Kind.PROGRAMMABLE_TRANSACTION,
			data: {
				oneofKind: 'programmableTransaction',
				programmableTransaction: { inputs: [input], commands } as never,
			},
		});
		const mapped = grpcTransactionToLedgerTransactionData(tx);
		expect(mapped.kind).toEqual({ $kind: 'Unknown', Unknown: true });
		expect(mapped.sender).toBe(address);
		// Building and resolving transactions stays strict.
		expect(() => grpcTransactionToTransactionData(tx)).toThrow();
	});

	it('returns Unknown for unknown end-of-epoch operations and keeps the others', () => {
		const mapped = grpcTransactionToLedgerTransactionData(
			grpcTransaction({
				kind: Kind.END_OF_EPOCH,
				data: {
					oneofKind: 'endOfEpoch',
					endOfEpoch: {
						transactions: [
							{ kind: EndOfEpochKind.COIN_REGISTRY_CREATE, data: { oneofKind: undefined } },
							{ kind: 99 as EndOfEpochKind, data: { oneofKind: undefined } },
							{
								kind: EndOfEpochKind.STORE_EXECUTION_TIME_OBSERVATIONS,
								data: {
									oneofKind: 'executionTimeObservations',
									executionTimeObservations: { version: 2, observations: [] },
								},
							},
						],
					},
				},
			}),
		);
		expect(mapped.kind).toEqual({
			$kind: 'EndOfEpochTransaction',
			EndOfEpochTransaction: [
				{ $kind: 'CoinRegistryCreate', CoinRegistryCreate: true },
				{ $kind: 'Unknown', Unknown: true },
				{ $kind: 'Unknown', Unknown: true },
			],
		});
	});

	it('returns Unknown for unknown consensus version assignments', () => {
		const mapped = grpcTransactionToLedgerTransactionData(
			grpcTransaction({
				kind: Kind.CONSENSUS_COMMIT_PROLOGUE_V4,
				data: {
					oneofKind: 'consensusCommitPrologue',
					consensusCommitPrologue: {
						...prologue,
						consensusDeterminedVersionAssignments: { version: 3, canceledTransactions: [] },
					},
				},
			}),
		);
		expect(mapped.kind).toEqual({ $kind: 'Unknown', Unknown: true });
	});

	it('maps an unknown expiration to null on reads but rejects it when resolving', () => {
		const tx = GrpcTransaction.create({
			...header,
			expiration: { kind: 99 as ExpirationKind },
			kind: cases.ProgrammableTransaction.grpc,
		});
		const mapped = grpcTransactionToLedgerTransactionData(tx);
		expect(mapped.expiration).toBeNull();
		expect(mapped.kind.$kind).toBe('ProgrammableTransaction');
		expect(() => grpcTransactionToTransactionData(tx)).toThrow(
			'Unknown transaction expiration kind: 99',
		);
	});

	it('maps shared object mutability for resolved transactions', () => {
		const { inputs } = grpcTransactionToTransactionData(
			grpcTransaction(cases.ProgrammableTransaction.grpc),
		);
		expect(inputs.slice(1)).toEqual([
			{
				$kind: 'Object',
				Object: {
					$kind: 'SharedObject',
					SharedObject: {
						objectId: address,
						initialSharedVersion: '1',
						mutable: false,
						mutability: 'NonExclusiveWrite',
					},
				},
			},
			{
				$kind: 'Object',
				Object: {
					$kind: 'SharedObject',
					SharedObject: { objectId: address, initialSharedVersion: '1', mutable: true },
				},
			},
		]);
	});
});

function grpcOwner(owner: typeof bcs.Owner.$inferType) {
	switch (owner.$kind) {
		case 'AddressOwner':
			return { kind: OwnerKind.ADDRESS, address: owner.AddressOwner };
		case 'ObjectOwner':
			return { kind: OwnerKind.OBJECT, address: owner.ObjectOwner };
		case 'Shared':
			return {
				kind: OwnerKind.SHARED,
				version: BigInt(owner.Shared.initialSharedVersion),
			};
		case 'Immutable':
			return { kind: OwnerKind.IMMUTABLE };
		default:
			throw new Error(`Unexpected genesis owner ${owner.$kind}`);
	}
}

function moveObjectTypeString(type: typeof bcs.MoveObjectType.$inferType): string {
	switch (type.$kind) {
		case 'GasCoin':
			return normalizeStructTag('0x2::coin::Coin<0x2::sui::SUI>');
		case 'StakedSui':
			return normalizeStructTag('0x3::staking_pool::StakedSui');
		case 'Coin':
			return normalizeStructTag(`0x2::coin::Coin<${TypeTagSerializer.tagToString(type.Coin)}>`);
		case 'Other':
			return normalizeStructTag(TypeTagSerializer.tagToString({ struct: type.Other }));
		default:
			throw new Error(`Unexpected genesis object type ${type.$kind}`);
	}
}
