// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiJsonRpcTypes } from '@mysten/wallet-standard';

/**
 * The legacy JSON-RPC request and response shapes a wallet has to name to answer the deprecated
 * `sui:signAndExecuteTransactionBlock` feature. Aliases of the members of `SuiJsonRpcTypes` in
 * `@mysten/wallet-standard`, re-exported flat for convenience.
 *
 * @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature.
 */
export type SuiTransactionBlockResponse = SuiJsonRpcTypes.SuiTransactionBlockResponse;

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type SuiTransactionBlockResponseOptions = SuiJsonRpcTypes.SuiTransactionBlockResponseOptions;

/** @deprecated Part of the deprecated `sui:signAndExecuteTransactionBlock` feature. */
export type ExecuteTransactionRequestType = SuiJsonRpcTypes.ExecuteTransactionRequestType;

/**
 * The response of the JSON-RPC `sui_dryRunTransactionBlock` method.
 *
 * @deprecated JSON-RPC is deprecated. Use `simulateTransaction` from the Core API instead.
 */
export interface DryRunTransactionBlockResponse {
	balanceChanges: SuiJsonRpcTypes.BalanceChange[];
	effects: SuiJsonRpcTypes.TransactionEffects;
	events: SuiJsonRpcTypes.SuiEvent[];
	executionErrorSource?: string | null;
	input: SuiJsonRpcTypes.TransactionBlockData;
	objectChanges: SuiJsonRpcTypes.SuiObjectChange[];
	suggestedGasPrice?: string | null;
}
