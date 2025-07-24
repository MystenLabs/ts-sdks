// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { BinaryWriteOptions } from '@protobuf-ts/runtime';
import type { IBinaryWriter } from '@protobuf-ts/runtime';
import { WireType } from '@protobuf-ts/runtime';
import type { BinaryReadOptions } from '@protobuf-ts/runtime';
import type { IBinaryReader } from '@protobuf-ts/runtime';
import { UnknownFieldHandler } from '@protobuf-ts/runtime';
import type { PartialMessage } from '@protobuf-ts/runtime';
import { reflectionMergePartial } from '@protobuf-ts/runtime';
import { MessageType } from '@protobuf-ts/runtime';
import { SignatureScheme } from './signature_scheme.js';
import { Bcs } from './bcs.js';
/**
 * A signature from a user.
 *
 * @generated from protobuf message sui.rpc.v2beta2.UserSignature
 */
export interface UserSignature {
	/**
	 * This signature serialized as as BCS.
	 *
	 * When provided as input this will support both the form that is length
	 * prefixed as well as not length prefixed.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Bcs bcs = 1
	 */
	bcs?: Bcs;
	/**
	 * The signature scheme of this signature.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.SignatureScheme scheme = 2
	 */
	scheme?: SignatureScheme;
	/**
	 * @generated from protobuf oneof: signature
	 */
	signature:
		| {
				oneofKind: 'simple';
				/**
				 * Simple signature if scheme is ed25519 | secp256k1 | secp256r1.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.SimpleSignature simple = 3
				 */
				simple: SimpleSignature;
		  }
		| {
				oneofKind: 'multisig';
				/**
				 * The multisig aggregated signature if scheme is `MULTISIG`.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.MultisigAggregatedSignature multisig = 4
				 */
				multisig: MultisigAggregatedSignature;
		  }
		| {
				oneofKind: 'zklogin';
				/**
				 * The zklogin authenticator if scheme is `ZKLOGIN`.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ZkLoginAuthenticator zklogin = 5
				 */
				zklogin: ZkLoginAuthenticator;
		  }
		| {
				oneofKind: 'passkey';
				/**
				 * The passkey authenticator if scheme is `PASSKEY`.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.PasskeyAuthenticator passkey = 6
				 */
				passkey: PasskeyAuthenticator;
		  }
		| {
				oneofKind: undefined;
		  };
}
/**
 * Either an ed25519, secp256k1 or secp256r1 signature
 *
 * @generated from protobuf message sui.rpc.v2beta2.SimpleSignature
 */
export interface SimpleSignature {
	/**
	 * The signature scheme of this signature.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.SignatureScheme scheme = 1
	 */
	scheme?: SignatureScheme;
	/**
	 * Signature bytes
	 *
	 * @generated from protobuf field: optional bytes signature = 2
	 */
	signature?: Uint8Array;
	/**
	 * Public key bytes
	 *
	 * @generated from protobuf field: optional bytes public_key = 3
	 */
	publicKey?: Uint8Array;
}
/**
 * Public key equivalent for zklogin authenticators.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ZkLoginPublicIdentifier
 */
export interface ZkLoginPublicIdentifier {
	/**
	 * @generated from protobuf field: optional string iss = 1
	 */
	iss?: string;
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string address_seed = 2
	 */
	addressSeed?: string;
}
/**
 * Set of valid public keys for multisig committee members.
 *
 * @generated from protobuf message sui.rpc.v2beta2.MultisigMemberPublicKey
 */
export interface MultisigMemberPublicKey {
	/**
	 * The signature scheme of this public key.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.SignatureScheme scheme = 1
	 */
	scheme?: SignatureScheme;
	/**
	 * Public key bytes if scheme is ed25519 | secp256k1 | secp256r1 | passkey.
	 *
	 * @generated from protobuf field: optional bytes public_key = 2
	 */
	publicKey?: Uint8Array;
	/**
	 * A zklogin public identifier if scheme is zklogin.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ZkLoginPublicIdentifier zklogin = 3
	 */
	zklogin?: ZkLoginPublicIdentifier;
}
/**
 * A member in a multisig committee.
 *
 * @generated from protobuf message sui.rpc.v2beta2.MultisigMember
 */
export interface MultisigMember {
	/**
	 * The public key of the committee member.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MultisigMemberPublicKey public_key = 1
	 */
	publicKey?: MultisigMemberPublicKey;
	/**
	 * The weight of this member's signature.
	 *
	 * @generated from protobuf field: optional uint32 weight = 2
	 */
	weight?: number;
}
/**
 * A multisig committee.
 *
 * @generated from protobuf message sui.rpc.v2beta2.MultisigCommittee
 */
export interface MultisigCommittee {
	/**
	 * A list of committee members and their corresponding weight.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.MultisigMember members = 1
	 */
	members: MultisigMember[];
	/**
	 * The threshold of signatures needed to validate a signature from
	 * this committee.
	 *
	 * @generated from protobuf field: optional uint32 threshold = 2
	 */
	threshold?: number;
}
/**
 * Aggregated signature from members of a multisig committee.
 *
 * @generated from protobuf message sui.rpc.v2beta2.MultisigAggregatedSignature
 */
export interface MultisigAggregatedSignature {
	/**
	 * The plain signatures encoded with signature scheme.
	 *
	 * The signatures must be in the same order as they are listed in the committee.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.MultisigMemberSignature signatures = 1
	 */
	signatures: MultisigMemberSignature[];
	/**
	 * Bitmap indicating which committee members contributed to the
	 * signature.
	 *
	 * @generated from protobuf field: optional uint32 bitmap = 2
	 */
	bitmap?: number;
	/**
	 * If present, means this signature's on-chain format uses the old
	 * legacy multisig format.
	 *
	 * @generated from protobuf field: repeated uint32 legacy_bitmap = 3
	 */
	legacyBitmap: number[];
	/**
	 * The committee to use to validate this signature.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.MultisigCommittee committee = 4
	 */
	committee?: MultisigCommittee;
}
/**
 * A signature from a member of a multisig committee.
 *
 * @generated from protobuf message sui.rpc.v2beta2.MultisigMemberSignature
 */
export interface MultisigMemberSignature {
	/**
	 * The signature scheme of this signature.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.SignatureScheme scheme = 1
	 */
	scheme?: SignatureScheme;
	/**
	 * Signature bytes if scheme is ed25519 | secp256k1 | secp256r1.
	 *
	 * @generated from protobuf field: optional bytes signature = 2
	 */
	signature?: Uint8Array;
	/**
	 * The zklogin authenticator if scheme is `ZKLOGIN`.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ZkLoginAuthenticator zklogin = 3
	 */
	zklogin?: ZkLoginAuthenticator;
	/**
	 * The passkey authenticator if scheme is `PASSKEY`.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.PasskeyAuthenticator passkey = 4
	 */
	passkey?: PasskeyAuthenticator;
}
/**
 * A zklogin authenticator.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ZkLoginAuthenticator
 */
export interface ZkLoginAuthenticator {
	/**
	 * Zklogin proof and inputs required to perform proof verification.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ZkLoginInputs inputs = 1
	 */
	inputs?: ZkLoginInputs;
	/**
	 * Maximum epoch for which the proof is valid.
	 *
	 * @generated from protobuf field: optional uint64 max_epoch = 2
	 */
	maxEpoch?: bigint;
	/**
	 * User signature with the public key attested to by the provided proof.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.SimpleSignature signature = 3
	 */
	signature?: SimpleSignature;
}
/**
 * A zklogin groth16 proof and the required inputs to perform proof verification.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ZkLoginInputs
 */
export interface ZkLoginInputs {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ZkLoginProof proof_points = 1
	 */
	proofPoints?: ZkLoginProof;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ZkLoginClaim iss_base64_details = 2
	 */
	issBase64Details?: ZkLoginClaim;
	/**
	 * @generated from protobuf field: optional string header_base64 = 3
	 */
	headerBase64?: string;
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string address_seed = 4
	 */
	addressSeed?: string;
}
/**
 * A zklogin groth16 proof.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ZkLoginProof
 */
export interface ZkLoginProof {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.CircomG1 a = 1
	 */
	a?: CircomG1;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.CircomG2 b = 2
	 */
	b?: CircomG2;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.CircomG1 c = 3
	 */
	c?: CircomG1;
}
/**
 * A claim of the iss in a zklogin proof.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ZkLoginClaim
 */
export interface ZkLoginClaim {
	/**
	 * @generated from protobuf field: optional string value = 1
	 */
	value?: string;
	/**
	 * @generated from protobuf field: optional uint32 index_mod_4 = 2
	 */
	indexMod4?: number;
}
/**
 * A G1 point.
 *
 * @generated from protobuf message sui.rpc.v2beta2.CircomG1
 */
export interface CircomG1 {
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string e0 = 1
	 */
	e0?: string;
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string e1 = 2
	 */
	e1?: string;
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string e2 = 3
	 */
	e2?: string;
}
/**
 * A G2 point.
 *
 * @generated from protobuf message sui.rpc.v2beta2.CircomG2
 */
export interface CircomG2 {
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string e00 = 1
	 */
	e00?: string;
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string e01 = 2
	 */
	e01?: string;
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string e10 = 3
	 */
	e10?: string;
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string e11 = 4
	 */
	e11?: string;
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string e20 = 5
	 */
	e20?: string;
	/**
	 * base10 encoded Bn254FieldElement
	 *
	 * @generated from protobuf field: optional string e21 = 6
	 */
	e21?: string;
}
/**
 * A passkey authenticator.
 *
 * See
 * [struct.PasskeyAuthenticator](https://mystenlabs.github.io/sui-rust-sdk/sui_sdk_types/struct.PasskeyAuthenticator.html#bcs)
 * for more information on the requirements on the shape of the
 * `client_data_json` field.
 *
 * @generated from protobuf message sui.rpc.v2beta2.PasskeyAuthenticator
 */
export interface PasskeyAuthenticator {
	/**
	 * Opaque authenticator data for this passkey signature.
	 *
	 * See [Authenticator Data](https://www.w3.org/TR/webauthn-2/#sctn-authenticator-data) for
	 * more information on this field.
	 *
	 * @generated from protobuf field: optional bytes authenticator_data = 1
	 */
	authenticatorData?: Uint8Array;
	/**
	 * Structured, unparsed, JSON for this passkey signature.
	 *
	 * See [CollectedClientData](https://www.w3.org/TR/webauthn-2/#dictdef-collectedclientdata)
	 * for more information on this field.
	 *
	 * @generated from protobuf field: optional string client_data_json = 2
	 */
	clientDataJson?: string;
	/**
	 * A secp256r1 signature.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.SimpleSignature signature = 3
	 */
	signature?: SimpleSignature;
}
/**
 * The validator set for a particular epoch.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ValidatorCommittee
 */
export interface ValidatorCommittee {
	/**
	 * The epoch where this committee governs.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 1
	 */
	epoch?: bigint;
	/**
	 * The committee members.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.ValidatorCommitteeMember members = 2
	 */
	members: ValidatorCommitteeMember[];
}
/**
 * A member of a validator committee.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ValidatorCommitteeMember
 */
export interface ValidatorCommitteeMember {
	/**
	 * The 96-byte Bls12381 public key for this validator.
	 *
	 * @generated from protobuf field: optional bytes public_key = 1
	 */
	publicKey?: Uint8Array;
	/**
	 * voting weight this validator possesses.
	 *
	 * @generated from protobuf field: optional uint64 weight = 2
	 */
	weight?: bigint;
}
/**
 * / An aggregated signature from multiple validators.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ValidatorAggregatedSignature
 */
export interface ValidatorAggregatedSignature {
	/**
	 * The epoch when this signature was produced.
	 *
	 * This can be used to lookup the `ValidatorCommittee` from this epoch
	 * to verify this signature.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 1
	 */
	epoch?: bigint;
	/**
	 * The 48-byte Bls12381 aggregated signature.
	 *
	 * @generated from protobuf field: optional bytes signature = 2
	 */
	signature?: Uint8Array;
	/**
	 * Bitmap indicating which members of the committee contributed to
	 * this signature.
	 *
	 * @generated from protobuf field: repeated uint32 bitmap = 3
	 */
	bitmap: number[];
}
// @generated message type with reflection information, may provide speed optimized methods
class UserSignature$Type extends MessageType<UserSignature> {
	constructor() {
		super('sui.rpc.v2beta2.UserSignature', [
			{ no: 1, name: 'bcs', kind: 'message', T: () => Bcs },
			{
				no: 2,
				name: 'scheme',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.SignatureScheme', SignatureScheme],
			},
			{ no: 3, name: 'simple', kind: 'message', oneof: 'signature', T: () => SimpleSignature },
			{
				no: 4,
				name: 'multisig',
				kind: 'message',
				oneof: 'signature',
				T: () => MultisigAggregatedSignature,
			},
			{
				no: 5,
				name: 'zklogin',
				kind: 'message',
				oneof: 'signature',
				T: () => ZkLoginAuthenticator,
			},
			{
				no: 6,
				name: 'passkey',
				kind: 'message',
				oneof: 'signature',
				T: () => PasskeyAuthenticator,
			},
		]);
	}
	create(value?: PartialMessage<UserSignature>): UserSignature {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.signature = { oneofKind: undefined };
		if (value !== undefined) reflectionMergePartial<UserSignature>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: UserSignature,
	): UserSignature {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Bcs bcs */ 1:
					message.bcs = Bcs.internalBinaryRead(reader, reader.uint32(), options, message.bcs);
					break;
				case /* optional sui.rpc.v2beta2.SignatureScheme scheme */ 2:
					message.scheme = reader.int32();
					break;
				case /* sui.rpc.v2beta2.SimpleSignature simple */ 3:
					message.signature = {
						oneofKind: 'simple',
						simple: SimpleSignature.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.signature as any).simple,
						),
					};
					break;
				case /* sui.rpc.v2beta2.MultisigAggregatedSignature multisig */ 4:
					message.signature = {
						oneofKind: 'multisig',
						multisig: MultisigAggregatedSignature.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.signature as any).multisig,
						),
					};
					break;
				case /* sui.rpc.v2beta2.ZkLoginAuthenticator zklogin */ 5:
					message.signature = {
						oneofKind: 'zklogin',
						zklogin: ZkLoginAuthenticator.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.signature as any).zklogin,
						),
					};
					break;
				case /* sui.rpc.v2beta2.PasskeyAuthenticator passkey */ 6:
					message.signature = {
						oneofKind: 'passkey',
						passkey: PasskeyAuthenticator.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.signature as any).passkey,
						),
					};
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: UserSignature,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Bcs bcs = 1; */
		if (message.bcs)
			Bcs.internalBinaryWrite(
				message.bcs,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.SignatureScheme scheme = 2; */
		if (message.scheme !== undefined) writer.tag(2, WireType.Varint).int32(message.scheme);
		/* sui.rpc.v2beta2.SimpleSignature simple = 3; */
		if (message.signature.oneofKind === 'simple')
			SimpleSignature.internalBinaryWrite(
				message.signature.simple,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.MultisigAggregatedSignature multisig = 4; */
		if (message.signature.oneofKind === 'multisig')
			MultisigAggregatedSignature.internalBinaryWrite(
				message.signature.multisig,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.ZkLoginAuthenticator zklogin = 5; */
		if (message.signature.oneofKind === 'zklogin')
			ZkLoginAuthenticator.internalBinaryWrite(
				message.signature.zklogin,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* sui.rpc.v2beta2.PasskeyAuthenticator passkey = 6; */
		if (message.signature.oneofKind === 'passkey')
			PasskeyAuthenticator.internalBinaryWrite(
				message.signature.passkey,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.UserSignature
 */
export const UserSignature = new UserSignature$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SimpleSignature$Type extends MessageType<SimpleSignature> {
	constructor() {
		super('sui.rpc.v2beta2.SimpleSignature', [
			{
				no: 1,
				name: 'scheme',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.SignatureScheme', SignatureScheme],
			},
			{ no: 2, name: 'signature', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 3, name: 'public_key', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<SimpleSignature>): SimpleSignature {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<SimpleSignature>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: SimpleSignature,
	): SimpleSignature {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.SignatureScheme scheme */ 1:
					message.scheme = reader.int32();
					break;
				case /* optional bytes signature */ 2:
					message.signature = reader.bytes();
					break;
				case /* optional bytes public_key */ 3:
					message.publicKey = reader.bytes();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: SimpleSignature,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.SignatureScheme scheme = 1; */
		if (message.scheme !== undefined) writer.tag(1, WireType.Varint).int32(message.scheme);
		/* optional bytes signature = 2; */
		if (message.signature !== undefined)
			writer.tag(2, WireType.LengthDelimited).bytes(message.signature);
		/* optional bytes public_key = 3; */
		if (message.publicKey !== undefined)
			writer.tag(3, WireType.LengthDelimited).bytes(message.publicKey);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.SimpleSignature
 */
export const SimpleSignature = new SimpleSignature$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ZkLoginPublicIdentifier$Type extends MessageType<ZkLoginPublicIdentifier> {
	constructor() {
		super('sui.rpc.v2beta2.ZkLoginPublicIdentifier', [
			{ no: 1, name: 'iss', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'address_seed', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<ZkLoginPublicIdentifier>): ZkLoginPublicIdentifier {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ZkLoginPublicIdentifier>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ZkLoginPublicIdentifier,
	): ZkLoginPublicIdentifier {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string iss */ 1:
					message.iss = reader.string();
					break;
				case /* optional string address_seed */ 2:
					message.addressSeed = reader.string();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ZkLoginPublicIdentifier,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string iss = 1; */
		if (message.iss !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.iss);
		/* optional string address_seed = 2; */
		if (message.addressSeed !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.addressSeed);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ZkLoginPublicIdentifier
 */
export const ZkLoginPublicIdentifier = new ZkLoginPublicIdentifier$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MultisigMemberPublicKey$Type extends MessageType<MultisigMemberPublicKey> {
	constructor() {
		super('sui.rpc.v2beta2.MultisigMemberPublicKey', [
			{
				no: 1,
				name: 'scheme',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.SignatureScheme', SignatureScheme],
			},
			{ no: 2, name: 'public_key', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 3, name: 'zklogin', kind: 'message', T: () => ZkLoginPublicIdentifier },
		]);
	}
	create(value?: PartialMessage<MultisigMemberPublicKey>): MultisigMemberPublicKey {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<MultisigMemberPublicKey>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MultisigMemberPublicKey,
	): MultisigMemberPublicKey {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.SignatureScheme scheme */ 1:
					message.scheme = reader.int32();
					break;
				case /* optional bytes public_key */ 2:
					message.publicKey = reader.bytes();
					break;
				case /* optional sui.rpc.v2beta2.ZkLoginPublicIdentifier zklogin */ 3:
					message.zklogin = ZkLoginPublicIdentifier.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.zklogin,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: MultisigMemberPublicKey,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.SignatureScheme scheme = 1; */
		if (message.scheme !== undefined) writer.tag(1, WireType.Varint).int32(message.scheme);
		/* optional bytes public_key = 2; */
		if (message.publicKey !== undefined)
			writer.tag(2, WireType.LengthDelimited).bytes(message.publicKey);
		/* optional sui.rpc.v2beta2.ZkLoginPublicIdentifier zklogin = 3; */
		if (message.zklogin)
			ZkLoginPublicIdentifier.internalBinaryWrite(
				message.zklogin,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.MultisigMemberPublicKey
 */
export const MultisigMemberPublicKey = new MultisigMemberPublicKey$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MultisigMember$Type extends MessageType<MultisigMember> {
	constructor() {
		super('sui.rpc.v2beta2.MultisigMember', [
			{ no: 1, name: 'public_key', kind: 'message', T: () => MultisigMemberPublicKey },
			{ no: 2, name: 'weight', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
		]);
	}
	create(value?: PartialMessage<MultisigMember>): MultisigMember {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<MultisigMember>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MultisigMember,
	): MultisigMember {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.MultisigMemberPublicKey public_key */ 1:
					message.publicKey = MultisigMemberPublicKey.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.publicKey,
					);
					break;
				case /* optional uint32 weight */ 2:
					message.weight = reader.uint32();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: MultisigMember,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.MultisigMemberPublicKey public_key = 1; */
		if (message.publicKey)
			MultisigMemberPublicKey.internalBinaryWrite(
				message.publicKey,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint32 weight = 2; */
		if (message.weight !== undefined) writer.tag(2, WireType.Varint).uint32(message.weight);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.MultisigMember
 */
export const MultisigMember = new MultisigMember$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MultisigCommittee$Type extends MessageType<MultisigCommittee> {
	constructor() {
		super('sui.rpc.v2beta2.MultisigCommittee', [
			{
				no: 1,
				name: 'members',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => MultisigMember,
			},
			{ no: 2, name: 'threshold', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
		]);
	}
	create(value?: PartialMessage<MultisigCommittee>): MultisigCommittee {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.members = [];
		if (value !== undefined) reflectionMergePartial<MultisigCommittee>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MultisigCommittee,
	): MultisigCommittee {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.MultisigMember members */ 1:
					message.members.push(MultisigMember.internalBinaryRead(reader, reader.uint32(), options));
					break;
				case /* optional uint32 threshold */ 2:
					message.threshold = reader.uint32();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: MultisigCommittee,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.MultisigMember members = 1; */
		for (let i = 0; i < message.members.length; i++)
			MultisigMember.internalBinaryWrite(
				message.members[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint32 threshold = 2; */
		if (message.threshold !== undefined) writer.tag(2, WireType.Varint).uint32(message.threshold);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.MultisigCommittee
 */
export const MultisigCommittee = new MultisigCommittee$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MultisigAggregatedSignature$Type extends MessageType<MultisigAggregatedSignature> {
	constructor() {
		super('sui.rpc.v2beta2.MultisigAggregatedSignature', [
			{
				no: 1,
				name: 'signatures',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => MultisigMemberSignature,
			},
			{ no: 2, name: 'bitmap', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{
				no: 3,
				name: 'legacy_bitmap',
				kind: 'scalar',
				repeat: 1 /*RepeatType.PACKED*/,
				T: 13 /*ScalarType.UINT32*/,
			},
			{ no: 4, name: 'committee', kind: 'message', T: () => MultisigCommittee },
		]);
	}
	create(value?: PartialMessage<MultisigAggregatedSignature>): MultisigAggregatedSignature {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.signatures = [];
		message.legacyBitmap = [];
		if (value !== undefined)
			reflectionMergePartial<MultisigAggregatedSignature>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MultisigAggregatedSignature,
	): MultisigAggregatedSignature {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.MultisigMemberSignature signatures */ 1:
					message.signatures.push(
						MultisigMemberSignature.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional uint32 bitmap */ 2:
					message.bitmap = reader.uint32();
					break;
				case /* repeated uint32 legacy_bitmap */ 3:
					if (wireType === WireType.LengthDelimited)
						for (let e = reader.int32() + reader.pos; reader.pos < e; )
							message.legacyBitmap.push(reader.uint32());
					else message.legacyBitmap.push(reader.uint32());
					break;
				case /* optional sui.rpc.v2beta2.MultisigCommittee committee */ 4:
					message.committee = MultisigCommittee.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.committee,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: MultisigAggregatedSignature,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.MultisigMemberSignature signatures = 1; */
		for (let i = 0; i < message.signatures.length; i++)
			MultisigMemberSignature.internalBinaryWrite(
				message.signatures[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint32 bitmap = 2; */
		if (message.bitmap !== undefined) writer.tag(2, WireType.Varint).uint32(message.bitmap);
		/* repeated uint32 legacy_bitmap = 3; */
		if (message.legacyBitmap.length) {
			writer.tag(3, WireType.LengthDelimited).fork();
			for (let i = 0; i < message.legacyBitmap.length; i++) writer.uint32(message.legacyBitmap[i]);
			writer.join();
		}
		/* optional sui.rpc.v2beta2.MultisigCommittee committee = 4; */
		if (message.committee)
			MultisigCommittee.internalBinaryWrite(
				message.committee,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.MultisigAggregatedSignature
 */
export const MultisigAggregatedSignature = new MultisigAggregatedSignature$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MultisigMemberSignature$Type extends MessageType<MultisigMemberSignature> {
	constructor() {
		super('sui.rpc.v2beta2.MultisigMemberSignature', [
			{
				no: 1,
				name: 'scheme',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.SignatureScheme', SignatureScheme],
			},
			{ no: 2, name: 'signature', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 3, name: 'zklogin', kind: 'message', T: () => ZkLoginAuthenticator },
			{ no: 4, name: 'passkey', kind: 'message', T: () => PasskeyAuthenticator },
		]);
	}
	create(value?: PartialMessage<MultisigMemberSignature>): MultisigMemberSignature {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<MultisigMemberSignature>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MultisigMemberSignature,
	): MultisigMemberSignature {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.SignatureScheme scheme */ 1:
					message.scheme = reader.int32();
					break;
				case /* optional bytes signature */ 2:
					message.signature = reader.bytes();
					break;
				case /* optional sui.rpc.v2beta2.ZkLoginAuthenticator zklogin */ 3:
					message.zklogin = ZkLoginAuthenticator.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.zklogin,
					);
					break;
				case /* optional sui.rpc.v2beta2.PasskeyAuthenticator passkey */ 4:
					message.passkey = PasskeyAuthenticator.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.passkey,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: MultisigMemberSignature,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.SignatureScheme scheme = 1; */
		if (message.scheme !== undefined) writer.tag(1, WireType.Varint).int32(message.scheme);
		/* optional bytes signature = 2; */
		if (message.signature !== undefined)
			writer.tag(2, WireType.LengthDelimited).bytes(message.signature);
		/* optional sui.rpc.v2beta2.ZkLoginAuthenticator zklogin = 3; */
		if (message.zklogin)
			ZkLoginAuthenticator.internalBinaryWrite(
				message.zklogin,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.PasskeyAuthenticator passkey = 4; */
		if (message.passkey)
			PasskeyAuthenticator.internalBinaryWrite(
				message.passkey,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.MultisigMemberSignature
 */
export const MultisigMemberSignature = new MultisigMemberSignature$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ZkLoginAuthenticator$Type extends MessageType<ZkLoginAuthenticator> {
	constructor() {
		super('sui.rpc.v2beta2.ZkLoginAuthenticator', [
			{ no: 1, name: 'inputs', kind: 'message', T: () => ZkLoginInputs },
			{
				no: 2,
				name: 'max_epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 3, name: 'signature', kind: 'message', T: () => SimpleSignature },
		]);
	}
	create(value?: PartialMessage<ZkLoginAuthenticator>): ZkLoginAuthenticator {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ZkLoginAuthenticator>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ZkLoginAuthenticator,
	): ZkLoginAuthenticator {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.ZkLoginInputs inputs */ 1:
					message.inputs = ZkLoginInputs.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.inputs,
					);
					break;
				case /* optional uint64 max_epoch */ 2:
					message.maxEpoch = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.SimpleSignature signature */ 3:
					message.signature = SimpleSignature.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.signature,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ZkLoginAuthenticator,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.ZkLoginInputs inputs = 1; */
		if (message.inputs)
			ZkLoginInputs.internalBinaryWrite(
				message.inputs,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 max_epoch = 2; */
		if (message.maxEpoch !== undefined) writer.tag(2, WireType.Varint).uint64(message.maxEpoch);
		/* optional sui.rpc.v2beta2.SimpleSignature signature = 3; */
		if (message.signature)
			SimpleSignature.internalBinaryWrite(
				message.signature,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ZkLoginAuthenticator
 */
export const ZkLoginAuthenticator = new ZkLoginAuthenticator$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ZkLoginInputs$Type extends MessageType<ZkLoginInputs> {
	constructor() {
		super('sui.rpc.v2beta2.ZkLoginInputs', [
			{ no: 1, name: 'proof_points', kind: 'message', T: () => ZkLoginProof },
			{ no: 2, name: 'iss_base64_details', kind: 'message', T: () => ZkLoginClaim },
			{ no: 3, name: 'header_base64', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'address_seed', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<ZkLoginInputs>): ZkLoginInputs {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ZkLoginInputs>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ZkLoginInputs,
	): ZkLoginInputs {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.ZkLoginProof proof_points */ 1:
					message.proofPoints = ZkLoginProof.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.proofPoints,
					);
					break;
				case /* optional sui.rpc.v2beta2.ZkLoginClaim iss_base64_details */ 2:
					message.issBase64Details = ZkLoginClaim.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.issBase64Details,
					);
					break;
				case /* optional string header_base64 */ 3:
					message.headerBase64 = reader.string();
					break;
				case /* optional string address_seed */ 4:
					message.addressSeed = reader.string();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ZkLoginInputs,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.ZkLoginProof proof_points = 1; */
		if (message.proofPoints)
			ZkLoginProof.internalBinaryWrite(
				message.proofPoints,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.ZkLoginClaim iss_base64_details = 2; */
		if (message.issBase64Details)
			ZkLoginClaim.internalBinaryWrite(
				message.issBase64Details,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string header_base64 = 3; */
		if (message.headerBase64 !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.headerBase64);
		/* optional string address_seed = 4; */
		if (message.addressSeed !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.addressSeed);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ZkLoginInputs
 */
export const ZkLoginInputs = new ZkLoginInputs$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ZkLoginProof$Type extends MessageType<ZkLoginProof> {
	constructor() {
		super('sui.rpc.v2beta2.ZkLoginProof', [
			{ no: 1, name: 'a', kind: 'message', T: () => CircomG1 },
			{ no: 2, name: 'b', kind: 'message', T: () => CircomG2 },
			{ no: 3, name: 'c', kind: 'message', T: () => CircomG1 },
		]);
	}
	create(value?: PartialMessage<ZkLoginProof>): ZkLoginProof {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ZkLoginProof>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ZkLoginProof,
	): ZkLoginProof {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.CircomG1 a */ 1:
					message.a = CircomG1.internalBinaryRead(reader, reader.uint32(), options, message.a);
					break;
				case /* optional sui.rpc.v2beta2.CircomG2 b */ 2:
					message.b = CircomG2.internalBinaryRead(reader, reader.uint32(), options, message.b);
					break;
				case /* optional sui.rpc.v2beta2.CircomG1 c */ 3:
					message.c = CircomG1.internalBinaryRead(reader, reader.uint32(), options, message.c);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ZkLoginProof,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.CircomG1 a = 1; */
		if (message.a)
			CircomG1.internalBinaryWrite(
				message.a,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.CircomG2 b = 2; */
		if (message.b)
			CircomG2.internalBinaryWrite(
				message.b,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.CircomG1 c = 3; */
		if (message.c)
			CircomG1.internalBinaryWrite(
				message.c,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ZkLoginProof
 */
export const ZkLoginProof = new ZkLoginProof$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ZkLoginClaim$Type extends MessageType<ZkLoginClaim> {
	constructor() {
		super('sui.rpc.v2beta2.ZkLoginClaim', [
			{ no: 1, name: 'value', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'index_mod_4', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
		]);
	}
	create(value?: PartialMessage<ZkLoginClaim>): ZkLoginClaim {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ZkLoginClaim>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ZkLoginClaim,
	): ZkLoginClaim {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string value */ 1:
					message.value = reader.string();
					break;
				case /* optional uint32 index_mod_4 */ 2:
					message.indexMod4 = reader.uint32();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ZkLoginClaim,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string value = 1; */
		if (message.value !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.value);
		/* optional uint32 index_mod_4 = 2; */
		if (message.indexMod4 !== undefined) writer.tag(2, WireType.Varint).uint32(message.indexMod4);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ZkLoginClaim
 */
export const ZkLoginClaim = new ZkLoginClaim$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CircomG1$Type extends MessageType<CircomG1> {
	constructor() {
		super('sui.rpc.v2beta2.CircomG1', [
			{ no: 1, name: 'e0', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'e1', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'e2', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<CircomG1>): CircomG1 {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CircomG1>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CircomG1,
	): CircomG1 {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string e0 */ 1:
					message.e0 = reader.string();
					break;
				case /* optional string e1 */ 2:
					message.e1 = reader.string();
					break;
				case /* optional string e2 */ 3:
					message.e2 = reader.string();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: CircomG1,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string e0 = 1; */
		if (message.e0 !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.e0);
		/* optional string e1 = 2; */
		if (message.e1 !== undefined) writer.tag(2, WireType.LengthDelimited).string(message.e1);
		/* optional string e2 = 3; */
		if (message.e2 !== undefined) writer.tag(3, WireType.LengthDelimited).string(message.e2);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.CircomG1
 */
export const CircomG1 = new CircomG1$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CircomG2$Type extends MessageType<CircomG2> {
	constructor() {
		super('sui.rpc.v2beta2.CircomG2', [
			{ no: 1, name: 'e00', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'e01', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'e10', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'e11', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'e20', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 6, name: 'e21', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<CircomG2>): CircomG2 {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CircomG2>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CircomG2,
	): CircomG2 {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string e00 */ 1:
					message.e00 = reader.string();
					break;
				case /* optional string e01 */ 2:
					message.e01 = reader.string();
					break;
				case /* optional string e10 */ 3:
					message.e10 = reader.string();
					break;
				case /* optional string e11 */ 4:
					message.e11 = reader.string();
					break;
				case /* optional string e20 */ 5:
					message.e20 = reader.string();
					break;
				case /* optional string e21 */ 6:
					message.e21 = reader.string();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: CircomG2,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string e00 = 1; */
		if (message.e00 !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.e00);
		/* optional string e01 = 2; */
		if (message.e01 !== undefined) writer.tag(2, WireType.LengthDelimited).string(message.e01);
		/* optional string e10 = 3; */
		if (message.e10 !== undefined) writer.tag(3, WireType.LengthDelimited).string(message.e10);
		/* optional string e11 = 4; */
		if (message.e11 !== undefined) writer.tag(4, WireType.LengthDelimited).string(message.e11);
		/* optional string e20 = 5; */
		if (message.e20 !== undefined) writer.tag(5, WireType.LengthDelimited).string(message.e20);
		/* optional string e21 = 6; */
		if (message.e21 !== undefined) writer.tag(6, WireType.LengthDelimited).string(message.e21);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.CircomG2
 */
export const CircomG2 = new CircomG2$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PasskeyAuthenticator$Type extends MessageType<PasskeyAuthenticator> {
	constructor() {
		super('sui.rpc.v2beta2.PasskeyAuthenticator', [
			{ no: 1, name: 'authenticator_data', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 2, name: 'client_data_json', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'signature', kind: 'message', T: () => SimpleSignature },
		]);
	}
	create(value?: PartialMessage<PasskeyAuthenticator>): PasskeyAuthenticator {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<PasskeyAuthenticator>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: PasskeyAuthenticator,
	): PasskeyAuthenticator {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional bytes authenticator_data */ 1:
					message.authenticatorData = reader.bytes();
					break;
				case /* optional string client_data_json */ 2:
					message.clientDataJson = reader.string();
					break;
				case /* optional sui.rpc.v2beta2.SimpleSignature signature */ 3:
					message.signature = SimpleSignature.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.signature,
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: PasskeyAuthenticator,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional bytes authenticator_data = 1; */
		if (message.authenticatorData !== undefined)
			writer.tag(1, WireType.LengthDelimited).bytes(message.authenticatorData);
		/* optional string client_data_json = 2; */
		if (message.clientDataJson !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.clientDataJson);
		/* optional sui.rpc.v2beta2.SimpleSignature signature = 3; */
		if (message.signature)
			SimpleSignature.internalBinaryWrite(
				message.signature,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.PasskeyAuthenticator
 */
export const PasskeyAuthenticator = new PasskeyAuthenticator$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ValidatorCommittee$Type extends MessageType<ValidatorCommittee> {
	constructor() {
		super('sui.rpc.v2beta2.ValidatorCommittee', [
			{
				no: 1,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'members',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => ValidatorCommitteeMember,
			},
		]);
	}
	create(value?: PartialMessage<ValidatorCommittee>): ValidatorCommittee {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.members = [];
		if (value !== undefined) reflectionMergePartial<ValidatorCommittee>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ValidatorCommittee,
	): ValidatorCommittee {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 epoch */ 1:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* repeated sui.rpc.v2beta2.ValidatorCommitteeMember members */ 2:
					message.members.push(
						ValidatorCommitteeMember.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ValidatorCommittee,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 epoch = 1; */
		if (message.epoch !== undefined) writer.tag(1, WireType.Varint).uint64(message.epoch);
		/* repeated sui.rpc.v2beta2.ValidatorCommitteeMember members = 2; */
		for (let i = 0; i < message.members.length; i++)
			ValidatorCommitteeMember.internalBinaryWrite(
				message.members[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ValidatorCommittee
 */
export const ValidatorCommittee = new ValidatorCommittee$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ValidatorCommitteeMember$Type extends MessageType<ValidatorCommitteeMember> {
	constructor() {
		super('sui.rpc.v2beta2.ValidatorCommitteeMember', [
			{ no: 1, name: 'public_key', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{
				no: 2,
				name: 'weight',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<ValidatorCommitteeMember>): ValidatorCommitteeMember {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ValidatorCommitteeMember>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ValidatorCommitteeMember,
	): ValidatorCommitteeMember {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional bytes public_key */ 1:
					message.publicKey = reader.bytes();
					break;
				case /* optional uint64 weight */ 2:
					message.weight = reader.uint64().toBigInt();
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ValidatorCommitteeMember,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional bytes public_key = 1; */
		if (message.publicKey !== undefined)
			writer.tag(1, WireType.LengthDelimited).bytes(message.publicKey);
		/* optional uint64 weight = 2; */
		if (message.weight !== undefined) writer.tag(2, WireType.Varint).uint64(message.weight);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ValidatorCommitteeMember
 */
export const ValidatorCommitteeMember = new ValidatorCommitteeMember$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ValidatorAggregatedSignature$Type extends MessageType<ValidatorAggregatedSignature> {
	constructor() {
		super('sui.rpc.v2beta2.ValidatorAggregatedSignature', [
			{
				no: 1,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 2, name: 'signature', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{
				no: 3,
				name: 'bitmap',
				kind: 'scalar',
				repeat: 1 /*RepeatType.PACKED*/,
				T: 13 /*ScalarType.UINT32*/,
			},
		]);
	}
	create(value?: PartialMessage<ValidatorAggregatedSignature>): ValidatorAggregatedSignature {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.bitmap = [];
		if (value !== undefined)
			reflectionMergePartial<ValidatorAggregatedSignature>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ValidatorAggregatedSignature,
	): ValidatorAggregatedSignature {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 epoch */ 1:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional bytes signature */ 2:
					message.signature = reader.bytes();
					break;
				case /* repeated uint32 bitmap */ 3:
					if (wireType === WireType.LengthDelimited)
						for (let e = reader.int32() + reader.pos; reader.pos < e; )
							message.bitmap.push(reader.uint32());
					else message.bitmap.push(reader.uint32());
					break;
				default:
					let u = options.readUnknownField;
					if (u === 'throw')
						throw new globalThis.Error(
							`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`,
						);
					let d = reader.skip(wireType);
					if (u !== false)
						(u === true ? UnknownFieldHandler.onRead : u)(
							this.typeName,
							message,
							fieldNo,
							wireType,
							d,
						);
			}
		}
		return message;
	}
	internalBinaryWrite(
		message: ValidatorAggregatedSignature,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 epoch = 1; */
		if (message.epoch !== undefined) writer.tag(1, WireType.Varint).uint64(message.epoch);
		/* optional bytes signature = 2; */
		if (message.signature !== undefined)
			writer.tag(2, WireType.LengthDelimited).bytes(message.signature);
		/* repeated uint32 bitmap = 3; */
		if (message.bitmap.length) {
			writer.tag(3, WireType.LengthDelimited).fork();
			for (let i = 0; i < message.bitmap.length; i++) writer.uint32(message.bitmap[i]);
			writer.join();
		}
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ValidatorAggregatedSignature
 */
export const ValidatorAggregatedSignature = new ValidatorAggregatedSignature$Type();
