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
/**
 * Reference to an object.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ObjectReference
 */
export interface ObjectReference {
	/**
	 * The object id of this object.
	 *
	 * @generated from protobuf field: optional string object_id = 1
	 */
	objectId?: string;
	/**
	 * The version of this object.
	 *
	 * @generated from protobuf field: optional uint64 version = 2
	 */
	version?: bigint;
	/**
	 * The digest of this object.
	 *
	 * @generated from protobuf field: optional string digest = 3
	 */
	digest?: string;
}
// @generated message type with reflection information, may provide speed optimized methods
class ObjectReference$Type extends MessageType<ObjectReference> {
	constructor() {
		super('sui.rpc.v2beta2.ObjectReference', [
			{ no: 1, name: 'object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 3, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<ObjectReference>): ObjectReference {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ObjectReference>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ObjectReference,
	): ObjectReference {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string object_id */ 1:
					message.objectId = reader.string();
					break;
				case /* optional uint64 version */ 2:
					message.version = reader.uint64().toBigInt();
					break;
				case /* optional string digest */ 3:
					message.digest = reader.string();
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
		message: ObjectReference,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string object_id = 1; */
		if (message.objectId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.objectId);
		/* optional uint64 version = 2; */
		if (message.version !== undefined) writer.tag(2, WireType.Varint).uint64(message.version);
		/* optional string digest = 3; */
		if (message.digest !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.digest);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ObjectReference
 */
export const ObjectReference = new ObjectReference$Type();
