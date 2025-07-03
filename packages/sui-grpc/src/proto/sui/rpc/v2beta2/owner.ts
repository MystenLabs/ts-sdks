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
 * Enum of different types of ownership for an object.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Owner
 */
export interface Owner {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Owner.OwnerKind kind = 1;
	 */
	kind?: Owner_OwnerKind;
	/**
	 * Address or ObjectId of the owner
	 *
	 * @generated from protobuf field: optional string address = 2;
	 */
	address?: string;
	/**
	 * The `initial_shared_version` if kind is `SHARED` or `start_version` if kind `CONSENSUS_ADDRESS`.
	 *
	 * @generated from protobuf field: optional uint64 version = 3;
	 */
	version?: bigint;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta2.Owner.OwnerKind
 */
export enum Owner_OwnerKind {
	/**
	 * @generated from protobuf enum value: OWNER_KIND_UNKNOWN = 0;
	 */
	OWNER_KIND_UNKNOWN = 0,
	/**
	 * @generated from protobuf enum value: ADDRESS = 1;
	 */
	ADDRESS = 1,
	/**
	 * @generated from protobuf enum value: OBJECT = 2;
	 */
	OBJECT = 2,
	/**
	 * @generated from protobuf enum value: SHARED = 3;
	 */
	SHARED = 3,
	/**
	 * @generated from protobuf enum value: IMMUTABLE = 4;
	 */
	IMMUTABLE = 4,
	/**
	 * @generated from protobuf enum value: CONSENSUS_ADDRESS = 5;
	 */
	CONSENSUS_ADDRESS = 5,
}
// @generated message type with reflection information, may provide speed optimized methods
class Owner$Type extends MessageType<Owner> {
	constructor() {
		super('sui.rpc.v2beta2.Owner', [
			{
				no: 1,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.Owner.OwnerKind', Owner_OwnerKind],
			},
			{ no: 2, name: 'address', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<Owner>): Owner {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Owner>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Owner,
	): Owner {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Owner.OwnerKind kind */ 1:
					message.kind = reader.int32();
					break;
				case /* optional string address */ 2:
					message.address = reader.string();
					break;
				case /* optional uint64 version */ 3:
					message.version = reader.uint64().toBigInt();
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
		message: Owner,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Owner.OwnerKind kind = 1; */
		if (message.kind !== undefined) writer.tag(1, WireType.Varint).int32(message.kind);
		/* optional string address = 2; */
		if (message.address !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.address);
		/* optional uint64 version = 3; */
		if (message.version !== undefined) writer.tag(3, WireType.Varint).uint64(message.version);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Owner
 */
export const Owner = new Owner$Type();
