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
import { Owner } from './owner.js';
import { GasCostSummary } from './gas_cost_summary.js';
import { ExecutionStatus } from './execution_status.js';
import { Bcs } from './bcs.js';
/**
 * The effects of executing a transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta.TransactionEffects
 */
export interface TransactionEffects {
	/**
	 * This TransactionEffects serialized as BCS.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.Bcs bcs = 1;
	 */
	bcs?: Bcs;
	/**
	 * The digest of this TransactionEffects.
	 *
	 * @generated from protobuf field: optional string digest = 2;
	 */
	digest?: string;
	/**
	 * Version of this TransactionEffects.
	 *
	 * @generated from protobuf field: optional int32 version = 3;
	 */
	version?: number;
	/**
	 * The status of the execution.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.ExecutionStatus status = 4;
	 */
	status?: ExecutionStatus;
	/**
	 * The epoch when this transaction was executed.
	 *
	 * @generated from protobuf field: optional uint64 epoch = 5;
	 */
	epoch?: bigint;
	/**
	 * The gas used by this transaction.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.GasCostSummary gas_used = 6;
	 */
	gasUsed?: GasCostSummary;
	/**
	 * The transaction digest.
	 *
	 * @generated from protobuf field: optional string transaction_digest = 7;
	 */
	transactionDigest?: string;
	/**
	 * Information about the gas object. Also present in the `changed_objects` vector.
	 *
	 * System transaction that don't require gas will leave this as `None`.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.ChangedObject gas_object = 8;
	 */
	gasObject?: ChangedObject;
	/**
	 * The digest of the events emitted during execution,
	 * can be `None` if the transaction does not emit any event.
	 *
	 * @generated from protobuf field: optional string events_digest = 9;
	 */
	eventsDigest?: string;
	/**
	 * The set of transaction digests this transaction depends on.
	 *
	 * @generated from protobuf field: repeated string dependencies = 10;
	 */
	dependencies: string[];
	/**
	 * The version number of all the written objects (excluding packages) by this transaction.
	 *
	 * @generated from protobuf field: optional uint64 lamport_version = 11;
	 */
	lamportVersion?: bigint;
	/**
	 * Objects whose state are changed by this transaction.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta.ChangedObject changed_objects = 12;
	 */
	changedObjects: ChangedObject[];
	/**
	 * Shared objects that are not mutated in this transaction. Unlike owned objects,
	 * read-only shared objects' version are not committed in the transaction,
	 * and in order for a node to catch up and execute it without consensus sequencing,
	 * the version needs to be committed in the effects.
	 *
	 * @generated from protobuf field: repeated sui.rpc.v2beta.UnchangedSharedObject unchanged_shared_objects = 13;
	 */
	unchangedSharedObjects: UnchangedSharedObject[];
	/**
	 * Auxiliary data that are not protocol-critical, generated as part of the effects but are stored separately.
	 * Storing it separately allows us to avoid bloating the effects with data that are not critical.
	 * It also provides more flexibility on the format and type of the data.
	 *
	 * @generated from protobuf field: optional string auxiliary_data_digest = 14;
	 */
	auxiliaryDataDigest?: string;
}
/**
 * Input/output state of an object that was changed during execution.
 *
 * @generated from protobuf message sui.rpc.v2beta.ChangedObject
 */
export interface ChangedObject {
	/**
	 * ID of the object.
	 *
	 * @generated from protobuf field: optional string object_id = 1;
	 */
	objectId?: string;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.ChangedObject.InputObjectState input_state = 2;
	 */
	inputState?: ChangedObject_InputObjectState;
	/**
	 * Version of the object before this transaction executed.
	 *
	 * @generated from protobuf field: optional uint64 input_version = 3;
	 */
	inputVersion?: bigint;
	/**
	 * Digest of the object before this transaction executed.
	 *
	 * @generated from protobuf field: optional string input_digest = 4;
	 */
	inputDigest?: string;
	/**
	 * Owner of the object before this transaction executed.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.Owner input_owner = 5;
	 */
	inputOwner?: Owner;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.ChangedObject.OutputObjectState output_state = 6;
	 */
	outputState?: ChangedObject_OutputObjectState;
	/**
	 * Version of the object after this transaction executed.
	 *
	 * @generated from protobuf field: optional uint64 output_version = 7;
	 */
	outputVersion?: bigint;
	/**
	 * Digest of the object after this transaction executed.
	 *
	 * @generated from protobuf field: optional string output_digest = 8;
	 */
	outputDigest?: string;
	/**
	 * Owner of the object after this transaction executed.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.Owner output_owner = 9;
	 */
	outputOwner?: Owner;
	/**
	 * What happened to an `ObjectId` during execution.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.ChangedObject.IdOperation id_operation = 10;
	 */
	idOperation?: ChangedObject_IdOperation;
	/**
	 * Type information is not provided by the effects structure but is instead
	 * provided by an indexing layer
	 *
	 * @generated from protobuf field: optional string object_type = 11;
	 */
	objectType?: string;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta.ChangedObject.InputObjectState
 */
export enum ChangedObject_InputObjectState {
	/**
	 * @generated from protobuf enum value: INPUT_OBJECT_STATE_UNKNOWN = 0;
	 */
	UNKNOWN = 0,
	/**
	 * @generated from protobuf enum value: INPUT_OBJECT_STATE_DOES_NOT_EXIST = 1;
	 */
	DOES_NOT_EXIST = 1,
	/**
	 * @generated from protobuf enum value: INPUT_OBJECT_STATE_EXISTS = 2;
	 */
	EXISTS = 2,
}
/**
 * @generated from protobuf enum sui.rpc.v2beta.ChangedObject.OutputObjectState
 */
export enum ChangedObject_OutputObjectState {
	/**
	 * @generated from protobuf enum value: OUTPUT_OBJECT_STATE_UNKNOWN = 0;
	 */
	UNKNOWN = 0,
	/**
	 * @generated from protobuf enum value: OUTPUT_OBJECT_STATE_DOES_NOT_EXIST = 1;
	 */
	DOES_NOT_EXIST = 1,
	/**
	 * @generated from protobuf enum value: OUTPUT_OBJECT_STATE_OBJECT_WRITE = 2;
	 */
	OBJECT_WRITE = 2,
	/**
	 * @generated from protobuf enum value: OUTPUT_OBJECT_STATE_PACKAGE_WRITE = 3;
	 */
	PACKAGE_WRITE = 3,
}
/**
 * @generated from protobuf enum sui.rpc.v2beta.ChangedObject.IdOperation
 */
export enum ChangedObject_IdOperation {
	/**
	 * @generated from protobuf enum value: ID_OPERATION_UNKNOWN = 0;
	 */
	ID_OPERATION_UNKNOWN = 0,
	/**
	 * @generated from protobuf enum value: NONE = 1;
	 */
	NONE = 1,
	/**
	 * @generated from protobuf enum value: CREATED = 2;
	 */
	CREATED = 2,
	/**
	 * @generated from protobuf enum value: DELETED = 3;
	 */
	DELETED = 3,
}
/**
 * A shared object that wasn't changed during execution.
 *
 * @generated from protobuf message sui.rpc.v2beta.UnchangedSharedObject
 */
export interface UnchangedSharedObject {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.UnchangedSharedObject.UnchangedSharedObjectKind kind = 1;
	 */
	kind?: UnchangedSharedObject_UnchangedSharedObjectKind;
	/**
	 * ObjectId of the shared object.
	 *
	 * @generated from protobuf field: optional string object_id = 2;
	 */
	objectId?: string;
	/**
	 * Version of the shared object.
	 *
	 * @generated from protobuf field: optional uint64 version = 3;
	 */
	version?: bigint;
	/**
	 * Digest of the shared object.
	 *
	 * @generated from protobuf field: optional string digest = 4;
	 */
	digest?: string;
	/**
	 * Type information is not provided by the effects structure but is instead
	 * provided by an indexing layer
	 *
	 * @generated from protobuf field: optional string object_type = 5;
	 */
	objectType?: string;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta.UnchangedSharedObject.UnchangedSharedObjectKind
 */
export enum UnchangedSharedObject_UnchangedSharedObjectKind {
	/**
	 * @generated from protobuf enum value: UNCHANGED_SHARED_OBJECT_KIND_UNKNOWN = 0;
	 */
	UNCHANGED_SHARED_OBJECT_KIND_UNKNOWN = 0,
	/**
	 * Read-only shared object from the input.
	 *
	 * @generated from protobuf enum value: READ_ONLY_ROOT = 1;
	 */
	READ_ONLY_ROOT = 1,
	/**
	 * Deleted shared objects that appear mutably/owned in the input.
	 *
	 * @generated from protobuf enum value: MUTATE_DELETED = 2;
	 */
	MUTATE_DELETED = 2,
	/**
	 * Deleted shared objects that appear as read-only in the input.
	 *
	 * @generated from protobuf enum value: READ_DELETED = 3;
	 */
	READ_DELETED = 3,
	/**
	 * Shared objects that was congested and resulted in this transaction being
	 * canceled.
	 *
	 * @generated from protobuf enum value: CANCELED = 4;
	 */
	CANCELED = 4,
	/**
	 * Read of a per-epoch config object that should remain the same during an epoch.
	 *
	 * @generated from protobuf enum value: PER_EPOCH_CONFIG = 5;
	 */
	PER_EPOCH_CONFIG = 5,
}
// @generated message type with reflection information, may provide speed optimized methods
class TransactionEffects$Type extends MessageType<TransactionEffects> {
	constructor() {
		super('sui.rpc.v2beta.TransactionEffects', [
			{ no: 1, name: 'bcs', kind: 'message', T: () => Bcs },
			{ no: 2, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'version', kind: 'scalar', opt: true, T: 5 /*ScalarType.INT32*/ },
			{ no: 4, name: 'status', kind: 'message', T: () => ExecutionStatus },
			{
				no: 5,
				name: 'epoch',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 6, name: 'gas_used', kind: 'message', T: () => GasCostSummary },
			{ no: 7, name: 'transaction_digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 8, name: 'gas_object', kind: 'message', T: () => ChangedObject },
			{ no: 9, name: 'events_digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 10,
				name: 'dependencies',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 9 /*ScalarType.STRING*/,
			},
			{
				no: 11,
				name: 'lamport_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 12,
				name: 'changed_objects',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => ChangedObject,
			},
			{
				no: 13,
				name: 'unchanged_shared_objects',
				kind: 'message',
				repeat: 1 /*RepeatType.PACKED*/,
				T: () => UnchangedSharedObject,
			},
			{
				no: 14,
				name: 'auxiliary_data_digest',
				kind: 'scalar',
				opt: true,
				T: 9 /*ScalarType.STRING*/,
			},
		]);
	}
	create(value?: PartialMessage<TransactionEffects>): TransactionEffects {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.dependencies = [];
		message.changedObjects = [];
		message.unchangedSharedObjects = [];
		if (value !== undefined) reflectionMergePartial<TransactionEffects>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: TransactionEffects,
	): TransactionEffects {
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
				case /* optional sui.rpc.v2beta.ExecutionStatus status */ 4:
					message.status = ExecutionStatus.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.status,
					);
					break;
				case /* optional uint64 epoch */ 5:
					message.epoch = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta.GasCostSummary gas_used */ 6:
					message.gasUsed = GasCostSummary.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.gasUsed,
					);
					break;
				case /* optional string transaction_digest */ 7:
					message.transactionDigest = reader.string();
					break;
				case /* optional sui.rpc.v2beta.ChangedObject gas_object */ 8:
					message.gasObject = ChangedObject.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.gasObject,
					);
					break;
				case /* optional string events_digest */ 9:
					message.eventsDigest = reader.string();
					break;
				case /* repeated string dependencies */ 10:
					message.dependencies.push(reader.string());
					break;
				case /* optional uint64 lamport_version */ 11:
					message.lamportVersion = reader.uint64().toBigInt();
					break;
				case /* repeated sui.rpc.v2beta.ChangedObject changed_objects */ 12:
					message.changedObjects.push(
						ChangedObject.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* repeated sui.rpc.v2beta.UnchangedSharedObject unchanged_shared_objects */ 13:
					message.unchangedSharedObjects.push(
						UnchangedSharedObject.internalBinaryRead(reader, reader.uint32(), options),
					);
					break;
				case /* optional string auxiliary_data_digest */ 14:
					message.auxiliaryDataDigest = reader.string();
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
		message: TransactionEffects,
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
		/* optional sui.rpc.v2beta.ExecutionStatus status = 4; */
		if (message.status)
			ExecutionStatus.internalBinaryWrite(
				message.status,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint64 epoch = 5; */
		if (message.epoch !== undefined) writer.tag(5, WireType.Varint).uint64(message.epoch);
		/* optional sui.rpc.v2beta.GasCostSummary gas_used = 6; */
		if (message.gasUsed)
			GasCostSummary.internalBinaryWrite(
				message.gasUsed,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string transaction_digest = 7; */
		if (message.transactionDigest !== undefined)
			writer.tag(7, WireType.LengthDelimited).string(message.transactionDigest);
		/* optional sui.rpc.v2beta.ChangedObject gas_object = 8; */
		if (message.gasObject)
			ChangedObject.internalBinaryWrite(
				message.gasObject,
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string events_digest = 9; */
		if (message.eventsDigest !== undefined)
			writer.tag(9, WireType.LengthDelimited).string(message.eventsDigest);
		/* repeated string dependencies = 10; */
		for (let i = 0; i < message.dependencies.length; i++)
			writer.tag(10, WireType.LengthDelimited).string(message.dependencies[i]);
		/* optional uint64 lamport_version = 11; */
		if (message.lamportVersion !== undefined)
			writer.tag(11, WireType.Varint).uint64(message.lamportVersion);
		/* repeated sui.rpc.v2beta.ChangedObject changed_objects = 12; */
		for (let i = 0; i < message.changedObjects.length; i++)
			ChangedObject.internalBinaryWrite(
				message.changedObjects[i],
				writer.tag(12, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* repeated sui.rpc.v2beta.UnchangedSharedObject unchanged_shared_objects = 13; */
		for (let i = 0; i < message.unchangedSharedObjects.length; i++)
			UnchangedSharedObject.internalBinaryWrite(
				message.unchangedSharedObjects[i],
				writer.tag(13, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional string auxiliary_data_digest = 14; */
		if (message.auxiliaryDataDigest !== undefined)
			writer.tag(14, WireType.LengthDelimited).string(message.auxiliaryDataDigest);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.TransactionEffects
 */
export const TransactionEffects = new TransactionEffects$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ChangedObject$Type extends MessageType<ChangedObject> {
	constructor() {
		super('sui.rpc.v2beta.ChangedObject', [
			{ no: 1, name: 'object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 2,
				name: 'input_state',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta.ChangedObject.InputObjectState',
					ChangedObject_InputObjectState,
					'INPUT_OBJECT_STATE_',
				],
			},
			{
				no: 3,
				name: 'input_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 4, name: 'input_digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'input_owner', kind: 'message', T: () => Owner },
			{
				no: 6,
				name: 'output_state',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta.ChangedObject.OutputObjectState',
					ChangedObject_OutputObjectState,
					'OUTPUT_OBJECT_STATE_',
				],
			},
			{
				no: 7,
				name: 'output_version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 8, name: 'output_digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 9, name: 'output_owner', kind: 'message', T: () => Owner },
			{
				no: 10,
				name: 'id_operation',
				kind: 'enum',
				opt: true,
				T: () => ['sui.rpc.v2beta.ChangedObject.IdOperation', ChangedObject_IdOperation],
			},
			{ no: 11, name: 'object_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<ChangedObject>): ChangedObject {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ChangedObject>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ChangedObject,
	): ChangedObject {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string object_id */ 1:
					message.objectId = reader.string();
					break;
				case /* optional sui.rpc.v2beta.ChangedObject.InputObjectState input_state */ 2:
					message.inputState = reader.int32();
					break;
				case /* optional uint64 input_version */ 3:
					message.inputVersion = reader.uint64().toBigInt();
					break;
				case /* optional string input_digest */ 4:
					message.inputDigest = reader.string();
					break;
				case /* optional sui.rpc.v2beta.Owner input_owner */ 5:
					message.inputOwner = Owner.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.inputOwner,
					);
					break;
				case /* optional sui.rpc.v2beta.ChangedObject.OutputObjectState output_state */ 6:
					message.outputState = reader.int32();
					break;
				case /* optional uint64 output_version */ 7:
					message.outputVersion = reader.uint64().toBigInt();
					break;
				case /* optional string output_digest */ 8:
					message.outputDigest = reader.string();
					break;
				case /* optional sui.rpc.v2beta.Owner output_owner */ 9:
					message.outputOwner = Owner.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.outputOwner,
					);
					break;
				case /* optional sui.rpc.v2beta.ChangedObject.IdOperation id_operation */ 10:
					message.idOperation = reader.int32();
					break;
				case /* optional string object_type */ 11:
					message.objectType = reader.string();
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
		message: ChangedObject,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string object_id = 1; */
		if (message.objectId !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.objectId);
		/* optional sui.rpc.v2beta.ChangedObject.InputObjectState input_state = 2; */
		if (message.inputState !== undefined) writer.tag(2, WireType.Varint).int32(message.inputState);
		/* optional uint64 input_version = 3; */
		if (message.inputVersion !== undefined)
			writer.tag(3, WireType.Varint).uint64(message.inputVersion);
		/* optional string input_digest = 4; */
		if (message.inputDigest !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.inputDigest);
		/* optional sui.rpc.v2beta.Owner input_owner = 5; */
		if (message.inputOwner)
			Owner.internalBinaryWrite(
				message.inputOwner,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta.ChangedObject.OutputObjectState output_state = 6; */
		if (message.outputState !== undefined)
			writer.tag(6, WireType.Varint).int32(message.outputState);
		/* optional uint64 output_version = 7; */
		if (message.outputVersion !== undefined)
			writer.tag(7, WireType.Varint).uint64(message.outputVersion);
		/* optional string output_digest = 8; */
		if (message.outputDigest !== undefined)
			writer.tag(8, WireType.LengthDelimited).string(message.outputDigest);
		/* optional sui.rpc.v2beta.Owner output_owner = 9; */
		if (message.outputOwner)
			Owner.internalBinaryWrite(
				message.outputOwner,
				writer.tag(9, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta.ChangedObject.IdOperation id_operation = 10; */
		if (message.idOperation !== undefined)
			writer.tag(10, WireType.Varint).int32(message.idOperation);
		/* optional string object_type = 11; */
		if (message.objectType !== undefined)
			writer.tag(11, WireType.LengthDelimited).string(message.objectType);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.ChangedObject
 */
export const ChangedObject = new ChangedObject$Type();
// @generated message type with reflection information, may provide speed optimized methods
class UnchangedSharedObject$Type extends MessageType<UnchangedSharedObject> {
	constructor() {
		super('sui.rpc.v2beta.UnchangedSharedObject', [
			{
				no: 1,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta.UnchangedSharedObject.UnchangedSharedObjectKind',
					UnchangedSharedObject_UnchangedSharedObjectKind,
				],
			},
			{ no: 2, name: 'object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 3,
				name: 'version',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 4, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 5, name: 'object_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<UnchangedSharedObject>): UnchangedSharedObject {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<UnchangedSharedObject>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: UnchangedSharedObject,
	): UnchangedSharedObject {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta.UnchangedSharedObject.UnchangedSharedObjectKind kind */ 1:
					message.kind = reader.int32();
					break;
				case /* optional string object_id */ 2:
					message.objectId = reader.string();
					break;
				case /* optional uint64 version */ 3:
					message.version = reader.uint64().toBigInt();
					break;
				case /* optional string digest */ 4:
					message.digest = reader.string();
					break;
				case /* optional string object_type */ 5:
					message.objectType = reader.string();
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
		message: UnchangedSharedObject,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta.UnchangedSharedObject.UnchangedSharedObjectKind kind = 1; */
		if (message.kind !== undefined) writer.tag(1, WireType.Varint).int32(message.kind);
		/* optional string object_id = 2; */
		if (message.objectId !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.objectId);
		/* optional uint64 version = 3; */
		if (message.version !== undefined) writer.tag(3, WireType.Varint).uint64(message.version);
		/* optional string digest = 4; */
		if (message.digest !== undefined)
			writer.tag(4, WireType.LengthDelimited).string(message.digest);
		/* optional string object_type = 5; */
		if (message.objectType !== undefined)
			writer.tag(5, WireType.LengthDelimited).string(message.objectType);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.UnchangedSharedObject
 */
export const UnchangedSharedObject = new UnchangedSharedObject$Type();
