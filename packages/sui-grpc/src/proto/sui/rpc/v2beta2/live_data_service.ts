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
import { Value } from '../../../google/protobuf/struct.js';
import { Bcs } from './bcs.js';
import { Argument } from './argument.js';
import { ExecutedTransaction } from './executed_transaction.js';
import { Transaction } from './transaction.js';
import { Object } from './object.js';
import { FieldMask } from '../../../google/protobuf/field_mask.js';
/**
 * Request message for `NodeService.GetCoinInfo`.
 *
 * @generated from protobuf message sui.rpc.v2beta2.GetCoinInfoRequest
 */
export interface GetCoinInfoRequest {
	/**
	 * The coin type to request information about
	 *
	 * @generated from protobuf field: optional string coin_type = 1
	 */
	coinType?: string;
}
/**
 * Response message for `NodeService.GetCoinInfo`.
 *
 * @generated from protobuf message sui.rpc.v2beta2.GetCoinInfoResponse
 */
export interface GetCoinInfoResponse {
	/**
	 * Required. The coin type.
	 *
	 * @generated from protobuf field: optional string coin_type = 1
	 */
	coinType?: string;
	/**
	 * This field will be populated with information about this coin
	 * type's `0x2::coin::CoinMetadata` if it exists and has not been wrapped.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.CoinMetadata metadata = 2
	 */
	metadata?: CoinMetadata;
	/**
	 * This field will be populated with information about this coin
	 * type's `0x2::coin::TreasuryCap` if it exists and has not been wrapped.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.CoinTreasury treasury = 3
	 */
	treasury?: CoinTreasury;
	/**
	 * If this coin type is a regulated coin, this field will be
	 * populated with information either from its Currency object
	 * in the CoinRegistry, or from its `0x2::coin::RegulatedCoinMetadata`
	 * object for coins that have not been migrated to the CoinRegistry
	 *
	 * If this coin is not known to be regulated, only the
	 * coin_regulated_state field will be populated.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.RegulatedCoinMetadata regulated_metadata = 4
	 */
	regulatedMetadata?: RegulatedCoinMetadata;
}
/**
 * Metadata for a coin type
 *
 * @generated from protobuf message sui.rpc.v2beta2.CoinMetadata
 */
export interface CoinMetadata {
	/**
	 * ObjectId of the `0x2::coin::CoinMetadata` object or
	 * 0x2::sui::coin_registry::Currency object (when registered with CoinRegistry).
	 *
	 * @generated from protobuf field: optional string id = 1
	 */
	id?: string;
	/**
	 * Number of decimal places to coin uses.
	 *
	 * @generated from protobuf field: optional uint32 decimals = 2
	 */
	decimals?: number;
	/**
	 * Name for the token
	 *
	 * @generated from protobuf field: optional string name = 3
	 */
	name?: string;
	/**
	 * Symbol for the token
	 *
	 * @generated from protobuf field: optional string symbol = 4
	 */
	symbol?: string;
	/**
	 * Description of the token
	 *
	 * @generated from protobuf field: optional string description = 5
	 */
	description?: string;
	/**
	 * URL for the token logo
	 *
	 * @generated from protobuf field: optional string icon_url = 6
	 */
	iconUrl?: string;
	/**
	 * The MetadataCap ID if it has been claimed for this coin type.
	 * This capability allows updating the coin's metadata fields.
	 * Only populated when metadata is from CoinRegistry.
	 *
	 * @generated from protobuf field: optional string metadata_cap_id = 7
	 */
	metadataCapId?: string;
	/**
	 * State of the MetadataCap for this coin type.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.CoinMetadata.MetadataCapState metadata_cap_state = 8
	 */
	metadataCapState?: CoinMetadata_MetadataCapState;
}
/**
 * Information about the state of the coin's MetadataCap
 *
 * @generated from protobuf enum sui.rpc.v2beta2.CoinMetadata.MetadataCapState
 */
export enum CoinMetadata_MetadataCapState {
	/**
	 * Indicates the state of the MetadataCap is unknown.
	 * Set when the coin has not been migrated to the CoinRegistry.
	 *
	 * @generated from protobuf enum value: METADATA_CAP_STATE_UNKNOWN = 0;
	 */
	METADATA_CAP_STATE_UNKNOWN = 0,
	/**
	 * Indicates the MetadataCap has been claimed.
	 *
	 * @generated from protobuf enum value: CLAIMED = 1;
	 */
	CLAIMED = 1,
	/**
	 * Indicates the MetadataCap has not been claimed.
	 *
	 * @generated from protobuf enum value: UNCLAIMED = 2;
	 */
	UNCLAIMED = 2,
	/**
	 * Indicates the MetadataCap has been deleted.
	 *
	 * @generated from protobuf enum value: DELETED = 3;
	 */
	DELETED = 3,
}
/**
 * Information about a coin type's `0x2::coin::TreasuryCap` and its total available supply
 *
 * @generated from protobuf message sui.rpc.v2beta2.CoinTreasury
 */
export interface CoinTreasury {
	/**
	 * ObjectId of the `0x2::coin::TreasuryCap` object.
	 *
	 * @generated from protobuf field: optional string id = 1
	 */
	id?: string;
	/**
	 * Total available supply for this coin type.
	 *
	 * @generated from protobuf field: optional uint64 total_supply = 2
	 */
	totalSupply?: bigint;
	/**
	 * Supply state indicating if the supply is fixed or can still be minted
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.CoinTreasury.SupplyState supply_state = 3
	 */
	supplyState?: CoinTreasury_SupplyState;
}
/**
 * Supply state of a coin, matching the Move SupplyState enum
 *
 * @generated from protobuf enum sui.rpc.v2beta2.CoinTreasury.SupplyState
 */
export enum CoinTreasury_SupplyState {
	/**
	 * Supply is unknown or TreasuryCap still exists (minting still possible)
	 *
	 * @generated from protobuf enum value: SUPPLY_STATE_UNKNOWN = 0;
	 */
	SUPPLY_STATE_UNKNOWN = 0,
	/**
	 * Supply is fixed (TreasuryCap consumed, no more minting possible)
	 *
	 * @generated from protobuf enum value: FIXED = 1;
	 */
	FIXED = 1,
	/**
	 * Supply can only decrease (burning allowed, minting not allowed)
	 *
	 * @generated from protobuf enum value: BURN_ONLY = 2;
	 */
	BURN_ONLY = 2,
}
/**
 * Information about a regulated coin, which indicates that it makes use of the transfer deny list.
 *
 * @generated from protobuf message sui.rpc.v2beta2.RegulatedCoinMetadata
 */
export interface RegulatedCoinMetadata {
	/**
	 * ObjectId of the `0x2::coin::RegulatedCoinMetadata` object.
	 * Only present for coins that have not been migrated to CoinRegistry.
	 *
	 * @generated from protobuf field: optional string id = 1
	 */
	id?: string;
	/**
	 * The ID of the coin's `CoinMetadata` or `CoinData` object.
	 *
	 * @generated from protobuf field: optional string coin_metadata_object = 2
	 */
	coinMetadataObject?: string;
	/**
	 * The ID of the coin's `DenyCap` object.
	 *
	 * @generated from protobuf field: optional string deny_cap_object = 3
	 */
	denyCapObject?: string;
	/**
	 * Whether the coin can be globally paused
	 *
	 * @generated from protobuf field: optional bool allow_global_pause = 4
	 */
	allowGlobalPause?: boolean;
	/**
	 * Variant of the regulated coin metadata
	 *
	 * @generated from protobuf field: optional uint32 variant = 5
	 */
	variant?: number;
	/**
	 * Indicates the coin's regulated state.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.RegulatedCoinMetadata.CoinRegulatedState coin_regulated_state = 6
	 */
	coinRegulatedState?: RegulatedCoinMetadata_CoinRegulatedState;
}
/**
 * Indicates the state of the regulation of the coin.
 *
 * @generated from protobuf enum sui.rpc.v2beta2.RegulatedCoinMetadata.CoinRegulatedState
 */
export enum RegulatedCoinMetadata_CoinRegulatedState {
	/**
	 * Indicates the regulation state of the coin is unknown.
	 * This is set when a coin has not been migrated to the
	 * coin registry and has no `0x2::coin::RegulatedCoinMetadata`
	 * object.
	 *
	 * @generated from protobuf enum value: COIN_REGULATED_STATE_UNKNOWN = 0;
	 */
	COIN_REGULATED_STATE_UNKNOWN = 0,
	/**
	 * Indicates a coin is regulated. RegulatedCoinMetadata will be populated.
	 *
	 * @generated from protobuf enum value: REGULATED = 1;
	 */
	REGULATED = 1,
	/**
	 * Indicates a coin is unregulated.
	 *
	 * @generated from protobuf enum value: UNREGULATED = 2;
	 */
	UNREGULATED = 2,
}
/**
 * Request message for `LiveDataService.GetBalance`.
 *
 * @generated from protobuf message sui.rpc.v2beta2.GetBalanceRequest
 */
export interface GetBalanceRequest {
	/**
	 * Required. The owner's Sui address.
	 *
	 * @generated from protobuf field: optional string owner = 1
	 */
	owner?: string;
	/**
	 * Required. The type names for the coin (e.g., 0x2::sui::SUI).
	 *
	 * @generated from protobuf field: optional string coin_type = 2
	 */
	coinType?: string;
}
/**
 * Response message for `LiveDataService.GetBalance`.
 * Return the total coin balance for one coin type, owned by the address owner.
 *
 * @generated from protobuf message sui.rpc.v2beta2.GetBalanceResponse
 */
export interface GetBalanceResponse {
	/**
	 * The balance information for the requested coin type.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Balance balance = 1
	 */
	balance?: Balance;
}
/**
 * Request message for `LiveDataService.ListBalances`.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ListBalancesRequest
 */
export interface ListBalancesRequest {
	/**
	 * Required. The owner's Sui address.
	 *
	 * @generated from protobuf field: optional string owner = 1
	 */
	owner?: string;
	/**
	 * The maximum number of balance entries to return. The service may return fewer than this value.
	 * If unspecified, at most `50` entries will be returned.
	 * The maximum value is `1000`; values above `1000` will be coerced to `1000`.
	 *
	 * @generated from protobuf field: optional uint32 page_size = 2
	 */
	pageSize?: number;
	/**
	 * A page token, received from a previous `ListBalances` call.
	 * Provide this to retrieve the subsequent page.
	 *
	 * When paginating, all other parameters provided to `ListBalances` must
	 * match the call that provided the page token.
	 *
	 * @generated from protobuf field: optional bytes page_token = 3
	 */
	pageToken?: Uint8Array;
}
/**
 * Response message for `LiveDataService.ListBalances`.
 * Return the total coin balance for all coin types, owned by the address owner.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ListBalancesResponse
 */
export interface ListBalancesResponse {
	/**
	 * The list of coin types and their respective balances.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Balance balances = 1
	 */
	balances: Balance[];
	/**
	 * A token, which can be sent as `page_token` to retrieve the next page.
	 * If this field is omitted, there are no subsequent pages.
	 *
	 * @generated from protobuf field: optional bytes next_page_token = 2
	 */
	nextPageToken?: Uint8Array;
}
/**
 * Balance information for a specific coin type.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Balance
 */
export interface Balance {
	/**
	 * The type of the coin (e.g., 0x2::sui::SUI).
	 *
	 * @generated from protobuf field: optional string coin_type = 1
	 */
	coinType?: string;
	/**
	 * Shows the total balance of the coin in its smallest unit.
	 *
	 * @generated from protobuf field: optional uint64 balance = 3
	 */
	balance?: bigint;
}
/**
 * Request message for `NodeService.ListDynamicFields`
 *
 * @generated from protobuf message sui.rpc.v2beta2.ListDynamicFieldsRequest
 */
export interface ListDynamicFieldsRequest {
	/**
	 * Required. The `UID` of the parent, which owns the collections of dynamic fields.
	 *
	 * @generated from protobuf field: optional string parent = 1
	 */
	parent?: string;
	/**
	 * The maximum number of dynamic fields to return. The service may return fewer than this value.
	 * If unspecified, at most `50` entries will be returned.
	 * The maximum value is `1000`; values above `1000` will be coerced to `1000`.
	 *
	 * @generated from protobuf field: optional uint32 page_size = 2
	 */
	pageSize?: number;
	/**
	 * A page token, received from a previous `ListDynamicFields` call.
	 * Provide this to retrieve the subsequent page.
	 *
	 * When paginating, all other parameters provided to `ListDynamicFields` must
	 * match the call that provided the page token.
	 *
	 * @generated from protobuf field: optional bytes page_token = 3
	 */
	pageToken?: Uint8Array;
	/**
	 * Mask specifying which fields to read.
	 * If no mask is specified, defaults to `parent,field_id`.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 4
	 */
	readMask?: FieldMask;
}
/**
 * Response message for `NodeService.ListDynamicFields`
 *
 * @generated from protobuf message sui.rpc.v2beta2.ListDynamicFieldsResponse
 */
export interface ListDynamicFieldsResponse {
	/**
	 * Page of dynamic fields owned by the specified parent.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.DynamicField dynamic_fields = 1
	 */
	dynamicFields: DynamicField[];
	/**
	 * A token, which can be sent as `page_token` to retrieve the next page.
	 * If this field is omitted, there are no subsequent pages.
	 *
	 * @generated from protobuf field: optional bytes next_page_token = 2
	 */
	nextPageToken?: Uint8Array;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.DynamicField
 */
export interface DynamicField {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.DynamicField.DynamicFieldKind kind = 1
	 */
	kind?: DynamicField_DynamicFieldKind;
	/**
	 * ObjectId of this dynamic field's parent.
	 *
	 * @generated from protobuf field: optional string parent = 2
	 */
	parent?: string;
	/**
	 * ObjectId of this dynamic field.
	 *
	 * @generated from protobuf field: optional string field_id = 3
	 */
	fieldId?: string;
	/**
	 * The type of the dynamic field "name"
	 *
	 * @generated from protobuf field: optional string name_type = 4
	 */
	nameType?: string;
	/**
	 * The serialized move value of "name"
	 *
	 * @generated from protobuf field: optional bytes name_value = 5
	 */
	nameValue?: Uint8Array;
	/**
	 * The type of the dynamic field "value".
	 *
	 * If this is a dynamic object field then this is the type of the object
	 * itself (which is a child of this field), otherwise this is the type of the
	 * value of this field.
	 *
	 * @generated from protobuf field: optional string value_type = 6
	 */
	valueType?: string;
	/**
	 * The ObjectId of the child object when a child is a dynamic
	 * object field.
	 *
	 * The presence or absence of this field can be used to determine if a child
	 * is a dynamic field or a dynamic child object
	 *
	 * @generated from protobuf field: optional string dynamic_object_id = 7
	 */
	dynamicObjectId?: string;
	/**
	 * The object itself when a child is a dynamic object field.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Object object = 8
	 */
	object?: Object;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta2.DynamicField.DynamicFieldKind
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
 * @generated from protobuf message sui.rpc.v2beta2.SimulateTransactionRequest
 */
export interface SimulateTransactionRequest {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Transaction transaction = 1
	 */
	transaction?: Transaction;
	/**
	 * Mask specifying which fields to read.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 2
	 */
	readMask?: FieldMask;
	/**
	 * Specify whether checks should be ENABLED (default) or DISABLED while executing the transaction
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.SimulateTransactionRequest.TransactionChecks checks = 3
	 */
	checks?: SimulateTransactionRequest_TransactionChecks;
	/**
	 * Perform gas selection based on a budget estimation and include the
	 * selected gas payment and budget in the response.
	 *
	 * This option will be ignored if `checks` is `DISABLED`.
	 *
	 * @generated from protobuf field: optional bool do_gas_selection = 4
	 */
	doGasSelection?: boolean;
}
/**
 * buf:lint:ignore ENUM_ZERO_VALUE_SUFFIX
 *
 * @generated from protobuf enum sui.rpc.v2beta2.SimulateTransactionRequest.TransactionChecks
 */
export enum SimulateTransactionRequest_TransactionChecks {
	/**
	 * @generated from protobuf enum value: ENABLED = 0;
	 */
	ENABLED = 0,
	/**
	 * @generated from protobuf enum value: DISABLED = 1;
	 */
	DISABLED = 1,
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.SimulateTransactionResponse
 */
export interface SimulateTransactionResponse {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ExecutedTransaction transaction = 1
	 */
	transaction?: ExecutedTransaction;
	/**
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.CommandResult outputs = 2
	 */
	outputs: CommandResult[];
}
/**
 * An intermediate result/output from the execution of a single command
 *
 * @generated from protobuf message sui.rpc.v2beta2.CommandResult
 */
export interface CommandResult {
	/**
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.CommandOutput return_values = 1
	 */
	returnValues: CommandOutput[];
	/**
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.CommandOutput mutated_by_ref = 2
	 */
	mutatedByRef: CommandOutput[];
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.CommandOutput
 */
export interface CommandOutput {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Argument argument = 1
	 */
	argument?: Argument;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Bcs value = 2
	 */
	value?: Bcs;
	/**
	 * JSON rendering of the output.
	 *
	 * @generated from protobuf field: optional google.protobuf.Value json = 3
	 */
	json?: Value;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ListOwnedObjectsRequest
 */
export interface ListOwnedObjectsRequest {
	/**
	 * Required. The address of the account that owns the objects.
	 *
	 * @generated from protobuf field: optional string owner = 1
	 */
	owner?: string;
	/**
	 * The maximum number of entries return. The service may return fewer than this value.
	 * If unspecified, at most `50` entries will be returned.
	 * The maximum value is `1000`; values above `1000` will be coerced to `1000`.
	 *
	 * @generated from protobuf field: optional uint32 page_size = 2
	 */
	pageSize?: number;
	/**
	 * A page token, received from a previous `ListOwnedObjects` call.
	 * Provide this to retrieve the subsequent page.
	 *
	 * When paginating, all other parameters provided to `ListOwnedObjects` must
	 * match the call that provided the page token.
	 *
	 * @generated from protobuf field: optional bytes page_token = 3
	 */
	pageToken?: Uint8Array;
	/**
	 * Mask specifying which fields to read.
	 * If no mask is specified, defaults to `object_id,version,object_type`.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 4
	 */
	readMask?: FieldMask;
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
	 * @generated from protobuf field: optional string object_type = 5
	 */
	objectType?: string;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ListOwnedObjectsResponse
 */
export interface ListOwnedObjectsResponse {
	/**
	 * Page of dynamic fields owned by the specified parent.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Object objects = 1
	 */
	objects: Object[];
	/**
	 * A token, which can be sent as `page_token` to retrieve the next page.
	 * If this field is omitted, there are no subsequent pages.
	 *
	 * @generated from protobuf field: optional bytes next_page_token = 2
	 */
	nextPageToken?: Uint8Array;
}
// @generated message type with reflection information, may provide speed optimized methods
class GetCoinInfoRequest$Type extends MessageType<GetCoinInfoRequest> {
	constructor() {
		super('sui.rpc.v2beta2.GetCoinInfoRequest', [
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
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GetCoinInfoRequest
 */
export const GetCoinInfoRequest = new GetCoinInfoRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetCoinInfoResponse$Type extends MessageType<GetCoinInfoResponse> {
	constructor() {
		super('sui.rpc.v2beta2.GetCoinInfoResponse', [
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
				case /* optional sui.rpc.v2beta2.CoinMetadata metadata */ 2:
					message.metadata = CoinMetadata.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.metadata,
					);
					break;
				case /* optional sui.rpc.v2beta2.CoinTreasury treasury */ 3:
					message.treasury = CoinTreasury.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.treasury,
					);
					break;
				case /* optional sui.rpc.v2beta2.RegulatedCoinMetadata regulated_metadata */ 4:
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
		/* optional sui.rpc.v2beta2.CoinMetadata metadata = 2; */
		if (message.metadata)
			CoinMetadata.internalBinaryWrite(
				message.metadata,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.CoinTreasury treasury = 3; */
		if (message.treasury)
			CoinTreasury.internalBinaryWrite(
				message.treasury,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.RegulatedCoinMetadata regulated_metadata = 4; */
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
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GetCoinInfoResponse
 */
export const GetCoinInfoResponse = new GetCoinInfoResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CoinMetadata$Type extends MessageType<CoinMetadata> {
	constructor() {
		super('sui.rpc.v2beta2.CoinMetadata', [
			{ no: 1, name: 'id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'decimals', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 3, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'symbol', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'description', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 6, name: 'icon_url', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 7, name: 'metadata_cap_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 8,
				name: 'metadata_cap_state',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.CoinMetadata.MetadataCapState', CoinMetadata_MetadataCapState],
			},
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
				case /* optional string metadata_cap_id */ 7:
					message.metadataCapId = reader.string();
					break;
				case /* optional sui.rpc.v2beta2.CoinMetadata.MetadataCapState metadata_cap_state */ 8:
					message.metadataCapState = reader.int32();
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
		/* optional string metadata_cap_id = 7; */
		if (message.metadataCapId !== undefined)
			writer.tag(7, WireType.LengthDelimited).string(message.metadataCapId);
		/* optional sui.rpc.v2beta2.CoinMetadata.MetadataCapState metadata_cap_state = 8; */
		if (message.metadataCapState !== undefined)
			writer.tag(8, WireType.Varint).int32(message.metadataCapState);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.CoinMetadata
 */
export const CoinMetadata = new CoinMetadata$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CoinTreasury$Type extends MessageType<CoinTreasury> {
	constructor() {
		super('sui.rpc.v2beta2.CoinTreasury', [
			{ no: 1, name: 'id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'total_supply',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: 'supply_state',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.CoinTreasury.SupplyState', CoinTreasury_SupplyState],
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
				case /* optional sui.rpc.v2beta2.CoinTreasury.SupplyState supply_state */ 3:
					message.supplyState = reader.int32();
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
		/* optional sui.rpc.v2beta2.CoinTreasury.SupplyState supply_state = 3; */
		if (message.supplyState !== undefined)
			writer.tag(3, WireType.Varint).int32(message.supplyState);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.CoinTreasury
 */
export const CoinTreasury = new CoinTreasury$Type();
// @generated message type with reflection information, may provide speed optimized methods
class RegulatedCoinMetadata$Type extends MessageType<RegulatedCoinMetadata> {
	constructor() {
		super('sui.rpc.v2beta2.RegulatedCoinMetadata', [
			{ no: 1, name: 'id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'coin_metadata_object',
				kind: 'scalar',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
			{ no: 3, name: 'deny_cap_object', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'allow_global_pause', kind: 'scalar', opt: true, T: 8 /*ScalarType.BOOL*/ },
			{ no: 5, name: 'variant', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{
				no: 6,
				name: 'coin_regulated_state',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta2.RegulatedCoinMetadata.CoinRegulatedState',
					RegulatedCoinMetadata_CoinRegulatedState,
				],
			},
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
				case /* optional bool allow_global_pause */ 4:
					message.allowGlobalPause = reader.bool();
					break;
				case /* optional uint32 variant */ 5:
					message.variant = reader.uint32();
					break;
				case /* optional sui.rpc.v2beta2.RegulatedCoinMetadata.CoinRegulatedState coin_regulated_state */ 6:
					message.coinRegulatedState = reader.int32();
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
		/* optional bool allow_global_pause = 4; */
		if (message.allowGlobalPause !== undefined)
			writer.tag(4, WireType.Varint).bool(message.allowGlobalPause);
		/* optional uint32 variant = 5; */
		if (message.variant !== undefined) writer.tag(5, WireType.Varint).uint32(message.variant);
		/* optional sui.rpc.v2beta2.RegulatedCoinMetadata.CoinRegulatedState coin_regulated_state = 6; */
		if (message.coinRegulatedState !== undefined)
			writer.tag(6, WireType.Varint).int32(message.coinRegulatedState);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.RegulatedCoinMetadata
 */
export const RegulatedCoinMetadata = new RegulatedCoinMetadata$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetBalanceRequest$Type extends MessageType<GetBalanceRequest> {
	constructor() {
		super('sui.rpc.v2beta2.GetBalanceRequest', [
			{ no: 1, name: 'owner', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'coin_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<GetBalanceRequest>): GetBalanceRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetBalanceRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetBalanceRequest,
	): GetBalanceRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string owner */ 1:
					message.owner = reader.string();
					break;
				case /* optional string coin_type */ 2:
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
		message: GetBalanceRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string owner = 1; */
		if (message.owner !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.owner);
		/* optional string coin_type = 2; */
		if (message.coinType !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.coinType);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GetBalanceRequest
 */
export const GetBalanceRequest = new GetBalanceRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetBalanceResponse$Type extends MessageType<GetBalanceResponse> {
	constructor() {
		super('sui.rpc.v2beta2.GetBalanceResponse', [
			{ no: 1, name: 'balance', kind: 'message', T: () => Balance },
		]);
	}
	create(value?: PartialMessage<GetBalanceResponse>): GetBalanceResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetBalanceResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetBalanceResponse,
	): GetBalanceResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Balance balance */ 1:
					message.balance = Balance.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.balance,
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
		message: GetBalanceResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Balance balance = 1; */
		if (message.balance)
			Balance.internalBinaryWrite(
				message.balance,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GetBalanceResponse
 */
export const GetBalanceResponse = new GetBalanceResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListBalancesRequest$Type extends MessageType<ListBalancesRequest> {
	constructor() {
		super('sui.rpc.v2beta2.ListBalancesRequest', [
			{ no: 1, name: 'owner', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'page_size', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 3, name: 'page_token', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<ListBalancesRequest>): ListBalancesRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ListBalancesRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ListBalancesRequest,
	): ListBalancesRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string owner */ 1:
					message.owner = reader.string();
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
		message: ListBalancesRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string owner = 1; */
		if (message.owner !== undefined) writer.tag(1, WireType.LengthDelimited).string(message.owner);
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
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ListBalancesRequest
 */
export const ListBalancesRequest = new ListBalancesRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListBalancesResponse$Type extends MessageType<ListBalancesResponse> {
	constructor() {
		super('sui.rpc.v2beta2.ListBalancesResponse', [
			{
				no: 1,
				name: 'balances',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Balance,
			},
			{ no: 2, name: 'next_page_token', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<ListBalancesResponse>): ListBalancesResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.balances = [];
		if (value !== undefined) reflectionMergePartial<ListBalancesResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ListBalancesResponse,
	): ListBalancesResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.Balance balances */ 1:
					message.balances.push(Balance.internalBinaryRead(reader, reader.uint32(), options));
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
		message: ListBalancesResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.Balance balances = 1; */
		for (let i = 0; i < message.balances.length; i++)
			Balance.internalBinaryWrite(
				message.balances[i],
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
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ListBalancesResponse
 */
export const ListBalancesResponse = new ListBalancesResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Balance$Type extends MessageType<Balance> {
	constructor() {
		super('sui.rpc.v2beta2.Balance', [
			{ no: 1, name: 'coin_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'balance',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<Balance>): Balance {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Balance>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Balance,
	): Balance {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string coin_type */ 1:
					message.coinType = reader.string();
					break;
				case /* optional uint64 balance */ 3:
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
		message: Balance,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string coin_type = 1; */
		if (message.coinType !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.coinType);
		/* optional uint64 balance = 3; */
		if (message.balance !== undefined) writer.tag(3, WireType.Varint).uint64(message.balance);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Balance
 */
export const Balance = new Balance$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListDynamicFieldsRequest$Type extends MessageType<ListDynamicFieldsRequest> {
	constructor() {
		super('sui.rpc.v2beta2.ListDynamicFieldsRequest', [
			{ no: 1, name: 'parent', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'page_size', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 3, name: 'page_token', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 4, name: 'read_mask', kind: 'message', T: () => FieldMask },
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
				case /* optional google.protobuf.FieldMask read_mask */ 4:
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
		/* optional google.protobuf.FieldMask read_mask = 4; */
		if (message.readMask)
			FieldMask.internalBinaryWrite(
				message.readMask,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ListDynamicFieldsRequest
 */
export const ListDynamicFieldsRequest = new ListDynamicFieldsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListDynamicFieldsResponse$Type extends MessageType<ListDynamicFieldsResponse> {
	constructor() {
		super('sui.rpc.v2beta2.ListDynamicFieldsResponse', [
			{
				no: 1,
				name: 'dynamic_fields',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
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
				case /* repeated sui.rpc.v2beta2.DynamicField dynamic_fields */ 1:
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
		/* repeated sui.rpc.v2beta2.DynamicField dynamic_fields = 1; */
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
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ListDynamicFieldsResponse
 */
export const ListDynamicFieldsResponse = new ListDynamicFieldsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class DynamicField$Type extends MessageType<DynamicField> {
	constructor() {
		super('sui.rpc.v2beta2.DynamicField', [
			{
				no: 1,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta2.DynamicField.DynamicFieldKind', DynamicField_DynamicFieldKind],
			},
			{ no: 2, name: 'parent', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'field_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'name_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'name_value', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 6, name: 'value_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 7, name: 'dynamic_object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 8, name: 'object', kind: 'message', T: () => Object },
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
				case /* optional sui.rpc.v2beta2.DynamicField.DynamicFieldKind kind */ 1:
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
				case /* optional sui.rpc.v2beta2.Object object */ 8:
					message.object = Object.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.object,
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
		message: DynamicField,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.DynamicField.DynamicFieldKind kind = 1; */
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
		/* optional sui.rpc.v2beta2.Object object = 8; */
		if (message.object)
			Object.internalBinaryWrite(
				message.object,
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.DynamicField
 */
export const DynamicField = new DynamicField$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SimulateTransactionRequest$Type extends MessageType<SimulateTransactionRequest> {
	constructor() {
		super('sui.rpc.v2beta2.SimulateTransactionRequest', [
			{ no: 1, name: 'transaction', kind: 'message', T: () => Transaction },
			{ no: 2, name: 'read_mask', kind: 'message', T: () => FieldMask },
			{
				no: 3,
				name: 'checks',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta2.SimulateTransactionRequest.TransactionChecks',
					SimulateTransactionRequest_TransactionChecks,
				],
			},
			{ no: 4, name: 'do_gas_selection', kind: 'scalar', opt: true, T: 8 /*ScalarType.BOOL*/ },
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
				case /* optional sui.rpc.v2beta2.Transaction transaction */ 1:
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
				case /* optional sui.rpc.v2beta2.SimulateTransactionRequest.TransactionChecks checks */ 3:
					message.checks = reader.int32();
					break;
				case /* optional bool do_gas_selection */ 4:
					message.doGasSelection = reader.bool();
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
		/* optional sui.rpc.v2beta2.Transaction transaction = 1; */
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
		/* optional sui.rpc.v2beta2.SimulateTransactionRequest.TransactionChecks checks = 3; */
		if (message.checks !== undefined) writer.tag(3, WireType.Varint).int32(message.checks);
		/* optional bool do_gas_selection = 4; */
		if (message.doGasSelection !== undefined)
			writer.tag(4, WireType.Varint).bool(message.doGasSelection);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.SimulateTransactionRequest
 */
export const SimulateTransactionRequest = new SimulateTransactionRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SimulateTransactionResponse$Type extends MessageType<SimulateTransactionResponse> {
	constructor() {
		super('sui.rpc.v2beta2.SimulateTransactionResponse', [
			{ no: 1, name: 'transaction', kind: 'message', T: () => ExecutedTransaction },
			{
				no: 2,
				name: 'outputs',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => CommandResult,
			},
		]);
	}
	create(value?: PartialMessage<SimulateTransactionResponse>): SimulateTransactionResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.outputs = [];
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
				case /* optional sui.rpc.v2beta2.ExecutedTransaction transaction */ 1:
					message.transaction = ExecutedTransaction.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.transaction,
					);
					break;
				case /* repeated sui.rpc.v2beta2.CommandResult outputs */ 2:
					message.outputs.push(CommandResult.internalBinaryRead(reader, reader.uint32(), options));
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
		/* optional sui.rpc.v2beta2.ExecutedTransaction transaction = 1; */
		if (message.transaction)
			ExecutedTransaction.internalBinaryWrite(
				message.transaction,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.CommandResult outputs = 2; */
		for (let i = 0; i < message.outputs.length; i++)
			CommandResult.internalBinaryWrite(
				message.outputs[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.SimulateTransactionResponse
 */
export const SimulateTransactionResponse = new SimulateTransactionResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CommandResult$Type extends MessageType<CommandResult> {
	constructor() {
		super('sui.rpc.v2beta2.CommandResult', [
			{
				no: 1,
				name: 'return_values',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => CommandOutput,
			},
			{
				no: 2,
				name: 'mutated_by_ref',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => CommandOutput,
			},
		]);
	}
	create(value?: PartialMessage<CommandResult>): CommandResult {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.returnValues = [];
		message.mutatedByRef = [];
		if (value !== undefined) reflectionMergePartial<CommandResult>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CommandResult,
	): CommandResult {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.CommandOutput return_values */ 1:
					message.returnValues.push(
						CommandOutput.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* repeated sui.rpc.v2beta2.CommandOutput mutated_by_ref */ 2:
					message.mutatedByRef.push(
						CommandOutput.internalBinaryRead(reader, reader.uint32(), options),
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
		message: CommandResult,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.CommandOutput return_values = 1; */
		for (let i = 0; i < message.returnValues.length; i++)
			CommandOutput.internalBinaryWrite(
				message.returnValues[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.CommandOutput mutated_by_ref = 2; */
		for (let i = 0; i < message.mutatedByRef.length; i++)
			CommandOutput.internalBinaryWrite(
				message.mutatedByRef[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.CommandResult
 */
export const CommandResult = new CommandResult$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CommandOutput$Type extends MessageType<CommandOutput> {
	constructor() {
		super('sui.rpc.v2beta2.CommandOutput', [
			{ no: 1, name: 'argument', kind: 'message', T: () => Argument },
			{ no: 2, name: 'value', kind: 'message', T: () => Bcs },
			{ no: 3, name: 'json', kind: 'message', T: () => Value },
		]);
	}
	create(value?: PartialMessage<CommandOutput>): CommandOutput {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CommandOutput>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CommandOutput,
	): CommandOutput {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Argument argument */ 1:
					message.argument = Argument.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.argument,
					);
					break;
				case /* optional sui.rpc.v2beta2.Bcs value */ 2:
					message.value = Bcs.internalBinaryRead(reader, reader.uint32(), options, message.value);
					break;
				case /* optional google.protobuf.Value json */ 3:
					message.json = Value.internalBinaryRead(reader, reader.uint32(), options, message.json);
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
		message: CommandOutput,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Argument argument = 1; */
		if (message.argument)
			Argument.internalBinaryWrite(
				message.argument,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.Bcs value = 2; */
		if (message.value)
			Bcs.internalBinaryWrite(
				message.value,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional google.protobuf.Value json = 3; */
		if (message.json)
			Value.internalBinaryWrite(
				message.json,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.CommandOutput
 */
export const CommandOutput = new CommandOutput$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListOwnedObjectsRequest$Type extends MessageType<ListOwnedObjectsRequest> {
	constructor() {
		super('sui.rpc.v2beta2.ListOwnedObjectsRequest', [
			{ no: 1, name: 'owner', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'page_size', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 3, name: 'page_token', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
			{ no: 4, name: 'read_mask', kind: 'message', T: () => FieldMask },
			{ no: 5, name: 'object_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
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
				case /* optional uint32 page_size */ 2:
					message.pageSize = reader.uint32();
					break;
				case /* optional bytes page_token */ 3:
					message.pageToken = reader.bytes();
					break;
				case /* optional google.protobuf.FieldMask read_mask */ 4:
					message.readMask = FieldMask.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.readMask,
					);
					break;
				case /* optional string object_type */ 5:
					message.objectType = reader.string();
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
		/* optional uint32 page_size = 2; */
		if (message.pageSize !== undefined) writer.tag(2, WireType.Varint).uint32(message.pageSize);
		/* optional bytes page_token = 3; */
		if (message.pageToken !== undefined)
			writer.tag(3, WireType.LengthDelimited).bytes(message.pageToken);
		/* optional google.protobuf.FieldMask read_mask = 4; */
		if (message.readMask)
			FieldMask.internalBinaryWrite(
				message.readMask,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string object_type = 5; */
		if (message.objectType !== undefined)
			writer.tag(5, WireType.LengthDelimited).string(message.objectType);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ListOwnedObjectsRequest
 */
export const ListOwnedObjectsRequest = new ListOwnedObjectsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListOwnedObjectsResponse$Type extends MessageType<ListOwnedObjectsResponse> {
	constructor() {
		super('sui.rpc.v2beta2.ListOwnedObjectsResponse', [
			{
				no: 1,
				name: 'objects',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Object,
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
				case /* repeated sui.rpc.v2beta2.Object objects */ 1:
					message.objects.push(Object.internalBinaryRead(reader, reader.uint32(), options));
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
		/* repeated sui.rpc.v2beta2.Object objects = 1; */
		for (let i = 0; i < message.objects.length; i++)
			Object.internalBinaryWrite(
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
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ListOwnedObjectsResponse
 */
export const ListOwnedObjectsResponse = new ListOwnedObjectsResponse$Type();
/**
 * @generated ServiceType for protobuf service sui.rpc.v2beta2.LiveDataService
 */
export const LiveDataService = new ServiceType('sui.rpc.v2beta2.LiveDataService', [
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
	{ name: 'GetBalance', options: {}, I: GetBalanceRequest, O: GetBalanceResponse },
	{ name: 'ListBalances', options: {}, I: ListBalancesRequest, O: ListBalancesResponse },
	{
		name: 'SimulateTransaction',
		options: {},
		I: SimulateTransactionRequest,
		O: SimulateTransactionResponse,
	},
]);
