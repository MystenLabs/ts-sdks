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
import { UserSignature } from './signature.js';
import { Bcs } from './bcs.js';
/**
 * The committed to contents of a checkpoint.
 *
 * @generated from protobuf message sui.rpc.v2beta.CheckpointContents
 */
export interface CheckpointContents {
	/**
	 * This CheckpointContents serialized as BCS.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.Bcs bcs = 1;
	 */
	bcs?: Bcs;
	/**
	 * The digest of this CheckpointContents.
	 *
	 * @generated from protobuf field: optional string digest = 2;
	 */
	digest?: string;
	/**
	 * Version of this CheckpointContents
	 *
	 * @generated from protobuf field: optional int32 version = 3;
	 */
	version?: number;
	/**
	 * Set of transactions committed to in this checkpoint.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta.CheckpointedTransactionInfo transactions = 4;
	 */
	transactions: CheckpointedTransactionInfo[];
}
/**
 * Transaction information committed to in a checkpoint.
 *
 * @generated from protobuf message sui.rpc.v2beta.CheckpointedTransactionInfo
 */
export interface CheckpointedTransactionInfo {
	/**
	 * Digest of the transaction.
	 *
	 * @generated from protobuf field: optional string transaction = 1;
	 */
	transaction?: string;
	/**
	 * Digest of the effects.
	 *
	 * @generated from protobuf field: optional string effects = 2;
	 */
	effects?: string;
	/**
	 * Set of user signatures that authorized the transaction.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta.UserSignature signatures = 3;
	 */
	signatures: UserSignature[];
}
// @generated message type with reflection information, may provide speed optimized methods
class CheckpointContents$Type extends MessageType<CheckpointContents> {
	constructor() {
		super('sui.rpc.v2beta.CheckpointContents', [
			{ no: 1, name: 'bcs', kind: 'message', T: () => Bcs },
			{ no: 2, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'version', kind: 'scalar', opt: true, T: 5 /*ScalarType.INT32*/ },
			{
				no: 4,
				name: 'transactions',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => CheckpointedTransactionInfo,
			},
		]);
	}
	create(value?: PartialMessage<CheckpointContents>): CheckpointContents {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.transactions = [];
		if (value !== undefined) reflectionMergePartial<CheckpointContents>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CheckpointContents,
	): CheckpointContents {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta.Bcs bcs */ 1:
					message.bcs = Bcs.internalBinaryRead(reader, reader.uint32(), options, message.bcs);
					break;
				case /* optional string digest */ 2:
					message.digest = reader.string();
					break;
				case /* optional int32 version */ 3:
					message.version = reader.int32();
					break;
				case /* repeated sui.rpc.v2beta.CheckpointedTransactionInfo transactions */ 4:
					message.transactions.push(
						CheckpointedTransactionInfo.internalBinaryRead(reader, reader.uint32(), options),
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
		message: CheckpointContents,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta.Bcs bcs = 1; */
		if (message.bcs)
			Bcs.internalBinaryWrite(
				message.bcs,
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string digest = 2; */
		if (message.digest !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.digest);
		/* optional int32 version = 3; */
		if (message.version !== undefined) writer.tag(3, WireType.Varint).int32(message.version);
		/* repeated sui.rpc.v2beta.CheckpointedTransactionInfo transactions = 4; */
		for (let i = 0; i < message.transactions.length; i++)
			CheckpointedTransactionInfo.internalBinaryWrite(
				message.transactions[i],
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.CheckpointContents
 */
export const CheckpointContents = new CheckpointContents$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CheckpointedTransactionInfo$Type extends MessageType<CheckpointedTransactionInfo> {
	constructor() {
		super('sui.rpc.v2beta.CheckpointedTransactionInfo', [
			{ no: 1, name: 'transaction', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'effects', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'signatures',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => UserSignature,
			},
		]);
	}
	create(value?: PartialMessage<CheckpointedTransactionInfo>): CheckpointedTransactionInfo {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.signatures = [];
		if (value !== undefined)
			reflectionMergePartial<CheckpointedTransactionInfo>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CheckpointedTransactionInfo,
	): CheckpointedTransactionInfo {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string transaction */ 1:
					message.transaction = reader.string();
					break;
				case /* optional string effects */ 2:
					message.effects = reader.string();
					break;
				case /* repeated sui.rpc.v2beta.UserSignature signatures */ 3:
					message.signatures.push(
						UserSignature.internalBinaryRead(reader, reader.uint32(), options),
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
		message: CheckpointedTransactionInfo,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string transaction = 1; */
		if (message.transaction !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.transaction);
		/* optional string effects = 2; */
		if (message.effects !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.effects);
		/* repeated sui.rpc.v2beta.UserSignature signatures = 3; */
		for (let i = 0; i < message.signatures.length; i++)
			UserSignature.internalBinaryWrite(
				message.signatures[i],
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.CheckpointedTransactionInfo
 */
export const CheckpointedTransactionInfo = new CheckpointedTransactionInfo$Type();
