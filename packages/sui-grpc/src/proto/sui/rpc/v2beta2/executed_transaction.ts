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
import { Object } from './object.js';
import { BalanceChange } from './balance_change.js';
import { Timestamp } from '../../../google/protobuf/timestamp.js';
import { TransactionEvents } from './event.js';
import { TransactionEffects } from './effects.js';
import { UserSignature } from './signature.js';
import { Transaction } from './transaction.js';
/**
 * @generated from protobuf message sui.rpc.v2beta2.ExecutedTransaction
 */
export interface ExecutedTransaction {
	/**
	 * The digest of this Transaction.
	 *
	 * @generated from protobuf field: optional string digest = 1
	 */
	digest?: string;
	/**
	 * The transaction itself.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Transaction transaction = 2
	 */
	transaction?: Transaction;
	/**
	 * List of user signatures that are used to authorize the
	 * execution of this transaction.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.UserSignature signatures = 3
	 */
	signatures: UserSignature[];
	/**
	 * The `TransactionEffects` for this transaction.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.TransactionEffects effects = 4
	 */
	effects?: TransactionEffects;
	/**
	 * The `TransactionEvents` for this transaction.
	 *
	 * This field might be empty, even if it was explicitly requested, if the
	 * transaction didn't produce any events.
	 * `sui.types.TransactionEffects.events_digest` is populated if the
	 * transaction produced any events.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.TransactionEvents events = 5
	 */
	events?: TransactionEvents;
	/**
	 * The sequence number for the checkpoint that includes this transaction.
	 *
	 * @generated from protobuf field: optional uint64 checkpoint = 6
	 */
	checkpoint?: bigint;
	/**
	 * The Unix timestamp of the checkpoint that includes this transaction.
	 *
	 * @generated from protobuf field: optional google.protobuf.Timestamp timestamp = 7
	 */
	timestamp?: Timestamp;
	/**
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.BalanceChange balance_changes = 8
	 */
	balanceChanges: BalanceChange[];
	/**
	 * Set of input objects used during the execution of this transaction.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Object input_objects = 10
	 */
	inputObjects: Object[];
	/**
	 * Set of output objects produced from the execution of this transaction.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.Object output_objects = 11
	 */
	outputObjects: Object[];
}
// @generated message type with reflection information, may provide speed optimized methods
class ExecutedTransaction$Type extends MessageType<ExecutedTransaction> {
	constructor() {
		super('sui.rpc.v2beta2.ExecutedTransaction', [
			{ no: 1, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'transaction', kind: 'message', T: () => Transaction },
			{
				no: 3,
				name: 'signatures',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => UserSignature,
			},
			{ no: 4, name: 'effects', kind: 'message', T: () => TransactionEffects },
			{ no: 5, name: 'events', kind: 'message', T: () => TransactionEvents },
			{
				no: 6,
				name: 'checkpoint',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 7, name: 'timestamp', kind: 'message', T: () => Timestamp },
			{
				no: 8,
				name: 'balance_changes',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => BalanceChange,
			},
			{
				no: 10,
				name: 'input_objects',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Object,
			},
			{
				no: 11,
				name: 'output_objects',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => Object,
			},
		]);
	}
	create(value?: PartialMessage<ExecutedTransaction>): ExecutedTransaction {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.signatures = [];
		message.balanceChanges = [];
		message.inputObjects = [];
		message.outputObjects = [];
		if (value !== undefined) reflectionMergePartial<ExecutedTransaction>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ExecutedTransaction,
	): ExecutedTransaction {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string digest */ 1:
					message.digest = reader.string();
					break;
				case /* optional sui.rpc.v2beta2.Transaction transaction */ 2:
					message.transaction = Transaction.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.transaction,
					);
					break;
				case /* repeated sui.rpc.v2beta2.UserSignature signatures */ 3:
					message.signatures.push(
						UserSignature.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional sui.rpc.v2beta2.TransactionEffects effects */ 4:
					message.effects = TransactionEffects.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.effects,
					);
					break;
				case /* optional sui.rpc.v2beta2.TransactionEvents events */ 5:
					message.events = TransactionEvents.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.events,
					);
					break;
				case /* optional uint64 checkpoint */ 6:
					message.checkpoint = reader.uint64().toBigInt();
					break;
				case /* optional google.protobuf.Timestamp timestamp */ 7:
					message.timestamp = Timestamp.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.timestamp,
					);
					break;
				case /* repeated sui.rpc.v2beta2.BalanceChange balance_changes */ 8:
					message.balanceChanges.push(
						BalanceChange.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* repeated sui.rpc.v2beta2.Object input_objects */ 10:
					message.inputObjects.push(Object.internalBinaryRead(reader, reader.uint32(), options));
					break;
				case /* repeated sui.rpc.v2beta2.Object output_objects */ 11:
					message.outputObjects.push(Object.internalBinaryRead(reader, reader.uint32(), options));
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
		message: ExecutedTransaction,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string digest = 1; */
		if (message.digest !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.digest);
		/* optional sui.rpc.v2beta2.Transaction transaction = 2; */
		if (message.transaction)
			Transaction.internalBinaryWrite(
				message.transaction,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.UserSignature signatures = 3; */
		for (let i = 0; i < message.signatures.length; i++)
			UserSignature.internalBinaryWrite(
				message.signatures[i],
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.TransactionEffects effects = 4; */
		if (message.effects)
			TransactionEffects.internalBinaryWrite(
				message.effects,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.TransactionEvents events = 5; */
		if (message.events)
			TransactionEvents.internalBinaryWrite(
				message.events,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 checkpoint = 6; */
		if (message.checkpoint !== undefined) writer.tag(6, WireType.Varint).uint64(message.checkpoint);
		/* optional google.protobuf.Timestamp timestamp = 7; */
		if (message.timestamp)
			Timestamp.internalBinaryWrite(
				message.timestamp,
				writer.tag(7, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.BalanceChange balance_changes = 8; */
		for (let i = 0; i < message.balanceChanges.length; i++)
			BalanceChange.internalBinaryWrite(
				message.balanceChanges[i],
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.Object input_objects = 10; */
		for (let i = 0; i < message.inputObjects.length; i++)
			Object.internalBinaryWrite(
				message.inputObjects[i],
				writer.tag(10, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.Object output_objects = 11; */
		for (let i = 0; i < message.outputObjects.length; i++)
			Object.internalBinaryWrite(
				message.outputObjects[i],
				writer.tag(11, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ExecutedTransaction
 */
export const ExecutedTransaction = new ExecutedTransaction$Type();
