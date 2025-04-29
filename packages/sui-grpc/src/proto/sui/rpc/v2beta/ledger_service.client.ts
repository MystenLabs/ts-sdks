// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import type { ServiceInfo } from '@protobuf-ts/runtime-rpc';
import { LedgerService } from './ledger_service.js';
import type { Epoch } from './epoch.js';
import type { GetEpochRequest } from './ledger_service.js';
import type { Checkpoint } from './checkpoint.js';
import type { GetCheckpointRequest } from './ledger_service.js';
import type { BatchGetTransactionsResponse } from './ledger_service.js';
import type { BatchGetTransactionsRequest } from './ledger_service.js';
import type { ExecutedTransaction } from './executed_transaction.js';
import type { GetTransactionRequest } from './ledger_service.js';
import type { BatchGetObjectsResponse } from './ledger_service.js';
import type { BatchGetObjectsRequest } from './ledger_service.js';
import type { Object } from './object.js';
import type { GetObjectRequest } from './ledger_service.js';
import { stackIntercept } from '@protobuf-ts/runtime-rpc';
import type { GetServiceInfoResponse } from './ledger_service.js';
import type { GetServiceInfoRequest } from './ledger_service.js';
import type { UnaryCall } from '@protobuf-ts/runtime-rpc';
import type { RpcOptions } from '@protobuf-ts/runtime-rpc';
/**
 * @generated from protobuf service sui.rpc.v2beta.LedgerService
 */
export interface ILedgerServiceClient {
	/**
	 * Query the service for general information about its current state.
	 *
	 * @generated from protobuf rpc: GetServiceInfo(sui.rpc.v2beta.GetServiceInfoRequest) returns (sui.rpc.v2beta.GetServiceInfoResponse);
	 */
	getServiceInfo(
		input: GetServiceInfoRequest,
		options?: RpcOptions,
	): UnaryCall<GetServiceInfoRequest, GetServiceInfoResponse>;
	/**
	 * @generated from protobuf rpc: GetObject(sui.rpc.v2beta.GetObjectRequest) returns (sui.rpc.v2beta.Object);
	 */
	getObject(input: GetObjectRequest, options?: RpcOptions): UnaryCall<GetObjectRequest, Object>;
	/**
	 * @generated from protobuf rpc: BatchGetObjects(sui.rpc.v2beta.BatchGetObjectsRequest) returns (sui.rpc.v2beta.BatchGetObjectsResponse);
	 */
	batchGetObjects(
		input: BatchGetObjectsRequest,
		options?: RpcOptions,
	): UnaryCall<BatchGetObjectsRequest, BatchGetObjectsResponse>;
	/**
	 * @generated from protobuf rpc: GetTransaction(sui.rpc.v2beta.GetTransactionRequest) returns (sui.rpc.v2beta.ExecutedTransaction);
	 */
	getTransaction(
		input: GetTransactionRequest,
		options?: RpcOptions,
	): UnaryCall<GetTransactionRequest, ExecutedTransaction>;
	/**
	 * @generated from protobuf rpc: BatchGetTransactions(sui.rpc.v2beta.BatchGetTransactionsRequest) returns (sui.rpc.v2beta.BatchGetTransactionsResponse);
	 */
	batchGetTransactions(
		input: BatchGetTransactionsRequest,
		options?: RpcOptions,
	): UnaryCall<BatchGetTransactionsRequest, BatchGetTransactionsResponse>;
	/**
	 * @generated from protobuf rpc: GetCheckpoint(sui.rpc.v2beta.GetCheckpointRequest) returns (sui.rpc.v2beta.Checkpoint);
	 */
	getCheckpoint(
		input: GetCheckpointRequest,
		options?: RpcOptions,
	): UnaryCall<GetCheckpointRequest, Checkpoint>;
	/**
	 * @generated from protobuf rpc: GetEpoch(sui.rpc.v2beta.GetEpochRequest) returns (sui.rpc.v2beta.Epoch);
	 */
	getEpoch(input: GetEpochRequest, options?: RpcOptions): UnaryCall<GetEpochRequest, Epoch>;
}
/**
 * @generated from protobuf service sui.rpc.v2beta.LedgerService
 */
export class LedgerServiceClient implements ILedgerServiceClient, ServiceInfo {
	typeName = LedgerService.typeName;
	methods = LedgerService.methods;
	options = LedgerService.options;
	constructor(private readonly _transport: RpcTransport) {}
	/**
	 * Query the service for general information about its current state.
	 *
	 * @generated from protobuf rpc: GetServiceInfo(sui.rpc.v2beta.GetServiceInfoRequest) returns (sui.rpc.v2beta.GetServiceInfoResponse);
	 */
	getServiceInfo(
		input: GetServiceInfoRequest,
		options?: RpcOptions,
	): UnaryCall<GetServiceInfoRequest, GetServiceInfoResponse> {
		const method = this.methods[0],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<GetServiceInfoRequest, GetServiceInfoResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: GetObject(sui.rpc.v2beta.GetObjectRequest) returns (sui.rpc.v2beta.Object);
	 */
	getObject(input: GetObjectRequest, options?: RpcOptions): UnaryCall<GetObjectRequest, Object> {
		const method = this.methods[1],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<GetObjectRequest, Object>('unary', this._transport, method, opt, input);
	}
	/**
	 * @generated from protobuf rpc: BatchGetObjects(sui.rpc.v2beta.BatchGetObjectsRequest) returns (sui.rpc.v2beta.BatchGetObjectsResponse);
	 */
	batchGetObjects(
		input: BatchGetObjectsRequest,
		options?: RpcOptions,
	): UnaryCall<BatchGetObjectsRequest, BatchGetObjectsResponse> {
		const method = this.methods[2],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<BatchGetObjectsRequest, BatchGetObjectsResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: GetTransaction(sui.rpc.v2beta.GetTransactionRequest) returns (sui.rpc.v2beta.ExecutedTransaction);
	 */
	getTransaction(
		input: GetTransactionRequest,
		options?: RpcOptions,
	): UnaryCall<GetTransactionRequest, ExecutedTransaction> {
		const method = this.methods[3],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<GetTransactionRequest, ExecutedTransaction>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: BatchGetTransactions(sui.rpc.v2beta.BatchGetTransactionsRequest) returns (sui.rpc.v2beta.BatchGetTransactionsResponse);
	 */
	batchGetTransactions(
		input: BatchGetTransactionsRequest,
		options?: RpcOptions,
	): UnaryCall<BatchGetTransactionsRequest, BatchGetTransactionsResponse> {
		const method = this.methods[4],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<BatchGetTransactionsRequest, BatchGetTransactionsResponse>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: GetCheckpoint(sui.rpc.v2beta.GetCheckpointRequest) returns (sui.rpc.v2beta.Checkpoint);
	 */
	getCheckpoint(
		input: GetCheckpointRequest,
		options?: RpcOptions,
	): UnaryCall<GetCheckpointRequest, Checkpoint> {
		const method = this.methods[5],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<GetCheckpointRequest, Checkpoint>(
			'unary',
			this._transport,
			method,
			opt,
			input,
		);
	}
	/**
	 * @generated from protobuf rpc: GetEpoch(sui.rpc.v2beta.GetEpochRequest) returns (sui.rpc.v2beta.Epoch);
	 */
	getEpoch(input: GetEpochRequest, options?: RpcOptions): UnaryCall<GetEpochRequest, Epoch> {
		const method = this.methods[6],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<GetEpochRequest, Epoch>('unary', this._transport, method, opt, input);
	}
}
