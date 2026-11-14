// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58, toHex } from '@mysten/bcs';

import { bcs } from '../bcs/index.js';
import type { GenesisObject as BcsGenesisObject } from '../bcs/transactions.js';
import { TypeTagSerializer } from '../bcs/type-tag-serializer.js';
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
import { normalizeStructTag, normalizeSuiAddress } from '../utils/sui-types.js';
import {
	grpcCommandToTsCommand,
	grpcInputToCallArg,
	grpcTimestampToMilliseconds,
	grpcTransactionHeader,
	mapOwner,
} from './transaction-resolver.js';
import type { SuiClientTypes } from './types.js';
import { mapBcsOwner } from './utils.js';

type TransactionKind = SuiClientTypes.TransactionKind;
type EndOfEpochTransactionKind = SuiClientTypes.EndOfEpochTransactionKind;
type TransactionHeader = Omit<SuiClientTypes.TransactionData, 'kind' | 'inputs' | 'commands'>;
/** A header as the builder types it, before `normalizeProgrammable` settles `null`s. */
type HeaderInput = Omit<BuilderTransactionData, 'inputs' | 'commands' | 'digest'>;

const UNKNOWN_KIND = { $kind: 'Unknown', Unknown: true } as const;

/**
 * Decode ledger transaction data from BCS. Unlike the transport mappers, which return `Unknown`,
 * this throws on a transaction kind or variant this SDK version does not recognize.
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
		case 'Genesis':
			kind = {
				$kind: 'Genesis',
				Genesis: { objects: data.kind.Genesis.objects.map(bcsGenesisObject) },
			};
			break;
		default:
			kind = data.kind;
	}

	return ledgerTransactionData(header, kind);
}

/**
 * Map a gRPC `Transaction`, or GraphQL's `transactionJson`, to ledger transaction data. Anything
 * in the kind this SDK cannot map makes the whole kind `Unknown`.
 */
export function grpcTransactionToLedgerTransactionData(
	grpcTx: GrpcTransaction,
): SuiClientTypes.TransactionData {
	const header = grpcTransactionHeader(grpcTx, { strict: false });
	// Validated outside the catch, so a bad header throws instead of becoming an `Unknown` kind.
	const normalizedHeader = normalizeHeader(header);
	try {
		return grpcKindToTransactionData(grpcTx.kind, header);
	} catch {
		return ledgerTransactionData(normalizedHeader, UNKNOWN_KIND);
	}
}

function grpcKindToTransactionData(
	grpcKind: GrpcTransactionKind | undefined,
	header: HeaderInput,
): SuiClientTypes.TransactionData {
	const kind = grpcKind?.kind;
	if (
		kind === TransactionKind_Kind.PROGRAMMABLE_TRANSACTION ||
		kind === TransactionKind_Kind.PROGRAMMABLE_SYSTEM_TRANSACTION
	) {
		const { inputs, commands } = oneof(grpcKind?.data, 'programmableTransaction');
		const { kind: body, ...normalized } = normalizeProgrammable(header, {
			inputs: inputs.map(grpcInputToCallArg),
			commands: commands.map(grpcCommandToTsCommand),
		});
		return ledgerTransactionData(
			normalized,
			kind === TransactionKind_Kind.PROGRAMMABLE_TRANSACTION
				? { $kind: 'ProgrammableTransaction', ProgrammableTransaction: body }
				: { $kind: 'ProgrammableSystemTransaction', ProgrammableSystemTransaction: body },
		);
	}
	return ledgerTransactionData(normalizeHeader(header), grpcSystemKind(grpcKind));
}

function ledgerTransactionData(
	header: TransactionHeader,
	kind: TransactionKind,
): SuiClientTypes.TransactionData {
	const programmable = kind.ProgrammableTransaction ?? kind.ProgrammableSystemTransaction;
	return {
		...header,
		inputs: programmable?.inputs ?? [],
		commands: programmable?.commands ?? [],
		kind,
	};
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
		sender: required(sender, 'sender'),
		gasData: {
			budget: String(required(gasData.budget, 'gas budget')),
			price: String(required(gasData.price, 'gas price')),
			owner: required(gasData.owner, 'gas owner'),
			payment: required(gasData.payment, 'gas payment').map((ref) => ({
				...ref,
				version: String(ref.version),
			})),
		},
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

function grpcSystemKind(grpcKind: GrpcTransactionKind | undefined): TransactionKind {
	const data = grpcKind?.data;

	switch (grpcKind?.kind) {
		case TransactionKind_Kind.CHANGE_EPOCH:
			return { $kind: 'ChangeEpoch', ChangeEpoch: grpcChangeEpoch(oneof(data, 'changeEpoch')) };
		case TransactionKind_Kind.GENESIS:
			return {
				$kind: 'Genesis',
				Genesis: { objects: oneof(data, 'genesis').objects.map(grpcGenesisObject) },
			};
		case TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V1:
		case TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V2:
		case TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V3:
		case TransactionKind_Kind.CONSENSUS_COMMIT_PROLOGUE_V4:
			return grpcConsensusCommitPrologue(grpcKind.kind, oneof(data, 'consensusCommitPrologue'));
		case TransactionKind_Kind.AUTHENTICATOR_STATE_UPDATE: {
			const update = oneof(data, 'authenticatorStateUpdate');
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
			return {
				$kind: 'EndOfEpochTransaction',
				EndOfEpochTransaction: oneof(data, 'endOfEpoch').transactions.map(
					grpcEndOfEpochTransactionKind,
				),
			};
		case TransactionKind_Kind.RANDOMNESS_STATE_UPDATE: {
			const update = oneof(data, 'randomnessStateUpdate');
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
			throw new Error(`Unknown transaction kind: ${grpcKind?.kind}`);
	}
}

function grpcGenesisObject(object: GrpcObject): SuiClientTypes.GenesisObject {
	const type = required(object.objectType, 'object type');
	return {
		objectId: normalizeSuiAddress(required(object.objectId, 'object id')),
		version: u64(object.version, 'object version'),
		owner: grpcGenesisOwner(object.owner),
		type: type === 'package' ? type : normalizeStructTag(type),
	};
}

// `mapOwner` trusts these fields; a malformed genesis owner makes the kind Unknown.
function grpcGenesisOwner(owner: GrpcOwner | undefined): SuiClientTypes.ObjectOwner {
	const { kind, address, version } = required(owner, 'object owner');
	if (
		kind === Owner_OwnerKind.ADDRESS ||
		kind === Owner_OwnerKind.OBJECT ||
		kind === Owner_OwnerKind.CONSENSUS_ADDRESS
	) {
		required(address, 'object owner address');
	}
	if (kind === Owner_OwnerKind.SHARED || kind === Owner_OwnerKind.CONSENSUS_ADDRESS) {
		u64(version, 'object owner version');
	}
	return mapOwner(owner)!;
}

function bcsGenesisObject({
	RawObject: { data, owner },
}: typeof BcsGenesisObject.$inferType): SuiClientTypes.GenesisObject {
	const object = data.Package
		? { objectId: data.Package.id, version: data.Package.version, type: 'package' }
		: {
				// A Move object's contents start with its UID.
				objectId: normalizeSuiAddress(toHex(new Uint8Array(data.Move.contents.slice(0, 32)))),
				version: data.Move.version,
				type: moveObjectTypeString(data.Move.type),
			};
	return { ...object, owner: mapBcsOwner(owner) };
}

// Expands the compact forms `MoveObjectType` in sui-types uses for common types.
function moveObjectTypeString(type: typeof bcs.MoveObjectType.$inferType): string {
	const balanceField = (coinType: string) =>
		`0x2::dynamic_field::Field<0x2::accumulator::Key<0x2::balance::Balance<${coinType}>>, 0x2::accumulator::U128>`;
	switch (type.$kind) {
		case 'Other':
			return normalizeStructTag(TypeTagSerializer.tagToString({ struct: type.Other }));
		case 'GasCoin':
			return normalizeStructTag('0x2::coin::Coin<0x2::sui::SUI>');
		case 'StakedSui':
			return normalizeStructTag('0x3::staking_pool::StakedSui');
		case 'Coin':
			return normalizeStructTag(`0x2::coin::Coin<${type.Coin}>`);
		case 'SuiBalanceAccumulatorField':
			return normalizeStructTag(balanceField('0x2::sui::SUI'));
		case 'BalanceAccumulatorField':
			return normalizeStructTag(balanceField(type.BalanceAccumulatorField));
	}
}

// Each entry degrades to `Unknown` on its own, so one newer operation keeps the rest readable.
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
			return { $kind: 'ChangeEpoch', ChangeEpoch: grpcChangeEpoch(oneof(data, 'changeEpoch')) };
		case EndOfEpochTransactionKind_Kind.AUTHENTICATOR_STATE_CREATE:
			return { $kind: 'AuthenticatorStateCreate', AuthenticatorStateCreate: true };
		case EndOfEpochTransactionKind_Kind.AUTHENTICATOR_STATE_EXPIRE: {
			const expire = oneof(data, 'authenticatorStateExpire');
			return {
				$kind: 'AuthenticatorStateExpire',
				AuthenticatorStateExpire: {
					minEpoch: u64(expire.minEpoch, 'min epoch'),
					authenticatorObjInitialSharedVersion: u64(
						expire.authenticatorObjectInitialSharedVersion,
						'authenticator object initial shared version',
					),
				},
			};
		}
		case EndOfEpochTransactionKind_Kind.RANDOMNESS_STATE_CREATE:
			return { $kind: 'RandomnessStateCreate', RandomnessStateCreate: true };
		case EndOfEpochTransactionKind_Kind.DENY_LIST_STATE_CREATE:
			return { $kind: 'DenyListStateCreate', DenyListStateCreate: true };
		case EndOfEpochTransactionKind_Kind.BRIDGE_STATE_CREATE:
			return {
				$kind: 'BridgeStateCreate',
				BridgeStateCreate: { chainId: oneof(data, 'bridgeChainId') },
			};
		case EndOfEpochTransactionKind_Kind.BRIDGE_COMMITTEE_INIT:
			return {
				$kind: 'BridgeCommitteeInit',
				BridgeCommitteeInit: oneof(data, 'bridgeObjectVersion').toString(),
			};
		case EndOfEpochTransactionKind_Kind.STORE_EXECUTION_TIME_OBSERVATIONS:
			return {
				$kind: 'StoreExecutionTimeObservations',
				StoreExecutionTimeObservations: grpcExecutionTimeObservations(
					oneof(data, 'executionTimeObservations'),
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
			return {
				$kind: 'WriteAccumulatorStorageCost',
				WriteAccumulatorStorageCost: { storageCost: oneof(data, 'storageCost').toString() },
			};
		case EndOfEpochTransactionKind_Kind.FORWARDING_ADDRESS_REGISTRY_CREATE:
			return { $kind: 'ForwardingAddressRegistryCreate', ForwardingAddressRegistryCreate: true };
		default:
			throw new Error(`Unknown end-of-epoch transaction kind: ${grpcKind.kind}`);
	}
}

function grpcChangeEpoch(change: GrpcChangeEpoch): NonNullable<TransactionKind['ChangeEpoch']> {
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
): NonNullable<
	TransactionKind['ConsensusCommitPrologueV3']
>['consensusDeterminedVersionAssignments'] {
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
		throw new Error(`Transaction data is missing ${name}`);
	}
	return value;
}

function oneof<T extends { oneofKind: string | undefined }, K extends T['oneofKind'] & string>(
	data: T | undefined,
	kind: K,
): Extract<T, Record<K, unknown>>[K] {
	if (data?.oneofKind !== kind) {
		throw new Error(`Transaction data is missing ${kind}`);
	}
	return (data as Extract<T, Record<K, unknown>>)[kind];
}

function u64(value: bigint | number | undefined, name: string): string {
	return required(value, name).toString();
}
