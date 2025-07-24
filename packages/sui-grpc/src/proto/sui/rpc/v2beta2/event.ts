// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { BinaryWriteOptions } from '@protobuf-ts/runtime';
import type { IBinaryWriter } from '@protobuf-ts/runtime';
import { WireType } from '@protobuf-ts/runtime';
import type { BinaryReadOptions } from '@protobuf-ts/runtime';
import type { IBinaryReader } from '@protobuf-ts/runtime';
import { UnknownFieldHandler } from '@protobuf-ts/runtime';
import type { PartialMessage } from '@protobuf-ts/runtime';
import { reflectionMergePartial } from '@protobuf-ts/runtime';
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
	create(value?: PartialMessage<TransactionEvents>): TransactionEvents {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.events = [];
		if (value !== undefined) reflectionMergePartial<TransactionEvents>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: TransactionEvents,
	): TransactionEvents {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Bcs bcs */ 1:
					message.bcs = Bcs.internalBinaryRead(reader, reader.uint32(), options, message.bcs);
					break;
				case /* optional string digest */ 2:
					message.digest = reader.string();
					break;
				case /* repeated sui.rpc.v2beta2.Event events */ 3:
					message.events.push(Event.internalBinaryRead(reader, reader.uint32(), options));
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
		message: TransactionEvents,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Bcs bcs = 1; */
		if (message.bcs)
			Bcs.internalBinaryWrite(
				message.bcs,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string digest = 2; */
		if (message.digest !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.digest);
		/* repeated sui.rpc.v2beta2.Event events = 3; */
		for (let i = 0; i < message.events.length; i++)
			Event.internalBinaryWrite(
				message.events[i],
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
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
	create(value?: PartialMessage<Event>): Event {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<Event>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Event,
	): Event {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string package_id */ 1:
					message.packageId = reader.string();
					break;
				case /* optional string module */ 2:
					message.module = reader.string();
					break;
				case /* optional string sender */ 3:
					message.sender = reader.string();
					break;
				case /* optional string event_type */ 4:
					message.eventType = reader.string();
					break;
				case /* optional sui.rpc.v2beta2.Bcs contents */ 5:
					message.contents = Bcs.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.contents,
					);
					break;
				case /* optional google.protobuf.Value json */ 6:
					message.json = Value.internalBinaryRead(reader, reader.uint32(), options, message.json);
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
		message: Event,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string package_id = 1; */
		if (message.packageId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.packageId);
		/* optional string module = 2; */
		if (message.module !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.module);
		/* optional string sender = 3; */
		if (message.sender !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.sender);
		/* optional string event_type = 4; */
		if (message.eventType !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.eventType);
		/* optional sui.rpc.v2beta2.Bcs contents = 5; */
		if (message.contents)
			Bcs.internalBinaryWrite(
				message.contents,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional google.protobuf.Value json = 6; */
		if (message.json)
			Value.internalBinaryWrite(
				message.json,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.Event
 */
export const Event = new Event$Type();
