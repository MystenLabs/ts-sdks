// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType } from '@mysten/bcs';
import { BcsEnum, BcsStruct, bcs } from '@mysten/bcs';

import { Address, ObjectDigest, Owner, SuiObjectRef, TypeTag } from './bcs.js';

type U64Type = BcsType<string, string | number | bigint, 'u64'>;
type U16Type = BcsType<number, number, 'u16'>;
type U8Type = BcsType<number, number, 'u8'>;
type StringType = BcsType<string, string, 'string'>;
type ByteVectorType = BcsType<Uint8Array, Iterable<number>, 'vector<u8>'>;
type AddressType = typeof Address;

// Rust: crates/sui-types/src/execution_status.rs (PackageUpgradeError enum)
const PackageUpgradeError: BcsEnum<
	{
		UnableToFetchPackage: BcsStruct<{ packageId: AddressType }, 'UnableToFetchPackage'>;
		NotAPackage: BcsStruct<{ objectId: AddressType }, 'NotAPackage'>;
		IncompatibleUpgrade: null;
		DigestDoesNotMatch: BcsStruct<{ digest: ByteVectorType }, 'DigestDoesNotMatch'>;
		UnknownUpgradePolicy: BcsStruct<{ policy: U8Type }, 'UnknownUpgradePolicy'>;
		PackageIDDoesNotMatch: BcsStruct<
			{ packageId: AddressType; ticketId: AddressType },
			'PackageIDDoesNotMatch'
		>;
	},
	'PackageUpgradeError'
> = bcs.enum('PackageUpgradeError', {
	UnableToFetchPackage: bcs.struct('UnableToFetchPackage', { packageId: Address }),
	NotAPackage: bcs.struct('NotAPackage', { objectId: Address }),
	IncompatibleUpgrade: null,
	DigestDoesNotMatch: bcs.struct('DigestDoesNotMatch', { digest: bcs.byteVector() }),
	UnknownUpgradePolicy: bcs.struct('UnknownUpgradePolicy', { policy: bcs.u8() }),
	PackageIDDoesNotMatch: bcs.struct('PackageIDDoesNotMatch', {
		packageId: Address,
		ticketId: Address,
	}),
}) as BcsEnum<
	{
		UnableToFetchPackage: BcsStruct<{ packageId: AddressType }, 'UnableToFetchPackage'>;
		NotAPackage: BcsStruct<{ objectId: AddressType }, 'NotAPackage'>;
		IncompatibleUpgrade: null;
		DigestDoesNotMatch: BcsStruct<{ digest: ByteVectorType }, 'DigestDoesNotMatch'>;
		UnknownUpgradePolicy: BcsStruct<{ policy: U8Type }, 'UnknownUpgradePolicy'>;
		PackageIDDoesNotMatch: BcsStruct<
			{ packageId: AddressType; ticketId: AddressType },
			'PackageIDDoesNotMatch'
		>;
	},
	'PackageUpgradeError'
>;

// Rust: move-core-types/src/language_storage.rs
const ModuleId: BcsStruct<{ address: AddressType; name: StringType }, 'ModuleId'> = bcs.struct(
	'ModuleId',
	{
		address: Address,
		name: bcs.string(),
	},
) as BcsStruct<{ address: AddressType; name: StringType }, 'ModuleId'>;

type MoveLocationType = BcsStruct<
	{
		module: typeof ModuleId;
		function: U16Type;
		instruction: U16Type;
		functionName: BcsType<string | null, string | null | undefined, 'Option<string>'>;
	},
	'MoveLocation'
>;
// Rust: crates/sui-types/src/execution_status.rs
const MoveLocation: MoveLocationType = bcs.struct('MoveLocation', {
	module: ModuleId,
	function: bcs.u16(),
	instruction: bcs.u16(),
	functionName: bcs.option(bcs.string()),
}) as MoveLocationType;

type CommandArgumentErrorType = BcsEnum<
	{
		TypeMismatch: null;
		InvalidBCSBytes: null;
		InvalidUsageOfPureArg: null;
		InvalidArgumentToPrivateEntryFunction: null;
		IndexOutOfBounds: BcsStruct<{ idx: U16Type }, 'IndexOutOfBounds'>;
		SecondaryIndexOutOfBounds: BcsStruct<
			{ resultIdx: U16Type; secondaryIdx: U16Type },
			'SecondaryIndexOutOfBounds'
		>;
		InvalidResultArity: BcsStruct<{ resultIdx: U16Type }, 'InvalidResultArity'>;
		InvalidGasCoinUsage: null;
		InvalidValueUsage: null;
		InvalidObjectByValue: null;
		InvalidObjectByMutRef: null;
		SharedObjectOperationNotAllowed: null;
		InvalidArgumentArity: null;
		InvalidTransferObject: null;
		InvalidMakeMoveVecNonObjectArgument: null;
		ArgumentWithoutValue: null;
		CannotMoveBorrowedValue: null;
		CannotWriteToExtendedReference: null;
		InvalidReferenceArgument: null;
	},
	'CommandArgumentError'
>;
// Rust: crates/sui-types/src/execution_status.rs
const CommandArgumentError: CommandArgumentErrorType = bcs.enum('CommandArgumentError', {
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
}) as CommandArgumentErrorType;

type TypeArgumentErrorType = BcsEnum<
	{ TypeNotFound: null; ConstraintNotSatisfied: null },
	'TypeArgumentError'
>;
// Rust: crates/sui-types/src/execution_status.rs
const TypeArgumentError: TypeArgumentErrorType = bcs.enum('TypeArgumentError', {
	TypeNotFound: null,
	ConstraintNotSatisfied: null,
}) as TypeArgumentErrorType;

type ExecutionFailureStatusType = BcsEnum<
	{
		InsufficientGas: null;
		InvalidGasObject: null;
		InvariantViolation: null;
		FeatureNotYetSupported: null;
		MoveObjectTooBig: BcsStruct<
			{ objectSize: U64Type; maxObjectSize: U64Type },
			'MoveObjectTooBig'
		>;
		MovePackageTooBig: BcsStruct<
			{ objectSize: U64Type; maxObjectSize: U64Type },
			'MovePackageTooBig'
		>;
		CircularObjectOwnership: BcsStruct<{ object: AddressType }, 'CircularObjectOwnership'>;
		InsufficientCoinBalance: null;
		CoinBalanceOverflow: null;
		PublishErrorNonZeroAddress: null;
		SuiMoveVerificationError: null;
		MovePrimitiveRuntimeError: BcsType<
			(typeof MoveLocation.$inferType) | null,
			(typeof MoveLocation.$inferInput) | null | undefined,
			'Option<MoveLocation>'
		>;
		MoveAbort: BcsType<
			[typeof MoveLocation.$inferType, string],
			readonly [typeof MoveLocation.$inferInput, string | number | bigint],
			'(MoveLocation, u64)'
		>;
		VMVerificationOrDeserializationError: null;
		VMInvariantViolation: null;
		FunctionNotFound: null;
		ArityMismatch: null;
		TypeArityMismatch: null;
		NonEntryFunctionInvoked: null;
		CommandArgumentError: BcsStruct<
			{ argIdx: U16Type; kind: CommandArgumentErrorType },
			'CommandArgumentError'
		>;
		TypeArgumentError: BcsStruct<
			{ argumentIdx: U16Type; kind: TypeArgumentErrorType },
			'TypeArgumentError'
		>;
		UnusedValueWithoutDrop: BcsStruct<
			{ resultIdx: U16Type; secondaryIdx: U16Type },
			'UnusedValueWithoutDrop'
		>;
		InvalidPublicFunctionReturnType: BcsStruct<{ idx: U16Type }, 'InvalidPublicFunctionReturnType'>;
		InvalidTransferObject: null;
		EffectsTooLarge: BcsStruct<{ currentSize: U64Type; maxSize: U64Type }, 'EffectsTooLarge'>;
		PublishUpgradeMissingDependency: null;
		PublishUpgradeDependencyDowngrade: null;
		PackageUpgradeError: BcsStruct<
			{ upgradeError: typeof PackageUpgradeError },
			'PackageUpgradeError'
		>;
		WrittenObjectsTooLarge: BcsStruct<
			{ currentSize: U64Type; maxSize: U64Type },
			'WrittenObjectsTooLarge'
		>;
		CertificateDenied: null;
		SuiMoveVerificationTimedout: null;
		SharedObjectOperationNotAllowed: null;
		InputObjectDeleted: null;
		ExecutionCancelledDueToSharedObjectCongestion: BcsStruct<
			{
				congested_objects: BcsType<
					string[],
					Iterable<string | Uint8Array> & { length: number },
					`vector<bytes[32]>`
				>;
			},
			'ExecutionCancelledDueToSharedObjectCongestion'
		>;
		AddressDeniedForCoin: BcsStruct<
			{ address: AddressType; coinType: StringType },
			'AddressDeniedForCoin'
		>;
		CoinTypeGlobalPause: BcsStruct<{ coinType: StringType }, 'CoinTypeGlobalPause'>;
		ExecutionCancelledDueToRandomnessUnavailable: null;
		MoveVectorElemTooBig: BcsStruct<
			{ valueSize: U64Type; maxScaledSize: U64Type },
			'MoveVectorElemTooBig'
		>;
		MoveRawValueTooBig: BcsStruct<
			{ valueSize: U64Type; maxScaledSize: U64Type },
			'MoveRawValueTooBig'
		>;
		InvalidLinkage: null;
		InsufficientBalanceForWithdraw: null;
		NonExclusiveWriteInputObjectModified: BcsStruct<
			{ id: AddressType },
			'NonExclusiveWriteInputObjectModified'
		>;
	},
	'ExecutionFailureStatus'
>;
// Rust: crates/sui-types/src/execution_status.rs
const ExecutionFailureStatus: ExecutionFailureStatusType = bcs.enum('ExecutionFailureStatus', {
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
}) as ExecutionFailureStatusType;

// Rust: crates/sui-types/src/execution_status.rs
export const ExecutionStatus = bcs.enum('ExecutionStatus', {
	Success: null,
	Failure: bcs.struct('Failure', {
		error: ExecutionFailureStatus,
		command: bcs.option(bcs.u64()),
	}),
}) as BcsEnum<
	{
		Success: null;
		Failure: BcsStruct<
			{
				error: typeof ExecutionFailureStatus;
				command: BcsType<
					string | null,
					string | number | bigint | null | undefined,
					`Option<u64>`
				>;
			},
			'Failure'
		>;
	},
	'ExecutionStatus'
>;

// Rust: crates/sui-types/src/gas.rs
const GasCostSummary = bcs.struct('GasCostSummary', {
	computationCost: bcs.u64(),
	storageCost: bcs.u64(),
	storageRebate: bcs.u64(),
	nonRefundableStorageFee: bcs.u64(),
});

type GasCostSummaryType = BcsStruct<
	{
		computationCost: U64Type;
		storageCost: U64Type;
		storageRebate: U64Type;
		nonRefundableStorageFee: U64Type;
	},
	'GasCostSummary'
>;
type VectorOf<T extends BcsType<any>> = BcsType<
	(T['$inferType'])[],
	Iterable<T['$inferInput']> & { length: number },
	`vector<${T['name']}>`
>;
type SuiObjectRefOwnerTuple = BcsType<
	[typeof SuiObjectRef.$inferType, typeof Owner.$inferType],
	readonly [typeof SuiObjectRef.$inferInput, typeof Owner.$inferInput],
	`(SuiObjectRef, Owner)`
>;
type AddressU64Tuple = BcsType<
	[string, string],
	readonly [string | Uint8Array, string | number | bigint],
	`(bytes[32], u64)`
>;
type OptionObjectDigestType = BcsType<
	string | null,
	string | null | undefined,
	`Option<ObjectDigest>`
>;
type TransactionEffectsV1Type = BcsStruct<
	{
		status: typeof ExecutionStatus;
		executedEpoch: U64Type;
		gasUsed: GasCostSummaryType;
		modifiedAtVersions: VectorOf<AddressU64Tuple>;
		sharedObjects: VectorOf<typeof SuiObjectRef>;
		transactionDigest: typeof ObjectDigest;
		created: VectorOf<SuiObjectRefOwnerTuple>;
		mutated: VectorOf<SuiObjectRefOwnerTuple>;
		unwrapped: VectorOf<SuiObjectRefOwnerTuple>;
		deleted: VectorOf<typeof SuiObjectRef>;
		unwrappedThenDeleted: VectorOf<typeof SuiObjectRef>;
		wrapped: VectorOf<typeof SuiObjectRef>;
		gasObject: SuiObjectRefOwnerTuple;
		eventsDigest: OptionObjectDigestType;
		dependencies: VectorOf<typeof ObjectDigest>;
	},
	'TransactionEffectsV1'
>;
// Rust: crates/sui-types/src/effects/effects_v1.rs
const TransactionEffectsV1: TransactionEffectsV1Type = bcs.struct('TransactionEffectsV1', {
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
}) as TransactionEffectsV1Type;

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

type VersionDigestType = BcsType<
	[string, string],
	readonly [string | number | bigint, string],
	`(u64, ObjectDigest)`
>;
type ObjectInType = BcsEnum<
	{
		NotExist: null;
		Exist: BcsType<
			[[string, string], typeof Owner.$inferType],
			readonly [readonly [string | number | bigint, string], typeof Owner.$inferInput],
			`((u64, ObjectDigest), Owner)`
		>;
	},
	'ObjectIn'
>;
type AccumulatorAddressType = BcsStruct<
	{ address: AddressType; ty: typeof TypeTag },
	'AccumulatorAddress'
>;
type AccumulatorOperationType = BcsEnum<{ Merge: null; Split: null }, 'AccumulatorOperation'>;
type AccumulatorValueType = BcsEnum<
	{
		Integer: U64Type;
		IntegerTuple: BcsType<
			[string, string],
			readonly [string | number | bigint, string | number | bigint],
			`(u64, u64)`
		>;
		EventDigest: VectorOf<
			BcsType<
				[string, string],
				readonly [string | number | bigint, string],
				`(u64, ObjectDigest)`
			>
		>;
	},
	'AccumulatorValue'
>;
type AccumulatorWriteV1Type = BcsStruct<
	{
		address: AccumulatorAddressType;
		operation: AccumulatorOperationType;
		value: AccumulatorValueType;
	},
	'AccumulatorWriteV1'
>;
type ObjectOutType = BcsEnum<
	{
		NotExist: null;
		ObjectWrite: BcsType<
			[string, typeof Owner.$inferType],
			readonly [string, typeof Owner.$inferInput],
			`(ObjectDigest, Owner)`
		>;
		PackageWrite: VersionDigestType;
		AccumulatorWriteV1: AccumulatorWriteV1Type;
	},
	'ObjectOut'
>;
type IDOperationType = BcsEnum<
	{ None: null; Created: null; Deleted: null },
	'IDOperation'
>;
type EffectsObjectChangeType = BcsStruct<
	{
		inputState: ObjectInType;
		outputState: ObjectOutType;
		idOperation: IDOperationType;
	},
	'EffectsObjectChange'
>;
type UnchangedConsensusKindType = BcsEnum<
	{
		ReadOnlyRoot: VersionDigestType;
		MutateConsensusStreamEnded: U64Type;
		ReadConsensusStreamEnded: U64Type;
		Cancelled: U64Type;
		PerEpochConfig: null;
	},
	'UnchangedConsensusKind'
>;
type AddressEffectsObjectChangeTuple = BcsType<
	[string, EffectsObjectChangeType['$inferType']],
	readonly [string | Uint8Array, EffectsObjectChangeType['$inferInput']],
	`(bytes[32], EffectsObjectChange)`
>;
type AddressUnchangedConsensusKindTuple = BcsType<
	[string, UnchangedConsensusKindType['$inferType']],
	readonly [string | Uint8Array, UnchangedConsensusKindType['$inferInput']],
	`(bytes[32], UnchangedConsensusKind)`
>;
type TransactionEffectsV2Type = BcsStruct<
	{
		status: typeof ExecutionStatus;
		executedEpoch: U64Type;
		gasUsed: GasCostSummaryType;
		transactionDigest: typeof ObjectDigest;
		gasObjectIndex: BcsType<number | null, number | null | undefined, `Option<u32>`>;
		eventsDigest: OptionObjectDigestType;
		dependencies: VectorOf<typeof ObjectDigest>;
		lamportVersion: U64Type;
		changedObjects: VectorOf<AddressEffectsObjectChangeTuple>;
		unchangedConsensusObjects: VectorOf<AddressUnchangedConsensusKindTuple>;
		auxDataDigest: OptionObjectDigestType;
	},
	'TransactionEffectsV2'
>;
// Rust: crates/sui-types/src/effects/effects_v2.rs
const TransactionEffectsV2: TransactionEffectsV2Type = bcs.struct('TransactionEffectsV2', {
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
}) as TransactionEffectsV2Type;

// Rust: crates/sui-types/src/effects/mod.rs
export const TransactionEffects = bcs.enum('TransactionEffects', {
	V1: TransactionEffectsV1,
	V2: TransactionEffectsV2,
}) as BcsEnum<
	{ V1: typeof TransactionEffectsV1; V2: typeof TransactionEffectsV2 },
	'TransactionEffects'
>;
