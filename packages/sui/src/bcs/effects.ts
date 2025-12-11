// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';

import { Address, ObjectDigest, Owner, SuiObjectRef, TypeTag } from './bcs.js';

// Rust: crates/sui-types/src/execution_status.rs (PackageUpgradeError enum)
const PackageUpgradeError = bcs.enum('PackageUpgradeError', {
	UnableToFetchPackage: bcs.struct('UnableToFetchPackage', { packageId: Address }),
	NotAPackage: bcs.struct('NotAPackage', { objectId: Address }),
	IncompatibleUpgrade: null,
	DigestDoesNotMatch: bcs.struct('DigestDoesNotMatch', { digest: bcs.byteVector() }),
	UnknownUpgradePolicy: bcs.struct('UnknownUpgradePolicy', { policy: bcs.u8() }),
	PackageIDDoesNotMatch: bcs.struct('PackageIDDoesNotMatch', {
		packageId: Address,
		ticketId: Address,
	}),
});

// Rust: move-core-types/src/language_storage.rs
const ModuleId = bcs.struct('ModuleId', {
	address: Address,
	name: bcs.string(),
});
// Rust: crates/sui-types/src/execution_status.rs
const MoveLocation = bcs.struct('MoveLocation', {
	module: ModuleId,
	function: bcs.u16(),
	instruction: bcs.u16(),
	functionName: bcs.option(bcs.string()),
});

// Rust: crates/sui-types/src/execution_status.rs
const CommandArgumentError = bcs.enum('CommandArgumentError', {
	TypeMismatch: null,
	InvalidBCSBytes: null,
	InvalidUsageOfPureArg: null,
	InvalidArgumentToPrivateEntryFunction: null,
	IndexOutOfBounds: bcs.struct('IndexOutOfBounds', { idx: bcs.u16() }),
	SecondaryIndexOutOfBounds: bcs.struct('SecondaryIndexOutOfBounds', {
		resultIdx: bcs.u16(),
		secondaryIdx: bcs.u16(),
	}),
	InvalidResultArity: bcs.struct('InvalidResultArity', { resultIdx: bcs.u16() }),
	InvalidGasCoinUsage: null,
	InvalidValueUsage: null,
	InvalidObjectByValue: null,
	InvalidObjectByMutRef: null,
	SharedObjectOperationNotAllowed: null,
	InvalidArgumentArity: null,
	InvalidTransferObject: null,
	InvalidMakeMoveVecNonObjectArgument: null,
	ArgumentWithoutValue: null,
	CannotMoveBorrowedValue: null,
	CannotWriteToExtendedReference: null,
	InvalidReferenceArgument: null,
});

// Rust: crates/sui-types/src/execution_status.rs
const TypeArgumentError = bcs.enum('TypeArgumentError', {
	TypeNotFound: null,
	ConstraintNotSatisfied: null,
});

// Rust: crates/sui-types/src/execution_status.rs
const ExecutionFailureStatus = bcs.enum('ExecutionFailureStatus', {
	InsufficientGas: null,
	InvalidGasObject: null,
	InvariantViolation: null,
	FeatureNotYetSupported: null,
	MoveObjectTooBig: bcs.struct('MoveObjectTooBig', {
		objectSize: bcs.u64(),
		maxObjectSize: bcs.u64(),
	}),
	MovePackageTooBig: bcs.struct('MovePackageTooBig', {
		objectSize: bcs.u64(),
		maxObjectSize: bcs.u64(),
	}),
	CircularObjectOwnership: bcs.struct('CircularObjectOwnership', { object: Address }),
	InsufficientCoinBalance: null,
	CoinBalanceOverflow: null,
	PublishErrorNonZeroAddress: null,
	SuiMoveVerificationError: null,
	MovePrimitiveRuntimeError: bcs.option(MoveLocation),
	MoveAbort: bcs.tuple([MoveLocation, bcs.u64()]),
	VMVerificationOrDeserializationError: null,
	VMInvariantViolation: null,
	FunctionNotFound: null,
	ArityMismatch: null,
	TypeArityMismatch: null,
	NonEntryFunctionInvoked: null,
	CommandArgumentError: bcs.struct('CommandArgumentError', {
		argIdx: bcs.u16(),
		kind: CommandArgumentError,
	}),
	TypeArgumentError: bcs.struct('TypeArgumentError', {
		argumentIdx: bcs.u16(),
		kind: TypeArgumentError,
	}),
	UnusedValueWithoutDrop: bcs.struct('UnusedValueWithoutDrop', {
		resultIdx: bcs.u16(),
		secondaryIdx: bcs.u16(),
	}),
	InvalidPublicFunctionReturnType: bcs.struct('InvalidPublicFunctionReturnType', {
		idx: bcs.u16(),
	}),
	InvalidTransferObject: null,
	EffectsTooLarge: bcs.struct('EffectsTooLarge', { currentSize: bcs.u64(), maxSize: bcs.u64() }),
	PublishUpgradeMissingDependency: null,
	PublishUpgradeDependencyDowngrade: null,
	PackageUpgradeError: bcs.struct('PackageUpgradeError', { upgradeError: PackageUpgradeError }),
	WrittenObjectsTooLarge: bcs.struct('WrittenObjectsTooLarge', {
		currentSize: bcs.u64(),
		maxSize: bcs.u64(),
	}),
	CertificateDenied: null,
	SuiMoveVerificationTimedout: null,
	SharedObjectOperationNotAllowed: null,
	InputObjectDeleted: null,
	ExecutionCancelledDueToSharedObjectCongestion: bcs.struct(
		'ExecutionCancelledDueToSharedObjectCongestion',
		{
			congested_objects: bcs.vector(Address),
		},
	),
	AddressDeniedForCoin: bcs.struct('AddressDeniedForCoin', {
		address: Address,
		coinType: bcs.string(),
	}),
	CoinTypeGlobalPause: bcs.struct('CoinTypeGlobalPause', { coinType: bcs.string() }),
	ExecutionCancelledDueToRandomnessUnavailable: null,
	MoveVectorElemTooBig: bcs.struct('MoveVectorElemTooBig', {
		valueSize: bcs.u64(),
		maxScaledSize: bcs.u64(),
	}),
	MoveRawValueTooBig: bcs.struct('MoveRawValueTooBig', {
		valueSize: bcs.u64(),
		maxScaledSize: bcs.u64(),
	}),
	InvalidLinkage: null,
	InsufficientBalanceForWithdraw: null,
	NonExclusiveWriteInputObjectModified: bcs.struct('NonExclusiveWriteInputObjectModified', {
		id: Address,
	}),
});

// Rust: crates/sui-types/src/execution_status.rs
export const ExecutionStatus = bcs.enum('ExecutionStatus', {
	Success: null,
	Failure: bcs.struct('Failure', {
		error: ExecutionFailureStatus,
		command: bcs.option(bcs.u64()),
	}),
});

// Rust: crates/sui-types/src/gas.rs
const GasCostSummary = bcs.struct('GasCostSummary', {
	computationCost: bcs.u64(),
	storageCost: bcs.u64(),
	storageRebate: bcs.u64(),
	nonRefundableStorageFee: bcs.u64(),
});

// Rust: crates/sui-types/src/effects/effects_v1.rs
const TransactionEffectsV1 = bcs.struct('TransactionEffectsV1', {
	status: ExecutionStatus,
	executedEpoch: bcs.u64(),
	gasUsed: GasCostSummary,
	modifiedAtVersions: bcs.vector(bcs.tuple([Address, bcs.u64()])),
	sharedObjects: bcs.vector(SuiObjectRef),
	transactionDigest: ObjectDigest,
	created: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
	mutated: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
	unwrapped: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
	deleted: bcs.vector(SuiObjectRef),
	unwrappedThenDeleted: bcs.vector(SuiObjectRef),
	wrapped: bcs.vector(SuiObjectRef),
	gasObject: bcs.tuple([SuiObjectRef, Owner]),
	eventsDigest: bcs.option(ObjectDigest),
	dependencies: bcs.vector(ObjectDigest),
});

// Rust: crates/sui-types/src/base_types.rs
const VersionDigest = bcs.tuple([bcs.u64(), ObjectDigest]);

// Rust: crates/sui-types/src/effects/object_change.rs
const ObjectIn = bcs.enum('ObjectIn', {
	NotExist: null,
	Exist: bcs.tuple([VersionDigest, Owner]),
});

// Rust: crates/sui-types/src/effects/object_change.rs
const AccumulatorAddress = bcs.struct('AccumulatorAddress', {
	address: Address,
	// TODO: ask why this is the name
	ty: TypeTag,
});

// Rust: crates/sui-types/src/effects/object_change.rs
const AccumulatorOperation = bcs.enum('AccumulatorOperation', {
	Merge: null,
	Split: null,
});

// Rust: crates/sui-types/src/effects/object_change.rs
const AccumulatorValue = bcs.enum('AccumulatorValue', {
	Integer: bcs.u64(),
	IntegerTuple: bcs.tuple([bcs.u64(), bcs.u64()]),
	// NonEmpty<(u64, Digest)> in Rust - vector must have at least one element
	EventDigest: bcs.vector(bcs.tuple([bcs.u64(), ObjectDigest])),
});

// Rust: crates/sui-types/src/effects/object_change.rs
const AccumulatorWriteV1 = bcs.struct('AccumulatorWriteV1', {
	address: AccumulatorAddress,
	operation: AccumulatorOperation,
	value: AccumulatorValue,
});

// Rust: crates/sui-types/src/effects/object_change.rs
const ObjectOut = bcs.enum('ObjectOut', {
	NotExist: null,
	ObjectWrite: bcs.tuple([ObjectDigest, Owner]),
	PackageWrite: VersionDigest,
	AccumulatorWriteV1: AccumulatorWriteV1,
});

// Rust: crates/sui-types/src/effects/mod.rs
const IDOperation = bcs.enum('IDOperation', {
	None: null,
	Created: null,
	Deleted: null,
});

// Rust: crates/sui-types/src/effects/object_change.rs
const EffectsObjectChange = bcs.struct('EffectsObjectChange', {
	inputState: ObjectIn,
	outputState: ObjectOut,
	idOperation: IDOperation,
});

// Rust: crates/sui-types/src/effects/effects_v2.rs
const UnchangedConsensusKind = bcs.enum('UnchangedConsensusKind', {
	ReadOnlyRoot: VersionDigest,
	MutateConsensusStreamEnded: bcs.u64(),
	ReadConsensusStreamEnded: bcs.u64(),
	Cancelled: bcs.u64(),
	PerEpochConfig: null,
});

// Rust: crates/sui-types/src/effects/effects_v2.rs
const TransactionEffectsV2 = bcs.struct('TransactionEffectsV2', {
	status: ExecutionStatus,
	executedEpoch: bcs.u64(),
	gasUsed: GasCostSummary,
	transactionDigest: ObjectDigest,
	gasObjectIndex: bcs.option(bcs.u32()),
	eventsDigest: bcs.option(ObjectDigest),
	dependencies: bcs.vector(ObjectDigest),
	lamportVersion: bcs.u64(),
	changedObjects: bcs.vector(bcs.tuple([Address, EffectsObjectChange])),
	unchangedConsensusObjects: bcs.vector(bcs.tuple([Address, UnchangedConsensusKind])),
	auxDataDigest: bcs.option(ObjectDigest),
});

// Rust: crates/sui-types/src/effects/mod.rs
export const TransactionEffects = bcs.enum('TransactionEffects', {
	V1: TransactionEffectsV1,
	V2: TransactionEffectsV2,
});
