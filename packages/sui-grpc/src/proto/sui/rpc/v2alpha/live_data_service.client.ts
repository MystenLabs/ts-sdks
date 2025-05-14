// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import type { ServiceInfo } from '@protobuf-ts/runtime-rpc';
import { LiveDataService } from './live_data_service.js';
import type { ResolveTransactionResponse } from './live_data_service.js';
import type { ResolveTransactionRequest } from './live_data_service.js';
import type { SimulateTransactionResponse } from './live_data_service.js';
import type { SimulateTransactionRequest } from './live_data_service.js';
import type { GetCoinInfoResponse } from './live_data_service.js';
import type { GetCoinInfoRequest } from './live_data_service.js';
import type { ListOwnedObjectsResponse } from './live_data_service.js';
import type { ListOwnedObjectsRequest } from './live_data_service.js';
import { stackIntercept } from '@protobuf-ts/runtime-rpc';
import type { ListDynamicFieldsResponse } from './live_data_service.js';
import type { ListDynamicFieldsRequest } from './live_data_service.js';
import type { UnaryCall } from '@protobuf-ts/runtime-rpc';
import type { RpcOptions } from '@protobuf-ts/runtime-rpc';
/**
 * @generated from protobuf service sui.rpc.v2alpha.LiveDataService
 */
export interface ILiveDataServiceClient {
	/**
	 * @generated from protobuf rpc: ListDynamicFields(sui.rpc.v2alpha.ListDynamicFieldsRequest) returns (sui.rpc.v2alpha.ListDynamicFieldsResponse);
	 */
	listDynamicFields(
		input: ListDynamicFieldsRequest,
		options?: RpcOptions,
	): UnaryCall<ListDynamicFieldsRequest, ListDynamicFieldsResponse>;
	/**
	 * @generated from protobuf rpc: ListOwnedObjects(sui.rpc.v2alpha.ListOwnedObjectsRequest) returns (sui.rpc.v2alpha.ListOwnedObjectsResponse);
	 */
	listOwnedObjects(
		input: ListOwnedObjectsRequest,
		options?: RpcOptions,
	): UnaryCall<ListOwnedObjectsRequest, ListOwnedObjectsResponse>;
	/**
	 * get balance? list balance?
	 *
	 * @generated from protobuf rpc: GetCoinInfo(sui.rpc.v2alpha.GetCoinInfoRequest) returns (sui.rpc.v2alpha.GetCoinInfoResponse);
	 */
	getCoinInfo(
		input: GetCoinInfoRequest,
		options?: RpcOptions,
	): UnaryCall<GetCoinInfoRequest, GetCoinInfoResponse>;
	/**
	 * @generated from protobuf rpc: SimulateTransaction(sui.rpc.v2alpha.SimulateTransactionRequest) returns (sui.rpc.v2alpha.SimulateTransactionResponse);
	 */
	simulateTransaction(
		input: SimulateTransactionRequest,
		options?: RpcOptions,
	): UnaryCall<SimulateTransactionRequest, SimulateTransactionResponse>;
	/**
	 * ViewFunction?
	 *
	 * @generated from protobuf rpc: ResolveTransaction(sui.rpc.v2alpha.ResolveTransactionRequest) returns (sui.rpc.v2alpha.ResolveTransactionResponse);
	 */
	resolveTransaction(
		input: ResolveTransactionRequest,
		options?: RpcOptions,
	): UnaryCall<ResolveTransactionRequest, ResolveTransactionResponse>;
}
/**
 * @generated from protobuf service sui.rpc.v2alpha.LiveDataService
 */
export class LiveDataServiceClient implements ILiveDataServiceClient, ServiceInfo {
	typeName = LiveDataService.typeName;
	methods = LiveDataService.methods;
	options = LiveDataService.options;
	constructor(private readonly _transport: RpcTransport) {}
	/**
	 * @generated from protobuf rpc: ListDynamicFields(sui.rpc.v2alpha.ListDynamicFieldsRequest) returns (sui.rpc.v2alpha.ListDynamicFieldsResponse);
	 */
	listDynamicFields(
		input: ListDynamicFieldsRequest,
		options?: RpcOptions,
	): UnaryCall<ListDynamicFieldsRequest, ListDynamicFieldsResponse> {
		const method = this.methods[0],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<ListDynamicFieldsRequest, ListDynamicFieldsResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: ListOwnedObjects(sui.rpc.v2alpha.ListOwnedObjectsRequest) returns (sui.rpc.v2alpha.ListOwnedObjectsResponse);
	 */
	listOwnedObjects(
		input: ListOwnedObjectsRequest,
		options?: RpcOptions,
	): UnaryCall<ListOwnedObjectsRequest, ListOwnedObjectsResponse> {
		const method = this.methods[1],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<ListOwnedObjectsRequest, ListOwnedObjectsResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * get balance? list balance?
	 *
	 * @generated from protobuf rpc: GetCoinInfo(sui.rpc.v2alpha.GetCoinInfoRequest) returns (sui.rpc.v2alpha.GetCoinInfoResponse);
	 */
	getCoinInfo(
		input: GetCoinInfoRequest,
		options?: RpcOptions,
	): UnaryCall<GetCoinInfoRequest, GetCoinInfoResponse> {
		const method = this.methods[2],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<GetCoinInfoRequest, GetCoinInfoResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: SimulateTransaction(sui.rpc.v2alpha.SimulateTransactionRequest) returns (sui.rpc.v2alpha.SimulateTransactionResponse);
	 */
	simulateTransaction(
		input: SimulateTransactionRequest,
		options?: RpcOptions,
	): UnaryCall<SimulateTransactionRequest, SimulateTransactionResponse> {
		const method = this.methods[3],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<SimulateTransactionRequest, SimulateTransactionResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * ViewFunction?
	 *
	 * @generated from protobuf rpc: ResolveTransaction(sui.rpc.v2alpha.ResolveTransactionRequest) returns (sui.rpc.v2alpha.ResolveTransactionResponse);
	 */
	resolveTransaction(
		input: ResolveTransactionRequest,
		options?: RpcOptions,
	): UnaryCall<ResolveTransactionRequest, ResolveTransactionResponse> {
		const method = this.methods[4],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<ResolveTransactionRequest, ResolveTransactionResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
}
