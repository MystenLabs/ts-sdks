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
import { isJsonObject } from '@protobuf-ts/runtime';
import { typeofJsonValue } from '@protobuf-ts/runtime';
import type { JsonValue } from '@protobuf-ts/runtime';
import type { JsonReadOptions } from '@protobuf-ts/runtime';
import type { JsonWriteOptions } from '@protobuf-ts/runtime';
import type { JsonObject } from '@protobuf-ts/runtime';
import { MessageType } from '@protobuf-ts/runtime';
/**
 * `Struct` represents a structured data value, consisting of fields
 * which map to dynamically typed values. In some languages, `Struct`
 * might be supported by a native representation. For example, in
 * scripting languages like JS a struct is represented as an
 * object. The details of that representation are described together
 * with the proto support for the language.
 *
 * The JSON representation for `Struct` is JSON object.
 *
 * @generated from protobuf message google.protobuf.Struct
 */
export interface Struct {
	/**
	 * Unordered map of dynamically typed values.
	 *
	 * @generated from protobuf field: map<string, google.protobuf.Value> fields = 1
	 */
	fields: {
		[key: string]: Value;
	};
}
/**
 * `Value` represents a dynamically typed value which can be either
 * null, a number, a string, a boolean, a recursive struct value, or a
 * list of values. A producer of value is expected to set one of these
 * variants. Absence of any variant indicates an error.
 *
 * The JSON representation for `Value` is JSON value.
 *
 * @generated from protobuf message google.protobuf.Value
 */
export interface Value {
	/**
	 * The kind of value.
	 *
	 * @generated from protobuf oneof: kind
	 */
	kind:
		| {
				oneofKind: 'nullValue';
				/**
				 * Represents a null value.
				 *
				 * @generated from protobuf field: google.protobuf.NullValue null_value = 1
				 */
				nullValue: NullValue;
		  }
		| {
				oneofKind: 'numberValue';
				/**
				 * Represents a double value.
				 *
				 * @generated from protobuf field: double number_value = 2
				 */
				numberValue: number;
		  }
		| {
				oneofKind: 'stringValue';
				/**
				 * Represents a string value.
				 *
				 * @generated from protobuf field: string string_value = 3
				 */
				stringValue: string;
		  }
		| {
				oneofKind: 'boolValue';
				/**
				 * Represents a boolean value.
				 *
				 * @generated from protobuf field: bool bool_value = 4
				 */
				boolValue: boolean;
		  }
		| {
				oneofKind: 'structValue';
				/**
				 * Represents a structured value.
				 *
				 * @generated from protobuf field: google.protobuf.Struct struct_value = 5
				 */
				structValue: Struct;
		  }
		| {
				oneofKind: 'listValue';
				/**
				 * Represents a repeated `Value`.
				 *
				 * @generated from protobuf field: google.protobuf.ListValue list_value = 6
				 */
				listValue: ListValue;
		  }
		| {
				oneofKind: undefined;
		  };
}
/**
 * `ListValue` is a wrapper around a repeated field of values.
 *
 * The JSON representation for `ListValue` is JSON array.
 *
 * @generated from protobuf message google.protobuf.ListValue
 */
export interface ListValue {
	/**
	 * Repeated field of dynamically typed values.
	 *
	 * @generated from protobuf field: repeated google.protobuf.Value values = 1
	 */
	values: Value[];
}
/**
 * `NullValue` is a singleton enumeration to represent the null value for the
 * `Value` type union.
 *
 * The JSON representation for `NullValue` is JSON `null`.
 *
 * @generated from protobuf enum google.protobuf.NullValue
 */
export enum NullValue {
	/**
	 * Null value.
	 *
	 * @generated from protobuf enum value: NULL_VALUE = 0;
	 */
	NULL_VALUE = 0,
}
// @generated message type with reflection information, may provide speed optimized methods
class Struct$Type extends MessageType<Struct> {
	constructor() {
		super('google.protobuf.Struct', [
			{
				no: 1,
				name: 'fields',
				kind: 'map',
				K: 9 /*ScalarType.STRING*/,
				V: { kind: 'message', T: () => Value },
			},
		]);
	}
	/**
	 * Encode `Struct` to JSON object.
	 */
	internalJsonWrite(message: Struct, options: JsonWriteOptions): JsonValue {
		let json: JsonObject = {};
		for (let [k, v] of Object.entries(message.fields)) {
			json[k] = Value.toJson(v);
		}
		return json;
	}
	/**
	 * Decode `Struct` from JSON object.
	 */
	internalJsonRead(json: JsonValue, options: JsonReadOptions, target?: Struct): Struct {
		if (!isJsonObject(json))
			throw new globalThis.Error(
				'Unable to parse message ' + this.typeName + ' from JSON ' + typeofJsonValue(json) + '.',
			);
		if (!target) target = this.create();
		for (let [k, v] of globalThis.Object.entries(json)) {
			target.fields[k] = Value.fromJson(v);
		}
		return target;
	}
	create(value?: PartialMessage<Struct>): Struct {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.fields = {};
		if (value !== undefined) reflectionMergePartial<Struct>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Struct,
	): Struct {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* map<string, google.protobuf.Value> fields */ 1:
					this.binaryReadMap1(message.fields, reader, options);
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
	private binaryReadMap1(
		map: Struct['fields'],
		reader: IBinaryReader,
		options: BinaryReadOptions,
	): void {
		let len = reader.uint32(),
			end = reader.pos + len,
			key: keyof Struct['fields'] | undefined,
			val: Struct['fields'][any] | undefined;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case 1:
					key = reader.string();
					break;
				case 2:
					val = Value.internalBinaryRead(reader, reader.uint32(), options);
					break;
				default:
					throw new globalThis.Error('unknown map entry field for google.protobuf.Struct.fields');
			}
		}
		map[key ?? ''] = val ?? Value.create();
	}
	internalBinaryWrite(
		message: Struct,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* map<string, google.protobuf.Value> fields = 1; */
		for (let k of globalThis.Object.keys(message.fields)) {
			writer.tag(1, WireType.LengthDelimited).fork().tag(1, WireType.LengthDelimited).string(k);
			writer.tag(2, WireType.LengthDelimited).fork();
			Value.internalBinaryWrite(message.fields[k], writer, options);
			writer.join().join();
		}
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message google.protobuf.Struct
 */
export const Struct = new Struct$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Value$Type extends MessageType<Value> {
	constructor() {
		super('google.protobuf.Value', [
			{
				no: 1,
				name: 'null_value',
				kind: 'enum',
				oneof: 'kind',
				T: () => ['google.protobuf.NullValue', NullValue],
			},
			{ no: 2, name: 'number_value', kind: 'scalar', oneof: 'kind', T: 1 /*ScalarType.DOUBLE*/ },
			{ no: 3, name: 'string_value', kind: 'scalar', oneof: 'kind', T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'bool_value', kind: 'scalar', oneof: 'kind', T: 8 /*ScalarType.BOOL*/ },
			{ no: 5, name: 'struct_value', kind: 'message', oneof: 'kind', T: () => Struct },
			{ no: 6, name: 'list_value', kind: 'message', oneof: 'kind', T: () => ListValue },
		]);
	}
	/**
	 * Encode `Value` to JSON value.
	 */
	internalJsonWrite(message: Value, options: JsonWriteOptions): JsonValue {
		if (message.kind.oneofKind === undefined) throw new globalThis.Error();
		switch (message.kind.oneofKind) {
			case undefined:
				throw new globalThis.Error();
			case 'boolValue':
				return message.kind.boolValue;
			case 'nullValue':
				return null;
			case 'numberValue':
				let numberValue = message.kind.numberValue;
				if (typeof numberValue == 'number' && !Number.isFinite(numberValue))
					throw new globalThis.Error();
				return numberValue;
			case 'stringValue':
				return message.kind.stringValue;
			case 'listValue':
				let listValueField = this.fields.find((f) => f.no === 6);
				if (listValueField?.kind !== 'message') throw new globalThis.Error();
				return listValueField.T().toJson(message.kind.listValue);
			case 'structValue':
				let structValueField = this.fields.find((f) => f.no === 5);
				if (structValueField?.kind !== 'message') throw new globalThis.Error();
				return structValueField.T().toJson(message.kind.structValue);
		}
	}
	/**
	 * Decode `Value` from JSON value.
	 */
	internalJsonRead(json: JsonValue, options: JsonReadOptions, target?: Value): Value {
		if (!target) target = this.create();
		switch (typeof json) {
			case 'number':
				target.kind = { oneofKind: 'numberValue', numberValue: json };
				break;
			case 'string':
				target.kind = { oneofKind: 'stringValue', stringValue: json };
				break;
			case 'boolean':
				target.kind = { oneofKind: 'boolValue', boolValue: json };
				break;
			case 'object':
				if (json === null) {
					target.kind = { oneofKind: 'nullValue', nullValue: NullValue.NULL_VALUE };
				} else if (globalThis.Array.isArray(json)) {
					target.kind = { oneofKind: 'listValue', listValue: ListValue.fromJson(json) };
				} else {
					target.kind = { oneofKind: 'structValue', structValue: Struct.fromJson(json) };
				}
				break;
			default:
				throw new globalThis.Error(
					'Unable to parse ' + this.typeName + ' from JSON ' + typeofJsonValue(json),
				);
		}
		return target;
	}
	create(value?: PartialMessage<Value>): Value {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.kind = { oneofKind: undefined };
		if (value !== undefined) reflectionMergePartial<Value>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Value,
	): Value {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* google.protobuf.NullValue null_value */ 1:
					message.kind = {
						oneofKind: 'nullValue',
						nullValue: reader.int32(),
					};
					break;
				case /* double number_value */ 2:
					message.kind = {
						oneofKind: 'numberValue',
						numberValue: reader.double(),
					};
					break;
				case /* string string_value */ 3:
					message.kind = {
						oneofKind: 'stringValue',
						stringValue: reader.string(),
					};
					break;
				case /* bool bool_value */ 4:
					message.kind = {
						oneofKind: 'boolValue',
						boolValue: reader.bool(),
					};
					break;
				case /* google.protobuf.Struct struct_value */ 5:
					message.kind = {
						oneofKind: 'structValue',
						structValue: Struct.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).structValue,
						),
					};
					break;
				case /* google.protobuf.ListValue list_value */ 6:
					message.kind = {
						oneofKind: 'listValue',
						listValue: ListValue.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.kind as any).listValue,
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
		message: Value,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* google.protobuf.NullValue null_value = 1; */
		if (message.kind.oneofKind === 'nullValue')
			writer.tag(1, WireType.Varint).int32(message.kind.nullValue);
		/* double number_value = 2; */
		if (message.kind.oneofKind === 'numberValue')
			writer.tag(2, WireType.Bit64).double(message.kind.numberValue);
		/* string string_value = 3; */
		if (message.kind.oneofKind === 'stringValue')
			writer.tag(3, WireType.LengthDelimited).string(message.kind.stringValue);
		/* bool bool_value = 4; */
		if (message.kind.oneofKind === 'boolValue')
			writer.tag(4, WireType.Varint).bool(message.kind.boolValue);
		/* google.protobuf.Struct struct_value = 5; */
		if (message.kind.oneofKind === 'structValue')
			Struct.internalBinaryWrite(
				message.kind.structValue,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* google.protobuf.ListValue list_value = 6; */
		if (message.kind.oneofKind === 'listValue')
			ListValue.internalBinaryWrite(
				message.kind.listValue,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message google.protobuf.Value
 */
export const Value = new Value$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListValue$Type extends MessageType<ListValue> {
	constructor() {
		super('google.protobuf.ListValue', [
			{ no: 1, name: 'values', kind: 'message', repeat: 2 /*RepeatType.UNPACKED*/, T: () => Value },
		]);
	}
	/**
	 * Encode `ListValue` to JSON array.
	 */
	internalJsonWrite(message: ListValue, options: JsonWriteOptions): JsonValue {
		return message.values.map((v) => Value.toJson(v));
	}
	/**
	 * Decode `ListValue` from JSON array.
	 */
	internalJsonRead(json: JsonValue, options: JsonReadOptions, target?: ListValue): ListValue {
		if (!globalThis.Array.isArray(json))
			throw new globalThis.Error(
				'Unable to parse ' + this.typeName + ' from JSON ' + typeofJsonValue(json),
			);
		if (!target) target = this.create();
		let values = json.map((v) => Value.fromJson(v));
		target.values.push(...values);
		return target;
	}
	create(value?: PartialMessage<ListValue>): ListValue {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.values = [];
		if (value !== undefined) reflectionMergePartial<ListValue>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ListValue,
	): ListValue {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated google.protobuf.Value values */ 1:
					message.values.push(Value.internalBinaryRead(reader, reader.uint32(), options));
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
		message: ListValue,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated google.protobuf.Value values = 1; */
		for (let i = 0; i < message.values.length; i++)
			Value.internalBinaryWrite(
				message.values[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message google.protobuf.ListValue
 */
export const ListValue = new ListValue$Type();
