// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ServiceType } from '@protobuf-ts/runtime-rpc';
import type { BinaryWriteOptions } from '@protobuf-ts/runtime';
import type { IBinaryWriter } from '@protobuf-ts/runtime';
import { WireType } from '@protobuf-ts/runtime';
import type { BinaryReadOptions } from '@protobuf-ts/runtime';
import type { IBinaryReader } from '@protobuf-ts/runtime';
import { UnknownFieldHandler } from '@protobuf-ts/runtime';
import type { PartialMessage } from '@protobuf-ts/runtime';
import { reflectionMergePartial } from '@protobuf-ts/runtime';
import { MessageType } from '@protobuf-ts/runtime';
import { Checkpoint } from '../v2beta/checkpoint.js';
import { FieldMask } from '../../../google/protobuf/field_mask.js';
/**
 * Request message for SubscriptionService.SubscribeCheckpoints
 *
 * @generated from protobuf message sui.rpc.v2alpha.SubscribeCheckpointsRequest
 */
export interface SubscribeCheckpointsRequest {
	/**
	 * Optional. Mask for specifiying which parts of the
	 * SubscribeCheckpointsResponse should be returned.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 1;
	 */
	readMask?: FieldMask;
}
/**
 * Response message for SubscriptionService.SubscribeCheckpoints
 *
 * @generated from protobuf message sui.rpc.v2alpha.SubscribeCheckpointsResponse
 */
export interface SubscribeCheckpointsResponse {
	/**
	 * Required. The checkpoint sequence number and value of the current cursor
	 * into the checkpoint stream
	 *
	 * @generated from protobuf field: optional uint64 cursor = 1;
	 */
	cursor?: bigint;
	/**
	 * The requested data for this checkpoint
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.Checkpoint checkpoint = 2;
	 */
	checkpoint?: Checkpoint;
}
// @generated message type with reflection information, may provide speed optimized methods
class SubscribeCheckpointsRequest$Type extends MessageType<SubscribeCheckpointsRequest> {
	constructor() {
		super('sui.rpc.v2alpha.SubscribeCheckpointsRequest', [
			{ no: 1, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
	create(value?: PartialMessage<SubscribeCheckpointsRequest>): SubscribeCheckpointsRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined)
			reflectionMergePartial<SubscribeCheckpointsRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: SubscribeCheckpointsRequest,
	): SubscribeCheckpointsRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional google.protobuf.FieldMask read_mask */ 1:
					message.readMask = FieldMask.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.readMask,
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
		message: SubscribeCheckpointsRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional google.protobuf.FieldMask read_mask = 1; */
		if (message.readMask)
			FieldMask.internalBinaryWrite(
				message.readMask,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.SubscribeCheckpointsRequest
 */
export const SubscribeCheckpointsRequest = new SubscribeCheckpointsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SubscribeCheckpointsResponse$Type extends MessageType<SubscribeCheckpointsResponse> {
	constructor() {
		super('sui.rpc.v2alpha.SubscribeCheckpointsResponse', [
			{
				no: 1,
				name: 'cursor',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 2, name: 'checkpoint', kind: 'message', T: () => Checkpoint },
		]);
	}
	create(value?: PartialMessage<SubscribeCheckpointsResponse>): SubscribeCheckpointsResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined)
			reflectionMergePartial<SubscribeCheckpointsResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: SubscribeCheckpointsResponse,
	): SubscribeCheckpointsResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 cursor */ 1:
					message.cursor = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta.Checkpoint checkpoint */ 2:
					message.checkpoint = Checkpoint.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.checkpoint,
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
		message: SubscribeCheckpointsResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 cursor = 1; */
		if (message.cursor !== undefined) writer.tag(1, WireType.Varint).uint64(message.cursor);
		/* optional sui.rpc.v2beta.Checkpoint checkpoint = 2; */
		if (message.checkpoint)
			Checkpoint.internalBinaryWrite(
				message.checkpoint,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.SubscribeCheckpointsResponse
 */
export const SubscribeCheckpointsResponse = new SubscribeCheckpointsResponse$Type();
/**
 * @generated ServiceType for protobuf service sui.rpc.v2alpha.SubscriptionService
 */
export const SubscriptionService = new ServiceType('sui.rpc.v2alpha.SubscriptionService', [
	{
		name: 'SubscribeCheckpoints',
		serverStreaming: true,
		options: {},
		I: SubscribeCheckpointsRequest,
		O: SubscribeCheckpointsResponse,
	},
]);
