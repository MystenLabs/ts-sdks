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
/**
 * An input to a user transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta.Input
 */
export interface Input {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.Input.InputKind kind = 1;
	 */
	kind?: Input_InputKind;
	/**
	 * A move value serialized as BCS.
	 *
	 * For normal operations this is required to be a move primitive type and not contain structs
	 * or objects.
	 *
	 * @generated from protobuf field: optional bytes pure = 2;
	 */
	pure?: Uint8Array;
	/**
	 * `ObjectId` of the object input.
	 *
	 * @generated from protobuf field: optional string object_id = 3;
	 */
	objectId?: string;
	/**
	 * Requested version of the input object when `kind` is `IMMUTABLE_OR_OWNED`
	 * or `RECEIVING` or if `kind` is `SHARED` this is the initial version of the
	 * object when it was shared
	 *
	 * @generated from protobuf field: optional uint64 version = 4;
	 */
	version?: bigint;
	/**
	 * The digest of this object.
	 *
	 * @generated from protobuf field: optional string digest = 5;
	 */
	digest?: string;
	/**
	 * Controls whether the caller asks for a mutable reference to the shared
	 * object.
	 *
	 * @generated from protobuf field: optional bool mutable = 6;
	 */
	mutable?: boolean;
	/**
	 * A literal value
	 *
	 * INPUT ONLY
	 *
	 * @generated from protobuf field: optional google.protobuf.Value literal = 1000;
	 */
	literal?: Value;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta.Input.InputKind
 */
export enum Input_InputKind {
	/**
	 * @generated from protobuf enum value: INPUT_KIND_UNKNOWN = 0;
	 */
	INPUT_KIND_UNKNOWN = 0,
	/**
	 * A move value serialized as BCS.
	 *
	 * @generated from protobuf enum value: PURE = 1;
	 */
	PURE = 1,
	/**
	 * A Move object that is either immutable or address owned.
	 *
	 * @generated from protobuf enum value: IMMUTABLE_OR_OWNED = 2;
	 */
	IMMUTABLE_OR_OWNED = 2,
	/**
	 * A Move object whose owner is "Shared".
	 *
	 * @generated from protobuf enum value: SHARED = 3;
	 */
	SHARED = 3,
	/**
	 * A Move object that is attempted to be received in this transaction.
	 *
	 * @generated from protobuf enum value: RECEIVING = 4;
	 */
	RECEIVING = 4,
}
// @generated message type with reflection information, may provide speed optimized methods
class Input$Type extends MessageType<Input> {
	constructor() {
		super('sui.rpc.v2beta.Input', [
			{
				no: 1,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta.Input.InputKind', Input_InputKind],
			},
			{ no: 2, name: 'pure', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 3, name: 'object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 4,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 5, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 6, name: 'mutable', kind: 'scalar', opt: true, T: 8 /*ScalarType.BOOL*/ },
			{ no: 1000, name: 'literal', kind: 'message', T: () => Value },
		]);
	}
	create(value?: PartialMessage<Input>): Input {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Input>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Input,
	): Input {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta.Input.InputKind kind */ 1:
					message.kind = reader.int32();
					break;
				case /* optional bytes pure */ 2:
					message.pure = reader.bytes();
					break;
				case /* optional string object_id */ 3:
					message.objectId = reader.string();
					break;
				case /* optional uint64 version */ 4:
					message.version = reader.uint64().toBigInt();
					break;
				case /* optional string digest */ 5:
					message.digest = reader.string();
					break;
				case /* optional bool mutable */ 6:
					message.mutable = reader.bool();
					break;
				case /* optional google.protobuf.Value literal */ 1000:
					message.literal = Value.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.literal,
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
		message: Input,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta.Input.InputKind kind = 1; */
		if (message.kind !== undefined) writer.tag(1, WireType.Varint).int32(message.kind);
		/* optional bytes pure = 2; */
		if (message.pure !== undefined) writer.tag(2, WireType.LengthDelimited).bytes(message.pure);
		/* optional string object_id = 3; */
		if (message.objectId !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.objectId);
		/* optional uint64 version = 4; */
		if (message.version !== undefined) writer.tag(4, WireType.Varint).uint64(message.version);
		/* optional string digest = 5; */
		if (message.digest !== undefined)
			writer.tag(5, WireType.LengthDelimited).string(message.digest);
		/* optional bool mutable = 6; */
		if (message.mutable !== undefined) writer.tag(6, WireType.Varint).bool(message.mutable);
		/* optional google.protobuf.Value literal = 1000; */
		if (message.literal)
			Value.internalBinaryWrite(
				message.literal,
				writer.tag(1000, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.Input
 */
export const Input = new Input$Type();
