// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Epoch } from './epoch.js';
import { Checkpoint } from './checkpoint.js';
import { ServiceType } from '@protobuf-ts/runtime-rpc';
import { WireType } from '@protobuf-ts/runtime';
import type { BinaryWriteOptions } from '@protobuf-ts/runtime';
import type { IBinaryWriter } from '@protobuf-ts/runtime';
import type { BinaryReadOptions } from '@protobuf-ts/runtime';
import type { IBinaryReader } from '@protobuf-ts/runtime';
import { UnknownFieldHandler } from '@protobuf-ts/runtime';
import type { PartialMessage } from '@protobuf-ts/runtime';
import { reflectionMergePartial } from '@protobuf-ts/runtime';
import { MessageType } from '@protobuf-ts/runtime';
import { ExecutedTransaction } from './executed_transaction.js';
import { Object } from './object.js';
import { FieldMask } from '../../../google/protobuf/field_mask.js';
import { Timestamp } from '../../../google/protobuf/timestamp.js';
/**
 * @generated from protobuf message sui.rpc.v2beta.GetServiceInfoRequest
 */
export interface GetServiceInfoRequest {}
/**
 * @generated from protobuf message sui.rpc.v2beta.GetServiceInfoResponse
 */
export interface GetServiceInfoResponse {
	/**
	 * The chain identifier of the chain that this node is on.
	 *
	 * The chain identifier is the digest of the genesis checkpoint, the
	 * checkpoint with sequence number 0.
	 *
	 * @generated from protobuf field: optional string chain_id = 1;
	 */
	chainId?: string;
	/**
	 * Human-readable name of the chain that this node is on.
	 *
	 * This is intended to be a human-readable name like `mainnet`, `testnet`, and so on.
	 *
	 * @generated from protobuf field: optional string chain = 2;
	 */
	chain?: string;
	/**
	 * Current epoch of the node based on its highest executed checkpoint.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 3;
	 */
	epoch?: bigint;
	/**
	 * Checkpoint height of the most recently executed checkpoint.
	 *
	 * @generated from protobuf field: optional uint64 checkpoint_height = 4;
	 */
	checkpointHeight?: bigint;
	/**
	 * Unix timestamp of the most recently executed checkpoint.
	 *
	 * @generated from protobuf field: optional google.protobuf.Timestamp timestamp = 5;
	 */
	timestamp?: Timestamp;
	/**
	 * The lowest checkpoint for which checkpoints and transaction data are available.
	 *
	 * @generated from protobuf field: optional uint64 lowest_available_checkpoint = 6;
	 */
	lowestAvailableCheckpoint?: bigint;
	/**
	 * The lowest checkpoint for which object data is available.
	 *
	 * @generated from protobuf field: optional uint64 lowest_available_checkpoint_objects = 7;
	 */
	lowestAvailableCheckpointObjects?: bigint;
	/**
	 * Software version of the service. Similar to the `server` http header.
	 *
	 * @generated from protobuf field: optional string server_version = 8;
	 */
	serverVersion?: string;
}
/**
 * @generated from protobuf message sui.rpc.v2beta.GetObjectRequest
 */
export interface GetObjectRequest {
	/**
	 * Required. The `ObjectId` of the requested object.
	 *
	 * @generated from protobuf field: optional string object_id = 1;
	 */
	objectId?: string;
	/**
	 * Request a specific version of the object.
	 * If no version is specified, and the object is live, then the latest
	 * version of the object is returned.
	 *
	 * @generated from protobuf field: optional uint64 version = 2;
	 */
	version?: bigint;
	/**
	 * Mask specifying which fields to read.
	 * If no mask is specified, defaults to `object_id,version,digest`.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 3;
	 */
	readMask?: FieldMask;
}
/**
 * @generated from protobuf message sui.rpc.v2beta.BatchGetObjectsRequest
 */
export interface BatchGetObjectsRequest {
	/**
	 * @generated from protobuf field: repeated sui.rpc.v2beta.GetObjectRequest requests = 1;
	 */
	requests: GetObjectRequest[];
	/**
	 * Mask specifying which fields to read.
	 * If no mask is specified, defaults to `object_id,version,digest`.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 2;
	 */
	readMask?: FieldMask;
}
/**
 * @generated from protobuf message sui.rpc.v2beta.BatchGetObjectsResponse
 */
export interface BatchGetObjectsResponse {
	/**
	 * @generated from protobuf field: repeated sui.rpc.v2beta.Object objects = 1;
	 */
	objects: Object[];
}
/**
 * @generated from protobuf message sui.rpc.v2beta.GetTransactionRequest
 */
export interface GetTransactionRequest {
	/**
	 * Required. The digest of the requested transaction.
	 *
	 * @generated from protobuf field: optional string digest = 1;
	 */
	digest?: string;
	/**
	 * Mask specifying which fields to read.
	 * If no mask is specified, defaults to `digest`.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 2;
	 */
	readMask?: FieldMask;
}
/**
 * @generated from protobuf message sui.rpc.v2beta.BatchGetTransactionsRequest
 */
export interface BatchGetTransactionsRequest {
	/**
	 * Required. The digests of the requested transactions.
	 *
	 * @generated from protobuf field: repeated string digests = 1;
	 */
	digests: string[];
	/**
	 * Mask specifying which fields to read.
	 * If no mask is specified, defaults to `object_id,version,digest`.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 2;
	 */
	readMask?: FieldMask;
}
/**
 * @generated from protobuf message sui.rpc.v2beta.BatchGetTransactionsResponse
 */
export interface BatchGetTransactionsResponse {
	/**
	 * @generated from protobuf field: repeated sui.rpc.v2beta.ExecutedTransaction transactions = 1;
	 */
	transactions: ExecutedTransaction[];
}
/**
 * @generated from protobuf message sui.rpc.v2beta.GetCheckpointRequest
 */
export interface GetCheckpointRequest {
	/**
	 * @generated from protobuf oneof: checkpoint_id
	 */
	checkpointId:
		| {
				oneofKind: 'sequenceNumber';
				/**
				 * The sequence number of the requested checkpoint.
				 *
				 * @generated from protobuf field: uint64 sequence_number = 1;
				 */
				sequenceNumber: bigint;
		  }
		| {
				oneofKind: 'digest';
				/**
				 * The digest of the requested checkpoint.
				 *
				 * @generated from protobuf field: string digest = 2;
				 */
				digest: string;
		  }
		| {
				oneofKind: undefined;
		  };
	/**
	 * Mask specifying which fields to read.
	 * If no mask is specified, defaults to `object_id,version,digest`.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 3;
	 */
	readMask?: FieldMask;
}
// message BatchGetCheckpointsRequest {
//   repeated GetCheckpointRequest requests = 1;
//
//   // Mask specifying which fields to read.
//   // If no mask is specified, defaults to `object_id,version,digest`.
//   optional google.protobuf.FieldMask read_mask = 2;
// }
//
// message BatchGetCheckpointsResponse {
//   repeated Checkpoint checkpoints = 1;
// }

/**
 * @generated from protobuf message sui.rpc.v2beta.GetEpochRequest
 */
export interface GetEpochRequest {
	/**
	 * The requested epoch.
	 * If no epoch is provided the current epoch will be returned.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 1;
	 */
	epoch?: bigint;
	/**
	 * Mask specifying which fields to read.
	 * If no mask is specified, defaults to `epoch`.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 2;
	 */
	readMask?: FieldMask;
}
// @generated message type with reflection information, may provide speed optimized methods
class GetServiceInfoRequest$Type extends MessageType<GetServiceInfoRequest> {
	constructor() {
		super('sui.rpc.v2beta.GetServiceInfoRequest', []);
	}
	create(value?: PartialMessage<GetServiceInfoRequest>): GetServiceInfoRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetServiceInfoRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetServiceInfoRequest,
	): GetServiceInfoRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
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
		message: GetServiceInfoRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.GetServiceInfoRequest
 */
export const GetServiceInfoRequest = new GetServiceInfoRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetServiceInfoResponse$Type extends MessageType<GetServiceInfoResponse> {
	constructor() {
		super('sui.rpc.v2beta.GetServiceInfoResponse', [
			{ no: 1, name: 'chain_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'chain', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 4,
				name: 'checkpoint_height',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 5, name: 'timestamp', kind: 'message', T: () => Timestamp },
			{
				no: 6,
				name: 'lowest_available_checkpoint',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 7,
				name: 'lowest_available_checkpoint_objects',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 8, name: 'server_version', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<GetServiceInfoResponse>): GetServiceInfoResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetServiceInfoResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetServiceInfoResponse,
	): GetServiceInfoResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string chain_id */ 1:
					message.chainId = reader.string();
					break;
				case /* optional string chain */ 2:
					message.chain = reader.string();
					break;
				case /* optional uint64 epoch */ 3:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 checkpoint_height */ 4:
					message.checkpointHeight = reader.uint64().toBigInt();
					break;
				case /* optional google.protobuf.Timestamp timestamp */ 5:
					message.timestamp = Timestamp.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.timestamp,
					);
					break;
				case /* optional uint64 lowest_available_checkpoint */ 6:
					message.lowestAvailableCheckpoint = reader.uint64().toBigInt();
					break;
				case /* optional uint64 lowest_available_checkpoint_objects */ 7:
					message.lowestAvailableCheckpointObjects = reader.uint64().toBigInt();
					break;
				case /* optional string server_version */ 8:
					message.serverVersion = reader.string();
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
		message: GetServiceInfoResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string chain_id = 1; */
		if (message.chainId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.chainId);
		/* optional string chain = 2; */
		if (message.chain !== undefined) writer.tag(2, WireType.LengthDelimited).string(message.chain);
		/* optional uint64 epoch = 3; */
		if (message.epoch !== undefined) writer.tag(3, WireType.Varint).uint64(message.epoch);
		/* optional uint64 checkpoint_height = 4; */
		if (message.checkpointHeight !== undefined)
			writer.tag(4, WireType.Varint).uint64(message.checkpointHeight);
		/* optional google.protobuf.Timestamp timestamp = 5; */
		if (message.timestamp)
			Timestamp.internalBinaryWrite(
				message.timestamp,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 lowest_available_checkpoint = 6; */
		if (message.lowestAvailableCheckpoint !== undefined)
			writer.tag(6, WireType.Varint).uint64(message.lowestAvailableCheckpoint);
		/* optional uint64 lowest_available_checkpoint_objects = 7; */
		if (message.lowestAvailableCheckpointObjects !== undefined)
			writer.tag(7, WireType.Varint).uint64(message.lowestAvailableCheckpointObjects);
		/* optional string server_version = 8; */
		if (message.serverVersion !== undefined)
			writer.tag(8, WireType.LengthDelimited).string(message.serverVersion);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.GetServiceInfoResponse
 */
export const GetServiceInfoResponse = new GetServiceInfoResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetObjectRequest$Type extends MessageType<GetObjectRequest> {
	constructor() {
		super('sui.rpc.v2beta.GetObjectRequest', [
			{ no: 1, name: 'object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 3, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
	create(value?: PartialMessage<GetObjectRequest>): GetObjectRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetObjectRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetObjectRequest,
	): GetObjectRequest {
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
				case /* optional google.protobuf.FieldMask read_mask */ 3:
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
		message: GetObjectRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string object_id = 1; */
		if (message.objectId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.objectId);
		/* optional uint64 version = 2; */
		if (message.version !== undefined) writer.tag(2, WireType.Varint).uint64(message.version);
		/* optional google.protobuf.FieldMask read_mask = 3; */
		if (message.readMask)
			FieldMask.internalBinaryWrite(
				message.readMask,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.GetObjectRequest
 */
export const GetObjectRequest = new GetObjectRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class BatchGetObjectsRequest$Type extends MessageType<BatchGetObjectsRequest> {
	constructor() {
		super('sui.rpc.v2beta.BatchGetObjectsRequest', [
			{
				no: 1,
				name: 'requests',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => GetObjectRequest,
			},
			{ no: 2, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
	create(value?: PartialMessage<BatchGetObjectsRequest>): BatchGetObjectsRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.requests = [];
		if (value !== undefined) reflectionMergePartial<BatchGetObjectsRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: BatchGetObjectsRequest,
	): BatchGetObjectsRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta.GetObjectRequest requests */ 1:
					message.requests.push(
						GetObjectRequest.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional google.protobuf.FieldMask read_mask */ 2:
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
		message: BatchGetObjectsRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta.GetObjectRequest requests = 1; */
		for (let i = 0; i < message.requests.length; i++)
			GetObjectRequest.internalBinaryWrite(
				message.requests[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional google.protobuf.FieldMask read_mask = 2; */
		if (message.readMask)
			FieldMask.internalBinaryWrite(
				message.readMask,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.BatchGetObjectsRequest
 */
export const BatchGetObjectsRequest = new BatchGetObjectsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class BatchGetObjectsResponse$Type extends MessageType<BatchGetObjectsResponse> {
	constructor() {
		super('sui.rpc.v2beta.BatchGetObjectsResponse', [
			{ no: 1, name: 'objects', kind: 'message', repeat: 1 /*RepeatType.PACKED*/, T: () => Object },
		]);
	}
	create(value?: PartialMessage<BatchGetObjectsResponse>): BatchGetObjectsResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.objects = [];
		if (value !== undefined) reflectionMergePartial<BatchGetObjectsResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: BatchGetObjectsResponse,
	): BatchGetObjectsResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta.Object objects */ 1:
					message.objects.push(Object.internalBinaryRead(reader, reader.uint32(), options));
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
		message: BatchGetObjectsResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta.Object objects = 1; */
		for (let i = 0; i < message.objects.length; i++)
			Object.internalBinaryWrite(
				message.objects[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.BatchGetObjectsResponse
 */
export const BatchGetObjectsResponse = new BatchGetObjectsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetTransactionRequest$Type extends MessageType<GetTransactionRequest> {
	constructor() {
		super('sui.rpc.v2beta.GetTransactionRequest', [
			{ no: 1, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
	create(value?: PartialMessage<GetTransactionRequest>): GetTransactionRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetTransactionRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetTransactionRequest,
	): GetTransactionRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string digest */ 1:
					message.digest = reader.string();
					break;
				case /* optional google.protobuf.FieldMask read_mask */ 2:
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
		message: GetTransactionRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string digest = 1; */
		if (message.digest !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.digest);
		/* optional google.protobuf.FieldMask read_mask = 2; */
		if (message.readMask)
			FieldMask.internalBinaryWrite(
				message.readMask,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.GetTransactionRequest
 */
export const GetTransactionRequest = new GetTransactionRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class BatchGetTransactionsRequest$Type extends MessageType<BatchGetTransactionsRequest> {
	constructor() {
		super('sui.rpc.v2beta.BatchGetTransactionsRequest', [
			{
				no: 1,
				name: 'digests',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 9 /*ScalarType.STRING*/,
			},
			{ no: 2, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
	create(value?: PartialMessage<BatchGetTransactionsRequest>): BatchGetTransactionsRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.digests = [];
		if (value !== undefined)
			reflectionMergePartial<BatchGetTransactionsRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: BatchGetTransactionsRequest,
	): BatchGetTransactionsRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated string digests */ 1:
					message.digests.push(reader.string());
					break;
				case /* optional google.protobuf.FieldMask read_mask */ 2:
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
		message: BatchGetTransactionsRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated string digests = 1; */
		for (let i = 0; i < message.digests.length; i++)
			writer.tag(1, WireType.LengthDelimited).string(message.digests[i]);
		/* optional google.protobuf.FieldMask read_mask = 2; */
		if (message.readMask)
			FieldMask.internalBinaryWrite(
				message.readMask,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.BatchGetTransactionsRequest
 */
export const BatchGetTransactionsRequest = new BatchGetTransactionsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class BatchGetTransactionsResponse$Type extends MessageType<BatchGetTransactionsResponse> {
	constructor() {
		super('sui.rpc.v2beta.BatchGetTransactionsResponse', [
			{
				no: 1,
				name: 'transactions',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => ExecutedTransaction,
			},
		]);
	}
	create(value?: PartialMessage<BatchGetTransactionsResponse>): BatchGetTransactionsResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.transactions = [];
		if (value !== undefined)
			reflectionMergePartial<BatchGetTransactionsResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: BatchGetTransactionsResponse,
	): BatchGetTransactionsResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta.ExecutedTransaction transactions */ 1:
					message.transactions.push(
						ExecutedTransaction.internalBinaryRead(reader, reader.uint32(), options),
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
		message: BatchGetTransactionsResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta.ExecutedTransaction transactions = 1; */
		for (let i = 0; i < message.transactions.length; i++)
			ExecutedTransaction.internalBinaryWrite(
				message.transactions[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.BatchGetTransactionsResponse
 */
export const BatchGetTransactionsResponse = new BatchGetTransactionsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetCheckpointRequest$Type extends MessageType<GetCheckpointRequest> {
	constructor() {
		super('sui.rpc.v2beta.GetCheckpointRequest', [
			{
				no: 1,
				name: 'sequence_number',
				kind: 'scalar',
				oneof: 'checkpointId',
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 2, name: 'digest', kind: 'scalar', oneof: 'checkpointId', T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
	create(value?: PartialMessage<GetCheckpointRequest>): GetCheckpointRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.checkpointId = { oneofKind: undefined };
		if (value !== undefined) reflectionMergePartial<GetCheckpointRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetCheckpointRequest,
	): GetCheckpointRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* uint64 sequence_number */ 1:
					message.checkpointId = {
						oneofKind: 'sequenceNumber',
						sequenceNumber: reader.uint64().toBigInt(),
					};
					break;
				case /* string digest */ 2:
					message.checkpointId = {
						oneofKind: 'digest',
						digest: reader.string(),
					};
					break;
				case /* optional google.protobuf.FieldMask read_mask */ 3:
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
		message: GetCheckpointRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* uint64 sequence_number = 1; */
		if (message.checkpointId.oneofKind === 'sequenceNumber')
			writer.tag(1, WireType.Varint).uint64(message.checkpointId.sequenceNumber);
		/* string digest = 2; */
		if (message.checkpointId.oneofKind === 'digest')
			writer.tag(2, WireType.LengthDelimited).string(message.checkpointId.digest);
		/* optional google.protobuf.FieldMask read_mask = 3; */
		if (message.readMask)
			FieldMask.internalBinaryWrite(
				message.readMask,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.GetCheckpointRequest
 */
export const GetCheckpointRequest = new GetCheckpointRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetEpochRequest$Type extends MessageType<GetEpochRequest> {
	constructor() {
		super('sui.rpc.v2beta.GetEpochRequest', [
			{
				no: 1,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 2, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
	create(value?: PartialMessage<GetEpochRequest>): GetEpochRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetEpochRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetEpochRequest,
	): GetEpochRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 epoch */ 1:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional google.protobuf.FieldMask read_mask */ 2:
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
		message: GetEpochRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 epoch = 1; */
		if (message.epoch !== undefined) writer.tag(1, WireType.Varint).uint64(message.epoch);
		/* optional google.protobuf.FieldMask read_mask = 2; */
		if (message.readMask)
			FieldMask.internalBinaryWrite(
				message.readMask,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.GetEpochRequest
 */
export const GetEpochRequest = new GetEpochRequest$Type();
/**
 * @generated ServiceType for protobuf service sui.rpc.v2beta.LedgerService
 */
export const LedgerService = new ServiceType('sui.rpc.v2beta.LedgerService', [
	{ name: 'GetServiceInfo', options: {}, I: GetServiceInfoRequest, O: GetServiceInfoResponse },
	{ name: 'GetObject', options: {}, I: GetObjectRequest, O: Object },
	{ name: 'BatchGetObjects', options: {}, I: BatchGetObjectsRequest, O: BatchGetObjectsResponse },
	{ name: 'GetTransaction', options: {}, I: GetTransactionRequest, O: ExecutedTransaction },
	{
		name: 'BatchGetTransactions',
		options: {},
		I: BatchGetTransactionsRequest,
		O: BatchGetTransactionsResponse,
	},
	{ name: 'GetCheckpoint', options: {}, I: GetCheckpointRequest, O: Checkpoint },
	{ name: 'GetEpoch', options: {}, I: GetEpochRequest, O: Epoch },
]);
