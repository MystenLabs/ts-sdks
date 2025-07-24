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
/**
 * Summary of gas charges.
 *
 * @generated from protobuf message sui.rpc.v2beta2.GasCostSummary
 */
export interface GasCostSummary {
	/**
	 * Cost of computation/execution.
	 *
	 * @generated from protobuf field: optional uint64 computation_cost = 1
	 */
	computationCost?: bigint;
	/**
	 * Storage cost, it's the sum of all storage cost for all objects created or mutated.
	 *
	 * @generated from protobuf field: optional uint64 storage_cost = 2
	 */
	storageCost?: bigint;
	/**
	 * The amount of storage cost refunded to the user for all objects deleted or mutated in the
	 * transaction.
	 *
	 * @generated from protobuf field: optional uint64 storage_rebate = 3
	 */
	storageRebate?: bigint;
	/**
	 * The fee for the rebate. The portion of the storage rebate kept by the system.
	 *
	 * @generated from protobuf field: optional uint64 non_refundable_storage_fee = 4
	 */
	nonRefundableStorageFee?: bigint;
}
// @generated message type with reflection information, may provide speed optimized methods
class GasCostSummary$Type extends MessageType<GasCostSummary> {
	constructor() {
		super('sui.rpc.v2beta2.GasCostSummary', [
			{
				no: 1,
				name: 'computation_cost',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'storage_cost',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: 'storage_rebate',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 4,
				name: 'non_refundable_storage_fee',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<GasCostSummary>): GasCostSummary {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<GasCostSummary>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: GasCostSummary,
	): GasCostSummary {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 computation_cost */ 1:
					message.computationCost = reader.uint64().toBigInt();
					break;
				case /* optional uint64 storage_cost */ 2:
					message.storageCost = reader.uint64().toBigInt();
					break;
				case /* optional uint64 storage_rebate */ 3:
					message.storageRebate = reader.uint64().toBigInt();
					break;
				case /* optional uint64 non_refundable_storage_fee */ 4:
					message.nonRefundableStorageFee = reader.uint64().toBigInt();
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
		message: GasCostSummary,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 computation_cost = 1; */
		if (message.computationCost !== undefined)
			writer.tag(1, WireType.Varint).uint64(message.computationCost);
		/* optional uint64 storage_cost = 2; */
		if (message.storageCost !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.storageCost);
		/* optional uint64 storage_rebate = 3; */
		if (message.storageRebate !== undefined)
			writer.tag(3, WireType.Varint).uint64(message.storageRebate);
		/* optional uint64 non_refundable_storage_fee = 4; */
		if (message.nonRefundableStorageFee !== undefined)
			writer.tag(4, WireType.Varint).uint64(message.nonRefundableStorageFee);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.GasCostSummary
 */
export const GasCostSummary = new GasCostSummary$Type();
