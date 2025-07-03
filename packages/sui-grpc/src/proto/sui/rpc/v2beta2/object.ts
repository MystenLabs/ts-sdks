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
import { Value } from '../../../google/protobuf/struct.js';
import { Package } from './move_package.js';
import { Owner } from './owner.js';
import { Bcs } from './bcs.js';
/**
 * An object on the Sui blockchain.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Object
 */
export interface Object {
	/**
	 * This Object serialized as BCS.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Bcs bcs = 1;
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
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Owner owner = 5;
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
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Bcs contents = 8;
	 */
	contents?: Bcs;
	/**
	 * Package information for Move Packages
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Package package = 9;
	 */
	package?: Package;
	/**
	 * The digest of the transaction that created or last mutated this object
	 *
	 * @generated from protobuf field: optional string previous_transaction = 10;
	 */
	previousTransaction?: string;
	/**
	 * The amount of SUI to rebate if this object gets deleted.
	 * This number is re-calculated each time the object is mutated based on
	 * the present storage gas price.
	 *
	 * @generated from protobuf field: optional uint64 storage_rebate = 11;
	 */
	storageRebate?: bigint;
	/**
	 * JSON rendering of the object.
	 *
	 * @generated from protobuf field: optional google.protobuf.Value json = 100;
	 */
	json?: Value;
}
// @generated message type with reflection information, may provide speed optimized methods
class Object$Type extends MessageType<Object> {
	constructor() {
		super('sui.rpc.v2beta2.Object', [
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
			{ no: 9, name: 'package', kind: 'message', T: () => Package },
			{
				no: 10,
				name: 'previous_transaction',
				kind: 'scalar',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 11,
				name: 'storage_rebate',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 100, name: 'json', kind: 'message', T: () => Value },
		]);
	}
	create(value?: PartialMessage<Object>): Object {
		const message = globalThis.Object.create(this.messagePrototype!);
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
				case /* optional sui.rpc.v2beta2.Bcs bcs */ 1:
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
				case /* optional sui.rpc.v2beta2.Owner owner */ 5:
					message.owner = Owner.internalBinaryRead(reader, reader.uint32(), options, message.owner);
					break;
				case /* optional string object_type */ 6:
					message.objectType = reader.string();
					break;
				case /* optional bool has_public_transfer */ 7:
					message.hasPublicTransfer = reader.bool();
					break;
				case /* optional sui.rpc.v2beta2.Bcs contents */ 8:
					message.contents = Bcs.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.contents,
					);
					break;
				case /* optional sui.rpc.v2beta2.Package package */ 9:
					message.package = Package.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.package,
					);
					break;
				case /* optional string previous_transaction */ 10:
					message.previousTransaction = reader.string();
					break;
				case /* optional uint64 storage_rebate */ 11:
					message.storageRebate = reader.uint64().toBigInt();
					break;
				case /* optional google.protobuf.Value json */ 100:
					message.json = Value.internalBinaryRead(reader, reader.uint32(), options, message.json);
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
		/* optional sui.rpc.v2beta2.Bcs bcs = 1; */
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
		/* optional sui.rpc.v2beta2.Owner owner = 5; */
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
		/* optional sui.rpc.v2beta2.Bcs contents = 8; */
		if (message.contents)
			Bcs.internalBinaryWrite(
				message.contents,
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.Package package = 9; */
		if (message.package)
			Package.internalBinaryWrite(
				message.package,
				writer.tag(9, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string previous_transaction = 10; */
		if (message.previousTransaction !== undefined)
			writer.tag(10, WireType.LengthDelimited).string(message.previousTransaction);
		/* optional uint64 storage_rebate = 11; */
		if (message.storageRebate !== undefined)
			writer.tag(11, WireType.Varint).uint64(message.storageRebate);
		/* optional google.protobuf.Value json = 100; */
		if (message.json)
			Value.internalBinaryWrite(
				message.json,
				writer.tag(100, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Object
 */
export const Object = new Object$Type();
