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
import { ExecutedTransaction } from './executed_transaction.js';
import { CheckpointContents } from './checkpoint_contents.js';
import { ValidatorAggregatedSignature } from './signature.js';
import { CheckpointSummary } from './checkpoint_summary.js';
/**
 * @generated from protobuf message sui.rpc.v2beta.Checkpoint
 */
export interface Checkpoint {
	/**
	 * The height of this checkpoint.
	 *
	 * @generated from protobuf field: optional uint64 sequence_number = 1;
	 */
	sequenceNumber?: bigint;
	/**
	 * The digest of this Checkpoint's CheckpointSummary.
	 *
	 * @generated from protobuf field: optional string digest = 2;
	 */
	digest?: string;
	/**
	 * The `CheckpointSummary` for this checkpoint.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.CheckpointSummary summary = 3;
	 */
	summary?: CheckpointSummary;
	/**
	 * An aggregated quorum signature from the validator committee that
	 * certified this checkpoint.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.ValidatorAggregatedSignature signature = 4;
	 */
	signature?: ValidatorAggregatedSignature;
	/**
	 * The `CheckpointContents` for this checkpoint.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.CheckpointContents contents = 5;
	 */
	contents?: CheckpointContents;
	/**
	 * List of transactions included in this checkpoint.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta.ExecutedTransaction transactions = 6;
	 */
	transactions: ExecutedTransaction[];
}
// @generated message type with reflection information, may provide speed optimized methods
class Checkpoint$Type extends MessageType<Checkpoint> {
	constructor() {
		super('sui.rpc.v2beta.Checkpoint', [
			{
				no: 1,
				name: 'sequence_number',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 2, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'summary', kind: 'message', T: () => CheckpointSummary },
			{ no: 4, name: 'signature', kind: 'message', T: () => ValidatorAggregatedSignature },
			{ no: 5, name: 'contents', kind: 'message', T: () => CheckpointContents },
			{
				no: 6,
				name: 'transactions',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => ExecutedTransaction,
			},
		]);
	}
	create(value?: PartialMessage<Checkpoint>): Checkpoint {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.transactions = [];
		if (value !== undefined) reflectionMergePartial<Checkpoint>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: Checkpoint,
	): Checkpoint {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 sequence_number */ 1:
					message.sequenceNumber = reader.uint64().toBigInt();
					break;
				case /* optional string digest */ 2:
					message.digest = reader.string();
					break;
				case /* optional sui.rpc.v2beta.CheckpointSummary summary */ 3:
					message.summary = CheckpointSummary.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.summary,
					);
					break;
				case /* optional sui.rpc.v2beta.ValidatorAggregatedSignature signature */ 4:
					message.signature = ValidatorAggregatedSignature.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.signature,
					);
					break;
				case /* optional sui.rpc.v2beta.CheckpointContents contents */ 5:
					message.contents = CheckpointContents.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.contents,
					);
					break;
				case /* repeated sui.rpc.v2beta.ExecutedTransaction transactions */ 6:
					message.transactions.push(
						ExecutedTransaction.internalBinaryRead(reader, reader.uint32(), options),
					);
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
		message: Checkpoint,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 sequence_number = 1; */
		if (message.sequenceNumber !== undefined)
			writer.tag(1, WireType.Varint).uint64(message.sequenceNumber);
		/* optional string digest = 2; */
		if (message.digest !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.digest);
		/* optional sui.rpc.v2beta.CheckpointSummary summary = 3; */
		if (message.summary)
			CheckpointSummary.internalBinaryWrite(
				message.summary,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta.ValidatorAggregatedSignature signature = 4; */
		if (message.signature)
			ValidatorAggregatedSignature.internalBinaryWrite(
				message.signature,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta.CheckpointContents contents = 5; */
		if (message.contents)
			CheckpointContents.internalBinaryWrite(
				message.contents,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta.ExecutedTransaction transactions = 6; */
		for (let i = 0; i < message.transactions.length; i++)
			ExecutedTransaction.internalBinaryWrite(
				message.transactions[i],
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.Checkpoint
 */
export const Checkpoint = new Checkpoint$Type();
