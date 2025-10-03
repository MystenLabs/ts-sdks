// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MessageType } from '@protobuf-ts/runtime';
/**
 * `Bcs` contains an arbitrary type that is serialized using the
 * [BCS](https://mystenlabs.github.io/sui-rust-sdk/sui_sdk_types/index.html#bcs)
 * format as well as a name that identifies the type of the serialized value.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Bcs
 */
export interface Bcs {
	/**
	 * Name that identifies the type of the serialized value.
	 *
	 * @generated from protobuf field: optional string name = 1
	 */
	name?: string;
	/**
	 * Bytes of a BCS serialized value.
	 *
	 * @generated from protobuf field: optional bytes value = 2
	 */
	value?: Uint8Array;
}
// @generated message type with reflection information, may provide speed optimized methods
class Bcs$Type extends MessageType<Bcs> {
	constructor() {
		super('sui.rpc.v2beta2.Bcs', [
			{ no: 1, name: 'name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'value', kind: 'scalar', opt: true, T: 12 /*ScalarType.BYTES*/ },
		]);
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Bcs
 */
export const Bcs = new Bcs$Type();
