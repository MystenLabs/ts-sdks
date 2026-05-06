// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsTypeOptions } from '@mysten/bcs';
import { BcsEnum, BcsStruct, BcsType } from '@mysten/bcs';
import { bcs, fromBase58, fromBase64, fromHex, toBase58, toBase64, toHex } from '@mysten/bcs';

import { isValidSuiAddress, normalizeSuiAddress, SUI_ADDRESS_LENGTH } from '../utils/sui-types.js';
import { TypeTagSerializer } from './type-tag-serializer.js';
import type { TypeTag as TypeTagType } from './types.js';

function unsafe_u64(options?: BcsTypeOptions<number>) {
	return bcs
		.u64({
			name: 'unsafe_u64',
			...(options as object),
		})
		.transform({
			input: (val: number | string) => val,
			output: (val) => Number(val),
		});
}

function optionEnum<T extends BcsType<any, any>>(type: T) {
	return bcs.enum('Option', {
		None: null,
		Some: type,
	});
}

export const Address: BcsType<string, string | Uint8Array, `bytes[${typeof SUI_ADDRESS_LENGTH}]`> =
	bcs.bytes(SUI_ADDRESS_LENGTH).transform({
		validate: (val) => {
			const address = typeof val === 'string' ? val : toHex(val);
			if (!address || !isValidSuiAddress(normalizeSuiAddress(address))) {
				throw new Error(`Invalid Sui address ${address}`);
			}
		},
		input: (val: string | Uint8Array) =>
			typeof val === 'string' ? fromHex(normalizeSuiAddress(val)) : val,
		output: (val) => normalizeSuiAddress(toHex(val)),
	});

export const ObjectDigest: BcsType<string, string, 'ObjectDigest'> = bcs.byteVector().transform({
	name: 'ObjectDigest',
	input: (value: string) => fromBase58(value),
	output: (value) => toBase58(new Uint8Array(value)),
	validate: (value) => {
		if (fromBase58(value).length !== 32) {
			throw new Error('ObjectDigest must be 32 bytes');
		}
	},
});

export const SuiObjectRef = bcs.struct('SuiObjectRef', {
	objectId: Address,
	version: bcs.u64(),
	digest: ObjectDigest,
}) as BcsStruct<
	{ objectId: typeof Address; version: BcsType<string, string | number | bigint, 'u64'>; digest: typeof ObjectDigest },
	'SuiObjectRef'
>;

export const SharedObjectRef = bcs.struct('SharedObjectRef', {
	objectId: Address,
	initialSharedVersion: bcs.u64(),
	mutable: bcs.bool(),
}) as BcsStruct<
	{
		objectId: typeof Address;
		initialSharedVersion: BcsType<string, string | number | bigint, 'u64'>;
		mutable: BcsType<boolean, boolean, 'bool'>;
	},
	'SharedObjectRef'
>;

export const ObjectArg = bcs.enum('ObjectArg', {
	ImmOrOwnedObject: SuiObjectRef,
	SharedObject: SharedObjectRef,
	Receiving: SuiObjectRef,
}) as BcsEnum<
	{
		ImmOrOwnedObject: typeof SuiObjectRef;
		SharedObject: typeof SharedObjectRef;
		Receiving: typeof SuiObjectRef;
	},
	'ObjectArg'
>;

// Rust: crates/sui-types/src/object.rs
export const Owner = bcs.enum('Owner', {
	AddressOwner: Address,
	ObjectOwner: Address,
	Shared: bcs.struct('Shared', {
		initialSharedVersion: bcs.u64(),
	}),
	Immutable: null,
	ConsensusAddressOwner: bcs.struct('ConsensusAddressOwner', {
		startVersion: bcs.u64(),
		owner: Address,
	}),
}) as BcsEnum<
	{
		AddressOwner: typeof Address;
		ObjectOwner: typeof Address;
		Shared: BcsStruct<
			{ initialSharedVersion: BcsType<string, string | number | bigint, 'u64'> },
			'Shared'
		>;
		Immutable: null;
		ConsensusAddressOwner: BcsStruct<
			{
				startVersion: BcsType<string, string | number | bigint, 'u64'>;
				owner: typeof Address;
			},
			'ConsensusAddressOwner'
		>;
	},
	'Owner'
>;

// Rust: crates/sui-types/src/transaction.rs
export const Reservation = bcs.enum('Reservation', {
	MaxAmountU64: bcs.u64(),
}) as BcsEnum<
	{ MaxAmountU64: BcsType<string, string | number | bigint, 'u64'> },
	'Reservation'
>;

// Rust: crates/sui-types/src/transaction.rs
export const WithdrawalType = bcs.enum('WithdrawalType', {
	Balance: bcs.lazy(() => TypeTag),
}) as BcsEnum<{ Balance: typeof TypeTag }, 'WithdrawalType'>;

// Rust: crates/sui-types/src/transaction.rs
export const WithdrawFrom = bcs.enum('WithdrawFrom', {
	Sender: null,
	Sponsor: null,
}) as BcsEnum<{ Sender: null; Sponsor: null }, 'WithdrawFrom'>;

// Rust: crates/sui-types/src/transaction.rs
export const FundsWithdrawal = bcs.struct('FundsWithdrawal', {
	reservation: Reservation,
	typeArg: WithdrawalType,
	withdrawFrom: WithdrawFrom,
}) as BcsStruct<
	{
		reservation: typeof Reservation;
		typeArg: typeof WithdrawalType;
		withdrawFrom: typeof WithdrawFrom;
	},
	'FundsWithdrawal'
>;

export const CallArg = bcs.enum('CallArg', {
	Pure: bcs.struct('Pure', {
		bytes: bcs.byteVector().transform({
			input: (val: string | Uint8Array) => (typeof val === 'string' ? fromBase64(val) : val),
			output: (val) => toBase64(new Uint8Array(val)),
		}),
	}),
	Object: ObjectArg,
	FundsWithdrawal: FundsWithdrawal,
}) as BcsEnum<
	{
		Pure: BcsStruct<
			{ bytes: BcsType<string, string | Uint8Array, 'vector<u8>'> },
			'Pure'
		>;
		Object: typeof ObjectArg;
		FundsWithdrawal: typeof FundsWithdrawal;
	},
	'CallArg'
>;

const InnerTypeTag: BcsType<TypeTagType, TypeTagType> = bcs.enum('TypeTag', {
	bool: null,
	u8: null,
	u64: null,
	u128: null,
	address: null,
	signer: null,
	vector: bcs.lazy(() => InnerTypeTag),
	struct: bcs.lazy(() => StructTag),
	u16: null,
	u32: null,
	u256: null,
}) as BcsType<TypeTagType>;

export const TypeTag: BcsType<string, string | TypeTagType> = InnerTypeTag.transform({
	input: (typeTag: string | TypeTagType) =>
		typeof typeTag === 'string' ? TypeTagSerializer.parseFromStr(typeTag, true) : typeTag,
	output: (typeTag: TypeTagType) => TypeTagSerializer.tagToString(typeTag),
});

export const Argument = bcs.enum('Argument', {
	GasCoin: null,
	Input: bcs.u16(),
	Result: bcs.u16(),
	NestedResult: bcs.tuple([bcs.u16(), bcs.u16()]),
}) as BcsEnum<
	{
		GasCoin: null;
		Input: BcsType<number, number, 'u16'>;
		Result: BcsType<number, number, 'u16'>;
		NestedResult: BcsType<[number, number], [number, number], '(u16, u16)'>;
	},
	'Argument'
>;

export const ProgrammableMoveCall = bcs.struct('ProgrammableMoveCall', {
	package: Address,
	module: bcs.string(),
	function: bcs.string(),
	typeArguments: bcs.vector(TypeTag),
	arguments: bcs.vector(Argument),
}) as BcsStruct<
	{
		package: typeof Address;
		module: BcsType<string, string, 'string'>;
		function: BcsType<string, string, 'string'>;
		typeArguments: BcsType<
			string[],
			Iterable<string | TypeTagType> & { length: number },
			`vector<${string}>`
		>;
		arguments: BcsType<
			(typeof Argument.$inferType)[],
			Iterable<typeof Argument.$inferInput> & { length: number },
			`vector<Argument>`
		>;
	},
	'ProgrammableMoveCall'
>;

export const Command = bcs.enum('Command', {
	/**
	 * A Move Call - any public Move function can be called via
	 * this transaction. The results can be used that instant to pass
	 * into the next transaction.
	 */
	MoveCall: ProgrammableMoveCall,
	/**
	 * Transfer vector of objects to a receiver.
	 */
	TransferObjects: bcs.struct('TransferObjects', {
		objects: bcs.vector(Argument),
		address: Argument,
	}),
	// /**
	//  * Split `amount` from a `coin`.
	//  */
	SplitCoins: bcs.struct('SplitCoins', {
		coin: Argument,
		amounts: bcs.vector(Argument),
	}),
	// /**
	//  * Merge Vector of Coins (`sources`) into a `destination`.
	//  */
	MergeCoins: bcs.struct('MergeCoins', {
		destination: Argument,
		sources: bcs.vector(Argument),
	}),
	// /**
	//  * Publish a Move module.
	//  */
	Publish: bcs.struct('Publish', {
		modules: bcs.vector(
			bcs.byteVector().transform({
				input: (val: string | Uint8Array) => (typeof val === 'string' ? fromBase64(val) : val),
				output: (val) => toBase64(new Uint8Array(val)),
			}),
		),
		dependencies: bcs.vector(Address),
	}),
	// /**
	//  * Build a vector of objects using the input arguments.
	//  * It is impossible to export construct a `vector<T: key>` otherwise,
	//  * so this call serves a utility function.
	//  */
	MakeMoveVec: bcs.struct('MakeMoveVec', {
		type: optionEnum(TypeTag).transform({
			input: (val: string | null) =>
				val === null
					? {
							None: true,
						}
					: {
							Some: val,
						},
			output: (val) => val.Some ?? null,
		}),
		elements: bcs.vector(Argument),
	}),
	Upgrade: bcs.struct('Upgrade', {
		modules: bcs.vector(
			bcs.byteVector().transform({
				input: (val: string | Uint8Array) => (typeof val === 'string' ? fromBase64(val) : val),
				output: (val) => toBase64(new Uint8Array(val)),
			}),
		),
		dependencies: bcs.vector(Address),
		package: Address,
		ticket: Argument,
	}),
}) as BcsEnum<
	{
		MoveCall: typeof ProgrammableMoveCall;
		TransferObjects: BcsStruct<
			{
				objects: BcsType<
					(typeof Argument.$inferType)[],
					Iterable<typeof Argument.$inferInput> & { length: number },
					`vector<Argument>`
				>;
				address: typeof Argument;
			},
			'TransferObjects'
		>;
		SplitCoins: BcsStruct<
			{
				coin: typeof Argument;
				amounts: BcsType<
					(typeof Argument.$inferType)[],
					Iterable<typeof Argument.$inferInput> & { length: number },
					`vector<Argument>`
				>;
			},
			'SplitCoins'
		>;
		MergeCoins: BcsStruct<
			{
				destination: typeof Argument;
				sources: BcsType<
					(typeof Argument.$inferType)[],
					Iterable<typeof Argument.$inferInput> & { length: number },
					`vector<Argument>`
				>;
			},
			'MergeCoins'
		>;
		Publish: BcsStruct<
			{
				modules: BcsType<
					string[],
					Iterable<string | Uint8Array> & { length: number },
					`vector<vector<u8>>`
				>;
				dependencies: BcsType<
					string[],
					Iterable<string | Uint8Array> & { length: number },
					`vector<bytes[${typeof SUI_ADDRESS_LENGTH}]>`
				>;
			},
			'Publish'
		>;
		MakeMoveVec: BcsStruct<
			{
				type: BcsType<string | null, string | null, string>;
				elements: BcsType<
					(typeof Argument.$inferType)[],
					Iterable<typeof Argument.$inferInput> & { length: number },
					`vector<Argument>`
				>;
			},
			'MakeMoveVec'
		>;
		Upgrade: BcsStruct<
			{
				modules: BcsType<
					string[],
					Iterable<string | Uint8Array> & { length: number },
					`vector<vector<u8>>`
				>;
				dependencies: BcsType<
					string[],
					Iterable<string | Uint8Array> & { length: number },
					`vector<bytes[${typeof SUI_ADDRESS_LENGTH}]>`
				>;
				package: typeof Address;
				ticket: typeof Argument;
			},
			'Upgrade'
		>;
	},
	'Command'
>;

export const ProgrammableTransaction = bcs.struct('ProgrammableTransaction', {
	inputs: bcs.vector(CallArg),
	commands: bcs.vector(Command),
}) as BcsStruct<
	{
		inputs: BcsType<
			(typeof CallArg.$inferType)[],
			Iterable<typeof CallArg.$inferInput> & { length: number },
			`vector<CallArg>`
		>;
		commands: BcsType<
			(typeof Command.$inferType)[],
			Iterable<typeof Command.$inferInput> & { length: number },
			`vector<Command>`
		>;
	},
	'ProgrammableTransaction'
>;

export const TransactionKind = bcs.enum('TransactionKind', {
	ProgrammableTransaction: ProgrammableTransaction,
	ChangeEpoch: null,
	Genesis: null,
	ConsensusCommitPrologue: null,
}) as BcsEnum<
	{
		ProgrammableTransaction: typeof ProgrammableTransaction;
		ChangeEpoch: null;
		Genesis: null;
		ConsensusCommitPrologue: null;
	},
	'TransactionKind'
>;

// Rust: crates/sui-types/src/transaction.rs
export const ValidDuring = bcs.struct('ValidDuring', {
	minEpoch: bcs.option(bcs.u64()),
	maxEpoch: bcs.option(bcs.u64()),
	minTimestamp: bcs.option(bcs.u64()),
	maxTimestamp: bcs.option(bcs.u64()),
	chain: ObjectDigest,
	nonce: bcs.u32(),
}) as BcsStruct<
	{
		minEpoch: BcsType<string | null, string | number | bigint | null | undefined, `Option<u64>`>;
		maxEpoch: BcsType<string | null, string | number | bigint | null | undefined, `Option<u64>`>;
		minTimestamp: BcsType<
			string | null,
			string | number | bigint | null | undefined,
			`Option<u64>`
		>;
		maxTimestamp: BcsType<
			string | null,
			string | number | bigint | null | undefined,
			`Option<u64>`
		>;
		chain: typeof ObjectDigest;
		nonce: BcsType<number, number, 'u32'>;
	},
	'ValidDuring'
>;

export const TransactionExpiration = bcs.enum('TransactionExpiration', {
	None: null,
	Epoch: unsafe_u64(),
	ValidDuring: ValidDuring,
}) as BcsEnum<
	{
		None: null;
		Epoch: BcsType<number, number | string, 'unsafe_u64'>;
		ValidDuring: typeof ValidDuring;
	},
	'TransactionExpiration'
>;

export const StructTag = bcs.struct('StructTag', {
	address: Address,
	module: bcs.string(),
	name: bcs.string(),
	typeParams: bcs.vector(InnerTypeTag),
}) as BcsStruct<
	{
		address: typeof Address;
		module: BcsType<string, string, 'string'>;
		name: BcsType<string, string, 'string'>;
		typeParams: BcsType<
			TypeTagType[],
			Iterable<TypeTagType> & { length: number },
			`vector<TypeTag>`
		>;
	},
	'StructTag'
>;

export const GasData = bcs.struct('GasData', {
	payment: bcs.vector(SuiObjectRef),
	owner: Address,
	price: bcs.u64(),
	budget: bcs.u64(),
}) as BcsStruct<
	{
		payment: BcsType<
			(typeof SuiObjectRef.$inferType)[],
			Iterable<typeof SuiObjectRef.$inferInput> & { length: number },
			`vector<SuiObjectRef>`
		>;
		owner: typeof Address;
		price: BcsType<string, string | number | bigint, 'u64'>;
		budget: BcsType<string, string | number | bigint, 'u64'>;
	},
	'GasData'
>;

export const TransactionDataV1 = bcs.struct('TransactionDataV1', {
	kind: TransactionKind,
	sender: Address,
	gasData: GasData,
	expiration: TransactionExpiration,
}) as BcsStruct<
	{
		kind: typeof TransactionKind;
		sender: typeof Address;
		gasData: typeof GasData;
		expiration: typeof TransactionExpiration;
	},
	'TransactionDataV1'
>;

export const TransactionData = bcs.enum('TransactionData', {
	V1: TransactionDataV1,
}) as BcsEnum<{ V1: typeof TransactionDataV1 }, 'TransactionData'>;

export const IntentScope = bcs.enum('IntentScope', {
	TransactionData: null,
	TransactionEffects: null,
	CheckpointSummary: null,
	PersonalMessage: null,
}) as BcsEnum<
	{
		TransactionData: null;
		TransactionEffects: null;
		CheckpointSummary: null;
		PersonalMessage: null;
	},
	'IntentScope'
>;

export const IntentVersion = bcs.enum('IntentVersion', {
	V0: null,
}) as BcsEnum<{ V0: null }, 'IntentVersion'>;

export const AppId = bcs.enum('AppId', {
	Sui: null,
}) as BcsEnum<{ Sui: null }, 'AppId'>;

export const Intent = bcs.struct('Intent', {
	scope: IntentScope,
	version: IntentVersion,
	appId: AppId,
}) as BcsStruct<
	{ scope: typeof IntentScope; version: typeof IntentVersion; appId: typeof AppId },
	'Intent'
>;

export function IntentMessage<T extends BcsType<any>>(
	T: T,
): BcsStruct<{ intent: typeof Intent; value: T }, `IntentMessage<${T['name']}>`> {
	return bcs.struct(`IntentMessage<${T.name}>`, {
		intent: Intent,
		value: T,
	}) as BcsStruct<{ intent: typeof Intent; value: T }, `IntentMessage<${T['name']}>`>;
}

export const CompressedSignature = bcs.enum('CompressedSignature', {
	ED25519: bcs.bytes(64),
	Secp256k1: bcs.bytes(64),
	Secp256r1: bcs.bytes(64),
	ZkLogin: bcs.byteVector(),
	Passkey: bcs.byteVector(),
}) as BcsEnum<
	{
		ED25519: BcsType<Uint8Array, Iterable<number>, `bytes[64]`>;
		Secp256k1: BcsType<Uint8Array, Iterable<number>, `bytes[64]`>;
		Secp256r1: BcsType<Uint8Array, Iterable<number>, `bytes[64]`>;
		ZkLogin: BcsType<Uint8Array, Iterable<number>, 'vector<u8>'>;
		Passkey: BcsType<Uint8Array, Iterable<number>, 'vector<u8>'>;
	},
	'CompressedSignature'
>;

export const PublicKey = bcs.enum('PublicKey', {
	ED25519: bcs.bytes(32),
	Secp256k1: bcs.bytes(33),
	Secp256r1: bcs.bytes(33),
	ZkLogin: bcs.byteVector(),
	Passkey: bcs.bytes(33),
}) as BcsEnum<
	{
		ED25519: BcsType<Uint8Array, Iterable<number>, `bytes[32]`>;
		Secp256k1: BcsType<Uint8Array, Iterable<number>, `bytes[33]`>;
		Secp256r1: BcsType<Uint8Array, Iterable<number>, `bytes[33]`>;
		ZkLogin: BcsType<Uint8Array, Iterable<number>, 'vector<u8>'>;
		Passkey: BcsType<Uint8Array, Iterable<number>, `bytes[33]`>;
	},
	'PublicKey'
>;

export const MultiSigPkMap = bcs.struct('MultiSigPkMap', {
	pubKey: PublicKey,
	weight: bcs.u8(),
}) as BcsStruct<
	{ pubKey: typeof PublicKey; weight: BcsType<number, number, 'u8'> },
	'MultiSigPkMap'
>;

export const MultiSigPublicKey = bcs.struct('MultiSigPublicKey', {
	pk_map: bcs.vector(MultiSigPkMap),
	threshold: bcs.u16(),
}) as BcsStruct<
	{
		pk_map: BcsType<
			(typeof MultiSigPkMap.$inferType)[],
			Iterable<typeof MultiSigPkMap.$inferInput> & { length: number },
			`vector<MultiSigPkMap>`
		>;
		threshold: BcsType<number, number, 'u16'>;
	},
	'MultiSigPublicKey'
>;

export const MultiSig = bcs.struct('MultiSig', {
	sigs: bcs.vector(CompressedSignature),
	bitmap: bcs.u16(),
	multisig_pk: MultiSigPublicKey,
}) as BcsStruct<
	{
		sigs: BcsType<
			(typeof CompressedSignature.$inferType)[],
			Iterable<typeof CompressedSignature.$inferInput> & { length: number },
			`vector<CompressedSignature>`
		>;
		bitmap: BcsType<number, number, 'u16'>;
		multisig_pk: typeof MultiSigPublicKey;
	},
	'MultiSig'
>;

export const base64String: BcsType<string, string | Uint8Array, 'vector<u8>'> = bcs
	.byteVector()
	.transform({
		input: (val: string | Uint8Array) => (typeof val === 'string' ? fromBase64(val) : val),
		output: (val) => toBase64(new Uint8Array(val)),
	});

export const SenderSignedTransaction = bcs.struct('SenderSignedTransaction', {
	intentMessage: IntentMessage(TransactionData),
	txSignatures: bcs.vector(base64String),
}) as BcsStruct<
	{
		intentMessage: BcsStruct<
			{ intent: typeof Intent; value: typeof TransactionData },
			`IntentMessage<TransactionData>`
		>;
		txSignatures: BcsType<
			string[],
			Iterable<string | Uint8Array> & { length: number },
			`vector<vector<u8>>`
		>;
	},
	'SenderSignedTransaction'
>;

export const SenderSignedData: BcsType<
	(typeof SenderSignedTransaction.$inferType)[],
	Iterable<typeof SenderSignedTransaction.$inferInput> & { length: number },
	'SenderSignedData'
> = bcs.vector(SenderSignedTransaction, {
	name: 'SenderSignedData',
});

export const PasskeyAuthenticator = bcs.struct('PasskeyAuthenticator', {
	authenticatorData: bcs.byteVector(),
	clientDataJson: bcs.string(),
	userSignature: bcs.byteVector(),
}) as BcsStruct<
	{
		authenticatorData: BcsType<Uint8Array, Iterable<number>, 'vector<u8>'>;
		clientDataJson: BcsType<string, string, 'string'>;
		userSignature: BcsType<Uint8Array, Iterable<number>, 'vector<u8>'>;
	},
	'PasskeyAuthenticator'
>;

// Rust: crates/sui-types/src/object.rs
export const MoveObjectType = bcs.enum('MoveObjectType', {
	Other: StructTag,
	GasCoin: null,
	StakedSui: null,
	Coin: TypeTag,
	AccumulatorBalanceWrapper: null,
}) as BcsEnum<
	{
		Other: typeof StructTag;
		GasCoin: null;
		StakedSui: null;
		Coin: typeof TypeTag;
		AccumulatorBalanceWrapper: null;
	},
	'MoveObjectType'
>;

// Rust: crates/sui-types/src/object.rs
export const TypeOrigin = bcs.struct('TypeOrigin', {
	moduleName: bcs.string(),
	datatypeName: bcs.string(),
	package: Address,
}) as BcsStruct<
	{
		moduleName: BcsType<string, string, 'string'>;
		datatypeName: BcsType<string, string, 'string'>;
		package: typeof Address;
	},
	'TypeOrigin'
>;

// Rust: crates/sui-types/src/object.rs
export const UpgradeInfo = bcs.struct('UpgradeInfo', {
	upgradedId: Address,
	upgradedVersion: bcs.u64(),
}) as BcsStruct<
	{
		upgradedId: typeof Address;
		upgradedVersion: BcsType<string, string | number | bigint, 'u64'>;
	},
	'UpgradeInfo'
>;

// Rust: crates/sui-types/src/object.rs
export const MovePackage = bcs.struct('MovePackage', {
	id: Address,
	version: bcs.u64(),
	moduleMap: bcs.map(bcs.string(), bcs.byteVector()),
	typeOriginTable: bcs.vector(TypeOrigin),
	linkageTable: bcs.map(Address, UpgradeInfo),
}) as BcsStruct<
	{
		id: typeof Address;
		version: BcsType<string, string | number | bigint, 'u64'>;
		moduleMap: BcsType<
			Map<string, Uint8Array>,
			Map<string, Iterable<number>>,
			`Map<string, vector<u8>>`
		>;
		typeOriginTable: BcsType<
			(typeof TypeOrigin.$inferType)[],
			Iterable<typeof TypeOrigin.$inferInput> & { length: number },
			`vector<TypeOrigin>`
		>;
		linkageTable: BcsType<
			Map<string, typeof UpgradeInfo.$inferType>,
			Map<string | Uint8Array, typeof UpgradeInfo.$inferInput>,
			`Map<bytes[${typeof SUI_ADDRESS_LENGTH}], UpgradeInfo>`
		>;
	},
	'MovePackage'
>;

// Rust: crates/sui-types/src/object.rs
export const MoveObject = bcs.struct('MoveObject', {
	type: MoveObjectType,
	hasPublicTransfer: bcs.bool(),
	version: bcs.u64(),
	contents: bcs.byteVector(),
}) as BcsStruct<
	{
		type: typeof MoveObjectType;
		hasPublicTransfer: BcsType<boolean, boolean, 'bool'>;
		version: BcsType<string, string | number | bigint, 'u64'>;
		contents: BcsType<Uint8Array, Iterable<number>, 'vector<u8>'>;
	},
	'MoveObject'
>;

// Rust: crates/sui-types/src/object.rs
export const Data = bcs.enum('Data', {
	Move: MoveObject,
	Package: MovePackage,
}) as BcsEnum<{ Move: typeof MoveObject; Package: typeof MovePackage }, 'Data'>;

// Rust: crates/sui-types/src/object.rs
export const ObjectInner = bcs.struct('ObjectInner', {
	data: Data,
	owner: Owner,
	previousTransaction: ObjectDigest,
	storageRebate: bcs.u64(),
}) as BcsStruct<
	{
		data: typeof Data;
		owner: typeof Owner;
		previousTransaction: typeof ObjectDigest;
		storageRebate: BcsType<string, string | number | bigint, 'u64'>;
	},
	'ObjectInner'
>;
