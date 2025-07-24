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
 * @generated from protobuf message sui.rpc.v2beta2.ProtocolConfig
 */
export interface ProtocolConfig {
	/**
	 * @generated from protobuf field: optional uint64 protocol_version = 1
	 */
	protocolVersion?: bigint;
	/**
	 * @generated from protobuf field: map<string, bool> feature_flags = 2
	 */
	featureFlags: {
		[key: string]: boolean;
	};
	/**
	 * @generated from protobuf field: map<string, string> attributes = 3
	 */
	attributes: {
		[key: string]: string;
	};
}
// @generated message type with reflection information, may provide speed optimized methods
class ProtocolConfig$Type extends MessageType<ProtocolConfig> {
	constructor() {
		super('sui.rpc.v2beta2.ProtocolConfig', [
			{
				no: 1,
				name: 'protocol_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'feature_flags',
				kind: 'map',
				K: 9 /*ScalarType.STRING*/,
				V: { kind: 'scalar', T: 8 /*ScalarType.BOOL*/ },
			},
			{
				no: 3,
				name: 'attributes',
				kind: 'map',
				K: 9 /*ScalarType.STRING*/,
				V: { kind: 'scalar', T: 9 /*ScalarType.STRING*/ },
			},
		]);
	}
	create(value?: PartialMessage<ProtocolConfig>): ProtocolConfig {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.featureFlags = {};
		message.attributes = {};
		if (value !== undefined) reflectionMergePartial<ProtocolConfig>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ProtocolConfig,
	): ProtocolConfig {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 protocol_version */ 1:
					message.protocolVersion = reader.uint64().toBigInt();
					break;
				case /* map<string, bool> feature_flags */ 2:
					this.binaryReadMap2(message.featureFlags, reader, options);
					break;
				case /* map<string, string> attributes */ 3:
					this.binaryReadMap3(message.attributes, reader, options);
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
	private binaryReadMap2(
		map: ProtocolConfig['featureFlags'],
		reader: IBinaryReader,
		options: BinaryReadOptions,
	): void {
		let len = reader.uint32(),
			end = reader.pos + len,
			key: keyof ProtocolConfig['featureFlags'] | undefined,
			val: ProtocolConfig['featureFlags'][any] | undefined;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case 1:
					key = reader.string();
					break;
				case 2:
					val = reader.bool();
					break;
				default:
					throw new globalThis.Error(
						'unknown map entry field for sui.rpc.v2beta2.ProtocolConfig.feature_flags',
					);
			}
		}
		map[key ?? ''] = val ?? false;
	}
	private binaryReadMap3(
		map: ProtocolConfig['attributes'],
		reader: IBinaryReader,
		options: BinaryReadOptions,
	): void {
		let len = reader.uint32(),
			end = reader.pos + len,
			key: keyof ProtocolConfig['attributes'] | undefined,
			val: ProtocolConfig['attributes'][any] | undefined;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case 1:
					key = reader.string();
					break;
				case 2:
					val = reader.string();
					break;
				default:
					throw new globalThis.Error(
						'unknown map entry field for sui.rpc.v2beta2.ProtocolConfig.attributes',
					);
			}
		}
		map[key ?? ''] = val ?? '';
	}
	internalBinaryWrite(
		message: ProtocolConfig,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 protocol_version = 1; */
		if (message.protocolVersion !== undefined)
			writer.tag(1, WireType.Varint).uint64(message.protocolVersion);
		/* map<string, bool> feature_flags = 2; */
		for (let k of globalThis.Object.keys(message.featureFlags))
			writer
				.tag(2, WireType.LengthDelimited)
				.fork()
				.tag(1, WireType.LengthDelimited)
				.string(k)
				.tag(2, WireType.Varint)
				.bool(message.featureFlags[k])
				.join();
		/* map<string, string> attributes = 3; */
		for (let k of globalThis.Object.keys(message.attributes))
			writer
				.tag(3, WireType.LengthDelimited)
				.fork()
				.tag(1, WireType.LengthDelimited)
				.string(k)
				.tag(2, WireType.LengthDelimited)
				.string(message.attributes[k])
				.join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ProtocolConfig
 */
export const ProtocolConfig = new ProtocolConfig$Type();
