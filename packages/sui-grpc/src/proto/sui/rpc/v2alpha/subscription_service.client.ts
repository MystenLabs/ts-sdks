// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import type { ServiceInfo } from '@protobuf-ts/runtime-rpc';
import { SubscriptionService } from './subscription_service.js';
import { stackIntercept } from '@protobuf-ts/runtime-rpc';
import type { SubscribeCheckpointsResponse } from './subscription_service.js';
import type { SubscribeCheckpointsRequest } from './subscription_service.js';
import type { ServerStreamingCall } from '@protobuf-ts/runtime-rpc';
import type { RpcOptions } from '@protobuf-ts/runtime-rpc';
/**
 * @generated from protobuf service sui.rpc.v2alpha.SubscriptionService
 */
export interface ISubscriptionServiceClient {
	/**
	 * Subscribe to the stream of checkpoints.
	 *
	 * This API provides a subscription to the checkpoint stream for the Sui
	 * blockchain. When a subscription is initialized the stream will begin with
	 * the latest executed checkpoint as seen by the server. Responses are
	 * gaurenteed to return checkpoints in-order and without gaps. This enables
	 * clients to know exactly the last checkpoint they have processed and in the
	 * event the subscription terminates (either by the client/server or by the
	 * connection breaking), clients will be able to reinitailize a subscription
	 * and then leverage other APIs in order to request data for the checkpoints
	 * they missed.
	 *
	 * @generated from protobuf rpc: SubscribeCheckpoints(sui.rpc.v2alpha.SubscribeCheckpointsRequest) returns (stream sui.rpc.v2alpha.SubscribeCheckpointsResponse);
	 */
	subscribeCheckpoints(
		input: SubscribeCheckpointsRequest,
		options?: RpcOptions,
	): ServerStreamingCall<SubscribeCheckpointsRequest, SubscribeCheckpointsResponse>;
}
/**
 * @generated from protobuf service sui.rpc.v2alpha.SubscriptionService
 */
export class SubscriptionServiceClient implements ISubscriptionServiceClient, ServiceInfo {
	typeName = SubscriptionService.typeName;
	methods = SubscriptionService.methods;
	options = SubscriptionService.options;
	constructor(private readonly _transport: RpcTransport) {}
	/**
	 * Subscribe to the stream of checkpoints.
	 *
	 * This API provides a subscription to the checkpoint stream for the Sui
	 * blockchain. When a subscription is initialized the stream will begin with
	 * the latest executed checkpoint as seen by the server. Responses are
	 * gaurenteed to return checkpoints in-order and without gaps. This enables
	 * clients to know exactly the last checkpoint they have processed and in the
	 * event the subscription terminates (either by the client/server or by the
	 * connection breaking), clients will be able to reinitailize a subscription
	 * and then leverage other APIs in order to request data for the checkpoints
	 * they missed.
	 *
	 * @generated from protobuf rpc: SubscribeCheckpoints(sui.rpc.v2alpha.SubscribeCheckpointsRequest) returns (stream sui.rpc.v2alpha.SubscribeCheckpointsResponse);
	 */
	subscribeCheckpoints(
		input: SubscribeCheckpointsRequest,
		options?: RpcOptions,
	): ServerStreamingCall<SubscribeCheckpointsRequest, SubscribeCheckpointsResponse> {
		const method = this.methods[0],
			opt = this._transport.mergeOptions(options);
		return stackIntercept<SubscribeCheckpointsRequest, SubscribeCheckpointsResponse>(
			'serverStreaming',
			this._transport,
			method,
			opt,
			input,
		);
	}
}
