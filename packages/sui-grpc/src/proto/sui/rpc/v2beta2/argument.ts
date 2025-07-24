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
 * An argument to a programmable transaction command.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Argument
 */
export interface Argument {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Argument.ArgumentKind kind = 1
	 */
	kind?: Argument_ArgumentKind;
	/**
	 * Index of an input when `kind` is `INPUT`.
	 *
	 * @generated from protobuf field: optional uint32 input = 2
	 */
	input?: number;
	/**
	 * Index of a result when `kind` is `RESULT`.
	 *
	 * @generated from protobuf field: optional uint32 result = 3
	 */
	result?: number;
	/**
	 * Used to access a nested result when `kind` is `RESULT`.
	 *
	 * @generated from protobuf field: optional uint32 subresult = 4
	 */
	subresult?: number;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta2.Argument.ArgumentKind
 */
export enum Argument_ArgumentKind {
	/**
	 * @generated from protobuf enum value: ARGUMENT_KIND_UNKNOWN = 0;
	 */
	ARGUMENT_KIND_UNKNOWN = 0,
	/**
	 * The gas coin.
	 *
	 * @generated from protobuf enum value: GAS = 1;
	 */
	GAS = 1,
	/**
	 * One of the input objects or primitive values (from
	 * `ProgrammableTransaction` inputs).
	 *
	 * @generated from protobuf enum value: INPUT = 2;
	 */
	INPUT = 2,
	/**
	 * The result of another command (from `ProgrammableTransaction` commands).
	 *
	 * @generated from protobuf enum value: RESULT = 3;
	 */
	RESULT = 3,
}
// @generated message type with reflection information, may provide speed optimized methods
class Argument$Type extends MessageType<Argument> {
	constructor() {
		super('sui.rpc.v2beta2.Argument', [
			{
				no: 1,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.Argument.ArgumentKind', Argument_ArgumentKind],
			},
			{ no: 2, name: 'input', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 3, name: 'result', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 4, name: 'subresult', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
		]);
	}
	create(value?: PartialMessage<Argument>): Argument {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Argument>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Argument,
	): Argument {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Argument.ArgumentKind kind */ 1:
					message.kind = reader.int32();
					break;
				case /* optional uint32 input */ 2:
					message.input = reader.uint32();
					break;
				case /* optional uint32 result */ 3:
					message.result = reader.uint32();
					break;
				case /* optional uint32 subresult */ 4:
					message.subresult = reader.uint32();
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
		message: Argument,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Argument.ArgumentKind kind = 1; */
		if (message.kind !== undefined) writer.tag(1, WireType.Varint).int32(message.kind);
		/* optional uint32 input = 2; */
		if (message.input !== undefined) writer.tag(2, WireType.Varint).uint32(message.input);
		/* optional uint32 result = 3; */
		if (message.result !== undefined) writer.tag(3, WireType.Varint).uint32(message.result);
		/* optional uint32 subresult = 4; */
		if (message.subresult !== undefined) writer.tag(4, WireType.Varint).uint32(message.subresult);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Argument
 */
export const Argument = new Argument$Type();
