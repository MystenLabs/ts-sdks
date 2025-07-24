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
import { FunctionDescriptor } from './move_package.js';
import { DatatypeDescriptor } from './move_package.js';
import { Package } from './move_package.js';
/**
 * @generated from protobuf message sui.rpc.v2beta2.GetPackageRequest
 */
export interface GetPackageRequest {
	/**
	 * Required. The `storage_id` of the requested package.
	 *
	 * @generated from protobuf field: optional string package_id = 1
	 */
	packageId?: string;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.GetPackageResponse
 */
export interface GetPackageResponse {
	/**
	 * The package.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Package package = 1
	 */
	package?: Package;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.GetDatatypeRequest
 */
export interface GetDatatypeRequest {
	/**
	 * Required. The `storage_id` of the requested package.
	 *
	 * @generated from protobuf field: optional string package_id = 1
	 */
	packageId?: string;
	/**
	 * Required. The name of the requested module.
	 *
	 * @generated from protobuf field: optional string module_name = 2
	 */
	moduleName?: string;
	/**
	 * Required. The name of the requested datatype.
	 *
	 * @generated from protobuf field: optional string name = 3
	 */
	name?: string;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.GetDatatypeResponse
 */
export interface GetDatatypeResponse {
	/**
	 * The datatype.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.DatatypeDescriptor datatype = 1
	 */
	datatype?: DatatypeDescriptor;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.GetFunctionRequest
 */
export interface GetFunctionRequest {
	/**
	 * Required. The `storage_id` of the requested package.
	 *
	 * @generated from protobuf field: optional string package_id = 1
	 */
	packageId?: string;
	/**
	 * Required. The name of the requested module.
	 *
	 * @generated from protobuf field: optional string module_name = 2
	 */
	moduleName?: string;
	/**
	 * Required. The name of the requested function.
	 *
	 * @generated from protobuf field: optional string name = 3
	 */
	name?: string;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.GetFunctionResponse
 */
export interface GetFunctionResponse {
	/**
	 * The function.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.FunctionDescriptor function = 1
	 */
	function?: FunctionDescriptor;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ListPackageVersionsRequest
 */
export interface ListPackageVersionsRequest {
	/**
	 * Required. The `storage_id` of any version of the package.
	 *
	 * @generated from protobuf field: optional string package_id = 1
	 */
	packageId?: string;
	/**
	 * The maximum number of versions to return. The service may return fewer than this value.
	 * If unspecified, at most `1000` entries will be returned.
	 * The maximum value is `10000`; values above `10000` will be coerced to `10000`.
	 *
	 * @generated from protobuf field: optional uint32 page_size = 2
	 */
	pageSize?: number;
	/**
	 * A page token, received from a previous `ListPackageVersions` call.
	 * Provide this to retrieve the subsequent page.
	 *
	 * When paginating, all other parameters provided to `ListPackageVersions` must
	 * match the call that provided the page token.
	 *
	 * @generated from protobuf field: optional bytes page_token = 3
	 */
	pageToken?: Uint8Array;
}
/**
 * @generated from protobuf message sui.rpc.v2beta2.ListPackageVersionsResponse
 */
export interface ListPackageVersionsResponse {
	/**
	 * List of all package versions, ordered by version.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.PackageVersion versions = 1
	 */
	versions: PackageVersion[];
	/**
	 * A token, which can be sent as `page_token` to retrieve the next page.
	 * If this field is omitted, there are no subsequent pages.
	 *
	 * @generated from protobuf field: optional bytes next_page_token = 2
	 */
	nextPageToken?: Uint8Array;
}
/**
 * A simplified representation of a package version
 *
 * @generated from protobuf message sui.rpc.v2beta2.PackageVersion
 */
export interface PackageVersion {
	/**
	 * The storage ID of this package version
	 *
	 * @generated from protobuf field: optional string package_id = 1
	 */
	packageId?: string;
	/**
	 * The version number
	 *
	 * @generated from protobuf field: optional uint64 version = 2
	 */
	version?: bigint;
}
// @generated message type with reflection information, may provide speed optimized methods
class GetPackageRequest$Type extends MessageType<GetPackageRequest> {
	constructor() {
		super('sui.rpc.v2beta2.GetPackageRequest', [
			{ no: 1, name: 'package_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<GetPackageRequest>): GetPackageRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetPackageRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetPackageRequest,
	): GetPackageRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string package_id */ 1:
					message.packageId = reader.string();
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
		message: GetPackageRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string package_id = 1; */
		if (message.packageId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.packageId);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GetPackageRequest
 */
export const GetPackageRequest = new GetPackageRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetPackageResponse$Type extends MessageType<GetPackageResponse> {
	constructor() {
		super('sui.rpc.v2beta2.GetPackageResponse', [
			{ no: 1, name: 'package', kind: 'message', T: () => Package },
		]);
	}
	create(value?: PartialMessage<GetPackageResponse>): GetPackageResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetPackageResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetPackageResponse,
	): GetPackageResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Package package */ 1:
					message.package = Package.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.package,
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
		message: GetPackageResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Package package = 1; */
		if (message.package)
			Package.internalBinaryWrite(
				message.package,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GetPackageResponse
 */
export const GetPackageResponse = new GetPackageResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetDatatypeRequest$Type extends MessageType<GetDatatypeRequest> {
	constructor() {
		super('sui.rpc.v2beta2.GetDatatypeRequest', [
			{ no: 1, name: 'package_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'module_name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<GetDatatypeRequest>): GetDatatypeRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetDatatypeRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetDatatypeRequest,
	): GetDatatypeRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string package_id */ 1:
					message.packageId = reader.string();
					break;
				case /* optional string module_name */ 2:
					message.moduleName = reader.string();
					break;
				case /* optional string name */ 3:
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
		message: GetDatatypeRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string package_id = 1; */
		if (message.packageId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.packageId);
		/* optional string module_name = 2; */
		if (message.moduleName !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.moduleName);
		/* optional string name = 3; */
		if (message.name !== undefined) writer.tag(3, WireType.LengthDelimited).string(message.name);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GetDatatypeRequest
 */
export const GetDatatypeRequest = new GetDatatypeRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetDatatypeResponse$Type extends MessageType<GetDatatypeResponse> {
	constructor() {
		super('sui.rpc.v2beta2.GetDatatypeResponse', [
			{ no: 1, name: 'datatype', kind: 'message', T: () => DatatypeDescriptor },
		]);
	}
	create(value?: PartialMessage<GetDatatypeResponse>): GetDatatypeResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetDatatypeResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetDatatypeResponse,
	): GetDatatypeResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.DatatypeDescriptor datatype */ 1:
					message.datatype = DatatypeDescriptor.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.datatype,
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
		message: GetDatatypeResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.DatatypeDescriptor datatype = 1; */
		if (message.datatype)
			DatatypeDescriptor.internalBinaryWrite(
				message.datatype,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GetDatatypeResponse
 */
export const GetDatatypeResponse = new GetDatatypeResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetFunctionRequest$Type extends MessageType<GetFunctionRequest> {
	constructor() {
		super('sui.rpc.v2beta2.GetFunctionRequest', [
			{ no: 1, name: 'package_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'module_name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<GetFunctionRequest>): GetFunctionRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetFunctionRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetFunctionRequest,
	): GetFunctionRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string package_id */ 1:
					message.packageId = reader.string();
					break;
				case /* optional string module_name */ 2:
					message.moduleName = reader.string();
					break;
				case /* optional string name */ 3:
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
		message: GetFunctionRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string package_id = 1; */
		if (message.packageId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.packageId);
		/* optional string module_name = 2; */
		if (message.moduleName !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.moduleName);
		/* optional string name = 3; */
		if (message.name !== undefined) writer.tag(3, WireType.LengthDelimited).string(message.name);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GetFunctionRequest
 */
export const GetFunctionRequest = new GetFunctionRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetFunctionResponse$Type extends MessageType<GetFunctionResponse> {
	constructor() {
		super('sui.rpc.v2beta2.GetFunctionResponse', [
			{ no: 1, name: 'function', kind: 'message', T: () => FunctionDescriptor },
		]);
	}
	create(value?: PartialMessage<GetFunctionResponse>): GetFunctionResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GetFunctionResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GetFunctionResponse,
	): GetFunctionResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.FunctionDescriptor function */ 1:
					message.function = FunctionDescriptor.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.function,
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
		message: GetFunctionResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.FunctionDescriptor function = 1; */
		if (message.function)
			FunctionDescriptor.internalBinaryWrite(
				message.function,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GetFunctionResponse
 */
export const GetFunctionResponse = new GetFunctionResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListPackageVersionsRequest$Type extends MessageType<ListPackageVersionsRequest> {
	constructor() {
		super('sui.rpc.v2beta2.ListPackageVersionsRequest', [
			{ no: 1, name: 'package_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'page_size', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 3, name: 'page_token', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<ListPackageVersionsRequest>): ListPackageVersionsRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined)
			reflectionMergePartial<ListPackageVersionsRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ListPackageVersionsRequest,
	): ListPackageVersionsRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string package_id */ 1:
					message.packageId = reader.string();
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
		message: ListPackageVersionsRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string package_id = 1; */
		if (message.packageId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.packageId);
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
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ListPackageVersionsRequest
 */
export const ListPackageVersionsRequest = new ListPackageVersionsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ListPackageVersionsResponse$Type extends MessageType<ListPackageVersionsResponse> {
	constructor() {
		super('sui.rpc.v2beta2.ListPackageVersionsResponse', [
			{
				no: 1,
				name: 'versions',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => PackageVersion,
			},
			{ no: 2, name: 'next_page_token', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
	create(value?: PartialMessage<ListPackageVersionsResponse>): ListPackageVersionsResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.versions = [];
		if (value !== undefined)
			reflectionMergePartial<ListPackageVersionsResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ListPackageVersionsResponse,
	): ListPackageVersionsResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.PackageVersion versions */ 1:
					message.versions.push(
						PackageVersion.internalBinaryRead(reader, reader.uint32(), options),
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
		message: ListPackageVersionsResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.PackageVersion versions = 1; */
		for (let i = 0; i < message.versions.length; i++)
			PackageVersion.internalBinaryWrite(
				message.versions[i],
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
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ListPackageVersionsResponse
 */
export const ListPackageVersionsResponse = new ListPackageVersionsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PackageVersion$Type extends MessageType<PackageVersion> {
	constructor() {
		super('sui.rpc.v2beta2.PackageVersion', [
			{ no: 1, name: 'package_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<PackageVersion>): PackageVersion {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<PackageVersion>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: PackageVersion,
	): PackageVersion {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string package_id */ 1:
					message.packageId = reader.string();
					break;
				case /* optional uint64 version */ 2:
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
		message: PackageVersion,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string package_id = 1; */
		if (message.packageId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.packageId);
		/* optional uint64 version = 2; */
		if (message.version !== undefined) writer.tag(2, WireType.Varint).uint64(message.version);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.PackageVersion
 */
export const PackageVersion = new PackageVersion$Type();
/**
 * @generated ServiceType for protobuf service sui.rpc.v2beta2.MovePackageService
 */
export const MovePackageService = new ServiceType('sui.rpc.v2beta2.MovePackageService', [
	{ name: 'GetPackage', options: {}, I: GetPackageRequest, O: GetPackageResponse },
	{ name: 'GetDatatype', options: {}, I: GetDatatypeRequest, O: GetDatatypeResponse },
	{ name: 'GetFunction', options: {}, I: GetFunctionRequest, O: GetFunctionResponse },
	{
		name: 'ListPackageVersions',
		options: {},
		I: ListPackageVersionsRequest,
		O: ListPackageVersionsResponse,
	},
]);
