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
import { Timestamp } from '../../../google/protobuf/timestamp.js';
/**
 * @generated from protobuf message sui.rpc.v2beta2.LookupNameRequest
 */
export interface LookupNameRequest {
	/**
	 * Required. The SuiNS name to lookup.
	 *
	 * Supports both `@name` as well as `name.sui` formats.
	 *
	 * @generated from protobuf field: optional string name = 1
	 */
	name?: string;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.LookupNameResponse
 */
export interface LookupNameResponse {
	/**
	 * The record for the requested name
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.NameRecord record = 1
	 */
	record?: NameRecord;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ReverseLookupNameRequest
 */
export interface ReverseLookupNameRequest {
	/**
	 * Required. The address to perform a reverse lookup for.
	 *
	 * @generated from protobuf field: optional string address = 1
	 */
	address?: string;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ReverseLookupNameResponse
 */
export interface ReverseLookupNameResponse {
	/**
	 * The record for the SuiNS name linked to the requested address
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.NameRecord record = 1
	 */
	record?: NameRecord;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.NameRecord
 */
export interface NameRecord {
	/**
	 * Id of this record.
	 *
	 * Note that records are stored on chain as dynamic fields of the type
	 * `Field<Domain,NameRecord>`.
	 *
	 * @generated from protobuf field: optional string id = 1
	 */
	id?: string;
	/**
	 * The SuiNS name of this record
	 *
	 * @generated from protobuf field: optional string name = 2
	 */
	name?: string;
	/**
	 * The ID of the `RegistrationNFT` assigned to this record.
	 *
	 * The owner of the corrisponding `RegistrationNFT` has the rights to
	 * be able to change and adjust the `target_address` of this domain.
	 *
	 * It is possible that the ID changes if the record expires and is
	 * purchased by someone else.
	 *
	 * @generated from protobuf field: optional string registration_nft_id = 3
	 */
	registrationNftId?: string;
	/**
	 * Timestamp when the record expires.
	 *
	 * This is either the expiration of the record itself or the expiration of
	 * this record's parent if this is a leaf record.
	 *
	 * @generated from protobuf field: optional google.protobuf.Timestamp expiration_timestamp = 4
	 */
	expirationTimestamp?: Timestamp;
	/**
	 * The target address that this name points to
	 *
	 * @generated from protobuf field: optional string target_address = 5
	 */
	targetAddress?: string;
	/**
	 * Additional data which may be stored in a record
	 *
	 * @generated from protobuf field: map<string, string> data = 6
	 */
	data: {
		[key: string]: string;
	};
}
// @generated message type with reflection information, may provide speed optimized methods
class LookupNameRequest$Type extends MessageType<LookupNameRequest> {
	constructor() {
		super('sui.rpc.v2beta2.LookupNameRequest', [
			{ no: 1, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<LookupNameRequest>): LookupNameRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<LookupNameRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: LookupNameRequest,
	): LookupNameRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string name */ 1:
					message.name = reader.string();
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
		message: LookupNameRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string name = 1; */
		if (message.name !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.name);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.LookupNameRequest
 */
export const LookupNameRequest = new LookupNameRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class LookupNameResponse$Type extends MessageType<LookupNameResponse> {
	constructor() {
		super('sui.rpc.v2beta2.LookupNameResponse', [
			{ no: 1, name: 'record', kind: 'message', T: () => NameRecord },
		]);
	}
	create(value?: PartialMessage<LookupNameResponse>): LookupNameResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<LookupNameResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: LookupNameResponse,
	): LookupNameResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.NameRecord record */ 1:
					message.record = NameRecord.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.record,
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
		message: LookupNameResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.NameRecord record = 1; */
		if (message.record)
			NameRecord.internalBinaryWrite(
				message.record,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.LookupNameResponse
 */
export const LookupNameResponse = new LookupNameResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ReverseLookupNameRequest$Type extends MessageType<ReverseLookupNameRequest> {
	constructor() {
		super('sui.rpc.v2beta2.ReverseLookupNameRequest', [
			{ no: 1, name: 'address', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<ReverseLookupNameRequest>): ReverseLookupNameRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ReverseLookupNameRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ReverseLookupNameRequest,
	): ReverseLookupNameRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string address */ 1:
					message.address = reader.string();
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
		message: ReverseLookupNameRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string address = 1; */
		if (message.address !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.address);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ReverseLookupNameRequest
 */
export const ReverseLookupNameRequest = new ReverseLookupNameRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ReverseLookupNameResponse$Type extends MessageType<ReverseLookupNameResponse> {
	constructor() {
		super('sui.rpc.v2beta2.ReverseLookupNameResponse', [
			{ no: 1, name: 'record', kind: 'message', T: () => NameRecord },
		]);
	}
	create(value?: PartialMessage<ReverseLookupNameResponse>): ReverseLookupNameResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined)
			reflectionMergePartial<ReverseLookupNameResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ReverseLookupNameResponse,
	): ReverseLookupNameResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.NameRecord record */ 1:
					message.record = NameRecord.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.record,
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
		message: ReverseLookupNameResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.NameRecord record = 1; */
		if (message.record)
			NameRecord.internalBinaryWrite(
				message.record,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ReverseLookupNameResponse
 */
export const ReverseLookupNameResponse = new ReverseLookupNameResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class NameRecord$Type extends MessageType<NameRecord> {
	constructor() {
		super('sui.rpc.v2beta2.NameRecord', [
			{ no: 1, name: 'id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'registration_nft_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'expiration_timestamp', kind: 'message', T: () => Timestamp },
			{ no: 5, name: 'target_address', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 6,
				name: 'data',
				kind: 'map',
				K: 9 /*ScalarType.STRING*/,
				V: { kind: 'scalar', T: 9 /*ScalarType.STRING*/ },
			},
		]);
	}
	create(value?: PartialMessage<NameRecord>): NameRecord {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.data = {};
		if (value !== undefined) reflectionMergePartial<NameRecord>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: NameRecord,
	): NameRecord {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string id */ 1:
					message.id = reader.string();
					break;
				case /* optional string name */ 2:
					message.name = reader.string();
					break;
				case /* optional string registration_nft_id */ 3:
					message.registrationNftId = reader.string();
					break;
				case /* optional google.protobuf.Timestamp expiration_timestamp */ 4:
					message.expirationTimestamp = Timestamp.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.expirationTimestamp,
					);
					break;
				case /* optional string target_address */ 5:
					message.targetAddress = reader.string();
					break;
				case /* map<string, string> data */ 6:
					this.binaryReadMap6(message.data, reader, options);
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
	private binaryReadMap6(
		map: NameRecord['data'],
		reader: IBinaryReader,
		options: BinaryReadOptions,
	): void {
		let len = reader.uint32(),
			end = reader.pos + len,
			key: keyof NameRecord['data'] | undefined,
			val: NameRecord['data'][any] | undefined;
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
					throw new globalThis.Error('unknown map entry field for sui.rpc.v2beta2.NameRecord.data');
			}
		}
		map[key ?? ''] = val ?? '';
	}
	internalBinaryWrite(
		message: NameRecord,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string id = 1; */
		if (message.id !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.id);
		/* optional string name = 2; */
		if (message.name !== undefined) writer.tag(2, WireType.LengthDelimited).string(message.name);
		/* optional string registration_nft_id = 3; */
		if (message.registrationNftId !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.registrationNftId);
		/* optional google.protobuf.Timestamp expiration_timestamp = 4; */
		if (message.expirationTimestamp)
			Timestamp.internalBinaryWrite(
				message.expirationTimestamp,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string target_address = 5; */
		if (message.targetAddress !== undefined)
			writer.tag(5, WireType.LengthDelimited).string(message.targetAddress);
		/* map<string, string> data = 6; */
		for (let k of globalThis.Object.keys(message.data))
			writer
				.tag(6, WireType.LengthDelimited)
				.fork()
				.tag(1, WireType.LengthDelimited)
				.string(k)
				.tag(2, WireType.LengthDelimited)
				.string(message.data[k])
				.join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.NameRecord
 */
export const NameRecord = new NameRecord$Type();
/**
 * @generated ServiceType for protobuf service sui.rpc.v2beta2.NameService
 */
export const NameService = new ServiceType('sui.rpc.v2beta2.NameService', [
	{ name: 'LookupName', options: {}, I: LookupNameRequest, O: LookupNameResponse },
	{
		name: 'ReverseLookupName',
		options: {},
		I: ReverseLookupNameRequest,
		O: ReverseLookupNameResponse,
	},
]);
