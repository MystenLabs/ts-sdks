// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export class DAppKitError extends Error {}

/**
 * Thown when someone attempts to perform an action that requires an active wallet connection.
 */
export class WalletNotConnectedError extends DAppKitError {}

/**
 * Thown when an account tries to invoke a feature on a chain that doesn't support it.
 */
export class ChainNotSupportedError extends DAppKitError {}

/**
 * Thown when an account tries to invoke a feature that it doesn't support.
 */
export class FeatureNotSupportedError extends DAppKitError {}

/**
 * Thown when a wallet is connected but no accounts are authorized.
 */
export class WalletNoAccountsConnectedError extends DAppKitError {}

/**
 * Thown when an account can't be found for a specific wallet.
 */
export class WalletAccountNotFoundError extends DAppKitError {}
