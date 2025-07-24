// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ServiceType } from '@protobuf-ts/runtime-rpc';
import type { BinaryWriteOptions } from '@protobuf-ts/runtime';
import type { IBinaryWriter } from '@protobuf-ts/runtime';
import { WireType } from '@protobuf-ts/runtime';
import type { BinaryReadOptions } from '@protobuf-ts/runtime';
import type { IBinaryReader } from '@protobuf-ts/runtime';
import { UnknownFieldHandler } from '@protobuf-ts/runtime';
import type { PartialMessage } from '@protobuf-ts/runtime';
import { reflectionMergePartial } from '@protobuf-ts/runtime';
import { MessageType } from '@protobuf-ts/runtime';
import { Empty } from '../../../google/protobuf/empty.js';
import { ValidatorAggregatedSignature } from './signature.js';
import { ExecutedTransaction } from './executed_transaction.js';
import { FieldMask } from '../../../google/protobuf/field_mask.js';
import { UserSignature } from './signature.js';
import { Transaction } from './transaction.js';
/**
 * @generated from protobuf message sui.rpc.v2beta2.ExecuteTransactionRequest
 */
export interface ExecuteTransactionRequest {
	/**
	 * The transaction to execute.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Transaction transaction = 1
	 */
	transaction?: Transaction;
	/**
	 * Set of `UserSiganture`s authorizing the execution of the provided
	 * transaction.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.UserSignature signatures = 2
	 */
	signatures: UserSignature[];
	/**
	 * Mask specifying which fields to read.
	 * If no mask is specified, defaults to `finality`.
	 *
	 * @generated from protobuf field: optional google.protobuf.FieldMask read_mask = 3
	 */
	readMask?: FieldMask;
}
/**
 * Response message for `NodeService.ExecuteTransaction`.
 *
 * @generated from protobuf message sui.rpc.v2beta2.ExecuteTransactionResponse
 */
export interface ExecuteTransactionResponse {
	/**
	 * Indicates the finality of the executed transaction.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.TransactionFinality finality = 1
	 */
	finality?: TransactionFinality;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.ExecutedTransaction transaction = 2
	 */
	transaction?: ExecutedTransaction;
}
/**
 * Indicates the finality of the executed transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta2.TransactionFinality
 */
export interface TransactionFinality {
	/**
	 * @generated from protobuf oneof: finality
	 */
	finality:
		| {
				oneofKind: 'certified';
				/**
				 * A quorum certificate certifying that a transaction is final but might not
				 * be included in a checkpoint yet.
				 *
				 * @generated from protobuf field: sui.rpc.v2beta2.ValidatorAggregatedSignature certified = 1
				 */
				certified: ValidatorAggregatedSignature;
		  }
		| {
				oneofKind: 'checkpointed';
				/**
				 * Sequence number of the checkpoint that includes the transaction.
				 *
				 * @generated from protobuf field: uint64 checkpointed = 2
				 */
				checkpointed: bigint;
		  }
		| {
				oneofKind: 'quorumExecuted';
				/**
				 * Indicates that a quorum of validators has executed the transaction but
				 * that it might not be included in a checkpoint yet.
				 *
				 * @generated from protobuf field: google.protobuf.Empty quorum_executed = 3
				 */
				quorumExecuted: Empty;
		  }
		| {
				oneofKind: undefined;
		  };
}
// @generated message type with reflection information, may provide speed optimized methods
class ExecuteTransactionRequest$Type extends MessageType<ExecuteTransactionRequest> {
	constructor() {
		super('sui.rpc.v2beta2.ExecuteTransactionRequest', [
			{ no: 1, name: 'transaction', kind: 'message', T: () => Transaction },
			{
				no: 2,
				name: 'signatures',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => UserSignature,
			},
			{ no: 3, name: 'read_mask', kind: 'message', T: () => FieldMask },
		]);
	}
	create(value?: PartialMessage<ExecuteTransactionRequest>): ExecuteTransactionRequest {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.signatures = [];
		if (value !== undefined)
			reflectionMergePartial<ExecuteTransactionRequest>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ExecuteTransactionRequest,
	): ExecuteTransactionRequest {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.Transaction transaction */ 1:
					message.transaction = Transaction.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.transaction,
					);
					break;
				case /* repeated sui.rpc.v2beta2.UserSignature signatures */ 2:
					message.signatures.push(
						UserSignature.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional google.protobuf.FieldMask read_mask */ 3:
					message.readMask = FieldMask.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.readMask,
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
		message: ExecuteTransactionRequest,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.Transaction transaction = 1; */
		if (message.transaction)
			Transaction.internalBinaryWrite(
				message.transaction,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.UserSignature signatures = 2; */
		for (let i = 0; i < message.signatures.length; i++)
			UserSignature.internalBinaryWrite(
				message.signatures[i],
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional google.protobuf.FieldMask read_mask = 3; */
		if (message.readMask)
			FieldMask.internalBinaryWrite(
				message.readMask,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ExecuteTransactionRequest
 */
export const ExecuteTransactionRequest = new ExecuteTransactionRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ExecuteTransactionResponse$Type extends MessageType<ExecuteTransactionResponse> {
	constructor() {
		super('sui.rpc.v2beta2.ExecuteTransactionResponse', [
			{ no: 1, name: 'finality', kind: 'message', T: () => TransactionFinality },
			{ no: 2, name: 'transaction', kind: 'message', T: () => ExecutedTransaction },
		]);
	}
	create(value?: PartialMessage<ExecuteTransactionResponse>): ExecuteTransactionResponse {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined)
			reflectionMergePartial<ExecuteTransactionResponse>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ExecuteTransactionResponse,
	): ExecuteTransactionResponse {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.TransactionFinality finality */ 1:
					message.finality = TransactionFinality.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.finality,
					);
					break;
				case /* optional sui.rpc.v2beta2.ExecutedTransaction transaction */ 2:
					message.transaction = ExecutedTransaction.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.transaction,
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
		message: ExecuteTransactionResponse,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.TransactionFinality finality = 1; */
		if (message.finality)
			TransactionFinality.internalBinaryWrite(
				message.finality,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.ExecutedTransaction transaction = 2; */
		if (message.transaction)
			ExecutedTransaction.internalBinaryWrite(
				message.transaction,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.ExecuteTransactionResponse
 */
export const ExecuteTransactionResponse = new ExecuteTransactionResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TransactionFinality$Type extends MessageType<TransactionFinality> {
	constructor() {
		super('sui.rpc.v2beta2.TransactionFinality', [
			{
				no: 1,
				name: 'certified',
				kind: 'message',
				oneof: 'finality',
				T: () => ValidatorAggregatedSignature,
			},
			{
				no: 2,
				name: 'checkpointed',
				kind: 'scalar',
				oneof: 'finality',
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 3, name: 'quorum_executed', kind: 'message', oneof: 'finality', T: () => Empty },
		]);
	}
	create(value?: PartialMessage<TransactionFinality>): TransactionFinality {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.finality = { oneofKind: undefined };
		if (value !== undefined) reflectionMergePartial<TransactionFinality>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: TransactionFinality,
	): TransactionFinality {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* sui.rpc.v2beta2.ValidatorAggregatedSignature certified */ 1:
					message.finality = {
						oneofKind: 'certified',
						certified: ValidatorAggregatedSignature.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.finality as any).certified,
						),
					};
					break;
				case /* uint64 checkpointed */ 2:
					message.finality = {
						oneofKind: 'checkpointed',
						checkpointed: reader.uint64().toBigInt(),
					};
					break;
				case /* google.protobuf.Empty quorum_executed */ 3:
					message.finality = {
						oneofKind: 'quorumExecuted',
						quorumExecuted: Empty.internalBinaryRead(
							reader,
							reader.uint32(),
							options,
							(message.finality as any).quorumExecuted,
						),
					};
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
		message: TransactionFinality,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* sui.rpc.v2beta2.ValidatorAggregatedSignature certified = 1; */
		if (message.finality.oneofKind === 'certified')
			ValidatorAggregatedSignature.internalBinaryWrite(
				message.finality.certified,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* uint64 checkpointed = 2; */
		if (message.finality.oneofKind === 'checkpointed')
			writer.tag(2, WireType.Varint).uint64(message.finality.checkpointed);
		/* google.protobuf.Empty quorum_executed = 3; */
		if (message.finality.oneofKind === 'quorumExecuted')
			Empty.internalBinaryWrite(
				message.finality.quorumExecuted,
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.TransactionFinality
 */
export const TransactionFinality = new TransactionFinality$Type();
/**
 * @generated ServiceType for protobuf service sui.rpc.v2beta2.TransactionExecutionService
 */
export const TransactionExecutionService = new ServiceType(
	'sui.rpc.v2beta2.TransactionExecutionService',
	[
		{
			name: 'ExecuteTransaction',
			options: {},
			I: ExecuteTransactionRequest,
			O: ExecuteTransactionResponse,
		},
	],
);
