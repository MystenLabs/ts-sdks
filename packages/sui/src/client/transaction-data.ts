// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58, toHex } from '@mysten/bcs';

import { bcs } from '../bcs/index.js';
import { TypeTagSerializer } from '../bcs/type-tag-serializer.js';
import type { StructTag, TypeTag } from '../bcs/types.js';
import type { Object as GrpcObject } from '../grpc/proto/sui/rpc/v2/object.js';
import type { Owner as GrpcOwner } from '../grpc/proto/sui/rpc/v2/owner.js';
import { Owner_OwnerKind } from '../grpc/proto/sui/rpc/v2/owner.js';
import type {
	ConsensusCommitPrologue as GrpcConsensusCommitPrologue,
	ChangeEpoch as GrpcChangeEpoch,
	EndOfEpochTransactionKind as GrpcEndOfEpochTransactionKind,
	ExecutionTimeObservations as GrpcExecutionTimeObservations,
	ExecutionTimeObservation as GrpcExecutionTimeObservation,
	Transaction as GrpcTransaction,
	TransactionKind as GrpcTransactionKind,
} from '../grpc/proto/sui/rpc/v2/transaction.js';
import {
	EndOfEpochTransactionKind_Kind,
	ExecutionTimeObservation_ExecutionTimeObservationKind,
	TransactionKind_Kind,
} from '../grpc/proto/sui/rpc/v2/transaction.js';
import { TransactionDataBuilder } from '../transactions/TransactionData.js';
import type { TransactionData as BuilderTransactionData } from '../transactions/data/internal.js';
import { normalizeSuiAddress } from '../utils/sui-types.js';
import {
	grpcCommandToTsCommand,
	grpcInputToCallArg,
	grpcTimestampToMilliseconds,
	grpcTransactionHeader,
} from './transaction-resolver.js';
import type { SuiClientTypes } from './types.js';

type TransactionKind = SuiClientTypes.TransactionKind;
type EndOfEpochTransactionKind = SuiClientTypes.EndOfEpochTransactionKind;
type TransactionHeader = Omit<SuiClientTypes.TransactionData, 'kind'>;
/** A header as the builder types it, before `normalizeProgrammable` settles `null`s. */
type HeaderInput = Omit<BuilderTransactionData, 'inputs' | 'commands' | 'digest'>;

const UNKNOWN_KIND = { $kind: 'Unknown', Unknown: true } as const;

/**
 * Decode ledger transaction data from BCS, normalizing the inputs and commands of programmable
 * kinds.
 *
 * This is strict: BCS is not self-describing, so bytes that use a transaction kind or a nested
 * variant this SDK version does not know cannot be decoded and throw. Client reads with
 * `include: { transaction: true }` map the transports' structured data instead, and return
 * `Unknown` kinds rather than failing.
 */
export function parseTransactionDataBcs(bytes: Uint8Array): SuiClientTypes.TransactionData {
	const data = bcs.TransactionData.parse(bytes).V1;
	const programmable = data.kind.ProgrammableTransaction ?? data.kind.ProgrammableSystemTransaction;
	const { kind: body, ...header } = normalizeProgrammable(
		{ version: 2, sender: data.sender, gasData: data.gasData, expiration: data.expiration },
		programmable ?? { inputs: [], commands: [] },
	);

	let kind: TransactionKind;
	switch (data.kind.$kind) {
		case 'ProgrammableTransaction':
			kind = { $kind: 'ProgrammableTransaction', ProgrammableTransaction: body };
			break;
		case 'ProgrammableSystemTransaction':
			kind = { $kind: 'ProgrammableSystemTransaction', ProgrammableSystemTransaction: body };
			break;
		case 'EndOfEpochTransaction':
			kind = {
				$kind: 'EndOfEpochTransaction',
				EndOfEpochTransaction: data.kind.EndOfEpochTransaction.map(
					(entry): EndOfEpochTransactionKind =>
						entry.$kind === 'BridgeStateCreate'
							? {
									$kind: 'BridgeStateCreate',
									BridgeStateCreate: {
										// Match the chain identifier the RPC APIs report.
										chainId: toHex(fromBase58(entry.BridgeStateCreate).slice(0, 4)),
									},
								}
							: entry,
				),
			};
			break;
		default:
			kind = data.kind;
	}

	return { ...header, kind };
}

/**
 * Map a gRPC `Transaction` (read with the `sender`, `gas_payment`, `expiration` and `kind`
 * fields, or decoded from the gRPC JSON GraphQL returns as `transactionJson`) to ledger
 * transaction data.
 *
 * Kinds, end-of-epoch operations, inputs or commands this SDK version cannot map yield an
 * `Unknown` kind (or end-of-epoch operation) and keep the sender, gas data and expiration. An
 * expiration kind this SDK does not know maps to `null`.
 */
export function grpcTransactionToLedgerTransactionData(
	grpcTx: GrpcTransaction,
): SuiClientTypes.TransactionData {
	const header = normalizeHeader(grpcTransactionHeader(grpcTx, { strict: false }));

	let kind: TransactionKind;
	try {
		kind = grpcKindToTransactionKind(grpcTx.kind, header);
	} catch {
		kind = UNKNOWN_KIND;
	}

	return { ...header, kind };
}

function normalizeHeader(header: HeaderInput): TransactionHeader {
	const { kind: _, ...normalized } = normalizeProgrammable(header, { inputs: [], commands: [] });
	return normalized;
}

// Round-trip through TransactionDataBuilder so inputs and commands are validated and normalized to
// the same shape as `TransactionDataBuilder` snapshots of transactions built with the SDK.
function normalizeProgrammable(
	header: HeaderInput,
	body: { inputs: unknown[]; commands: unknown[] },
): TransactionHeader & { kind: SuiClientTypes.ProgrammableTransaction } {
	const { version, sender, gasData, expiration, inputs, commands } = TransactionDataBuilder.restore(
		{ ...header, ...body } as Parameters<typeof TransactionDataBuilder.restore>[0],
	).snapshot();
	return {
		version,
		sender: sender ?? null,
		gasData,
		expiration: expiration ?? null,
		kind: { inputs: inputs.map(resolvedInput), commands: commands.map(resolvedCommand) },
	};
}

// Ledger data only holds resolved inputs and plain commands; the builder-only variants mean the
// data was not what this mapper expects.
function resolvedInput(
	input: ReturnType<TransactionDataBuilder['snapshot']>['inputs'][number],
): SuiClientTypes.TransactionInput {
	if (input.$kind === 'UnresolvedPure' || input.$kind === 'UnresolvedObject') {
		throw new Error(`Unexpected ${input.$kind} input in ledger transaction data`);
	}
	return input;
}

function resolvedCommand(
	command: ReturnType<TransactionDataBuilder['snapshot']>['commands'][number],
): SuiClientTypes.TransactionCommand {
	if (command.$kind === '$Intent') {
		throw new Error('Unexpected $Intent command in ledger transaction data');
	}
	return command;
}

function grpcKindToTransactionKind(
	grpcKind: GrpcTransactionKind | undefined,
	header: TransactionHeader,
): TransactionKind {
	const data = grpcKind?.data;

	switch (grpcKind?.kind) {
		case TransactionKind_Kind.PROGRAMMABLE_TRANSACTION:
		case TransactionKind_Kind.PROGRAMMABLE_SYSTEM_TRANSACTION: {
			if (data?.oneofKind !== 'programmableTransaction') {
				return UNKNOWN_KIND;
			}
			const { kind: body } = normalizeProgrammable(header, {
				inputs: data.programmableTransaction.inputs.map(grpcInputToCallArg),
				commands: data.programmableTransaction.commands.map(grpcCommandToTsCommand),
			});
			return grpcKind.kind === TransactionKind_Kind.PROGRAMMABLE_TRANSACTION
				? { $kind: 'ProgrammableTransaction', ProgrammableTransaction: body }
				: { $kind: 'ProgrammableSystemTransaction', ProgrammableSystemTransaction: body };
		}
		case TransactionKind_Kind.CHANGE_EPOCH:
			if (data?.oneofKind !== 'changeEpoch') return UNKNOWN_KIND;
			return { $kind: 'ChangeEpoch', ChangeEpoch: grpcChangeEpoch(data.changeEpoch) };
		case TransactionKind_Kind.GENESIS:
			if (data?.oneofKind !== 'genesis') return UNKNOWN_KIND;
			return {
				$kind: 'Genesis',
				Genesis: {
					objects: data.genesis.objects.map(grpcGenesisObject),
				},
			};
		case TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V1:
		case TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V2:
		case TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V3:
		case TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V4:
			if (data?.oneofKind !== 'consensusCommitPrologue') return UNKNOWN_KIND;
			return grpcConsensusCommitPrologue(grpcKind.kind, data.consensusCommitPrologue);
		case TransactionKind_Kind.AUTHENTICATOR_STATE_UPDATE: {
			if (data?.oneofKind !== 'authenticatorStateUpdate') return UNKNOWN_KIND;
			const update = data.authenticatorStateUpdate;
			return {
				$kind: 'AuthenticatorStateUpdate',
				AuthenticatorStateUpdate: {
					epoch: u64(update.epoch, 'epoch'),
					round: u64(update.round, 'round'),
					newActiveJwks: update.newActiveJwks.map((jwk) => ({
						jwkId: {
							iss: required(jwk.id?.iss, 'jwk id iss'),
							kid: required(jwk.id?.kid, 'jwk id kid'),
						},
						jwk: {
							kty: required(jwk.jwk?.kty, 'jwk kty'),
							e: required(jwk.jwk?.e, 'jwk e'),
							n: required(jwk.jwk?.n, 'jwk n'),
							alg: required(jwk.jwk?.alg, 'jwk alg'),
						},
						epoch: u64(jwk.epoch, 'jwk epoch'),
					})),
					authenticatorObjInitialSharedVersion: u64(
						update.authenticatorObjectInitialSharedVersion,
						'authenticator object initial shared version',
					),
				},
			};
		}
		case TransactionKind_Kind.END_OF_EPOCH:
			if (data?.oneofKind !== 'endOfEpoch') return UNKNOWN_KIND;
			return {
				$kind: 'EndOfEpochTransaction',
				EndOfEpochTransaction: data.endOfEpoch.transactions.map(grpcEndOfEpochTransactionKind),
			};
		case TransactionKind_Kind.RANDOMNESS_STATE_UPDATE: {
			if (data?.oneofKind !== 'randomnessStateUpdate') return UNKNOWN_KIND;
			const update = data.randomnessStateUpdate;
			return {
				$kind: 'RandomnessStateUpdate',
				RandomnessStateUpdate: {
					epoch: u64(update.epoch, 'epoch'),
					randomnessRound: u64(update.randomnessRound, 'randomness round'),
					randomBytes: required(update.randomBytes, 'random bytes'),
					randomnessObjInitialSharedVersion: u64(
						update.randomnessObjectInitialSharedVersion,
						'randomness object initial shared version',
					),
				},
			};
		}
		default:
			return UNKNOWN_KIND;
	}
}

const SUI_FRAMEWORK = normalizeSuiAddress('0x2');
const SUI_SYSTEM = normalizeSuiAddress('0x3');

/**
 * Genesis objects are not sent with their BCS: the RPC fills the owner, ID, version, type,
 * public-transfer flag and contents of Move objects, or the modules, type origins and linkage of
 * packages. Rebuild the raw object from those fields, then round-trip it through BCS so it has the
 * same shape as the BCS decoder's output.
 */
function grpcGenesisObject(object: GrpcObject): SuiClientTypes.GenesisObject {
	const version = u64(object.version, 'object version');
	let data: typeof bcs.Data.$inferInput;
	if (object.package) {
		data = {
			Package: {
				id: normalizeSuiAddress(required(object.objectId, 'object id')),
				version,
				moduleMap: new Map(
					object.package.modules.map((module) => [
						required(module.name, 'module name'),
						required(module.contents, 'module contents'),
					]),
				),
				typeOriginTable: object.package.typeOrigins.map((origin) => ({
					moduleName: required(origin.moduleName, 'type origin module name'),
					datatypeName: required(origin.datatypeName, 'type origin datatype name'),
					package: normalizeSuiAddress(required(origin.packageId, 'type origin package id')),
				})),
				linkageTable: new Map(
					object.package.linkage.map((linkage) => [
						normalizeSuiAddress(required(linkage.originalId, 'linkage original id')),
						{
							upgradedId: normalizeSuiAddress(required(linkage.upgradedId, 'linkage upgraded id')),
							upgradedVersion: u64(linkage.upgradedVersion, 'linkage upgraded version'),
						},
					]),
				),
			},
		};
	} else {
		data = {
			Move: {
				type: moveObjectType(required(object.objectType, 'object type')),
				hasPublicTransfer: required(object.hasPublicTransfer, 'has public transfer'),
				version,
				contents: required(object.contents?.value, 'object contents'),
			},
		};
	}

	const owner = grpcOwner(required(object.owner, 'object owner'));
	return {
		$kind: 'RawObject',
		RawObject: {
			data: bcs.Data.parse(bcs.Data.serialize(data).toBytes()),
			owner: bcs.Owner.parse(bcs.Owner.serialize(owner).toBytes()),
		},
	};
}

function grpcOwner(owner: GrpcOwner): typeof bcs.Owner.$inferInput {
	switch (owner.kind) {
		case Owner_OwnerKind.ADDRESS:
			return { AddressOwner: required(owner.address, 'owner address') };
		case Owner_OwnerKind.OBJECT:
			return { ObjectOwner: required(owner.address, 'owner address') };
		case Owner_OwnerKind.SHARED:
			return { Shared: { initialSharedVersion: u64(owner.version, 'initial shared version') } };
		case Owner_OwnerKind.IMMUTABLE:
			return { Immutable: true };
		case Owner_OwnerKind.CONSENSUS_ADDRESS:
			return {
				ConsensusAddressOwner: {
					startVersion: u64(owner.version, 'start version'),
					owner: required(owner.address, 'owner address'),
				},
			};
		default:
			throw new Error(`Unknown owner kind: ${owner.kind}`);
	}
}

// Mirrors `MoveObjectType::from(StructTag)` in sui-types, which stores common types compactly.
function moveObjectType(objectType: string): typeof bcs.MoveObjectType.$inferInput {
	const tag = structTag(TypeTagSerializer.parseFromStr(objectType, true));

	if (isStruct(tag, SUI_FRAMEWORK, 'coin', 'Coin') && tag.typeParams.length === 1) {
		const [inner] = tag.typeParams;
		return isGas(inner) ? { GasCoin: true } : { Coin: inner };
	}
	if (isStruct(tag, SUI_SYSTEM, 'staking_pool', 'StakedSui') && tag.typeParams.length === 0) {
		return { StakedSui: true };
	}
	const balanceType = accumulatorBalanceType(tag);
	if (balanceType) {
		return isGas(balanceType)
			? { SuiBalanceAccumulatorField: true }
			: { BalanceAccumulatorField: balanceType };
	}
	return { Other: tag };
}

// `0x2::dynamic_field::Field<0x2::accumulator::Key<0x2::balance::Balance<T>>, 0x2::accumulator::U128>`
function accumulatorBalanceType(tag: StructTag): TypeTag | null {
	if (!isStruct(tag, SUI_FRAMEWORK, 'dynamic_field', 'Field') || tag.typeParams.length !== 2) {
		return null;
	}
	const [key, value] = tag.typeParams;
	const keyTag = 'struct' in key ? key.struct : null;
	if (
		!keyTag ||
		!isStruct(keyTag, SUI_FRAMEWORK, 'accumulator', 'Key') ||
		keyTag.typeParams.length !== 1 ||
		!('struct' in value) ||
		!isStruct(value.struct, SUI_FRAMEWORK, 'accumulator', 'U128') ||
		value.struct.typeParams.length !== 0
	) {
		return null;
	}
	const [balance] = keyTag.typeParams;
	if (
		!('struct' in balance) ||
		!isStruct(balance.struct, SUI_FRAMEWORK, 'balance', 'Balance') ||
		balance.struct.typeParams.length !== 1
	) {
		return null;
	}
	return balance.struct.typeParams[0];
}

function structTag(tag: TypeTag): StructTag {
	if (!('struct' in tag)) {
		throw new Error('Object type is not a struct');
	}
	return tag.struct;
}

function isStruct(tag: StructTag, address: string, module: string, name: string) {
	return tag.address === address && tag.module === module && tag.name === name;
}

function isGas(tag: TypeTag) {
	return (
		'struct' in tag &&
		isStruct(tag.struct, SUI_FRAMEWORK, 'sui', 'SUI') &&
		tag.struct.typeParams.length === 0
	);
}

function grpcEndOfEpochTransactionKind(
	grpcKind: GrpcEndOfEpochTransactionKind,
): EndOfEpochTransactionKind {
	try {
		return grpcEndOfEpochTransactionKindOrThrow(grpcKind);
	} catch {
		return UNKNOWN_KIND;
	}
}

function grpcEndOfEpochTransactionKindOrThrow(
	grpcKind: GrpcEndOfEpochTransactionKind,
): EndOfEpochTransactionKind {
	const data = grpcKind.data;

	switch (grpcKind.kind) {
		case EndOfEpochTransactionKind_Kind.CHANGE_EPOCH:
			if (data.oneofKind !== 'changeEpoch') return UNKNOWN_KIND;
			return { $kind: 'ChangeEpoch', ChangeEpoch: grpcChangeEpoch(data.changeEpoch) };
		case EndOfEpochTransactionKind_Kind.AUTHENTICATOR_STATE_CREATE:
			return { $kind: 'AuthenticatorStateCreate', AuthenticatorStateCreate: true };
		case EndOfEpochTransactionKind_Kind.AUTHENTICATOR_STATE_EXPIRE:
			if (data.oneofKind !== 'authenticatorStateExpire') return UNKNOWN_KIND;
			return {
				$kind: 'AuthenticatorStateExpire',
				AuthenticatorStateExpire: {
					minEpoch: u64(data.authenticatorStateExpire.minEpoch, 'min epoch'),
					authenticatorObjInitialSharedVersion: u64(
						data.authenticatorStateExpire.authenticatorObjectInitialSharedVersion,
						'authenticator object initial shared version',
					),
				},
			};
		case EndOfEpochTransactionKind_Kind.RANDOMNESS_STATE_CREATE:
			return { $kind: 'RandomnessStateCreate', RandomnessStateCreate: true };
		case EndOfEpochTransactionKind_Kind.DENY_LIST_STATE_CREATE:
			return { $kind: 'DenyListStateCreate', DenyListStateCreate: true };
		case EndOfEpochTransactionKind_Kind.BRIDGE_STATE_CREATE:
			if (data.oneofKind !== 'bridgeChainId') return UNKNOWN_KIND;
			return { $kind: 'BridgeStateCreate', BridgeStateCreate: { chainId: data.bridgeChainId } };
		case EndOfEpochTransactionKind_Kind.BRIDGE_COMMITTEE_INIT:
			if (data.oneofKind !== 'bridgeObjectVersion') return UNKNOWN_KIND;
			return {
				$kind: 'BridgeCommitteeInit',
				BridgeCommitteeInit: data.bridgeObjectVersion.toString(),
			};
		case EndOfEpochTransactionKind_Kind.STORE_EXECUTION_TIME_OBSERVATIONS:
			if (data.oneofKind !== 'executionTimeObservations') return UNKNOWN_KIND;
			return {
				$kind: 'StoreExecutionTimeObservations',
				StoreExecutionTimeObservations: grpcExecutionTimeObservations(
					data.executionTimeObservations,
				),
			};
		case EndOfEpochTransactionKind_Kind.ACCUMULATOR_ROOT_CREATE:
			return { $kind: 'AccumulatorRootCreate', AccumulatorRootCreate: true };
		case EndOfEpochTransactionKind_Kind.COIN_REGISTRY_CREATE:
			return { $kind: 'CoinRegistryCreate', CoinRegistryCreate: true };
		case EndOfEpochTransactionKind_Kind.DISPLAY_REGISTRY_CREATE:
			return { $kind: 'DisplayRegistryCreate', DisplayRegistryCreate: true };
		case EndOfEpochTransactionKind_Kind.ADDRESS_ALIAS_STATE_CREATE:
			return { $kind: 'AddressAliasStateCreate', AddressAliasStateCreate: true };
		case EndOfEpochTransactionKind_Kind.WRITE_ACCUMULATOR_STORAGE_COST:
			if (data.oneofKind !== 'storageCost') return UNKNOWN_KIND;
			return {
				$kind: 'WriteAccumulatorStorageCost',
				WriteAccumulatorStorageCost: { storageCost: data.storageCost.toString() },
			};
		default:
			return UNKNOWN_KIND;
	}
}

function grpcChangeEpoch(change: GrpcChangeEpoch): SuiClientTypes.ChangeEpochTransaction {
	return {
		epoch: u64(change.epoch, 'epoch'),
		protocolVersion: u64(change.protocolVersion, 'protocol version'),
		storageCharge: u64(change.storageCharge, 'storage charge'),
		computationCharge: u64(change.computationCharge, 'computation charge'),
		storageRebate: u64(change.storageRebate, 'storage rebate'),
		nonRefundableStorageFee: u64(change.nonRefundableStorageFee, 'non-refundable storage fee'),
		epochStartTimestampMs: grpcTimestampToMilliseconds(
			required(change.epochStartTimestamp, 'epoch start timestamp'),
		),
		systemPackages: change.systemPackages.map((pkg) => [
			u64(pkg.version, 'system package version'),
			pkg.modules,
			pkg.dependencies.map((dependency) => normalizeSuiAddress(dependency)),
		]),
	};
}

function grpcConsensusCommitPrologue(
	kind:
		| TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V1
		| TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V2
		| TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V3
		| TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V4,
	prologue: GrpcConsensusCommitPrologue,
): TransactionKind {
	const v1 = {
		epoch: u64(prologue.epoch, 'epoch'),
		round: u64(prologue.round, 'round'),
		commitTimestampMs: grpcTimestampToMilliseconds(
			required(prologue.commitTimestamp, 'commit timestamp'),
		),
	};
	if (kind === TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V1) {
		return { $kind: 'ConsensusCommitPrologue', ConsensusCommitPrologue: v1 };
	}

	const v2 = {
		...v1,
		consensusCommitDigest: required(prologue.consensusCommitDigest, 'consensus commit digest'),
	};
	if (kind === TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V2) {
		return { $kind: 'ConsensusCommitPrologueV2', ConsensusCommitPrologueV2: v2 };
	}

	const v3 = {
		...v2,
		subDagIndex: prologue.subDagIndex?.toString() ?? null,
		consensusDeterminedVersionAssignments: grpcVersionAssignments(prologue),
	};
	if (kind === TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V3) {
		return { $kind: 'ConsensusCommitPrologueV3', ConsensusCommitPrologueV3: v3 };
	}

	return {
		$kind: 'ConsensusCommitPrologueV4',
		ConsensusCommitPrologueV4: {
			...v3,
			additionalStateDigest: required(prologue.additionalStateDigest, 'additional state digest'),
		},
	};
}

function grpcVersionAssignments(
	prologue: GrpcConsensusCommitPrologue,
): SuiClientTypes.ConsensusCommitPrologueV3['consensusDeterminedVersionAssignments'] {
	const assignments = required(
		prologue.consensusDeterminedVersionAssignments,
		'consensus determined version assignments',
	);
	const transactions = assignments.canceledTransactions.map((canceled) => ({
		digest: required(canceled.digest, 'canceled transaction digest'),
		assignments: canceled.versionAssignments.map((assignment) => ({
			objectId: normalizeSuiAddress(required(assignment.objectId, 'object id')),
			startVersion: assignment.startVersion,
			version: u64(assignment.version, 'assigned version'),
		})),
	}));

	switch (assignments.version) {
		case 1:
			return {
				$kind: 'CancelledTransactions',
				CancelledTransactions: transactions.map(({ digest, assignments }) => [
					digest,
					assignments.map(({ objectId, version }) => [objectId, version]),
				]),
			};
		case 2:
			return {
				$kind: 'CancelledTransactionsV2',
				CancelledTransactionsV2: transactions.map(({ digest, assignments }) => [
					digest,
					assignments.map(({ objectId, startVersion, version }) => [
						[objectId, u64(startVersion, 'start version')],
						version,
					]),
				]),
			};
		default:
			throw new Error(`Unknown version assignments version: ${assignments.version}`);
	}
}

function grpcExecutionTimeObservations(
	observations: GrpcExecutionTimeObservations,
): NonNullable<EndOfEpochTransactionKind['StoreExecutionTimeObservations']> {
	if (observations.version !== 1) {
		throw new Error(`Unknown execution time observations version: ${observations.version}`);
	}

	return {
		$kind: 'V1',
		V1: observations.observations.map((observation) => [
			grpcExecutionTimeObservationKey(observation),
			observation.validatorObservations.map((validator) => {
				const duration = required(validator.duration, 'observation duration');
				return [
					required(validator.validator, 'validator'),
					{ secs: duration.seconds.toString(), nanos: duration.nanos },
				];
			}),
		]),
	};
}

function grpcExecutionTimeObservationKey(observation: GrpcExecutionTimeObservation) {
	const Kind = ExecutionTimeObservation_ExecutionTimeObservationKind;

	switch (observation.kind) {
		case Kind.MOVE_ENTRY_POINT: {
			const call = required(observation.moveEntryPoint, 'move entry point');
			return {
				$kind: 'MoveEntryPoint' as const,
				MoveEntryPoint: {
					package: normalizeSuiAddress(required(call.package, 'package')),
					module: required(call.module, 'module'),
					function: required(call.function, 'function'),
					typeArguments: call.typeArguments,
				},
			};
		}
		case Kind.TRANSFER_OBJECTS:
			return { $kind: 'TransferObjects' as const, TransferObjects: true as const };
		case Kind.SPLIT_COINS:
			return { $kind: 'SplitCoins' as const, SplitCoins: true as const };
		case Kind.MERGE_COINS:
			return { $kind: 'MergeCoins' as const, MergeCoins: true as const };
		case Kind.PUBLISH:
			return { $kind: 'Publish' as const, Publish: true as const };
		case Kind.MAKE_MOVE_VECTOR:
			return { $kind: 'MakeMoveVec' as const, MakeMoveVec: true as const };
		case Kind.UPGRADE:
			return { $kind: 'Upgrade' as const, Upgrade: true as const };
		default:
			throw new Error(`Unknown execution time observation kind: ${observation.kind}`);
	}
}

function required<T>(value: T | null | undefined, name: string): T {
	if (value === undefined || value === null) {
		throw new Error(`Transaction kind is missing ${name}`);
	}
	return value;
}

function u64(value: bigint | number | undefined, name: string): string {
	return required(value, name).toString();
}
