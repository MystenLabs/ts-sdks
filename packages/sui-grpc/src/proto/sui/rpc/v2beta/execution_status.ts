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
 * The status of an executed transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta.ExecutionStatus
 */
export interface ExecutionStatus {
	/**
	 * Indicates if the transaction was successful or not.
	 *
	 * @generated from protobuf field: optional bool success = 1;
	 */
	success?: boolean;
	/**
	 * The error if `success` is false.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.ExecutionError error = 2;
	 */
	error?: ExecutionError;
}
/**
 * An error that can occur during the execution of a transaction.
 *
 * @generated from protobuf message sui.rpc.v2beta.ExecutionError
 */
export interface ExecutionError {
	/**
	 * The command, if any, during which the error occurred.
	 *
	 * @generated from protobuf field: optional uint64 command = 1;
	 */
	command?: bigint;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.ExecutionError.ExecutionErrorKind kind = 2;
	 */
	kind?: ExecutionError_ExecutionErrorKind;
	// TODO figure out how clever errors fit in before this graduates from beta

	/**
	 * Abort code from Move.
	 *
	 * @generated from protobuf field: optional uint64 abort_code = 3;
	 */
	abortCode?: bigint;
	/**
	 * Location in Move where the error occurred.
	 *
	 * @generated from protobuf field: optional sui.rpc.v2beta.MoveLocation location = 4;
	 */
	location?: MoveLocation;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.SizeError size_error = 5;
	 */
	sizeError?: SizeError;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.CommandArgumentError command_argument_error = 6;
	 */
	commandArgumentError?: CommandArgumentError;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.TypeArgumentError type_argument_error = 7;
	 */
	typeArgumentError?: TypeArgumentError;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.PackageUpgradeError package_upgrade_error = 8;
	 */
	packageUpgradeError?: PackageUpgradeError;
	/**
	 * Index of an input or result.
	 *
	 * @generated from protobuf field: optional uint32 index = 9;
	 */
	index?: number;
	/**
	 * Index of a subresult.
	 *
	 * @generated from protobuf field: optional uint32 subresult = 10;
	 */
	subresult?: number;
	/**
	 * @generated from protobuf field: optional string object_id = 11;
	 */
	objectId?: string;
	/**
	 * Denied address.
	 *
	 * @generated from protobuf field: optional string address = 12;
	 */
	address?: string;
	/**
	 * Coin type.
	 *
	 * @generated from protobuf field: optional string coin_type = 13;
	 */
	coinType?: string;
	/**
	 * Set of objects that were congested, leading to the transaction's cancellation.
	 *
	 * @generated from protobuf field: repeated string congested_objects = 14;
	 */
	congestedObjects: string[];
}
/**
 * @generated from protobuf enum sui.rpc.v2beta.ExecutionError.ExecutionErrorKind
 */
export enum ExecutionError_ExecutionErrorKind {
	/**
	 * @generated from protobuf enum value: EXECUTION_ERROR_KIND_UNKNOWN = 0;
	 */
	EXECUTION_ERROR_KIND_UNKNOWN = 0,
	/**
	 * Insufficient gas.
	 *
	 * @generated from protobuf enum value: INSUFFICIENT_GAS = 1;
	 */
	INSUFFICIENT_GAS = 1,
	/**
	 * Invalid `Gas` object.
	 *
	 * @generated from protobuf enum value: INVALID_GAS_OBJECT = 2;
	 */
	INVALID_GAS_OBJECT = 2,
	/**
	 * Invariant violation.
	 *
	 * @generated from protobuf enum value: INVARIANT_VIOLATION = 3;
	 */
	INVARIANT_VIOLATION = 3,
	/**
	 * Attempted to use feature that is not supported yet.
	 *
	 * @generated from protobuf enum value: FEATURE_NOT_YET_SUPPORTED = 4;
	 */
	FEATURE_NOT_YET_SUPPORTED = 4,
	/**
	 * Move object is larger than the maximum allowed size.
	 *
	 * @generated from protobuf enum value: OBJECT_TOO_BIG = 5;
	 */
	OBJECT_TOO_BIG = 5,
	/**
	 * Package is larger than the maximum allowed size.
	 *
	 * @generated from protobuf enum value: PACKAGE_TOO_BIG = 6;
	 */
	PACKAGE_TOO_BIG = 6,
	/**
	 * Circular object ownership.
	 *
	 * @generated from protobuf enum value: CIRCULAR_OBJECT_OWNERSHIP = 7;
	 */
	CIRCULAR_OBJECT_OWNERSHIP = 7,
	/**
	 * Insufficient coin balance for requested operation.
	 *
	 * @generated from protobuf enum value: INSUFFICIENT_COIN_BALANCE = 8;
	 */
	INSUFFICIENT_COIN_BALANCE = 8,
	/**
	 * Coin balance overflowed an u64.
	 *
	 * @generated from protobuf enum value: COIN_BALANCE_OVERFLOW = 9;
	 */
	COIN_BALANCE_OVERFLOW = 9,
	/**
	 * Publish error, non-zero address.
	 * The modules in the package must have their self-addresses set to zero.
	 *
	 * @generated from protobuf enum value: PUBLISH_ERROR_NON_ZERO_ADDRESS = 10;
	 */
	PUBLISH_ERROR_NON_ZERO_ADDRESS = 10,
	/**
	 * Sui Move bytecode verification error.
	 *
	 * @generated from protobuf enum value: SUI_MOVE_VERIFICATION_ERROR = 11;
	 */
	SUI_MOVE_VERIFICATION_ERROR = 11,
	/**
	 * Error from a non-abort instruction.
	 * Possible causes:
	 *     Arithmetic error, stack overflow, max value depth, or similar.
	 *
	 * @generated from protobuf enum value: MOVE_PRIMITIVE_RUNTIME_ERROR = 12;
	 */
	MOVE_PRIMITIVE_RUNTIME_ERROR = 12,
	/**
	 * Move runtime abort.
	 *
	 * @generated from protobuf enum value: MOVE_ABORT = 13;
	 */
	MOVE_ABORT = 13,
	/**
	 * Bytecode verification error.
	 *
	 * @generated from protobuf enum value: VM_VERIFICATION_OR_DESERIALIZATION_ERROR = 14;
	 */
	VM_VERIFICATION_OR_DESERIALIZATION_ERROR = 14,
	/**
	 * MoveVm invariant violation.
	 *
	 * @generated from protobuf enum value: VM_INVARIANT_VIOLATION = 15;
	 */
	VM_INVARIANT_VIOLATION = 15,
	/**
	 * Function not found.
	 *
	 * @generated from protobuf enum value: FUNCTION_NOT_FOUND = 16;
	 */
	FUNCTION_NOT_FOUND = 16,
	/**
	 * Parity mismatch for Move function.
	 * The number of arguments does not match the number of parameters.
	 *
	 * @generated from protobuf enum value: ARITY_MISMATCH = 17;
	 */
	ARITY_MISMATCH = 17,
	/**
	 * Type parity mismatch for Move function.
	 * Mismatch between the number of actual versus expected type arguments.
	 *
	 * @generated from protobuf enum value: TYPE_ARITY_MISMATCH = 18;
	 */
	TYPE_ARITY_MISMATCH = 18,
	/**
	 * Non-entry function invoked. Move Call must start with an entry function.
	 *
	 * @generated from protobuf enum value: NON_ENTRY_FUNCTION_INVOKED = 19;
	 */
	NON_ENTRY_FUNCTION_INVOKED = 19,
	/**
	 * Invalid command argument.
	 *
	 * @generated from protobuf enum value: COMMAND_ARGUMENT_ERROR = 20;
	 */
	COMMAND_ARGUMENT_ERROR = 20,
	/**
	 * Type argument error.
	 *
	 * @generated from protobuf enum value: TYPE_ARGUMENT_ERROR = 21;
	 */
	TYPE_ARGUMENT_ERROR = 21,
	/**
	 * Unused result without the drop ability.
	 *
	 * @generated from protobuf enum value: UNUSED_VALUE_WITHOUT_DROP = 22;
	 */
	UNUSED_VALUE_WITHOUT_DROP = 22,
	/**
	 * Invalid public Move function signature.
	 * Unsupported return type for return value.
	 *
	 * @generated from protobuf enum value: INVALID_PUBLIC_FUNCTION_RETURN_TYPE = 23;
	 */
	INVALID_PUBLIC_FUNCTION_RETURN_TYPE = 23,
	/**
	 * Invalid transfer object, object does not have public transfer.
	 *
	 * @generated from protobuf enum value: INVALID_TRANSFER_OBJECT = 24;
	 */
	INVALID_TRANSFER_OBJECT = 24,
	/**
	 * Effects from the transaction are too large.
	 *
	 * @generated from protobuf enum value: EFFECTS_TOO_LARGE = 25;
	 */
	EFFECTS_TOO_LARGE = 25,
	/**
	 * Publish or Upgrade is missing dependency.
	 *
	 * @generated from protobuf enum value: PUBLISH_UPGRADE_MISSING_DEPENDENCY = 26;
	 */
	PUBLISH_UPGRADE_MISSING_DEPENDENCY = 26,
	/**
	 * Publish or upgrade dependency downgrade.
	 *
	 * Indirect (transitive) dependency of published or upgraded package has been assigned an
	 * on-chain version that is less than the version required by one of the package's
	 * transitive dependencies.
	 *
	 * @generated from protobuf enum value: PUBLISH_UPGRADE_DEPENDENCY_DOWNGRADE = 27;
	 */
	PUBLISH_UPGRADE_DEPENDENCY_DOWNGRADE = 27,
	/**
	 * Invalid package upgrade.
	 *
	 * @generated from protobuf enum value: PACKAGE_UPGRADE_ERROR = 28;
	 */
	PACKAGE_UPGRADE_ERROR = 28,
	/**
	 * Indicates the transaction tried to write objects too large to storage.
	 *
	 * @generated from protobuf enum value: WRITTEN_OBJECTS_TOO_LARGE = 29;
	 */
	WRITTEN_OBJECTS_TOO_LARGE = 29,
	/**
	 * Certificate is on the deny list.
	 *
	 * @generated from protobuf enum value: CERTIFICATE_DENIED = 30;
	 */
	CERTIFICATE_DENIED = 30,
	/**
	 * Sui Move bytecode verification timed out.
	 *
	 * @generated from protobuf enum value: SUI_MOVE_VERIFICATION_TIMEDOUT = 31;
	 */
	SUI_MOVE_VERIFICATION_TIMEDOUT = 31,
	/**
	 * The requested shared object operation is not allowed.
	 *
	 * @generated from protobuf enum value: SHARED_OBJECT_OPERATION_NOT_ALLOWED = 32;
	 */
	SHARED_OBJECT_OPERATION_NOT_ALLOWED = 32,
	/**
	 * Requested shared object has been deleted.
	 *
	 * @generated from protobuf enum value: INPUT_OBJECT_DELETED = 33;
	 */
	INPUT_OBJECT_DELETED = 33,
	/**
	 * Certificate is canceled due to congestion on shared objects.
	 *
	 * @generated from protobuf enum value: EXECUTION_CANCELED_DUE_TO_SHARED_OBJECT_CONGESTION = 34;
	 */
	EXECUTION_CANCELED_DUE_TO_SHARED_OBJECT_CONGESTION = 34,
	/**
	 * Address is denied for this coin type.
	 *
	 * @generated from protobuf enum value: ADDRESS_DENIED_FOR_COIN = 35;
	 */
	ADDRESS_DENIED_FOR_COIN = 35,
	/**
	 * Coin type is globally paused for use.
	 *
	 * @generated from protobuf enum value: COIN_TYPE_GLOBAL_PAUSE = 36;
	 */
	COIN_TYPE_GLOBAL_PAUSE = 36,
	/**
	 * Certificate is canceled because randomness could not be generated this epoch.
	 *
	 * @generated from protobuf enum value: EXECUTION_CANCELED_DUE_TO_RANDOMNESS_UNAVAILABLE = 37;
	 */
	EXECUTION_CANCELED_DUE_TO_RANDOMNESS_UNAVAILABLE = 37,
}
/**
 * A size error.
 *
 * @generated from protobuf message sui.rpc.v2beta.SizeError
 */
export interface SizeError {
	/**
	 * The offending size.
	 *
	 * @generated from protobuf field: optional uint64 size = 1;
	 */
	size?: bigint;
	/**
	 * The maximum allowable size.
	 *
	 * @generated from protobuf field: optional uint64 max_size = 2;
	 */
	maxSize?: bigint;
}
/**
 * Location in Move bytecode where an error occurred.
 *
 * @generated from protobuf message sui.rpc.v2beta.MoveLocation
 */
export interface MoveLocation {
	/**
	 * The package ID.
	 *
	 * @generated from protobuf field: optional string package = 1;
	 */
	package?: string;
	/**
	 * The module name.
	 *
	 * @generated from protobuf field: optional string module = 2;
	 */
	module?: string;
	/**
	 * The function index.
	 *
	 * @generated from protobuf field: optional uint32 function = 3;
	 */
	function?: number;
	/**
	 * Offset of the instruction where the error occurred.
	 *
	 * @generated from protobuf field: optional uint32 instruction = 4;
	 */
	instruction?: number;
	/**
	 * The name of the function, if available.
	 *
	 * @generated from protobuf field: optional string function_name = 5;
	 */
	functionName?: string;
}
/**
 * An error with an argument to a command.
 *
 * @generated from protobuf message sui.rpc.v2beta.CommandArgumentError
 */
export interface CommandArgumentError {
	/**
	 * Position of the problematic argument.
	 *
	 * @generated from protobuf field: optional uint32 argument = 1;
	 */
	argument?: number;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.CommandArgumentError.CommandArgumentErrorKind kind = 2;
	 */
	kind?: CommandArgumentError_CommandArgumentErrorKind;
	/**
	 * Index of an input or result.
	 *
	 * @generated from protobuf field: optional uint32 index = 3;
	 */
	index?: number;
	/**
	 * Index of a subresult.
	 *
	 * @generated from protobuf field: optional uint32 subresult = 4;
	 */
	subresult?: number;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta.CommandArgumentError.CommandArgumentErrorKind
 */
export enum CommandArgumentError_CommandArgumentErrorKind {
	/**
	 * @generated from protobuf enum value: COMMAND_ARGUMENT_ERROR_KIND_UNKNOWN = 0;
	 */
	COMMAND_ARGUMENT_ERROR_KIND_UNKNOWN = 0,
	/**
	 * The type of the value does not match the expected type.
	 *
	 * @generated from protobuf enum value: TYPE_MISMATCH = 1;
	 */
	TYPE_MISMATCH = 1,
	/**
	 * The argument cannot be deserialized into a value of the specified type.
	 *
	 * @generated from protobuf enum value: INVALID_BCS_BYTES = 2;
	 */
	INVALID_BCS_BYTES = 2,
	/**
	 * The argument cannot be instantiated from raw bytes.
	 *
	 * @generated from protobuf enum value: INVALID_USAGE_OF_PURE_ARGUMENT = 3;
	 */
	INVALID_USAGE_OF_PURE_ARGUMENT = 3,
	/**
	 * Invalid argument to private entry function.
	 * Private entry functions cannot take arguments from other Move functions.
	 *
	 * @generated from protobuf enum value: INVALID_ARGUMENT_TO_PRIVATE_ENTRY_FUNCTION = 4;
	 */
	INVALID_ARGUMENT_TO_PRIVATE_ENTRY_FUNCTION = 4,
	/**
	 * Out of bounds access to input or results.
	 *
	 * `index` field will be set indicating the invalid index value.
	 *
	 * @generated from protobuf enum value: INDEX_OUT_OF_BOUNDS = 5;
	 */
	INDEX_OUT_OF_BOUNDS = 5,
	/**
	 * Out of bounds access to subresult.
	 *
	 * `index` and `subresult` fields will be set indicating the invalid index value.
	 *
	 * @generated from protobuf enum value: SECONDARY_INDEX_OUT_OF_BOUNDS = 6;
	 */
	SECONDARY_INDEX_OUT_OF_BOUNDS = 6,
	/**
	 * Invalid usage of result.
	 * Expected a single result but found either no return value or multiple.
	 * `index` field will be set indicating the invalid index value.
	 *
	 * @generated from protobuf enum value: INVALID_RESULT_ARITY = 7;
	 */
	INVALID_RESULT_ARITY = 7,
	/**
	 * Invalid usage of gas coin.
	 * The gas coin can only be used by-value with a `TransferObject` command.
	 *
	 * @generated from protobuf enum value: INVALID_GAS_COIN_USAGE = 8;
	 */
	INVALID_GAS_COIN_USAGE = 8,
	/**
	 * Invalid usage of Move value.
	 *    - Mutably borrowed values require unique usage.
	 *    - Immutably borrowed values cannot be taken or borrowed mutably.
	 *    - Taken values cannot be used again.
	 *
	 * @generated from protobuf enum value: INVALID_VALUE_USAGE = 9;
	 */
	INVALID_VALUE_USAGE = 9,
	/**
	 * Immutable objects cannot be passed by-value.
	 *
	 * @generated from protobuf enum value: INVALID_OBJECT_BY_VALUE = 10;
	 */
	INVALID_OBJECT_BY_VALUE = 10,
	/**
	 * Immutable objects cannot be passed by mutable reference, `&mut`.
	 *
	 * @generated from protobuf enum value: INVALID_OBJECT_BY_MUT_REF = 11;
	 */
	INVALID_OBJECT_BY_MUT_REF = 11,
	/**
	 * Shared object operations such as wrapping, freezing, or converting to owned are not
	 * allowed.
	 *
	 * @generated from protobuf enum value: SHARED_OBJECT_OPERATION_NOT_ALLOWED = 12;
	 */
	SHARED_OBJECT_OPERATION_NOT_ALLOWED = 12,
}
/**
 * An error with upgrading a package.
 *
 * @generated from protobuf message sui.rpc.v2beta.PackageUpgradeError
 */
export interface PackageUpgradeError {
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.PackageUpgradeError.PackageUpgradeErrorKind kind = 1;
	 */
	kind?: PackageUpgradeError_PackageUpgradeErrorKind;
	/**
	 * The Package Id.
	 *
	 * @generated from protobuf field: optional string package_id = 2;
	 */
	packageId?: string;
	/**
	 * A digest.
	 *
	 * @generated from protobuf field: optional string digest = 3;
	 */
	digest?: string;
	/**
	 * The policy.
	 *
	 * @generated from protobuf field: optional uint32 policy = 4;
	 */
	policy?: number;
	/**
	 * The ticket Id.
	 *
	 * @generated from protobuf field: optional string ticket_id = 5;
	 */
	ticketId?: string;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta.PackageUpgradeError.PackageUpgradeErrorKind
 */
export enum PackageUpgradeError_PackageUpgradeErrorKind {
	/**
	 * @generated from protobuf enum value: PACKAGE_UPGRADE_ERROR_KIND_UNKNOWN = 0;
	 */
	PACKAGE_UPGRADE_ERROR_KIND_UNKNOWN = 0,
	/**
	 * Unable to fetch package.
	 *
	 * @generated from protobuf enum value: UNABLE_TO_FETCH_PACKAGE = 1;
	 */
	UNABLE_TO_FETCH_PACKAGE = 1,
	/**
	 * Object is not a package.
	 *
	 * @generated from protobuf enum value: NOT_A_PACKAGE = 2;
	 */
	NOT_A_PACKAGE = 2,
	/**
	 * Package upgrade is incompatible with previous version.
	 *
	 * @generated from protobuf enum value: INCOMPATIBLE_UPGRADE = 3;
	 */
	INCOMPATIBLE_UPGRADE = 3,
	/**
	 * Digest in upgrade ticket and computed digest differ.
	 *
	 * @generated from protobuf enum value: DIGETS_DOES_NOT_MATCH = 4;
	 */
	DIGETS_DOES_NOT_MATCH = 4,
	/**
	 * Upgrade policy is not valid.
	 *
	 * @generated from protobuf enum value: UNKNOWN_UPGRADE_POLICY = 5;
	 */
	UNKNOWN_UPGRADE_POLICY = 5,
	/**
	 * Package ID does not match `PackageId` in upgrade ticket.
	 *
	 * @generated from protobuf enum value: PACKAGE_ID_DOES_NOT_MATCH = 6;
	 */
	PACKAGE_ID_DOES_NOT_MATCH = 6,
}
/**
 * Type argument error.
 *
 * @generated from protobuf message sui.rpc.v2beta.TypeArgumentError
 */
export interface TypeArgumentError {
	/**
	 * Index of the problematic type argument.
	 *
	 * @generated from protobuf field: optional uint32 type_argument = 1;
	 */
	typeArgument?: number;
	/**
	 * @generated from protobuf field: optional sui.rpc.v2beta.TypeArgumentError.TypeArgumentErrorKind kind = 2;
	 */
	kind?: TypeArgumentError_TypeArgumentErrorKind;
}
/**
 * @generated from protobuf enum sui.rpc.v2beta.TypeArgumentError.TypeArgumentErrorKind
 */
export enum TypeArgumentError_TypeArgumentErrorKind {
	/**
	 * @generated from protobuf enum value: TYPE_ARGUMENT_ERROR_KIND_UNKNOWN = 0;
	 */
	TYPE_ARGUMENT_ERROR_KIND_UNKNOWN = 0,
	/**
	 * A type was not found in the module specified.
	 *
	 * @generated from protobuf enum value: TYPE_NOT_FOUND = 1;
	 */
	TYPE_NOT_FOUND = 1,
	/**
	 * A type provided did not match the specified constraint.
	 *
	 * @generated from protobuf enum value: CONSTRAINT_NOT_SATISFIED = 2;
	 */
	CONSTRAINT_NOT_SATISFIED = 2,
}
// @generated message type with reflection information, may provide speed optimized methods
class ExecutionStatus$Type extends MessageType<ExecutionStatus> {
	constructor() {
		super('sui.rpc.v2beta.ExecutionStatus', [
			{ no: 1, name: 'success', kind: 'scalar', opt: true, T: 8 /*ScalarType.BOOL*/ },
			{ no: 2, name: 'error', kind: 'message', T: () => ExecutionError },
		]);
	}
	create(value?: PartialMessage<ExecutionStatus>): ExecutionStatus {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<ExecutionStatus>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ExecutionStatus,
	): ExecutionStatus {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional bool success */ 1:
					message.success = reader.bool();
					break;
				case /* optional sui.rpc.v2beta.ExecutionError error */ 2:
					message.error = ExecutionError.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.error,
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
		message: ExecutionStatus,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional bool success = 1; */
		if (message.success !== undefined) writer.tag(1, WireType.Varint).bool(message.success);
		/* optional sui.rpc.v2beta.ExecutionError error = 2; */
		if (message.error)
			ExecutionError.internalBinaryWrite(
				message.error,
				writer.tag(2, WireType.LengthDelimited).fork(),
				options,
			).join();
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.ExecutionStatus
 */
export const ExecutionStatus = new ExecutionStatus$Type();
// @generated message type with reflection information, may provide speed optimized methods
class ExecutionError$Type extends MessageType<ExecutionError> {
	constructor() {
		super('sui.rpc.v2beta.ExecutionError', [
			{
				no: 1,
				name: 'command',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta.ExecutionError.ExecutionErrorKind',
					ExecutionError_ExecutionErrorKind,
				],
			},
			{
				no: 3,
				name: 'abort_code',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{ no: 4, name: 'location', kind: 'message', T: () => MoveLocation },
			{ no: 5, name: 'size_error', kind: 'message', T: () => SizeError },
			{ no: 6, name: 'command_argument_error', kind: 'message', T: () => CommandArgumentError },
			{ no: 7, name: 'type_argument_error', kind: 'message', T: () => TypeArgumentError },
			{ no: 8, name: 'package_upgrade_error', kind: 'message', T: () => PackageUpgradeError },
			{ no: 9, name: 'index', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 10, name: 'subresult', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 11, name: 'object_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 12, name: 'address', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 13, name: 'coin_type', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{
				no: 14,
				name: 'congested_objects',
				kind: 'scalar',
				repeat: 2 /*RepeatType.UNPACKED*/,
				T: 9 /*ScalarType.STRING*/,
			},
		]);
	}
	create(value?: PartialMessage<ExecutionError>): ExecutionError {
		const message = globalThis.Object.create(this.messagePrototype!);
		message.congestedObjects = [];
		if (value !== undefined) reflectionMergePartial<ExecutionError>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: ExecutionError,
	): ExecutionError {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 command */ 1:
					message.command = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta.ExecutionError.ExecutionErrorKind kind */ 2:
					message.kind = reader.int32();
					break;
				case /* optional uint64 abort_code */ 3:
					message.abortCode = reader.uint64().toBigInt();
					break;
				case /* optional sui.rpc.v2beta.MoveLocation location */ 4:
					message.location = MoveLocation.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.location,
					);
					break;
				case /* optional sui.rpc.v2beta.SizeError size_error */ 5:
					message.sizeError = SizeError.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.sizeError,
					);
					break;
				case /* optional sui.rpc.v2beta.CommandArgumentError command_argument_error */ 6:
					message.commandArgumentError = CommandArgumentError.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.commandArgumentError,
					);
					break;
				case /* optional sui.rpc.v2beta.TypeArgumentError type_argument_error */ 7:
					message.typeArgumentError = TypeArgumentError.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.typeArgumentError,
					);
					break;
				case /* optional sui.rpc.v2beta.PackageUpgradeError package_upgrade_error */ 8:
					message.packageUpgradeError = PackageUpgradeError.internalBinaryRead(
						reader,
						reader.uint32(),
						options,
						message.packageUpgradeError,
					);
					break;
				case /* optional uint32 index */ 9:
					message.index = reader.uint32();
					break;
				case /* optional uint32 subresult */ 10:
					message.subresult = reader.uint32();
					break;
				case /* optional string object_id */ 11:
					message.objectId = reader.string();
					break;
				case /* optional string address */ 12:
					message.address = reader.string();
					break;
				case /* optional string coin_type */ 13:
					message.coinType = reader.string();
					break;
				case /* repeated string congested_objects */ 14:
					message.congestedObjects.push(reader.string());
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
		message: ExecutionError,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 command = 1; */
		if (message.command !== undefined) writer.tag(1, WireType.Varint).uint64(message.command);
		/* optional sui.rpc.v2beta.ExecutionError.ExecutionErrorKind kind = 2; */
		if (message.kind !== undefined) writer.tag(2, WireType.Varint).int32(message.kind);
		/* optional uint64 abort_code = 3; */
		if (message.abortCode !== undefined) writer.tag(3, WireType.Varint).uint64(message.abortCode);
		/* optional sui.rpc.v2beta.MoveLocation location = 4; */
		if (message.location)
			MoveLocation.internalBinaryWrite(
				message.location,
				writer.tag(4, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta.SizeError size_error = 5; */
		if (message.sizeError)
			SizeError.internalBinaryWrite(
				message.sizeError,
				writer.tag(5, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta.CommandArgumentError command_argument_error = 6; */
		if (message.commandArgumentError)
			CommandArgumentError.internalBinaryWrite(
				message.commandArgumentError,
				writer.tag(6, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta.TypeArgumentError type_argument_error = 7; */
		if (message.typeArgumentError)
			TypeArgumentError.internalBinaryWrite(
				message.typeArgumentError,
				writer.tag(7, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional sui.rpc.v2beta.PackageUpgradeError package_upgrade_error = 8; */
		if (message.packageUpgradeError)
			PackageUpgradeError.internalBinaryWrite(
				message.packageUpgradeError,
				writer.tag(8, WireType.LengthDelimited).fork(),
				options,
			).join();
		/* optional uint32 index = 9; */
		if (message.index !== undefined) writer.tag(9, WireType.Varint).uint32(message.index);
		/* optional uint32 subresult = 10; */
		if (message.subresult !== undefined) writer.tag(10, WireType.Varint).uint32(message.subresult);
		/* optional string object_id = 11; */
		if (message.objectId !== undefined)
			writer.tag(11, WireType.LengthDelimited).string(message.objectId);
		/* optional string address = 12; */
		if (message.address !== undefined)
			writer.tag(12, WireType.LengthDelimited).string(message.address);
		/* optional string coin_type = 13; */
		if (message.coinType !== undefined)
			writer.tag(13, WireType.LengthDelimited).string(message.coinType);
		/* repeated string congested_objects = 14; */
		for (let i = 0; i < message.congestedObjects.length; i++)
			writer.tag(14, WireType.LengthDelimited).string(message.congestedObjects[i]);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.ExecutionError
 */
export const ExecutionError = new ExecutionError$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SizeError$Type extends MessageType<SizeError> {
	constructor() {
		super('sui.rpc.v2beta.SizeError', [
			{
				no: 1,
				name: 'size',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
			{
				no: 2,
				name: 'max_size',
				kind: 'scalar',
				opt: true,
				T: 4 /*ScalarType.UINT64*/,
				L: 0 /*LongType.BIGINT*/,
			},
		]);
	}
	create(value?: PartialMessage<SizeError>): SizeError {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<SizeError>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: SizeError,
	): SizeError {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint64 size */ 1:
					message.size = reader.uint64().toBigInt();
					break;
				case /* optional uint64 max_size */ 2:
					message.maxSize = reader.uint64().toBigInt();
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
		message: SizeError,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint64 size = 1; */
		if (message.size !== undefined) writer.tag(1, WireType.Varint).uint64(message.size);
		/* optional uint64 max_size = 2; */
		if (message.maxSize !== undefined) writer.tag(2, WireType.Varint).uint64(message.maxSize);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.SizeError
 */
export const SizeError = new SizeError$Type();
// @generated message type with reflection information, may provide speed optimized methods
class MoveLocation$Type extends MessageType<MoveLocation> {
	constructor() {
		super('sui.rpc.v2beta.MoveLocation', [
			{ no: 1, name: 'package', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 2, name: 'module', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'function', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 4, name: 'instruction', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 5, name: 'function_name', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<MoveLocation>): MoveLocation {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<MoveLocation>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: MoveLocation,
	): MoveLocation {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional string package */ 1:
					message.package = reader.string();
					break;
				case /* optional string module */ 2:
					message.module = reader.string();
					break;
				case /* optional uint32 function */ 3:
					message.function = reader.uint32();
					break;
				case /* optional uint32 instruction */ 4:
					message.instruction = reader.uint32();
					break;
				case /* optional string function_name */ 5:
					message.functionName = reader.string();
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
		message: MoveLocation,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional string package = 1; */
		if (message.package !== undefined)
			writer.tag(1, WireType.LengthDelimited).string(message.package);
		/* optional string module = 2; */
		if (message.module !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.module);
		/* optional uint32 function = 3; */
		if (message.function !== undefined) writer.tag(3, WireType.Varint).uint32(message.function);
		/* optional uint32 instruction = 4; */
		if (message.instruction !== undefined)
			writer.tag(4, WireType.Varint).uint32(message.instruction);
		/* optional string function_name = 5; */
		if (message.functionName !== undefined)
			writer.tag(5, WireType.LengthDelimited).string(message.functionName);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.MoveLocation
 */
export const MoveLocation = new MoveLocation$Type();
// @generated message type with reflection information, may provide speed optimized methods
class CommandArgumentError$Type extends MessageType<CommandArgumentError> {
	constructor() {
		super('sui.rpc.v2beta.CommandArgumentError', [
			{ no: 1, name: 'argument', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{
				no: 2,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta.CommandArgumentError.CommandArgumentErrorKind',
					CommandArgumentError_CommandArgumentErrorKind,
				],
			},
			{ no: 3, name: 'index', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 4, name: 'subresult', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
		]);
	}
	create(value?: PartialMessage<CommandArgumentError>): CommandArgumentError {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<CommandArgumentError>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: CommandArgumentError,
	): CommandArgumentError {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint32 argument */ 1:
					message.argument = reader.uint32();
					break;
				case /* optional sui.rpc.v2beta.CommandArgumentError.CommandArgumentErrorKind kind */ 2:
					message.kind = reader.int32();
					break;
				case /* optional uint32 index */ 3:
					message.index = reader.uint32();
					break;
				case /* optional uint32 subresult */ 4:
					message.subresult = reader.uint32();
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
		message: CommandArgumentError,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint32 argument = 1; */
		if (message.argument !== undefined) writer.tag(1, WireType.Varint).uint32(message.argument);
		/* optional sui.rpc.v2beta.CommandArgumentError.CommandArgumentErrorKind kind = 2; */
		if (message.kind !== undefined) writer.tag(2, WireType.Varint).int32(message.kind);
		/* optional uint32 index = 3; */
		if (message.index !== undefined) writer.tag(3, WireType.Varint).uint32(message.index);
		/* optional uint32 subresult = 4; */
		if (message.subresult !== undefined) writer.tag(4, WireType.Varint).uint32(message.subresult);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.CommandArgumentError
 */
export const CommandArgumentError = new CommandArgumentError$Type();
// @generated message type with reflection information, may provide speed optimized methods
class PackageUpgradeError$Type extends MessageType<PackageUpgradeError> {
	constructor() {
		super('sui.rpc.v2beta.PackageUpgradeError', [
			{
				no: 1,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta.PackageUpgradeError.PackageUpgradeErrorKind',
					PackageUpgradeError_PackageUpgradeErrorKind,
				],
			},
			{ no: 2, name: 'package_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 3, name: 'digest', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
			{ no: 4, name: 'policy', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{ no: 5, name: 'ticket_id', kind: 'scalar', opt: true, T: 9 /*ScalarType.STRING*/ },
		]);
	}
	create(value?: PartialMessage<PackageUpgradeError>): PackageUpgradeError {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<PackageUpgradeError>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: PackageUpgradeError,
	): PackageUpgradeError {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional sui.rpc.v2beta.PackageUpgradeError.PackageUpgradeErrorKind kind */ 1:
					message.kind = reader.int32();
					break;
				case /* optional string package_id */ 2:
					message.packageId = reader.string();
					break;
				case /* optional string digest */ 3:
					message.digest = reader.string();
					break;
				case /* optional uint32 policy */ 4:
					message.policy = reader.uint32();
					break;
				case /* optional string ticket_id */ 5:
					message.ticketId = reader.string();
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
		message: PackageUpgradeError,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional sui.rpc.v2beta.PackageUpgradeError.PackageUpgradeErrorKind kind = 1; */
		if (message.kind !== undefined) writer.tag(1, WireType.Varint).int32(message.kind);
		/* optional string package_id = 2; */
		if (message.packageId !== undefined)
			writer.tag(2, WireType.LengthDelimited).string(message.packageId);
		/* optional string digest = 3; */
		if (message.digest !== undefined)
			writer.tag(3, WireType.LengthDelimited).string(message.digest);
		/* optional uint32 policy = 4; */
		if (message.policy !== undefined) writer.tag(4, WireType.Varint).uint32(message.policy);
		/* optional string ticket_id = 5; */
		if (message.ticketId !== undefined)
			writer.tag(5, WireType.LengthDelimited).string(message.ticketId);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.PackageUpgradeError
 */
export const PackageUpgradeError = new PackageUpgradeError$Type();
// @generated message type with reflection information, may provide speed optimized methods
class TypeArgumentError$Type extends MessageType<TypeArgumentError> {
	constructor() {
		super('sui.rpc.v2beta.TypeArgumentError', [
			{ no: 1, name: 'type_argument', kind: 'scalar', opt: true, T: 13 /*ScalarType.UINT32*/ },
			{
				no: 2,
				name: 'kind',
				kind: 'enum',
				opt: true,
				T: () => [
					'sui.rpc.v2beta.TypeArgumentError.TypeArgumentErrorKind',
					TypeArgumentError_TypeArgumentErrorKind,
				],
			},
		]);
	}
	create(value?: PartialMessage<TypeArgumentError>): TypeArgumentError {
		const message = globalThis.Object.create(this.messagePrototype!);
		if (value !== undefined) reflectionMergePartial<TypeArgumentError>(this, message, value);
		return message;
	}
	internalBinaryRead(
		reader: IBinaryReader,
		length: number,
		options: BinaryReadOptions,
		target?: TypeArgumentError,
	): TypeArgumentError {
		let message = target ?? this.create(),
			end = reader.pos + length;
		while (reader.pos < end) {
			let [fieldNo, wireType] = reader.tag();
			switch (fieldNo) {
				case /* optional uint32 type_argument */ 1:
					message.typeArgument = reader.uint32();
					break;
				case /* optional sui.rpc.v2beta.TypeArgumentError.TypeArgumentErrorKind kind */ 2:
					message.kind = reader.int32();
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
		message: TypeArgumentError,
		writer: IBinaryWriter,
		options: BinaryWriteOptions,
	): IBinaryWriter {
		/* optional uint32 type_argument = 1; */
		if (message.typeArgument !== undefined)
			writer.tag(1, WireType.Varint).uint32(message.typeArgument);
		/* optional sui.rpc.v2beta.TypeArgumentError.TypeArgumentErrorKind kind = 2; */
		if (message.kind !== undefined) writer.tag(2, WireType.Varint).int32(message.kind);
		let u = options.writeUnknownFields;
		if (u !== false) (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
		return writer;
	}
}
/**
 * @generated MessageType for protobuf message sui.rpc.v2beta.TypeArgumentError
 */
export const TypeArgumentError = new TypeArgumentError$Type();
