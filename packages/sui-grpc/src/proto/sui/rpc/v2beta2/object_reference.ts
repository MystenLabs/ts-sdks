// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MessageType } from '@protobuf-ts/runtime';
/**
 * Reference to an object.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ObjectReference
 */
export interface ObjectReference {
	/**
	 * The object id of this object.
	 *
	 * @generated from protobuf field: optional string object_id = 1
	 */
	objectId?: string;
	/**
	 * The version of this object.
	 *
	 * @generated from protobuf field: optional uint64 version = 2
	 */
	version?: bigint;
	/**
	 * The digest of this object.
	 *
	 * @generated from protobuf field: optional string digest = 3
	 */
	digest?: string;
}
// @generated message type with reflection information, may provide speed optimized methods
class ObjectReference$Type extends MessageType<ObjectReference> {
	constructor() {
		super('sui.rpc.v2beta2.ObjectReference', [
			{ no: 1, name: 'object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 3, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ObjectReference
 */
export const ObjectReference = new ObjectReference$Type();
