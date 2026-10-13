// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Helpers for wallets that implement the deprecated `sui:signAndExecuteTransactionBlock`
 * wallet-standard feature, or otherwise have to answer with legacy JSON-RPC response shapes, while
 * reading the chain through the gRPC or GraphQL Core API.
 *
 * @module
 */

export {
	dryRunFromSimulation,
	MAPPABLE_TRANSACTION_INCLUDE,
	type MappableTransaction,
	tryDryRunFromSimulation,
} from './dry-run-from-simulation.js';
export { readMoveModuleName } from './move-bytecode.js';
export {
	type MappableIncludeFor,
	mappableIncludeFor,
	type TransactionBlockExecutionContext,
	transactionBlockResponseFromExecution,
} from './transaction-block-response.js';
export type {
	DryRunTransactionBlockResponse,
	ExecuteTransactionRequestType,
	SuiTransactionBlockResponse,
	SuiTransactionBlockResponseOptions,
} from './legacy-types.js';
