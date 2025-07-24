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
import { ValidatorCommitteeMember } from './signature.js';
import { Timestamp } from '../../../google/protobuf/timestamp.js';
import { GasCostSummary } from './gas_cost_summary.js';
import { Bcs } from './bcs.js';
/**
 * A header for a checkpoint on the Sui blockchain.
 *
 * On the Sui network, checkpoints define the history of the blockchain. They are quite similar to
 * the concept of blocks used by other blockchains like Bitcoin or Ethereum. The Sui blockchain,
 * however, forms checkpoints after transaction execution has already happened to provide a
 * certified history of the chain, instead of being formed before execution.
 *
 * Checkpoints commit to a variety of state, including but not limited to:
 * - The hash of the previous checkpoint.
 * - The set of transaction digests, their corresponding effects digests, as well as the set of
 *   user signatures that authorized its execution.
 * - The objects produced by a transaction.
 * - The set of live objects that make up the current state of the chain.
 * - On epoch transitions, the next validator committee.
 *
 * `CheckpointSummary`s themselves don't directly include all of the previous information but they
 * are the top-level type by which all the information is committed to transitively via cryptographic
 * hashes included in the summary. `CheckpointSummary`s are signed and certified by a quorum of
 * the validator committee in a given epoch to allow verification of the chain's state.
 *
 * @generated from protobuf message sui.rpc.v2beta2.CheckpointSummary
 */
export interface CheckpointSummary {
	/**
	 * This CheckpointSummary serialized as BCS.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.Bcs bcs = 1
	 */
	bcs?: Bcs;
	/**
	 * The digest of this CheckpointSummary.
	 *
	 * @generated from protobuf field: optional string digest = 2
	 */
	digest?: string;
	/**
	 * Epoch that this checkpoint belongs to.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 3
	 */
	epoch?: bigint;
	/**
	 * The height of this checkpoint.
	 *
	 * @generated from protobuf field: optional uint64 sequence_number = 4
	 */
	sequenceNumber?: bigint;
	/**
	 * Total number of transactions committed since genesis, including those in this
	 * checkpoint.
	 *
	 * @generated from protobuf field: optional uint64 total_network_transactions = 5
	 */
	totalNetworkTransactions?: bigint;
	/**
	 * The hash of the `CheckpointContents` for this checkpoint.
	 *
	 * @generated from protobuf field: optional string content_digest = 6
	 */
	contentDigest?: string;
	/**
	 * The hash of the previous `CheckpointSummary`.
	 *
	 * This will be `None` only for the first, or genesis, checkpoint.
	 *
	 * @generated from protobuf field: optional string previous_digest = 7
	 */
	previousDigest?: string;
	/**
	 * The running total gas costs of all transactions included in the current epoch so far
	 * until this checkpoint.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.GasCostSummary epoch_rolling_gas_cost_summary = 8
	 */
	epochRollingGasCostSummary?: GasCostSummary;
	/**
	 * Timestamp of the checkpoint - number of milliseconds from the Unix epoch
	 * Checkpoint timestamps are monotonic, but not strongly monotonic - subsequent
	 * checkpoints can have the same timestamp if they originate from the same underlining consensus commit.
	 *
	 * @generated from protobuf field: optional google.protobuf.Timestamp timestamp = 9
	 */
	timestamp?: Timestamp;
	/**
	 * Commitments to checkpoint-specific state.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.CheckpointCommitment commitments = 10
	 */
	commitments: CheckpointCommitment[];
	/**
	 * Extra data only present in the final checkpoint of an epoch.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta2.EndOfEpochData end_of_epoch_data = 11
	 */
	endOfEpochData?: EndOfEpochData;
	/**
	 * `CheckpointSummary` is not an evolvable structure - it must be readable by any version of
	 * the code. Therefore, to allow extensions to be added to `CheckpointSummary`,
	 * opaque data can be added to checkpoints, which can be deserialized based on the current
	 * protocol version.
	 *
	 * @generated from protobuf field: optional bytes version_specific_data = 12
	 */
	versionSpecificData?: Uint8Array;
}
/**
 * Data, which when included in a `CheckpointSummary`, signals the end of an `Epoch`.
 *
 * @generated from protobuf message sui.rpc.v2beta2.EndOfEpochData
 */
export interface EndOfEpochData {
	/**
	 * The set of validators that will be in the `ValidatorCommittee` for the next epoch.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.ValidatorCommitteeMember next_epoch_committee = 1
	 */
	nextEpochCommittee: ValidatorCommitteeMember[];
	/**
	 * The protocol version that is in effect during the next epoch.
	 *
	 * @generated from protobuf field: optional uint64 next_epoch_protocol_version = 2
	 */
	nextEpochProtocolVersion?: bigint;
	/**
	 * Commitments to epoch specific state (live object set)
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta2.CheckpointCommitment epoch_commitments = 3
	 */
	epochCommitments: CheckpointCommitment[];
}
/**
 * A commitment made by a checkpoint.
 *
 * @generated from protobuf message sui.rpc.v2beta2.CheckpointCommitment
 */
export interface CheckpointCommitment {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta2.CheckpointCommitment.CheckpointCommitmentKind kind = 1
	 */
	kind?: CheckpointCommitment_CheckpointCommitmentKind;
	/**
	 * @generated from protobuf field: optional string digest = 2
	 */
	digest?: string;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta2.CheckpointCommitment.CheckpointCommitmentKind
 */
export enum CheckpointCommitment_CheckpointCommitmentKind {
	/**
	 * @generated from protobuf enum value: CHECKPOINT_COMMITMENT_KIND_UNKNOWN = 0;
	 */
	CHECKPOINT_COMMITMENT_KIND_UNKNOWN = 0,
	/**
	 * An elliptic curve multiset hash attesting to the set of objects that
	 * comprise the live state of the Sui blockchain.
	 *
	 * @generated from protobuf enum value: ECMH_LIVE_OBJECT_SET = 1;
	 */
	ECMH_LIVE_OBJECT_SET = 1,
}
// @generated message type with reflection information, may provide speed optimized methods
class CheckpointSummary$Type extends MessageType<CheckpointSummary> {
	constructor() {
		super('sui.rpc.v2beta2.CheckpointSummary', [
			{ no: 1, name: 'bcs', kind: 'message', T: () => Bcs },
			{ no: 2, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 4,
				name: 'sequence_number',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 5,
				name: 'total_network_transactions',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 6, name: 'content_digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 7, name: 'previous_digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 8, name: 'epoch_rolling_gas_cost_summary', kind: 'message', T: () => GasCostSummary },
			{ no: 9, name: 'timestamp', kind: 'message', T: () => Timestamp },
			{
				no: 10,
				name: 'commitments',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => CheckpointCommitment,
			},
			{ no: 11, name: 'end_of_epoch_data', kind: 'message', T: () => EndOfEpochData },
			{
				no: 12,
				name: 'version_specific_data',
				kind: 'scalar',
				opt: true,
				T: 12 /*ScalarType.BYTES*/,
			},
		]);
	}
	create(value?: PartialMessage<CheckpointSummary>): CheckpointSummary {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.commitments = [];
		if (value !== undefined) reflectionMergePartial<CheckpointSummary>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CheckpointSummary,
	): CheckpointSummary {
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
				case /* optional uint64 epoch */ 3:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional uint64 sequence_number */ 4:
					message.sequenceNumber = reader.uint64().toBigInt();
					break;
				case /* optional uint64 total_network_transactions */ 5:
					message.totalNetworkTransactions = reader.uint64().toBigInt();
					break;
				case /* optional string content_digest */ 6:
					message.contentDigest = reader.string();
					break;
				case /* optional string previous_digest */ 7:
					message.previousDigest = reader.string();
					break;
				case /* optional sui.rpc.v2beta2.GasCostSummary epoch_rolling_gas_cost_summary */ 8:
					message.epochRollingGasCostSummary = GasCostSummary.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.epochRollingGasCostSummary,
					);
					break;
				case /* optional google.protobuf.Timestamp timestamp */ 9:
					message.timestamp = Timestamp.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.timestamp,
					);
					break;
				case /* repeated sui.rpc.v2beta2.CheckpointCommitment commitments */ 10:
					message.commitments.push(
						CheckpointCommitment.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional sui.rpc.v2beta2.EndOfEpochData end_of_epoch_data */ 11:
					message.endOfEpochData = EndOfEpochData.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.endOfEpochData,
					);
					break;
				case /* optional bytes version_specific_data */ 12:
					message.versionSpecificData = reader.bytes();
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
		message: CheckpointSummary,
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
		/* optional uint64 epoch = 3; */
		if (message.epoch !== undefined) writer.tag(3, WireType.Varint).uint64(message.epoch);
		/* optional uint64 sequence_number = 4; */
		if (message.sequenceNumber !== undefined)
			writer.tag(4, WireType.Varint).uint64(message.sequenceNumber);
		/* optional uint64 total_network_transactions = 5; */
		if (message.totalNetworkTransactions !== undefined)
			writer.tag(5, WireType.Varint).uint64(message.totalNetworkTransactions);
		/* optional string content_digest = 6; */
		if (message.contentDigest !== undefined)
			writer.tag(6, WireType.LengthDelimited).string(message.contentDigest);
		/* optional string previous_digest = 7; */
		if (message.previousDigest !== undefined)
			writer.tag(7, WireType.LengthDelimited).string(message.previousDigest);
		/* optional sui.rpc.v2beta2.GasCostSummary epoch_rolling_gas_cost_summary = 8; */
		if (message.epochRollingGasCostSummary)
			GasCostSummary.internalBinaryWrite(
				message.epochRollingGasCostSummary,
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional google.protobuf.Timestamp timestamp = 9; */
		if (message.timestamp)
			Timestamp.internalBinaryWrite(
				message.timestamp,
				writer.tag(9, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta2.CheckpointCommitment commitments = 10; */
		for (let i = 0; i < message.commitments.length; i++)
			CheckpointCommitment.internalBinaryWrite(
				message.commitments[i],
				writer.tag(10, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta2.EndOfEpochData end_of_epoch_data = 11; */
		if (message.endOfEpochData)
			EndOfEpochData.internalBinaryWrite(
				message.endOfEpochData,
				writer.tag(11, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional bytes version_specific_data = 12; */
		if (message.versionSpecificData !== undefined)
			writer.tag(12, WireType.LengthDelimited).bytes(message.versionSpecificData);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.CheckpointSummary
 */
export const CheckpointSummary = new CheckpointSummary$Type();
// @generated message type with reflection information, may provide speed optimized methods
class EndOfEpochData$Type extends MessageType<EndOfEpochData> {
	constructor() {
		super('sui.rpc.v2beta2.EndOfEpochData', [
			{
				no: 1,
				name: 'next_epoch_committee',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => ValidatorCommitteeMember,
			},
			{
				no: 2,
				name: 'next_epoch_protocol_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 3,
				name: 'epoch_commitments',
				kind: 'message',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: () => CheckpointCommitment,
			},
		]);
	}
	create(value?: PartialMessage<EndOfEpochData>): EndOfEpochData {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.nextEpochCommittee = [];
		message.epochCommitments = [];
		if (value !== undefined) reflectionMergePartial<EndOfEpochData>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: EndOfEpochData,
	): EndOfEpochData {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* repeated sui.rpc.v2beta2.ValidatorCommitteeMember next_epoch_committee */ 1:
					message.nextEpochCommittee.push(
						ValidatorCommitteeMember.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional uint64 next_epoch_protocol_version */ 2:
					message.nextEpochProtocolVersion = reader.uint64().toBigInt();
					break;
				case /* repeated sui.rpc.v2beta2.CheckpointCommitment epoch_commitments */ 3:
					message.epochCommitments.push(
						CheckpointCommitment.internalBinaryRead(reader, reader.uint32(), options),
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
		message: EndOfEpochData,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* repeated sui.rpc.v2beta2.ValidatorCommitteeMember next_epoch_committee = 1; */
		for (let i = 0; i < message.nextEpochCommittee.length; i++)
			ValidatorCommitteeMember.internalBinaryWrite(
				message.nextEpochCommittee[i],
				writer.tag(1, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 next_epoch_protocol_version = 2; */
		if (message.nextEpochProtocolVersion !== undefined)
			writer.tag(2, WireType.Varint).uint64(message.nextEpochProtocolVersion);
		/* repeated sui.rpc.v2beta2.CheckpointCommitment epoch_commitments = 3; */
		for (let i = 0; i < message.epochCommitments.length; i++)
			CheckpointCommitment.internalBinaryWrite(
				message.epochCommitments[i],
				writer.tag(3, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.EndOfEpochData
 */
export const EndOfEpochData = new EndOfEpochData$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CheckpointCommitment$Type extends MessageType<CheckpointCommitment> {
	constructor() {
		super('sui.rpc.v2beta2.CheckpointCommitment', [
			{
				no: 1,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta2.CheckpointCommitment.CheckpointCommitmentKind',
					CheckpointCommitment_CheckpointCommitmentKind,
				],
			},
			{ no: 2, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<CheckpointCommitment>): CheckpointCommitment {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CheckpointCommitment>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CheckpointCommitment,
	): CheckpointCommitment {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta2.CheckpointCommitment.CheckpointCommitmentKind kind */ 1:
					message.kind = reader.int32();
					break;
				case /* optional string digest */ 2:
					message.digest = reader.string();
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
		message: CheckpointCommitment,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta2.CheckpointCommitment.CheckpointCommitmentKind kind = 1; */
		if (message.kind !== undefined) writer.tag(1, WireType.Varint).int32(message.kind);
		/* optional string digest = 2; */
		if (message.digest !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.digest);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta2.CheckpointCommitment
 */
export const CheckpointCommitment = new CheckpointCommitment$Type();
