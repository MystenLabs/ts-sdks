// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export class DAppKitError extends Error {}

/**
 * An error that is instantiated when someone attempts to perform an action that requires an active wallet connection.
 */
export class WalletNotConnectedError extends DAppKitError {}

/**
 * An error that is instantiated when a wallet is connected but no accounts are authorized.
 */
export class WalletNoAccountsConnectedError extends DAppKitError {}

/**
 * An error that is instantiated when an account can't be found for a specific wallet.
 */
export class WalletAccountNotFoundError extends DAppKitError {}
