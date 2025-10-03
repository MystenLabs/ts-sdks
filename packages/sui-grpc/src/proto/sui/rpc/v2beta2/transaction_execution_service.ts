// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ServiceType } from '@protobuf-ts/runtime-rpc';
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
