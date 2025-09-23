// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import type { ServiceInfo } from '@protobuf-ts/runtime-rpc';
import { NameService } from './name_service.js';
import type { ReverseLookupNameResponse } from './name_service.js';
import type { ReverseLookupNameRequest } from './name_service.js';
import { stackIntercept } from '@protobuf-ts/runtime-rpc';
import type { LookupNameResponse } from './name_service.js';
import type { LookupNameRequest } from './name_service.js';
import type { UnaryCall } from '@protobuf-ts/runtime-rpc';
import type { RpcOptions } from '@protobuf-ts/runtime-rpc';
/**
 * @generated from protobuf service sui.rpc.v2beta2.NameService
 */
export interface INameServiceClient {
	/**
	 * @generated from protobuf rpc: LookupName
	 */
	lookupName(
		input: LookupNameRequest,
		options?: RpcOptions,
	): UnaryCall<LookupNameRequest, LookupNameResponse>;
	/**
	 * @generated from protobuf rpc: ReverseLookupName
	 */
	reverseLookupName(
		input: ReverseLookupNameRequest,
		options?: RpcOptions,
	): UnaryCall<ReverseLookupNameRequest, ReverseLookupNameResponse>;
}
/**
 * @generated from protobuf service sui.rpc.v2beta2.NameService
 */
export class NameServiceClient implements INameServiceClient, ServiceInfo {
	typeName = NameService.typeName;
	methods = NameService.methods;
	options = NameService.options;
	constructor(private readonly _transport: RpcTransport) {}
	/**
	 * @generated from protobuf rpc: LookupName
	 */
	lookupName(
		input: LookupNameRequest,
		options?: RpcOptions,
	): UnaryCall<LookupNameRequest, LookupNameResponse> {
		const method = this.methods[0],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<LookupNameRequest, LookupNameResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: ReverseLookupName
	 */
	reverseLookupName(
		input: ReverseLookupNameRequest,
		options?: RpcOptions,
	): UnaryCall<ReverseLookupNameRequest, ReverseLookupNameResponse> {
		const method = this.methods[1],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<ReverseLookupNameRequest, ReverseLookupNameResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
}
