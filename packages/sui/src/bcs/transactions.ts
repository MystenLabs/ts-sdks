// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';

import {
	Address,
	base64String,
	Data,
	GasData,
	IntentMessage,
	ObjectDigest,
	Owner,
	ProgrammableTransaction,
	TransactionExpiration,
	TypeTag,
} from './bcs.js';

// Rust: crates/sui-types/src/transaction.rs
export const ChangeEpoch = bcs.struct('ChangeEpoch', {
	epoch: bcs.u64(),
	protocolVersion: bcs.u64(),
	storageCharge: bcs.u64(),
	computationCharge: bcs.u64(),
	storageRebate: bcs.u64(),
	nonRefundableStorageFee: bcs.u64(),
	epochStartTimestampMs: bcs.u64(),
	systemPackages: bcs.vector(
		bcs.tuple([bcs.u64(), bcs.vector(bcs.byteVector()), bcs.vector(Address)]),
	),
});

// Rust: crates/sui-types/src/transaction.rs
export const GenesisObject = bcs.enum('GenesisObject', {
	RawObject: bcs.struct('RawObject', {
		data: Data,
		owner: Owner,
	}),
});

// Rust: crates/sui-types/src/transaction.rs
export const GenesisTransaction = bcs.struct('GenesisTransaction', {
	objects: bcs.vector(GenesisObject),
});

// Rust: crates/sui-types/src/messages_consensus.rs
export const ConsensusCommitPrologue = bcs.struct('ConsensusCommitPrologue', {
	epoch: bcs.u64(),
	round: bcs.u64(),
	commitTimestampMs: bcs.u64(),
});

// Rust: crates/sui-types/src/messages_consensus.rs
export const ConsensusCommitPrologueV2 = bcs.struct('ConsensusCommitPrologueV2', {
	epoch: bcs.u64(),
	round: bcs.u64(),
	commitTimestampMs: bcs.u64(),
	consensusCommitDigest: ObjectDigest,
});

// Rust: crates/sui-types/src/messages_consensus.rs
export const ConsensusDeterminedVersionAssignments = bcs.enum(
	'ConsensusDeterminedVersionAssignments',
	{
		CancelledTransactions: bcs.vector(
			bcs.tuple([ObjectDigest, bcs.vector(bcs.tuple([Address, bcs.u64()]))]),
		),
		CancelledTransactionsV2: bcs.vector(
			bcs.tuple([
				ObjectDigest,
				bcs.vector(bcs.tuple([bcs.tuple([Address, bcs.u64()]), bcs.u64()])),
			]),
		),
	},
);

// Rust: crates/sui-types/src/messages_consensus.rs
export const ConsensusCommitPrologueV3 = bcs.struct('ConsensusCommitPrologueV3', {
	epoch: bcs.u64(),
	round: bcs.u64(),
	subDagIndex: bcs.option(bcs.u64()),
	commitTimestampMs: bcs.u64(),
	consensusCommitDigest: ObjectDigest,
	consensusDeterminedVersionAssignments: ConsensusDeterminedVersionAssignments,
});

// Rust: crates/sui-types/src/messages_consensus.rs
export const ConsensusCommitPrologueV4 = bcs.struct('ConsensusCommitPrologueV4', {
	epoch: bcs.u64(),
	round: bcs.u64(),
	subDagIndex: bcs.option(bcs.u64()),
	commitTimestampMs: bcs.u64(),
	consensusCommitDigest: ObjectDigest,
	consensusDeterminedVersionAssignments: ConsensusDeterminedVersionAssignments,
	additionalStateDigest: ObjectDigest,
});

// Rust: crates/sui-types/src/authenticator_state.rs
export const ActiveJwk = bcs.struct('ActiveJwk', {
	jwkId: bcs.struct('JwkId', {
		iss: bcs.string(),
		kid: bcs.string(),
	}),
	jwk: bcs.struct('JWK', {
		kty: bcs.string(),
		e: bcs.string(),
		n: bcs.string(),
		alg: bcs.string(),
	}),
	epoch: bcs.u64(),
});

// Rust: crates/sui-types/src/transaction.rs
export const AuthenticatorStateUpdate = bcs.struct('AuthenticatorStateUpdate', {
	epoch: bcs.u64(),
	round: bcs.u64(),
	newActiveJwks: bcs.vector(ActiveJwk),
	authenticatorObjInitialSharedVersion: bcs.u64(),
});

// Rust: crates/sui-types/src/transaction.rs
export const RandomnessStateUpdate = bcs.struct('RandomnessStateUpdate', {
	epoch: bcs.u64(),
	randomnessRound: bcs.u64(),
	randomBytes: bcs.byteVector(),
	randomnessObjInitialSharedVersion: bcs.u64(),
});

// Rust: crates/sui-types/src/transaction.rs
export const AuthenticatorStateExpire = bcs.struct('AuthenticatorStateExpire', {
	minEpoch: bcs.u64(),
	authenticatorObjInitialSharedVersion: bcs.u64(),
});

// Rust: crates/sui-types/src/execution.rs
export const ExecutionTimeObservationKey = bcs.enum('ExecutionTimeObservationKey', {
	MoveEntryPoint: bcs.struct('MoveEntryPoint', {
		package: Address,
		module: bcs.string(),
		function: bcs.string(),
		typeArguments: bcs.vector(TypeTag),
	}),
	TransferObjects: null,
	SplitCoins: null,
	MergeCoins: null,
	Publish: null,
	MakeMoveVec: null,
	Upgrade: null,
});

// Rust: crates/sui-types/src/transaction.rs
export const StoredExecutionTimeObservations = bcs.enum('StoredExecutionTimeObservations', {
	V1: bcs.vector(
		bcs.tuple([
			ExecutionTimeObservationKey,
			bcs.vector(
				bcs.tuple([
					// AuthorityName (BLS public key bytes)
					bcs.byteVector(),
					bcs.struct('Duration', {
						secs: bcs.u64(),
						nanos: bcs.u32(),
					}),
				]),
			),
		]),
	),
});

// Rust: crates/sui-types/src/transaction.rs
export const WriteAccumulatorStorageCost = bcs.struct('WriteAccumulatorStorageCost', {
	storageCost: bcs.u64(),
});

// Rust: crates/sui-types/src/transaction.rs
export const EndOfEpochTransactionKind = bcs.enum('EndOfEpochTransactionKind', {
	ChangeEpoch: ChangeEpoch,
	AuthenticatorStateCreate: null,
	AuthenticatorStateExpire: AuthenticatorStateExpire,
	RandomnessStateCreate: null,
	DenyListStateCreate: null,
	// ChainIdentifier (the genesis checkpoint digest)
	BridgeStateCreate: ObjectDigest,
	BridgeCommitteeInit: bcs.u64(),
	StoreExecutionTimeObservations: StoredExecutionTimeObservations,
	AccumulatorRootCreate: null,
	CoinRegistryCreate: null,
	DisplayRegistryCreate: null,
	AddressAliasStateCreate: null,
	WriteAccumulatorStorageCost: WriteAccumulatorStorageCost,
});

// Rust: crates/sui-types/src/transaction.rs
export const TransactionKind = bcs.enum('TransactionKind', {
	ProgrammableTransaction: ProgrammableTransaction,
	ChangeEpoch: ChangeEpoch,
	Genesis: GenesisTransaction,
	ConsensusCommitPrologue: ConsensusCommitPrologue,
	AuthenticatorStateUpdate: AuthenticatorStateUpdate,
	EndOfEpochTransaction: bcs.vector(EndOfEpochTransactionKind),
	RandomnessStateUpdate: RandomnessStateUpdate,
	ConsensusCommitPrologueV2: ConsensusCommitPrologueV2,
	ConsensusCommitPrologueV3: ConsensusCommitPrologueV3,
	ConsensusCommitPrologueV4: ConsensusCommitPrologueV4,
	ProgrammableSystemTransaction: ProgrammableTransaction,
});

export const TransactionDataV1 = bcs.struct('TransactionDataV1', {
	kind: TransactionKind,
	sender: Address,
	gasData: GasData,
	expiration: TransactionExpiration,
});

export const TransactionData = bcs.enum('TransactionData', {
	V1: TransactionDataV1,
});

export const SenderSignedTransaction = bcs.struct('SenderSignedTransaction', {
	intentMessage: IntentMessage(TransactionData),
	txSignatures: bcs.vector(base64String),
});

export const SenderSignedData = bcs.vector(SenderSignedTransaction, {
	name: 'SenderSignedData',
});
