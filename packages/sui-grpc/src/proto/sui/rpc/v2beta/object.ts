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
import { Owner } from './owner.js';
import { Bcs } from './bcs.js';
/**
 * An object on the Sui blockchain.
 *
 * @generated from protobuf message sui.rpc.v2beta.Object
 */
export interface Object {
	/**
	 * This Object serialized as BCS.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.Bcs bcs = 1;
	 */
	bcs?: Bcs;
	/**
	 * `ObjectId` for this object.
	 *
	 * @generated from protobuf field: optional string object_id = 2;
	 */
	objectId?: string;
	/**
	 * Version of the object.
	 *
	 * @generated from protobuf field: optional uint64 version = 3;
	 */
	version?: bigint;
	/**
	 * The digest of this Object.
	 *
	 * @generated from protobuf field: optional string digest = 4;
	 */
	digest?: string;
	/**
	 * Owner of the object.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.Owner owner = 5;
	 */
	owner?: Owner;
	/**
	 * The type of this object.
	 *
	 * This will be 'package' for packages and a StructTag for move structs.
	 *
	 * @generated from protobuf field: optional string object_type = 6;
	 */
	objectType?: string;
	/**
	 * DEPRECATED this field is no longer used to determine whether a tx can transfer this
	 * object. Instead, it is always calculated from the objects type when loaded in execution.
	 *
	 * Only set for Move structs
	 *
	 * @generated from protobuf field: optional bool has_public_transfer = 7;
	 */
	hasPublicTransfer?: boolean;
	/**
	 * BCS bytes of a Move struct value.
	 *
	 * Only set for Move structs
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.Bcs contents = 8;
	 */
	contents?: Bcs;
	/**
	 * Set of modules defined by this package.
	 *
	 * Only set for Packages
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta.MoveModule modules = 9;
	 */
	modules: MoveModule[];
	/**
	 * Maps struct/module to a package version where it was first defined, stored as a vector for
	 * simple serialization and deserialization.
	 *
	 * Only set for Packages
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta.TypeOrigin type_origin_table = 10;
	 */
	typeOriginTable: TypeOrigin[];
	/**
	 * For each dependency, maps original package ID to the info about the (upgraded) dependency
	 * version that this package is using.
	 *
	 * Only set for Packages
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta.UpgradeInfo linkage_table = 11;
	 */
	linkageTable: UpgradeInfo[];
	/**
	 * The digest of the transaction that created or last mutated this object
	 *
	 * @generated from protobuf field: optional string previous_transaction = 12;
	 */
	previousTransaction?: string;
	/**
	 * The amount of SUI to rebate if this object gets deleted.
	 * This number is re-calculated each time the object is mutated based on
	 * the present storage gas price.
	 *
	 * @generated from protobuf field: optional uint64 storage_rebate = 13;
	 */
	storageRebate?: bigint;
}
/**
 * Module defined by a package.
 *
 * @generated from protobuf message sui.rpc.v2beta.MoveModule
 */
export interface MoveModule {
	/**
	 * Name of the module.
	 *
	 * @generated from protobuf field: optional string name = 1;
	 */
	name?: string;
	/**
	 * Serialized bytecode of the module.
	 *
	 * @generated from protobuf field: optional bytes contents = 2;
	 */
	contents?: Uint8Array;
}
/**
 * Identifies a struct and the module it was defined in.
 *
 * @generated from protobuf message sui.rpc.v2beta.TypeOrigin
 */
export interface TypeOrigin {
	/**
	 * @generated from protobuf field: optional string module_name = 1;
	 */
	moduleName?: string;
	/**
	 * @generated from protobuf field: optional string struct_name = 2;
	 */
	structName?: string;
	/**
	 * @generated from protobuf field: optional string package_id = 3;
	 */
	packageId?: string;
}
/**
 * / Upgraded package info for the linkage table.
 *
 * @generated from protobuf message sui.rpc.v2beta.UpgradeInfo
 */
export interface UpgradeInfo {
	/**
	 * ID of the original package.
	 *
	 * @generated from protobuf field: optional string original_id = 1;
	 */
	originalId?: string;
	/**
	 * ID of the upgraded package.
	 *
	 * @generated from protobuf field: optional string upgraded_id = 2;
	 */
	upgradedId?: string;
	/**
	 * Version of the upgraded package.
	 *
	 * @generated from protobuf field: optional uint64 upgraded_version = 3;
	 */
	upgradedVersion?: bigint;
}
// @generated message type with reflection information, may provide speed optimized methods
class Object$Type extends MessageType<Object> {
	constructor() {
		super('sui.rpc.v2beta.Object', [
			{ no: 1, name: 'bcs', kind: 'message', T: () => Bcs },
			{ no: 2, name: 'object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 4, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'owner', kind: 'message', T: () => Owner },
			{ no: 6, name: 'object_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 7, name: 'has_public_transfer', kind: 'scalar', opt: true, T: 8 /*ScalarType.BOOL*/ },
			{ no: 8, name: 'contents', kind: 'message', T: () => Bcs },
			{
				no: 9,
				name: 'modules',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => MoveModule,
			},
			{
				no: 10,
				name: 'type_origin_table',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => TypeOrigin,
			},
			{
				no: 11,
				name: 'linkage_table',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => UpgradeInfo,
			},
			{
				no: 12,
				name: 'previous_transaction',
				kind: 'scalar',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 13,
				name: 'storage_rebate',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<Object>): Object {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.modules = [];
		message.typeOriginTable = [];
		message.linkageTable = [];
		if (value !== undefined) reflectionMergePartial<Object>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Object,
	): Object {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta.Bcs bcs */ 1:
					message.bcs = Bcs.internalBinaryRead(reader, reader.uint32(), options, message.bcs);
					break;
				case /* optional string object_id */ 2:
					message.objectId = reader.string();
					break;
				case /* optional uint64 version */ 3:
					message.version = reader.uint64().toBigInt();
					break;
				case /* optional string digest */ 4:
					message.digest = reader.string();
					break;
				case /* optional sui.rpc.v2beta.Owner owner */ 5:
					message.owner = Owner.internalBinaryRead(reader, reader.uint32(), options, message.owner);
					break;
				case /* optional string object_type */ 6:
					message.objectType = reader.string();
					break;
				case /* optional bool has_public_transfer */ 7:
					message.hasPublicTransfer = reader.bool();
					break;
				case /* optional sui.rpc.v2beta.Bcs contents */ 8:
					message.contents = Bcs.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.contents,
					);
					break;
				case /* repeated sui.rpc.v2beta.MoveModule modules */ 9:
					message.modules.push(MoveModule.internalBinaryRead(reader, reader.uint32(), options));
					break;
				case /* repeated sui.rpc.v2beta.TypeOrigin type_origin_table */ 10:
					message.typeOriginTable.push(
						TypeOrigin.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* repeated sui.rpc.v2beta.UpgradeInfo linkage_table */ 11:
					message.linkageTable.push(
						UpgradeInfo.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional string previous_transaction */ 12:
					message.previousTransaction = reader.string();
					break;
				case /* optional uint64 storage_rebate */ 13:
					message.storageRebate = reader.uint64().toBigInt();
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
		message: Object,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta.Bcs bcs = 1; */
		if (message.bcs)
			Bcs.internalBinaryWrite(
				message.bcs,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string object_id = 2; */
		if (message.objectId !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.objectId);
		/* optional uint64 version = 3; */
		if (message.version !== undefined) writer.tag(3, WireType.Varint).uint64(message.version);
		/* optional string digest = 4; */
		if (message.digest !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.digest);
		/* optional sui.rpc.v2beta.Owner owner = 5; */
		if (message.owner)
			Owner.internalBinaryWrite(
				message.owner,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string object_type = 6; */
		if (message.objectType !== undefined)
			writer.tag(6, WireType.LengthDelimited).string(message.objectType);
		/* optional bool has_public_transfer = 7; */
		if (message.hasPublicTransfer !== undefined)
			writer.tag(7, WireType.Varint).bool(message.hasPublicTransfer);
		/* optional sui.rpc.v2beta.Bcs contents = 8; */
		if (message.contents)
			Bcs.internalBinaryWrite(
				message.contents,
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta.MoveModule modules = 9; */
		for (let i = 0; i < message.modules.length; i++)
			MoveModule.internalBinaryWrite(
				message.modules[i],
				writer.tag(9, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta.TypeOrigin type_origin_table = 10; */
		for (let i = 0; i < message.typeOriginTable.length; i++)
			TypeOrigin.internalBinaryWrite(
				message.typeOriginTable[i],
				writer.tag(10, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta.UpgradeInfo linkage_table = 11; */
		for (let i = 0; i < message.linkageTable.length; i++)
			UpgradeInfo.internalBinaryWrite(
				message.linkageTable[i],
				writer.tag(11, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string previous_transaction = 12; */
		if (message.previousTransaction !== undefined)
			writer.tag(12, WireType.LengthDelimited).string(message.previousTransaction);
		/* optional uint64 storage_rebate = 13; */
		if (message.storageRebate !== undefined)
			writer.tag(13, WireType.Varint).uint64(message.storageRebate);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.Object
 */
export const Object = new Object$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MoveModule$Type extends MessageType<MoveModule> {
	constructor() {
		super('sui.rpc.v2beta.MoveModule', [
			{ no: 1, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'contents', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<MoveModule>): MoveModule {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<MoveModule>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MoveModule,
	): MoveModule {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string name */ 1:
					message.name = reader.string();
					break;
				case /* optional bytes contents */ 2:
					message.contents = reader.bytes();
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
		message: MoveModule,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string name = 1; */
		if (message.name !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.name);
		/* optional bytes contents = 2; */
		if (message.contents !== undefined)
			writer.tag(2, WireType.LengthDelimited).bytes(message.contents);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.MoveModule
 */
export const MoveModule = new MoveModule$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TypeOrigin$Type extends MessageType<TypeOrigin> {
	constructor() {
		super('sui.rpc.v2beta.TypeOrigin', [
			{ no: 1, name: 'module_name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'struct_name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'package_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<TypeOrigin>): TypeOrigin {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<TypeOrigin>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: TypeOrigin,
	): TypeOrigin {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string module_name */ 1:
					message.moduleName = reader.string();
					break;
				case /* optional string struct_name */ 2:
					message.structName = reader.string();
					break;
				case /* optional string package_id */ 3:
					message.packageId = reader.string();
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
		message: TypeOrigin,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string module_name = 1; */
		if (message.moduleName !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.moduleName);
		/* optional string struct_name = 2; */
		if (message.structName !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.structName);
		/* optional string package_id = 3; */
		if (message.packageId !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.packageId);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.TypeOrigin
 */
export const TypeOrigin = new TypeOrigin$Type();
// @generated message type with reflection information, may provide speed optimized methods
class UpgradeInfo$Type extends MessageType<UpgradeInfo> {
	constructor() {
		super('sui.rpc.v2beta.UpgradeInfo', [
			{ no: 1, name: 'original_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'upgraded_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'upgraded_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<UpgradeInfo>): UpgradeInfo {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<UpgradeInfo>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: UpgradeInfo,
	): UpgradeInfo {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string original_id */ 1:
					message.originalId = reader.string();
					break;
				case /* optional string upgraded_id */ 2:
					message.upgradedId = reader.string();
					break;
				case /* optional uint64 upgraded_version */ 3:
					message.upgradedVersion = reader.uint64().toBigInt();
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
		message: UpgradeInfo,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string original_id = 1; */
		if (message.originalId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.originalId);
		/* optional string upgraded_id = 2; */
		if (message.upgradedId !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.upgradedId);
		/* optional uint64 upgraded_version = 3; */
		if (message.upgradedVersion !== undefined)
			writer.tag(3, WireType.Varint).uint64(message.upgradedVersion);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.UpgradeInfo
 */
export const UpgradeInfo = new UpgradeInfo$Type();
