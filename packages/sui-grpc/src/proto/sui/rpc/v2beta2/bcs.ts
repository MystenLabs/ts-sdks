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
 * `Bcs` contains an arbitrary type that is serialized using the
 * [BCS](https://mystenlabs.github.io/sui-rust-sdk/sui_sdk_types/index.html#bcs)
 * format as well as a name that identifies the type of the serialized value.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Bcs
 */
export interface Bcs {
	/**
	 * Name that identifies the type of the serialized value.
	 *
	 * @generated from protobuf field: optional string name = 1;
	 */
	name?: string;
	/**
	 * Bytes of a BCS serialized value.
	 *
	 * @generated from protobuf field: optional bytes value = 2;
	 */
	value?: Uint8Array;
}
// @generated message type with reflection information, may provide speed optimized methods
class Bcs$Type extends MessageType<Bcs> {
	constructor() {
		super('sui.rpc.v2beta2.Bcs', [
			{ no: 1, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'value', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<Bcs>): Bcs {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Bcs>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Bcs,
	): Bcs {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string name */ 1:
					message.name = reader.string();
					break;
				case /* optional bytes value */ 2:
					message.value = reader.bytes();
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
		message: Bcs,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string name = 1; */
		if (message.name !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.name);
		/* optional bytes value = 2; */
		if (message.value !== undefined) writer.tag(2, WireType.LengthDelimited).bytes(message.value);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Bcs
 */
export const Bcs = new Bcs$Type();
