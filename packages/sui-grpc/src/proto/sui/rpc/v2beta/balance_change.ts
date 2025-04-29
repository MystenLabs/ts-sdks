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
 * The delta, or change, in balance for an address for a particular `Coin` type.
 *
 * @generated from protobuf message sui.rpc.v2beta.BalanceChange
 */
export interface BalanceChange {
	/**
	 * The account address that is affected by this balance change event.
	 *
	 * @generated from protobuf field: optional string address = 1;
	 */
	address?: string;
	/**
	 * The `Coin` type of this balance change event.
	 *
	 * @generated from protobuf field: optional string coin_type = 2;
	 */
	coinType?: string;
	/**
	 * The amount or change in balance.
	 *
	 * @generated from protobuf field: optional string amount = 3;
	 */
	amount?: string;
}
// @generated message type with reflection information, may provide speed optimized methods
class BalanceChange$Type extends MessageType<BalanceChange> {
	constructor() {
		super('sui.rpc.v2beta.BalanceChange', [
			{ no: 1, name: 'address', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'coin_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'amount', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<BalanceChange>): BalanceChange {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<BalanceChange>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: BalanceChange,
	): BalanceChange {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string address */ 1:
					message.address = reader.string();
					break;
				case /* optional string coin_type */ 2:
					message.coinType = reader.string();
					break;
				case /* optional string amount */ 3:
					message.amount = reader.string();
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
		message: BalanceChange,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string address = 1; */
		if (message.address !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.address);
		/* optional string coin_type = 2; */
		if (message.coinType !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.coinType);
		/* optional string amount = 3; */
		if (message.amount !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.amount);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.BalanceChange
 */
export const BalanceChange = new BalanceChange$Type();
