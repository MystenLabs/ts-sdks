// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import type { ServiceInfo } from '@protobuf-ts/runtime-rpc';
import { MovePackageService } from './move_package_service.js';
import type { ListPackageVersionsResponse } from './move_package_service.js';
import type { ListPackageVersionsRequest } from './move_package_service.js';
import type { GetFunctionResponse } from './move_package_service.js';
import type { GetFunctionRequest } from './move_package_service.js';
import type { GetDatatypeResponse } from './move_package_service.js';
import type { GetDatatypeRequest } from './move_package_service.js';
import { stackIntercept } from '@protobuf-ts/runtime-rpc';
import type { GetPackageResponse } from './move_package_service.js';
import type { GetPackageRequest } from './move_package_service.js';
import type { UnaryCall } from '@protobuf-ts/runtime-rpc';
import type { RpcOptions } from '@protobuf-ts/runtime-rpc';
/**
 * @generated from protobuf service sui.rpc.v2beta2.MovePackageService
 */
export interface IMovePackageServiceClient {
	/**
	 * @generated from protobuf rpc: GetPackage
	 */
	getPackage(
		input: GetPackageRequest,
		options?: RpcOptions,
	): UnaryCall<GetPackageRequest, GetPackageResponse>;
	/**
	 * @generated from protobuf rpc: GetDatatype
	 */
	getDatatype(
		input: GetDatatypeRequest,
		options?: RpcOptions,
	): UnaryCall<GetDatatypeRequest, GetDatatypeResponse>;
	/**
	 * @generated from protobuf rpc: GetFunction
	 */
	getFunction(
		input: GetFunctionRequest,
		options?: RpcOptions,
	): UnaryCall<GetFunctionRequest, GetFunctionResponse>;
	/**
	 * @generated from protobuf rpc: ListPackageVersions
	 */
	listPackageVersions(
		input: ListPackageVersionsRequest,
		options?: RpcOptions,
	): UnaryCall<ListPackageVersionsRequest, ListPackageVersionsResponse>;
}
/**
 * @generated from protobuf service sui.rpc.v2beta2.MovePackageService
 */
export class MovePackageServiceClient implements IMovePackageServiceClient, ServiceInfo {
	typeName = MovePackageService.typeName;
	methods = MovePackageService.methods;
	options = MovePackageService.options;
	constructor(private readonly _transport: RpcTransport) {}
	/**
	 * @generated from protobuf rpc: GetPackage
	 */
	getPackage(
		input: GetPackageRequest,
		options?: RpcOptions,
	): UnaryCall<GetPackageRequest, GetPackageResponse> {
		const method = this.methods[0],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<GetPackageRequest, GetPackageResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: GetDatatype
	 */
	getDatatype(
		input: GetDatatypeRequest,
		options?: RpcOptions,
	): UnaryCall<GetDatatypeRequest, GetDatatypeResponse> {
		const method = this.methods[1],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<GetDatatypeRequest, GetDatatypeResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: GetFunction
	 */
	getFunction(
		input: GetFunctionRequest,
		options?: RpcOptions,
	): UnaryCall<GetFunctionRequest, GetFunctionResponse> {
		const method = this.methods[2],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<GetFunctionRequest, GetFunctionResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: ListPackageVersions
	 */
	listPackageVersions(
		input: ListPackageVersionsRequest,
		options?: RpcOptions,
	): UnaryCall<ListPackageVersionsRequest, ListPackageVersionsResponse> {
		const method = this.methods[3],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<ListPackageVersionsRequest, ListPackageVersionsResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
}
