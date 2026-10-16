// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { BcsType, BcsTypeOptions } from '@mysten/bcs';
import { bcs, fromBase58, fromBase64, toBase58, toBase64, toHex } from '@mysten/bcs';

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

const HEX_NIBBLES = new Int8Array(128).fill(-1);
for (let i = 0; i < 16; i++) {
	HEX_NIBBLES['0123456789abcdef'.charCodeAt(i)] = i;
	HEX_NIBBLES['0123456789ABCDEF'.charCodeAt(i)] = i;
}
function hexNibble(code: number): number {
	return code < 128 ? HEX_NIBBLES[code] : -1;
}

// Same bytes as fromHex(normalizeSuiAddress(value)) for valid addresses, or null for invalid ones
function decodeAddress(value: string): Uint8Array<ArrayBuffer> | null {
	if (!value) {
		return null;
	}
	const start =
		value.length >= 2 && value[0] === '0' && (value[1] === 'x' || value[1] === 'X') ? 2 : 0;
	const digits = value.length - start;
	if (digits > SUI_ADDRESS_LENGTH * 2) {
		return null;
	}

	const bytes = new Uint8Array(SUI_ADDRESS_LENGTH);
	// Right-align the digits, as normalizeSuiAddress left-pads with zeros
	let byteIndex = SUI_ADDRESS_LENGTH - 1;
	let i = value.length - 1;
	for (; i >= start + 1; i -= 2) {
		const low = hexNibble(value.charCodeAt(i));
		const high = hexNibble(value.charCodeAt(i - 1));
		if (low < 0 || high < 0) {
			return null;
		}
		bytes[byteIndex--] = (high << 4) | low;
	}
	if (i === start) {
		const low = hexNibble(value.charCodeAt(i));
		if (low < 0) {
			return null;
		}
		bytes[byteIndex] = low;
	}

	return bytes;
}

export const Address = bcs.bytes(SUI_ADDRESS_LENGTH).transform({
	// Validation lives in input so string addresses are only decoded once per write; transform's
	// validate runs input, so validate() still rejects invalid addresses.
	input: (val: string | Uint8Array) => {
		if (typeof val === 'string') {
			const bytes = decodeAddress(val);
			if (!bytes) {
				throw new Error(`Invalid Sui address ${val}`);
			}
			return bytes;
		}
		const address = toHex(val);
		if (!address || !isValidSuiAddress(normalizeSuiAddress(address))) {
			throw new Error(`Invalid Sui address ${address}`);
		}
		return val;
	},
	output: (val) => `0x${toHex(val)}`,
});

export const ObjectDigest = bcs.byteVector().transform({
	name: 'ObjectDigest',
	// The length check lives in input so the digest is only base58-decoded once per write;
	// transform's validate runs input, so validate() still rejects digests of the wrong length.
	input: (value: string) => {
		const bytes = fromBase58(value);
		if (bytes.length !== 32) {
			throw new Error('ObjectDigest must be 32 bytes');
		}
		return bytes;
	},
	output: (value) => toBase58(value),
});

export const SuiObjectRef = bcs.struct('SuiObjectRef', {
	objectId: Address,
	version: bcs.u64(),
	digest: ObjectDigest,
});

// Rust: crates/sui-types/src/transaction.rs
// `Immutable` and `Mutable` encode as the bytes `false` and `true` do.
export const SharedObjectMutability = bcs.enum('SharedObjectMutability', {
	Immutable: null,
	Mutable: null,
	NonExclusiveWrite: null,
});

const SharedObjectRefStruct = bcs.struct('SharedObjectRef', {
	objectId: Address,
	initialSharedVersion: bcs.u64(),
	mutability: SharedObjectMutability,
});

/**
 * A shared object input. Non-exclusive write access, used only by system transactions, parses as
 * `mutable: false` with `mutability: 'NonExclusiveWrite'`.
 */
export const SharedObjectRef = SharedObjectRefStruct.transform({
	name: 'SharedObjectRef',
	input: ({
		mutable,
		mutability,
		...ref
	}: Omit<typeof SharedObjectRefStruct.$inferInput, 'mutability'> & {
		mutable: boolean;
		mutability?: 'NonExclusiveWrite';
	}): typeof SharedObjectRefStruct.$inferInput => ({
		...ref,
		mutability: {
			[mutability ?? (mutable ? 'Mutable' : 'Immutable')]: true,
		} as typeof SharedObjectMutability.$inferInput,
	}),
	output: ({
		mutability,
		...ref
	}): {
		objectId: string;
		initialSharedVersion: string;
		mutable: boolean;
		mutability?: 'NonExclusiveWrite';
	} =>
		mutability.$kind === 'NonExclusiveWrite'
			? { ...ref, mutable: false, mutability: 'NonExclusiveWrite' }
			: { ...ref, mutable: mutability.$kind === 'Mutable' },
});

export const ObjectArg = bcs.enum('ObjectArg', {
	ImmOrOwnedObject: SuiObjectRef,
	SharedObject: SharedObjectRef,
	Receiving: SuiObjectRef,
});

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
	Party: bcs.struct('PartyOwner', {
		startVersion: bcs.u64(),
		permissions: bcs.struct('Party', {
			// `ObjectPermissions` bitflags
			defaultPermissions: bcs.u64(),
			members: bcs.vector(bcs.tuple([Address, bcs.u64()])),
		}),
	}),
});

// Rust: crates/sui-types/src/transaction.rs
export const Reservation = bcs.enum('Reservation', {
	MaxAmountU64: bcs.u64(),
});

// Rust: crates/sui-types/src/transaction.rs
export const WithdrawalType = bcs.enum('WithdrawalType', {
	Balance: bcs.lazy(() => TypeTag),
});

// Rust: crates/sui-types/src/transaction.rs
export const WithdrawFrom = bcs.enum('WithdrawFrom', {
	Sender: null,
	Sponsor: null,
	SenderAllowance: bcs.struct('SenderAllowance', {
		funder: Address,
		allowance: Address,
	}),
});

// Rust: crates/sui-types/src/transaction.rs
export const FundsWithdrawal = bcs.struct('FundsWithdrawal', {
	reservation: Reservation,
	typeArg: WithdrawalType,
	withdrawFrom: WithdrawFrom,
});

export const CallArg = bcs.enum('CallArg', {
	Pure: bcs.struct('Pure', {
		bytes: bcs.byteVector().transform({
			input: (val: string | Uint8Array) => (typeof val === 'string' ? fromBase64(val) : val),
			output: (val) => toBase64(val),
		}),
	}),
	Object: ObjectArg,
	FundsWithdrawal: FundsWithdrawal,
});

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

export const TypeTag = InnerTypeTag.transform({
	input: (typeTag: string | TypeTagType) =>
		typeof typeTag === 'string' ? TypeTagSerializer.parseFromStr(typeTag, true) : typeTag,
	output: (typeTag: TypeTagType) => TypeTagSerializer.tagToString(typeTag),
});

export const Argument = bcs.enum('Argument', {
	GasCoin: null,
	Input: bcs.u16(),
	Result: bcs.u16(),
	NestedResult: bcs.tuple([bcs.u16(), bcs.u16()]),
});

export const ProgrammableMoveCall = bcs.struct('ProgrammableMoveCall', {
	package: Address,
	module: bcs.string(),
	function: bcs.string(),
	typeArguments: bcs.vector(TypeTag),
	arguments: bcs.vector(Argument),
});

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
				output: (val) => toBase64(val),
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
				output: (val) => toBase64(val),
			}),
		),
		dependencies: bcs.vector(Address),
		package: Address,
		ticket: Argument,
	}),
});

export const ProgrammableTransaction = bcs.struct('ProgrammableTransaction', {
	inputs: bcs.vector(CallArg),
	commands: bcs.vector(Command),
});

// Rust: crates/sui-types/src/transaction.rs
export const ValidDuring = bcs.struct('ValidDuring', {
	minEpoch: bcs.option(bcs.u64()),
	maxEpoch: bcs.option(bcs.u64()),
	minTimestamp: bcs.option(bcs.u64()),
	maxTimestamp: bcs.option(bcs.u64()),
	chain: ObjectDigest,
	nonce: bcs.u32(),
});

export function assertAllowedProposersNotEmpty(proposers: number[]) {
	if (proposers.length === 0) {
		throw new Error('Allowed proposers must not be empty');
	}

	return proposers;
}

export function assertAllowedProposersStrictlyIncreasing(proposers: number[]) {
	assertAllowedProposersNotEmpty(proposers);

	for (let i = 1; i < proposers.length; i++) {
		if (proposers[i] <= proposers[i - 1]) {
			throw new Error('Allowed proposers must be strictly increasing');
		}
	}

	return proposers;
}

// Upstream only checks sortedness in `validity_check`, on submission, so decoding an unsorted
// set must succeed. Empty is a deserialization error there, and here.
const AllowedProposerIndices = bcs.vector(bcs.u32()).transform({
	input: assertAllowedProposersStrictlyIncreasing,
	output: assertAllowedProposersNotEmpty,
});

// Rust: crates/sui-types/src/transaction.rs
export const AllowedProposers = bcs.struct('AllowedProposers', {
	epoch: bcs.u64(),
	proposers: AllowedProposerIndices,
});

// Rust: crates/sui-types/src/transaction.rs
export const Validity = bcs.struct('Validity', {
	minEpoch: bcs.option(bcs.u64()),
	maxEpoch: bcs.option(bcs.u64()),
	minTimestamp: bcs.option(bcs.u64()),
	maxTimestamp: bcs.option(bcs.u64()),
	chain: ObjectDigest,
	nonce: bcs.u32(),
	allowedProposers: bcs.option(AllowedProposers),
});

export const TransactionExpiration = bcs.enum('TransactionExpiration', {
	None: null,
	Epoch: unsafe_u64(),
	ValidDuring: ValidDuring,
	Validity,
});

export const StructTag = bcs.struct('StructTag', {
	address: Address,
	module: bcs.string(),
	name: bcs.string(),
	typeParams: bcs.vector(InnerTypeTag),
});

export const GasData = bcs.struct('GasData', {
	payment: bcs.vector(SuiObjectRef),
	owner: Address,
	price: bcs.u64(),
	budget: bcs.u64(),
});

export const IntentScope = bcs.enum('IntentScope', {
	TransactionData: null,
	TransactionEffects: null,
	CheckpointSummary: null,
	PersonalMessage: null,
});

export const IntentVersion = bcs.enum('IntentVersion', {
	V0: null,
});

export const AppId = bcs.enum('AppId', {
	Sui: null,
});

export const Intent = bcs.struct('Intent', {
	scope: IntentScope,
	version: IntentVersion,
	appId: AppId,
});

export function IntentMessage<T extends BcsType<any>>(T: T) {
	return bcs.struct(`IntentMessage<${T.name}>`, {
		intent: Intent,
		value: T,
	});
}

export const CompressedSignature = bcs.enum('CompressedSignature', {
	ED25519: bcs.bytes(64),
	Secp256k1: bcs.bytes(64),
	Secp256r1: bcs.bytes(64),
	ZkLogin: bcs.byteVector(),
	Passkey: bcs.byteVector(),
	MLDSA65: bcs.bytes(3309),
});

// Variant order must match Sui's `PublicKey` enum, which validators hash to
// derive a multisig address.
export const PublicKey = bcs.enum('PublicKey', {
	ED25519: bcs.bytes(32),
	Secp256k1: bcs.bytes(33),
	Secp256r1: bcs.bytes(33),
	ZkLogin: bcs.byteVector(),
	Passkey: bcs.bytes(33),
	MLDSA65: bcs.bytes(1952),
});

export const MultiSigPkMap = bcs.struct('MultiSigPkMap', {
	pubKey: PublicKey,
	weight: bcs.u8(),
});

export const MultiSigPublicKey = bcs.struct('MultiSigPublicKey', {
	pk_map: bcs.vector(MultiSigPkMap),
	threshold: bcs.u16(),
});

export const MultiSig = bcs.struct('MultiSig', {
	sigs: bcs.vector(CompressedSignature),
	bitmap: bcs.u16(),
	multisig_pk: MultiSigPublicKey,
});

export const base64String = bcs.byteVector().transform({
	input: (val: string | Uint8Array) => (typeof val === 'string' ? fromBase64(val) : val),
	output: (val) => toBase64(val),
});

export const PasskeyAuthenticator = bcs.struct('PasskeyAuthenticator', {
	authenticatorData: bcs.byteVector(),
	clientDataJson: bcs.string(),
	userSignature: bcs.byteVector(),
});

// Rust: crates/sui-types/src/object.rs
export const MoveObjectType = bcs.enum('MoveObjectType', {
	Other: StructTag,
	GasCoin: null,
	StakedSui: null,
	Coin: TypeTag,
	SuiBalanceAccumulatorField: null,
	BalanceAccumulatorField: TypeTag,
});

// Rust: crates/sui-types/src/object.rs
export const TypeOrigin = bcs.struct('TypeOrigin', {
	moduleName: bcs.string(),
	datatypeName: bcs.string(),
	package: Address,
});

// Rust: crates/sui-types/src/object.rs
export const UpgradeInfo = bcs.struct('UpgradeInfo', {
	upgradedId: Address,
	upgradedVersion: bcs.u64(),
});

// Rust: crates/sui-types/src/object.rs
export const MovePackage = bcs.struct('MovePackage', {
	id: Address,
	version: bcs.u64(),
	moduleMap: bcs.map(bcs.string(), bcs.byteVector()),
	typeOriginTable: bcs.vector(TypeOrigin),
	linkageTable: bcs.map(Address, UpgradeInfo),
});

// Rust: crates/sui-types/src/object.rs
export const MoveObject = bcs.struct('MoveObject', {
	type: MoveObjectType,
	hasPublicTransfer: bcs.bool(),
	version: bcs.u64(),
	contents: bcs.byteVector(),
});

// Rust: crates/sui-types/src/object.rs
export const Data = bcs.enum('Data', {
	Move: MoveObject,
	Package: MovePackage,
});

// Rust: crates/sui-types/src/object.rs
export const ObjectInner = bcs.struct('ObjectInner', {
	data: Data,
	owner: Owner,
	previousTransaction: ObjectDigest,
	storageRebate: bcs.u64(),
});
