// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Helpers for wallets that still serve the deprecated wallet-standard features: they build the
 * legacy JSON-RPC response shapes from Core API (gRPC or GraphQL) results. The legacy types are
 * in the `SuiJsonRpcTypes` namespace of `@mysten/wallet-standard`.
 *
 * Differences from the fullnode's JSON-RPC output:
 *
 * - Error strings, event `parsedJson` and `executionErrorSource` come from the Core API.
 * - Pure inputs keep their decoded value only when the commands give their type (`SplitCoins`
 *   amounts, `TransferObjects` recipients, typed `MakeMoveVec` elements); others are raw bytes.
 * - `confirmedLocalExecution` is always `false`, and `effects.accumulatorEvents` is omitted.
 * - A transaction that publishes or upgrades several packages lists all their modules on each
 *   `published` change.
 * - When gas is paid from an address balance, `effects.gasObject.owner` is the gas payer.
 *
 * @module
 */

export { type DryRunTransactionBlockResponse, dryRunFromSimulation } from './mappers.js';
export {
	mappableIncludeFor,
	type TransactionBlockExecutionContext,
	transactionBlockResponseFromExecution,
} from './transaction-block-response.js';
