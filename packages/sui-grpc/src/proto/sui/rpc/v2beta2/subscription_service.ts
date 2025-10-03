// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ServiceType } from '@protobuf-ts/runtime-rpc';
import { MessageType } from '@protobuf-ts/runtime';
import { Checkpoint } from './checkpoint.js';
import { FieldMask } from '../../../google/protobuf/field_mask.js';
/**
 * Request message for SubscriptionService.SubscribeCheckpoints
 *
 * @generated from protobuf message sui.rpc.v2beta2.SubscribeCheckpointsRequest
 */
export interface SubscribeCheckpointsRequest {
	/**
	 * Optional. Mask for specifiying which parts of the
	 * SubscribeCheckpointsResponse should be returned.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 1
	 */
	readMask?: FieldMask;
}
/**
 * Response message for SubscriptionService.SubscribeCheckpoints
 *
 * @generated from protobuf message sui.rpc.v2beta2.SubscribeCheckpointsResponse
 */
export interface SubscribeCheckpointsResponse {
	/**
	 * Required. The checkpoint sequence number and value of the current cursor
	 * into the checkpoint stream
	 *
	 * @generated from protobuf field: optional uint64 cursor = 1
	 */
	cursor?: bigint;
	/**
	 * The requested data for this checkpoint
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Checkpoint checkpoint = 2
	 */
	checkpoint?: Checkpoint;
}
// @generated message type with reflection information, may provide speed optimized methods
class SubscribeCheckpointsRequest$Type extends MessageType<SubscribeCheckpointsRequest> {
	constructor() {
		super('sui.rpc.v2beta2.SubscribeCheckpointsRequest', [
			{ no: 1, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.SubscribeCheckpointsRequest
 */
export const SubscribeCheckpointsRequest = new SubscribeCheckpointsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SubscribeCheckpointsResponse$Type extends MessageType<SubscribeCheckpointsResponse> {
	constructor() {
		super('sui.rpc.v2beta2.SubscribeCheckpointsResponse', [
			{
				no: 1,
				name: 'cursor',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 2, name: 'checkpoint', kind: 'message', T: () => Checkpoint },
		]);
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.SubscribeCheckpointsResponse
 */
export const SubscribeCheckpointsResponse = new SubscribeCheckpointsResponse$Type();
/**
 * @generated ServiceType for protobuf service sui.rpc.v2beta2.SubscriptionService
 */
export const SubscriptionService = new ServiceType('sui.rpc.v2beta2.SubscriptionService', [
	{
		name: 'SubscribeCheckpoints',
		serverStreaming: true,
		options: {},
		I: SubscribeCheckpointsRequest,
		O: SubscribeCheckpointsResponse,
	},
]);
