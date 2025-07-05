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
import { ProtocolConfig } from './protocol_config.js';
import { Timestamp } from '../../../google/protobuf/timestamp.js';
import { SystemState } from './system_state.js';
import { ValidatorCommittee } from './signature.js';
/**
 * @generated from protobuf message sui.rpc.v2beta2.Epoch
 */
export interface Epoch {
	/**
	 * @generated from protobuf field: optional uint64 epoch = 1;
	 */
	epoch?: bigint;
	/**
	 * The committee governing this epoch.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ValidatorCommittee committee = 2;
	 */
	committee?: ValidatorCommittee;
	/**
	 * Snapshot of Sui's SystemState (`0x3::sui_system::SystemState`) at the
	 * beginning of the epoch, for past epochs, or the current state for the
	 * current epoch.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.SystemState system_state = 3;
	 */
	systemState?: SystemState;
	/**
	 * @generated from protobuf field: optional uint64 first_checkpoint = 4;
	 */
	firstCheckpoint?: bigint;
	/**
	 * @generated from protobuf field: optional uint64 last_checkpoint = 5;
	 */
	lastCheckpoint?: bigint;
	/**
	 * @generated from protobuf field: optional google.protobuf.Timestamp start = 6;
	 */
	start?: Timestamp;
	/**
	 * @generated from protobuf field: optional google.protobuf.Timestamp end = 7;
	 */
	end?: Timestamp;
	/**
	 * Reference gas price denominated in MIST
	 *
	 * @generated from protobuf field: optional uint64 reference_gas_price = 8;
	 */
	referenceGasPrice?: bigint;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ProtocolConfig protocol_config = 9;
	 */
	protocolConfig?: ProtocolConfig;
}
// @generated message type with reflection information, may provide speed optimized methods
class Epoch$Type extends MessageType<Epoch> {
	constructor() {
		super('sui.rpc.v2beta2.Epoch', [
			{
				no: 1,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 2, name: 'committee', kind: 'message', T: () => ValidatorCommittee },
			{ no: 3, name: 'system_state', kind: 'message', T: () => SystemState },
			{
				no: 4,
				name: 'first_checkpoint',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 5,
				name: 'last_checkpoint',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 6, name: 'start', kind: 'message', T: () => Timestamp },
			{ no: 7, name: 'end', kind: 'message', T: () => Timestamp },
			{
				no: 8,
				name: 'reference_gas_price',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 9, name: 'protocol_config', kind: 'message', T: () => ProtocolConfig },
		]);
	}
	create(value?: PartialMessage<Epoch>): Epoch {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Epoch>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Epoch,
	): Epoch {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 epoch */ 1:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.ValidatorCommittee committee */ 2:
					message.committee = ValidatorCommittee.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.committee,
					);
					break;
				case /* optional sui.rpc.v2beta2.SystemState system_state */ 3:
					message.systemState = SystemState.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.systemState,
					);
					break;
				case /* optional uint64 first_checkpoint */ 4:
					message.firstCheckpoint = reader.uint64().toBigInt();
					break;
				case /* optional uint64 last_checkpoint */ 5:
					message.lastCheckpoint = reader.uint64().toBigInt();
					break;
				case /* optional google.protobuf.Timestamp start */ 6:
					message.start = Timestamp.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.start,
					);
					break;
				case /* optional google.protobuf.Timestamp end */ 7:
					message.end = Timestamp.internalBinaryRead(reader, reader.uint32(), options, message.end);
					break;
				case /* optional uint64 reference_gas_price */ 8:
					message.referenceGasPrice = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta2.ProtocolConfig protocol_config */ 9:
					message.protocolConfig = ProtocolConfig.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.protocolConfig,
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
		message: Epoch,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 epoch = 1; */
		if (message.epoch !== undefined) writer.tag(1, WireType.Varint).uint64(message.epoch);
		/* optional sui.rpc.v2beta2.ValidatorCommittee committee = 2; */
		if (message.committee)
			ValidatorCommittee.internalBinaryWrite(
				message.committee,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.SystemState system_state = 3; */
		if (message.systemState)
			SystemState.internalBinaryWrite(
				message.systemState,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 first_checkpoint = 4; */
		if (message.firstCheckpoint !== undefined)
			writer.tag(4, WireType.Varint).uint64(message.firstCheckpoint);
		/* optional uint64 last_checkpoint = 5; */
		if (message.lastCheckpoint !== undefined)
			writer.tag(5, WireType.Varint).uint64(message.lastCheckpoint);
		/* optional google.protobuf.Timestamp start = 6; */
		if (message.start)
			Timestamp.internalBinaryWrite(
				message.start,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional google.protobuf.Timestamp end = 7; */
		if (message.end)
			Timestamp.internalBinaryWrite(
				message.end,
				writer.tag(7, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 reference_gas_price = 8; */
		if (message.referenceGasPrice !== undefined)
			writer.tag(8, WireType.Varint).uint64(message.referenceGasPrice);
		/* optional sui.rpc.v2beta2.ProtocolConfig protocol_config = 9; */
		if (message.protocolConfig)
			ProtocolConfig.internalBinaryWrite(
				message.protocolConfig,
				writer.tag(9, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Epoch
 */
export const Epoch = new Epoch$Type();
