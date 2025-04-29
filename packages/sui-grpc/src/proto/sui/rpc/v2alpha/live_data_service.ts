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
import { Owner } from '../v2beta/owner.js';
import { ExecutedTransaction } from '../v2beta/executed_transaction.js';
import { FieldMask } from '../../../google/protobuf/field_mask.js';
import { Transaction } from '../v2beta/transaction.js';
/**
 * Request message for `NodeService.GetCoinInfo`.
 *
 * @generated from protobuf message sui.rpc.v2alpha.GetCoinInfoRequest
 */
export interface GetCoinInfoRequest {
	/**
	 * The coin type to request information about
	 *
	 * @generated from protobuf field: optional string coin_type = 1;
	 */
	coinType?: string;
}
/**
 * Response message for `NodeService.GetCoinInfo`.
 *
 * @generated from protobuf message sui.rpc.v2alpha.GetCoinInfoResponse
 */
export interface GetCoinInfoResponse {
	/**
	 * Required. The coin type.
	 *
	 * @generated from protobuf field: optional string coin_type = 1;
	 */
	coinType?: string;
	/**
	 * This field will be populated with information about this coin
	 * type's `0x2::coin::CoinMetadata` if it exists and has not been wrapped.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2alpha.CoinMetadata metadata = 2;
	 */
	metadata?: CoinMetadata;
	/**
	 * This field will be populated with information about this coin
	 * type's `0x2::coin::TreasuryCap` if it exists and has not been wrapped.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2alpha.CoinTreasury treasury = 3;
	 */
	treasury?: CoinTreasury;
	/**
	 * If this coin type is a regulated coin, this field will be
	 * populated with information about its `0x2::coin::RegulatedCoinMetadata`
	 * object.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2alpha.RegulatedCoinMetadata regulated_metadata = 4;
	 */
	regulatedMetadata?: RegulatedCoinMetadata;
}
/**
 * Metadata for a coin type
 *
 * @generated from protobuf message sui.rpc.v2alpha.CoinMetadata
 */
export interface CoinMetadata {
	/**
	 * ObjectId of the `0x2::coin::CoinMetadata` object.
	 *
	 * @generated from protobuf field: optional string id = 1;
	 */
	id?: string;
	/**
	 * Number of decimal places to coin uses.
	 *
	 * @generated from protobuf field: optional uint32 decimals = 2;
	 */
	decimals?: number;
	/**
	 * Name for the token
	 *
	 * @generated from protobuf field: optional string name = 3;
	 */
	name?: string;
	/**
	 * Symbol for the token
	 *
	 * @generated from protobuf field: optional string symbol = 4;
	 */
	symbol?: string;
	/**
	 * Description of the token
	 *
	 * @generated from protobuf field: optional string description = 5;
	 */
	description?: string;
	/**
	 * URL for the token logo
	 *
	 * @generated from protobuf field: optional string icon_url = 6;
	 */
	iconUrl?: string;
}
/**
 * Information about a coin type's `0x2::coin::TreasuryCap` and its total available supply
 *
 * @generated from protobuf message sui.rpc.v2alpha.CoinTreasury
 */
export interface CoinTreasury {
	/**
	 * ObjectId of the `0x2::coin::TreasuryCap` object.
	 *
	 * @generated from protobuf field: optional string id = 1;
	 */
	id?: string;
	/**
	 * Total available supply for this coin type.
	 *
	 * @generated from protobuf field: optional uint64 total_supply = 2;
	 */
	totalSupply?: bigint;
}
/**
 * Information about a regulated coin, which indicates that it makes use of the transfer deny list.
 *
 * @generated from protobuf message sui.rpc.v2alpha.RegulatedCoinMetadata
 */
export interface RegulatedCoinMetadata {
	/**
	 * ObjectId of the `0x2::coin::RegulatedCoinMetadata` object.
	 *
	 * @generated from protobuf field: optional string id = 1;
	 */
	id?: string;
	/**
	 * The ID of the coin's `CoinMetadata` object.
	 *
	 * @generated from protobuf field: optional string coin_metadata_object = 2;
	 */
	coinMetadataObject?: string;
	/**
	 * The ID of the coin's `DenyCap` object.
	 *
	 * @generated from protobuf field: optional string deny_cap_object = 3;
	 */
	denyCapObject?: string;
}
/**
 * Request message for `NodeService.ListDynamicFields`
 *
 * @generated from protobuf message sui.rpc.v2alpha.ListDynamicFieldsRequest
 */
export interface ListDynamicFieldsRequest {
	/**
	 * Required. The `UID` of the parent, which owns the collections of dynamic fields.
	 *
	 * @generated from protobuf field: optional string parent = 1;
	 */
	parent?: string;
	/**
	 * The maximum number of dynamic fields to return. The service may return fewer than this value.
	 * If unspecified, at most `50` entries will be returned.
	 * The maximum value is `1000`; values above `1000` will be coerced to `1000`.
	 *
	 * @generated from protobuf field: optional uint32 page_size = 2;
	 */
	pageSize?: number;
	/**
	 * A page token, received from a previous `ListDynamicFields` call.
	 * Provide this to retrieve the subsequent page.
	 *
	 * When paginating, all other parameters provided to `ListDynamicFields` must
	 * match the call that provided the page token.
	 *
	 * @generated from protobuf field: optional bytes page_token = 3;
	 */
	pageToken?: Uint8Array;
}
/**
 * Response message for `NodeService.ListDynamicFields`
 *
 * @generated from protobuf message sui.rpc.v2alpha.ListDynamicFieldsResponse
 */
export interface ListDynamicFieldsResponse {
	/**
	 * Page of dynamic fields owned by the specified parent.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2alpha.DynamicField dynamic_fields = 1;
	 */
	dynamicFields: DynamicField[];
	/**
	 * A token, which can be sent as `page_token` to retrieve the next page.
	 * If this field is omitted, there are no subsequent pages.
	 *
	 * @generated from protobuf field: optional bytes next_page_token = 2;
	 */
	nextPageToken?: Uint8Array;
}
/**
 * @generated from protobuf message sui.rpc.v2alpha.DynamicField
 */
export interface DynamicField {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2alpha.DynamicField.DynamicFieldKind kind = 1;
	 */
	kind?: DynamicField_DynamicFieldKind;
	/**
	 * ObjectId of this dynamic field's parent.
	 *
	 * @generated from protobuf field: optional string parent = 2;
	 */
	parent?: string;
	/**
	 * ObjectId of this dynamic field.
	 *
	 * @generated from protobuf field: optional string field_id = 3;
	 */
	fieldId?: string;
	/**
	 * The type of the dynamic field "name"
	 *
	 * @generated from protobuf field: optional string name_type = 4;
	 */
	nameType?: string;
	/**
	 * The serialized move value of "name"
	 *
	 * @generated from protobuf field: optional bytes name_value = 5;
	 */
	nameValue?: Uint8Array;
	/**
	 * The type of the dynamic field "value".
	 *
	 * If this is a dynamic object field then this is the type of the object
	 * itself (which is a child of this field), otherwise this is the type of the
	 * value of this field.
	 *
	 * @generated from protobuf field: optional string value_type = 6;
	 */
	valueType?: string;
	/**
	 * The ObjectId of the child object when a child is a dynamic
	 * object field.
	 *
	 * The presence or absence of this field can be used to determine if a child
	 * is a dynamic field or a dynamic child object
	 *
	 * @generated from protobuf field: optional string dynamic_object_id = 7;
	 */
	dynamicObjectId?: string;
}
/**
 * @generated from protobuf enum sui.rpc.v2alpha.DynamicField.DynamicFieldKind
 */
export enum DynamicField_DynamicFieldKind {
	/**
	 * @generated from protobuf enum value: DYNAMIC_FIELD_KIND_UNKNOWN = 0;
	 */
	DYNAMIC_FIELD_KIND_UNKNOWN = 0,
	/**
	 * @generated from protobuf enum value: FIELD = 1;
	 */
	FIELD = 1,
	/**
	 * @generated from protobuf enum value: OBJECT = 2;
	 */
	OBJECT = 2,
}
/**
 * @generated from protobuf message sui.rpc.v2alpha.SimulateTransactionRequest
 */
export interface SimulateTransactionRequest {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.Transaction transaction = 1;
	 */
	transaction?: Transaction;
	/**
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 2;
	 */
	readMask?: FieldMask;
}
/**
 * @generated from protobuf message sui.rpc.v2alpha.SimulateTransactionResponse
 */
export interface SimulateTransactionResponse {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.ExecutedTransaction transaction = 1;
	 */
	transaction?: ExecutedTransaction;
}
/**
 * @generated from protobuf message sui.rpc.v2alpha.ResolveTransactionRequest
 */
export interface ResolveTransactionRequest {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.Transaction unresolved_transaction = 1;
	 */
	unresolvedTransaction?: Transaction;
	/**
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 2;
	 */
	readMask?: FieldMask;
}
/**
 * @generated from protobuf message sui.rpc.v2alpha.ResolveTransactionResponse
 */
export interface ResolveTransactionResponse {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.Transaction transaction = 1;
	 */
	transaction?: Transaction;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2alpha.SimulateTransactionResponse simulation = 2;
	 */
	simulation?: SimulateTransactionResponse;
}
/**
 * @generated from protobuf message sui.rpc.v2alpha.ListOwnedObjectsRequest
 */
export interface ListOwnedObjectsRequest {
	/**
	 * Required. The address of the account that owns the objects.
	 *
	 * @generated from protobuf field: optional string owner = 1;
	 */
	owner?: string;
	/**
	 * Optional type filter to limit the types of objects listed.
	 *
	 * Providing an object type with no type params will return objects of that
	 * type with any type parameter, e.g. `0x2::coin::Coin` will return all
	 * `Coin<T>` objects regardless of the type parameter `T`. Providing a type
	 * with a type param will retrict the returned objects to only those objects
	 * that match the provided type parameters, e.g.
	 * `0x2::coin::Coin<0x2::sui::SUI>` will only return `Coin<SUI>` objects.
	 *
	 * @generated from protobuf field: optional string object_type = 4;
	 */
	objectType?: string;
	/**
	 * The maximum number of entries return. The service may return fewer than this value.
	 * If unspecified, at most `50` entries will be returned.
	 * The maximum value is `1000`; values above `1000` will be coerced to `1000`.
	 *
	 * @generated from protobuf field: optional uint32 page_size = 2;
	 */
	pageSize?: number;
	/**
	 * A page token, received from a previous `ListOwnedObjects` call.
	 * Provide this to retrieve the subsequent page.
	 *
	 * When paginating, all other parameters provided to `ListOwnedObjects` must
	 * match the call that provided the page token.
	 *
	 * @generated from protobuf field: optional bytes page_token = 3;
	 */
	pageToken?: Uint8Array;
}
/**
 * @generated from protobuf message sui.rpc.v2alpha.ListOwnedObjectsResponse
 */
export interface ListOwnedObjectsResponse {
	/**
	 * Page of dynamic fields owned by the specified parent.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2alpha.OwnedObject objects = 1;
	 */
	objects: OwnedObject[];
	/**
	 * A token, which can be sent as `page_token` to retrieve the next page.
	 * If this field is omitted, there are no subsequent pages.
	 *
	 * @generated from protobuf field: optional bytes next_page_token = 2;
	 */
	nextPageToken?: Uint8Array;
}
/**
 * @generated from protobuf message sui.rpc.v2alpha.OwnedObject
 */
export interface OwnedObject {
	/**
	 * @generated from protobuf field: optional string object_id = 2;
	 */
	objectId?: string;
	/**
	 * @generated from protobuf field: optional uint64 version = 3;
	 */
	version?: bigint;
	/**
	 * @generated from protobuf field: optional string digest = 4;
	 */
	digest?: string;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.Owner owner = 5;
	 */
	owner?: Owner;
	/**
	 * @generated from protobuf field: optional string object_type = 6;
	 */
	objectType?: string;
	/**
	 * Current balance if this object is a `0x2::coin::Coin<T>`
	 *
	 * @generated from protobuf field: optional uint64 balance = 200;
	 */
	balance?: bigint;
}
// @generated message type with reflection information, may provide speed optimized methods
class GetCoinInfoRequest$Type extends MessageType<GetCoinInfoRequest> {
	constructor() {
		super('sui.rpc.v2alpha.GetCoinInfoRequest', [
			{ no: 1, name: 'coin_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<GetCoinInfoRequest>): GetCoinInfoRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetCoinInfoRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetCoinInfoRequest,
	): GetCoinInfoRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string coin_type */ 1:
					message.coinType = reader.string();
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
		message: GetCoinInfoRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string coin_type = 1; */
		if (message.coinType !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.coinType);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.GetCoinInfoRequest
 */
export const GetCoinInfoRequest = new GetCoinInfoRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetCoinInfoResponse$Type extends MessageType<GetCoinInfoResponse> {
	constructor() {
		super('sui.rpc.v2alpha.GetCoinInfoResponse', [
			{ no: 1, name: 'coin_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'metadata', kind: 'message', T: () => CoinMetadata },
			{ no: 3, name: 'treasury', kind: 'message', T: () => CoinTreasury },
			{ no: 4, name: 'regulated_metadata', kind: 'message', T: () => RegulatedCoinMetadata },
		]);
	}
	create(value?: PartialMessage<GetCoinInfoResponse>): GetCoinInfoResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetCoinInfoResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetCoinInfoResponse,
	): GetCoinInfoResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string coin_type */ 1:
					message.coinType = reader.string();
					break;
				case /* optional sui.rpc.v2alpha.CoinMetadata metadata */ 2:
					message.metadata = CoinMetadata.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.metadata,
					);
					break;
				case /* optional sui.rpc.v2alpha.CoinTreasury treasury */ 3:
					message.treasury = CoinTreasury.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.treasury,
					);
					break;
				case /* optional sui.rpc.v2alpha.RegulatedCoinMetadata regulated_metadata */ 4:
					message.regulatedMetadata = RegulatedCoinMetadata.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.regulatedMetadata,
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
		message: GetCoinInfoResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string coin_type = 1; */
		if (message.coinType !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.coinType);
		/* optional sui.rpc.v2alpha.CoinMetadata metadata = 2; */
		if (message.metadata)
			CoinMetadata.internalBinaryWrite(
				message.metadata,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2alpha.CoinTreasury treasury = 3; */
		if (message.treasury)
			CoinTreasury.internalBinaryWrite(
				message.treasury,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2alpha.RegulatedCoinMetadata regulated_metadata = 4; */
		if (message.regulatedMetadata)
			RegulatedCoinMetadata.internalBinaryWrite(
				message.regulatedMetadata,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.GetCoinInfoResponse
 */
export const GetCoinInfoResponse = new GetCoinInfoResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CoinMetadata$Type extends MessageType<CoinMetadata> {
	constructor() {
		super('sui.rpc.v2alpha.CoinMetadata', [
			{ no: 1, name: 'id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'decimals', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 3, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'symbol', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'description', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 6, name: 'icon_url', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<CoinMetadata>): CoinMetadata {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CoinMetadata>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CoinMetadata,
	): CoinMetadata {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string id */ 1:
					message.id = reader.string();
					break;
				case /* optional uint32 decimals */ 2:
					message.decimals = reader.uint32();
					break;
				case /* optional string name */ 3:
					message.name = reader.string();
					break;
				case /* optional string symbol */ 4:
					message.symbol = reader.string();
					break;
				case /* optional string description */ 5:
					message.description = reader.string();
					break;
				case /* optional string icon_url */ 6:
					message.iconUrl = reader.string();
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
		message: CoinMetadata,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string id = 1; */
		if (message.id !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.id);
		/* optional uint32 decimals = 2; */
		if (message.decimals !== undefined) writer.tag(2, WireType.Varint).uint32(message.decimals);
		/* optional string name = 3; */
		if (message.name !== undefined) writer.tag(3, WireType.LengthDelimited).string(message.name);
		/* optional string symbol = 4; */
		if (message.symbol !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.symbol);
		/* optional string description = 5; */
		if (message.description !== undefined)
			writer.tag(5, WireType.LengthDelimited).string(message.description);
		/* optional string icon_url = 6; */
		if (message.iconUrl !== undefined)
			writer.tag(6, WireType.LengthDelimited).string(message.iconUrl);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.CoinMetadata
 */
export const CoinMetadata = new CoinMetadata$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CoinTreasury$Type extends MessageType<CoinTreasury> {
	constructor() {
		super('sui.rpc.v2alpha.CoinTreasury', [
			{ no: 1, name: 'id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'total_supply',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<CoinTreasury>): CoinTreasury {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CoinTreasury>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CoinTreasury,
	): CoinTreasury {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string id */ 1:
					message.id = reader.string();
					break;
				case /* optional uint64 total_supply */ 2:
					message.totalSupply = reader.uint64().toBigInt();
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
		message: CoinTreasury,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string id = 1; */
		if (message.id !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.id);
		/* optional uint64 total_supply = 2; */
		if (message.totalSupply !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.totalSupply);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.CoinTreasury
 */
export const CoinTreasury = new CoinTreasury$Type();
// @generated message type with reflection information, may provide speed optimized methods
class RegulatedCoinMetadata$Type extends MessageType<RegulatedCoinMetadata> {
	constructor() {
		super('sui.rpc.v2alpha.RegulatedCoinMetadata', [
			{ no: 1, name: 'id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'coin_metadata_object',
				kind: 'scalar',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{ no: 3, name: 'deny_cap_object', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<RegulatedCoinMetadata>): RegulatedCoinMetadata {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<RegulatedCoinMetadata>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: RegulatedCoinMetadata,
	): RegulatedCoinMetadata {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string id */ 1:
					message.id = reader.string();
					break;
				case /* optional string coin_metadata_object */ 2:
					message.coinMetadataObject = reader.string();
					break;
				case /* optional string deny_cap_object */ 3:
					message.denyCapObject = reader.string();
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
		message: RegulatedCoinMetadata,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string id = 1; */
		if (message.id !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.id);
		/* optional string coin_metadata_object = 2; */
		if (message.coinMetadataObject !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.coinMetadataObject);
		/* optional string deny_cap_object = 3; */
		if (message.denyCapObject !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.denyCapObject);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.RegulatedCoinMetadata
 */
export const RegulatedCoinMetadata = new RegulatedCoinMetadata$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListDynamicFieldsRequest$Type extends MessageType<ListDynamicFieldsRequest> {
	constructor() {
		super('sui.rpc.v2alpha.ListDynamicFieldsRequest', [
			{ no: 1, name: 'parent', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'page_size', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 3, name: 'page_token', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<ListDynamicFieldsRequest>): ListDynamicFieldsRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ListDynamicFieldsRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ListDynamicFieldsRequest,
	): ListDynamicFieldsRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string parent */ 1:
					message.parent = reader.string();
					break;
				case /* optional uint32 page_size */ 2:
					message.pageSize = reader.uint32();
					break;
				case /* optional bytes page_token */ 3:
					message.pageToken = reader.bytes();
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
		message: ListDynamicFieldsRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string parent = 1; */
		if (message.parent !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.parent);
		/* optional uint32 page_size = 2; */
		if (message.pageSize !== undefined) writer.tag(2, WireType.Varint).uint32(message.pageSize);
		/* optional bytes page_token = 3; */
		if (message.pageToken !== undefined)
			writer.tag(3, WireType.LengthDelimited).bytes(message.pageToken);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.ListDynamicFieldsRequest
 */
export const ListDynamicFieldsRequest = new ListDynamicFieldsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListDynamicFieldsResponse$Type extends MessageType<ListDynamicFieldsResponse> {
	constructor() {
		super('sui.rpc.v2alpha.ListDynamicFieldsResponse', [
			{
				no: 1,
				name: 'dynamic_fields',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => DynamicField,
			},
			{ no: 2, name: 'next_page_token', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<ListDynamicFieldsResponse>): ListDynamicFieldsResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.dynamicFields = [];
		if (value !== undefined)
			reflectionMergePartial<ListDynamicFieldsResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ListDynamicFieldsResponse,
	): ListDynamicFieldsResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2alpha.DynamicField dynamic_fields */ 1:
					message.dynamicFields.push(
						DynamicField.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional bytes next_page_token */ 2:
					message.nextPageToken = reader.bytes();
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
		message: ListDynamicFieldsResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2alpha.DynamicField dynamic_fields = 1; */
		for (let i = 0; i < message.dynamicFields.length; i++)
			DynamicField.internalBinaryWrite(
				message.dynamicFields[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional bytes next_page_token = 2; */
		if (message.nextPageToken !== undefined)
			writer.tag(2, WireType.LengthDelimited).bytes(message.nextPageToken);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.ListDynamicFieldsResponse
 */
export const ListDynamicFieldsResponse = new ListDynamicFieldsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DynamicField$Type extends MessageType<DynamicField> {
	constructor() {
		super('sui.rpc.v2alpha.DynamicField', [
			{
				no: 1,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2alpha.DynamicField.DynamicFieldKind', DynamicField_DynamicFieldKind],
			},
			{ no: 2, name: 'parent', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'field_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'name_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'name_value', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 6, name: 'value_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 7, name: 'dynamic_object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<DynamicField>): DynamicField {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<DynamicField>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: DynamicField,
	): DynamicField {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2alpha.DynamicField.DynamicFieldKind kind */ 1:
					message.kind = reader.int32();
					break;
				case /* optional string parent */ 2:
					message.parent = reader.string();
					break;
				case /* optional string field_id */ 3:
					message.fieldId = reader.string();
					break;
				case /* optional string name_type */ 4:
					message.nameType = reader.string();
					break;
				case /* optional bytes name_value */ 5:
					message.nameValue = reader.bytes();
					break;
				case /* optional string value_type */ 6:
					message.valueType = reader.string();
					break;
				case /* optional string dynamic_object_id */ 7:
					message.dynamicObjectId = reader.string();
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
		message: DynamicField,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2alpha.DynamicField.DynamicFieldKind kind = 1; */
		if (message.kind !== undefined) writer.tag(1, WireType.Varint).int32(message.kind);
		/* optional string parent = 2; */
		if (message.parent !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.parent);
		/* optional string field_id = 3; */
		if (message.fieldId !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.fieldId);
		/* optional string name_type = 4; */
		if (message.nameType !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.nameType);
		/* optional bytes name_value = 5; */
		if (message.nameValue !== undefined)
			writer.tag(5, WireType.LengthDelimited).bytes(message.nameValue);
		/* optional string value_type = 6; */
		if (message.valueType !== undefined)
			writer.tag(6, WireType.LengthDelimited).string(message.valueType);
		/* optional string dynamic_object_id = 7; */
		if (message.dynamicObjectId !== undefined)
			writer.tag(7, WireType.LengthDelimited).string(message.dynamicObjectId);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.DynamicField
 */
export const DynamicField = new DynamicField$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SimulateTransactionRequest$Type extends MessageType<SimulateTransactionRequest> {
	constructor() {
		super('sui.rpc.v2alpha.SimulateTransactionRequest', [
			{ no: 1, name: 'transaction', kind: 'message', T: () => Transaction },
			{ no: 2, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
	create(value?: PartialMessage<SimulateTransactionRequest>): SimulateTransactionRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined)
			reflectionMergePartial<SimulateTransactionRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: SimulateTransactionRequest,
	): SimulateTransactionRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta.Transaction transaction */ 1:
					message.transaction = Transaction.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.transaction,
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
		message: SimulateTransactionRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta.Transaction transaction = 1; */
		if (message.transaction)
			Transaction.internalBinaryWrite(
				message.transaction,
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
 * @generated MessageType for protobuf message sui.rpc.v2alpha.SimulateTransactionRequest
 */
export const SimulateTransactionRequest = new SimulateTransactionRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SimulateTransactionResponse$Type extends MessageType<SimulateTransactionResponse> {
	constructor() {
		super('sui.rpc.v2alpha.SimulateTransactionResponse', [
			{ no: 1, name: 'transaction', kind: 'message', T: () => ExecutedTransaction },
		]);
	}
	create(value?: PartialMessage<SimulateTransactionResponse>): SimulateTransactionResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined)
			reflectionMergePartial<SimulateTransactionResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: SimulateTransactionResponse,
	): SimulateTransactionResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta.ExecutedTransaction transaction */ 1:
					message.transaction = ExecutedTransaction.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.transaction,
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
		message: SimulateTransactionResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta.ExecutedTransaction transaction = 1; */
		if (message.transaction)
			ExecutedTransaction.internalBinaryWrite(
				message.transaction,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.SimulateTransactionResponse
 */
export const SimulateTransactionResponse = new SimulateTransactionResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ResolveTransactionRequest$Type extends MessageType<ResolveTransactionRequest> {
	constructor() {
		super('sui.rpc.v2alpha.ResolveTransactionRequest', [
			{ no: 1, name: 'unresolved_transaction', kind: 'message', T: () => Transaction },
			{ no: 2, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
	create(value?: PartialMessage<ResolveTransactionRequest>): ResolveTransactionRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined)
			reflectionMergePartial<ResolveTransactionRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ResolveTransactionRequest,
	): ResolveTransactionRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta.Transaction unresolved_transaction */ 1:
					message.unresolvedTransaction = Transaction.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.unresolvedTransaction,
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
		message: ResolveTransactionRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta.Transaction unresolved_transaction = 1; */
		if (message.unresolvedTransaction)
			Transaction.internalBinaryWrite(
				message.unresolvedTransaction,
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
 * @generated MessageType for protobuf message sui.rpc.v2alpha.ResolveTransactionRequest
 */
export const ResolveTransactionRequest = new ResolveTransactionRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ResolveTransactionResponse$Type extends MessageType<ResolveTransactionResponse> {
	constructor() {
		super('sui.rpc.v2alpha.ResolveTransactionResponse', [
			{ no: 1, name: 'transaction', kind: 'message', T: () => Transaction },
			{ no: 2, name: 'simulation', kind: 'message', T: () => SimulateTransactionResponse },
		]);
	}
	create(value?: PartialMessage<ResolveTransactionResponse>): ResolveTransactionResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined)
			reflectionMergePartial<ResolveTransactionResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ResolveTransactionResponse,
	): ResolveTransactionResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta.Transaction transaction */ 1:
					message.transaction = Transaction.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.transaction,
					);
					break;
				case /* optional sui.rpc.v2alpha.SimulateTransactionResponse simulation */ 2:
					message.simulation = SimulateTransactionResponse.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.simulation,
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
		message: ResolveTransactionResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta.Transaction transaction = 1; */
		if (message.transaction)
			Transaction.internalBinaryWrite(
				message.transaction,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2alpha.SimulateTransactionResponse simulation = 2; */
		if (message.simulation)
			SimulateTransactionResponse.internalBinaryWrite(
				message.simulation,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.ResolveTransactionResponse
 */
export const ResolveTransactionResponse = new ResolveTransactionResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListOwnedObjectsRequest$Type extends MessageType<ListOwnedObjectsRequest> {
	constructor() {
		super('sui.rpc.v2alpha.ListOwnedObjectsRequest', [
			{ no: 1, name: 'owner', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'object_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'page_size', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 3, name: 'page_token', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<ListOwnedObjectsRequest>): ListOwnedObjectsRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ListOwnedObjectsRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ListOwnedObjectsRequest,
	): ListOwnedObjectsRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string owner */ 1:
					message.owner = reader.string();
					break;
				case /* optional string object_type */ 4:
					message.objectType = reader.string();
					break;
				case /* optional uint32 page_size */ 2:
					message.pageSize = reader.uint32();
					break;
				case /* optional bytes page_token */ 3:
					message.pageToken = reader.bytes();
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
		message: ListOwnedObjectsRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string owner = 1; */
		if (message.owner !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.owner);
		/* optional string object_type = 4; */
		if (message.objectType !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.objectType);
		/* optional uint32 page_size = 2; */
		if (message.pageSize !== undefined) writer.tag(2, WireType.Varint).uint32(message.pageSize);
		/* optional bytes page_token = 3; */
		if (message.pageToken !== undefined)
			writer.tag(3, WireType.LengthDelimited).bytes(message.pageToken);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.ListOwnedObjectsRequest
 */
export const ListOwnedObjectsRequest = new ListOwnedObjectsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListOwnedObjectsResponse$Type extends MessageType<ListOwnedObjectsResponse> {
	constructor() {
		super('sui.rpc.v2alpha.ListOwnedObjectsResponse', [
			{
				no: 1,
				name: 'objects',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => OwnedObject,
			},
			{ no: 2, name: 'next_page_token', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<ListOwnedObjectsResponse>): ListOwnedObjectsResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.objects = [];
		if (value !== undefined) reflectionMergePartial<ListOwnedObjectsResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ListOwnedObjectsResponse,
	): ListOwnedObjectsResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2alpha.OwnedObject objects */ 1:
					message.objects.push(OwnedObject.internalBinaryRead(reader, reader.uint32(), options));
					break;
				case /* optional bytes next_page_token */ 2:
					message.nextPageToken = reader.bytes();
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
		message: ListOwnedObjectsResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2alpha.OwnedObject objects = 1; */
		for (let i = 0; i < message.objects.length; i++)
			OwnedObject.internalBinaryWrite(
				message.objects[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional bytes next_page_token = 2; */
		if (message.nextPageToken !== undefined)
			writer.tag(2, WireType.LengthDelimited).bytes(message.nextPageToken);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.ListOwnedObjectsResponse
 */
export const ListOwnedObjectsResponse = new ListOwnedObjectsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class OwnedObject$Type extends MessageType<OwnedObject> {
	constructor() {
		super('sui.rpc.v2alpha.OwnedObject', [
			{ no: 2, name: 'object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 4, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'owner', kind: 'message', T: () => Owner },
			{ no: 6, name: 'object_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 200,
				name: 'balance',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<OwnedObject>): OwnedObject {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<OwnedObject>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: OwnedObject,
	): OwnedObject {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string object_id */ 2:
					message.objectId = reader.string();
					break;
				case /* optional uint64 version */ 3:
					message.version = reader.uint64().toBigInt();
					break;
				case /* optional string digest */ 4:
					message.digest = reader.string();
					break;
				case /* optional sui.rpc.v2beta.Owner owner */ 5:
					message.owner = Owner.internalBinaryRead(reader, reader.uint32(), options, message.owner);
					break;
				case /* optional string object_type */ 6:
					message.objectType = reader.string();
					break;
				case /* optional uint64 balance */ 200:
					message.balance = reader.uint64().toBigInt();
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
		message: OwnedObject,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string object_id = 2; */
		if (message.objectId !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.objectId);
		/* optional uint64 version = 3; */
		if (message.version !== undefined) writer.tag(3, WireType.Varint).uint64(message.version);
		/* optional string digest = 4; */
		if (message.digest !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.digest);
		/* optional sui.rpc.v2beta.Owner owner = 5; */
		if (message.owner)
			Owner.internalBinaryWrite(
				message.owner,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string object_type = 6; */
		if (message.objectType !== undefined)
			writer.tag(6, WireType.LengthDelimited).string(message.objectType);
		/* optional uint64 balance = 200; */
		if (message.balance !== undefined) writer.tag(200, WireType.Varint).uint64(message.balance);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2alpha.OwnedObject
 */
export const OwnedObject = new OwnedObject$Type();
/**
 * @generated ServiceType for protobuf service sui.rpc.v2alpha.LiveDataService
 */
export const LiveDataService = new ServiceType('sui.rpc.v2alpha.LiveDataService', [
	{
		name: 'ListDynamicFields',
		options: {},
		I: ListDynamicFieldsRequest,
		O: ListDynamicFieldsResponse,
	},
	{
		name: 'ListOwnedObjects',
		options: {},
		I: ListOwnedObjectsRequest,
		O: ListOwnedObjectsResponse,
	},
	{ name: 'GetCoinInfo', options: {}, I: GetCoinInfoRequest, O: GetCoinInfoResponse },
	{
		name: 'SimulateTransaction',
		options: {},
		I: SimulateTransactionRequest,
		O: SimulateTransactionResponse,
	},
	{
		name: 'ResolveTransaction',
		options: {},
		I: ResolveTransactionRequest,
		O: ResolveTransactionResponse,
	},
]);
