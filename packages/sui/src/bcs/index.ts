// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';

import {
	Address,
	AppId,
	Argument,
	CallArg,
	Command,
	CompressedSignature,
	Data,
	GasData,
	Intent,
	IntentMessage,
	IntentScope,
	IntentVersion,
	MoveObject,
	MoveObjectType,
	MovePackage,
	MultiSig,
	MultiSigPkMap,
	MultiSigPublicKey,
	ObjectArg,
	ObjectDigest,
	ObjectInner,
	Owner,
	PasskeyAuthenticator,
	ProgrammableMoveCall,
	ProgrammableTransaction,
	PublicKey,
	SenderSignedData,
	SenderSignedTransaction,
	SharedObjectRef,
	StructTag,
	SuiObjectRef,
	TransactionData,
	TransactionDataV1,
	TransactionExpiration,
	TransactionKind,
	TypeOrigin,
	TypeTag,
	UpgradeInfo,
} from './bcs.js';
import { TransactionEffects } from './effects.js';

export type { TypeTag } from './types.js';

export { TypeTagSerializer } from './type-tag-serializer.js';
export {
	BcsType,
	BcsStruct,
	BcsEnum,
	BcsTuple,
	type BcsTypeOptions,
	compareBcsBytes,
} from '@mysten/bcs';

const suiBcs: typeof bcs & {
	U8: ReturnType<typeof bcs.u8>;
	U16: ReturnType<typeof bcs.u16>;
	U32: ReturnType<typeof bcs.u32>;
	U64: ReturnType<typeof bcs.u64>;
	U128: ReturnType<typeof bcs.u128>;
	U256: ReturnType<typeof bcs.u256>;
	ULEB128: ReturnType<typeof bcs.uleb128>;
	Bool: ReturnType<typeof bcs.bool>;
	String: ReturnType<typeof bcs.string>;
	Address: typeof Address;
	AppId: typeof AppId;
	Argument: typeof Argument;
	CallArg: typeof CallArg;
	Command: typeof Command;
	CompressedSignature: typeof CompressedSignature;
	Data: typeof Data;
	GasData: typeof GasData;
	Intent: typeof Intent;
	IntentMessage: typeof IntentMessage;
	IntentScope: typeof IntentScope;
	IntentVersion: typeof IntentVersion;
	MoveObject: typeof MoveObject;
	MoveObjectType: typeof MoveObjectType;
	MovePackage: typeof MovePackage;
	MultiSig: typeof MultiSig;
	MultiSigPkMap: typeof MultiSigPkMap;
	MultiSigPublicKey: typeof MultiSigPublicKey;
	Object: typeof ObjectInner;
	ObjectArg: typeof ObjectArg;
	ObjectDigest: typeof ObjectDigest;
	Owner: typeof Owner;
	PasskeyAuthenticator: typeof PasskeyAuthenticator;
	ProgrammableMoveCall: typeof ProgrammableMoveCall;
	ProgrammableTransaction: typeof ProgrammableTransaction;
	PublicKey: typeof PublicKey;
	SenderSignedData: typeof SenderSignedData;
	SenderSignedTransaction: typeof SenderSignedTransaction;
	SharedObjectRef: typeof SharedObjectRef;
	StructTag: typeof StructTag;
	SuiObjectRef: typeof SuiObjectRef;
	TransactionData: typeof TransactionData;
	TransactionDataV1: typeof TransactionDataV1;
	TransactionEffects: typeof TransactionEffects;
	TransactionExpiration: typeof TransactionExpiration;
	TransactionKind: typeof TransactionKind;
	TypeOrigin: typeof TypeOrigin;
	TypeTag: typeof TypeTag;
	UpgradeInfo: typeof UpgradeInfo;
} = {
	...bcs,
	U8: bcs.u8(),
	U16: bcs.u16(),
	U32: bcs.u32(),
	U64: bcs.u64(),
	U128: bcs.u128(),
	U256: bcs.u256(),
	ULEB128: bcs.uleb128(),
	Bool: bcs.bool(),
	String: bcs.string(),
	Address: Address,
	AppId: AppId,
	Argument: Argument,
	CallArg: CallArg,
	Command: Command,
	CompressedSignature: CompressedSignature,
	Data: Data,
	GasData: GasData,
	Intent: Intent,
	IntentMessage: IntentMessage,
	IntentScope: IntentScope,
	IntentVersion: IntentVersion,
	MoveObject: MoveObject,
	MoveObjectType: MoveObjectType,
	MovePackage: MovePackage,
	MultiSig: MultiSig,
	MultiSigPkMap: MultiSigPkMap,
	MultiSigPublicKey: MultiSigPublicKey,
	Object: ObjectInner,
	ObjectArg: ObjectArg,
	ObjectDigest: ObjectDigest,
	Owner: Owner,
	PasskeyAuthenticator: PasskeyAuthenticator,
	ProgrammableMoveCall: ProgrammableMoveCall,
	ProgrammableTransaction: ProgrammableTransaction,
	PublicKey: PublicKey,
	SenderSignedData: SenderSignedData,
	SenderSignedTransaction: SenderSignedTransaction,
	SharedObjectRef: SharedObjectRef,
	StructTag: StructTag,
	SuiObjectRef: SuiObjectRef,
	TransactionData: TransactionData,
	TransactionDataV1: TransactionDataV1,
	TransactionEffects: TransactionEffects,
	TransactionExpiration: TransactionExpiration,
	TransactionKind: TransactionKind,
	TypeOrigin: TypeOrigin,
	TypeTag: TypeTag,
	UpgradeInfo: UpgradeInfo,
};
export {
	pureBcsSchemaFromTypeName,
	type ShapeFromPureTypeName,
	type PureTypeName,
} from './pure.js';

export { suiBcs as bcs };
