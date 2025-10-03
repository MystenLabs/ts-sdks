// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { MessageType } from '@protobuf-ts/runtime';
import { Value } from '../../../google/protobuf/struct.js';
import { Bcs } from './bcs.js';
/**
 * Events emitted during the successful execution of a transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta2.TransactionEvents
 */
export interface TransactionEvents {
	/**
	 * This TransactionEvents serialized as BCS.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Bcs bcs = 1
	 */
	bcs?: Bcs;
	/**
	 * The digest of this TransactionEvents.
	 *
	 * @generated from protobuf field: optional string digest = 2
	 */
	digest?: string;
	/**
	 * Set of events emitted by a transaction.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Event events = 3
	 */
	events: Event[];
}
/**
 * An event.
 *
 * @generated from protobuf message sui.rpc.v2beta2.Event
 */
export interface Event {
	/**
	 * Package ID of the top-level function invoked by a `MoveCall` command that triggered this
	 * event to be emitted.
	 *
	 * @generated from protobuf field: optional string package_id = 1
	 */
	packageId?: string;
	/**
	 * Module name of the top-level function invoked by a `MoveCall` command that triggered this
	 * event to be emitted.
	 *
	 * @generated from protobuf field: optional string module = 2
	 */
	module?: string;
	/**
	 * Address of the account that sent the transaction where this event was emitted.
	 *
	 * @generated from protobuf field: optional string sender = 3
	 */
	sender?: string;
	/**
	 * The type of the event emitted.
	 *
	 * @generated from protobuf field: optional string event_type = 4
	 */
	eventType?: string;
	/**
	 * BCS serialized bytes of the event.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Bcs contents = 5
	 */
	contents?: Bcs;
	/**
	 * JSON rendering of the event.
	 *
	 * @generated from protobuf field: optional google.protobuf.Value json = 6
	 */
	json?: Value;
}
// @generated message type with reflection information, may provide speed optimized methods
class TransactionEvents$Type extends MessageType<TransactionEvents> {
	constructor() {
		super('sui.rpc.v2beta2.TransactionEvents', [
			{ no: 1, name: 'bcs', kind: 'message', T: () => Bcs },
			{ no: 2, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'events', kind: 'message', repeat: 2 /*RepeatType.UNPACKED*/, T: () => Event },
		]);
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.TransactionEvents
 */
export const TransactionEvents = new TransactionEvents$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Event$Type extends MessageType<Event> {
	constructor() {
		super('sui.rpc.v2beta2.Event', [
			{ no: 1, name: 'package_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'module', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'sender', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'event_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'contents', kind: 'message', T: () => Bcs },
			{ no: 6, name: 'json', kind: 'message', T: () => Value },
		]);
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Event
 */
export const Event = new Event$Type();
