// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '@mysten/sui/client';
import { normalizeSuiAddress } from '@mysten/sui/utils';

export class WalrusClientError extends Error {}

export class RetryableWalrusClientError extends WalrusClientError {}

/** Thrown when the client could not retrieve the status of a blob from any storage node. */
export class NoBlobStatusReceivedError extends WalrusClientError {}

/** Thrown when the client could not retrieve a verified blob status for the blob. */
export class NoVerifiedBlobStatusReceivedError extends WalrusClientError {}

/** Thrown when the client could not retrieve blob metadata from any storage node. */
export class NoBlobMetadataReceivedError extends RetryableWalrusClientError {}

/** Thrown when the client could not retrieve enough slivers to reconstruct the blob. */
export class NotEnoughSliversReceivedError extends RetryableWalrusClientError {}

/** Thrown when the client could not write enough slivers to upload the blob. */
export class NotEnoughBlobConfirmationsError extends RetryableWalrusClientError {}

/** Thrown when the client is currently behind the current epoch. */
export class BehindCurrentEpochError extends RetryableWalrusClientError {}

/** Thrown when a blob is not certified or determined to not exist. */
export class BlobNotCertifiedError extends RetryableWalrusClientError {}

/** Thrown when a blob was determined to be incorrectly encoded. */
export class InconsistentBlobError extends WalrusClientError {}

/**
 * Thrown when a transaction aborts in a way that usually indicates the WAL payment was
 * computed from stale cached storage prices (it can also indicate an insufficient WAL balance).
 * The client's caches are reset before this error is thrown, so transactions built after
 * this error will use freshly loaded prices.
 */
export class StalePriceError extends RetryableWalrusClientError {}

/**
 * Checks whether an execution or simulation error is a MoveAbort in `0x2::balance`, which for
 * walrus payment transactions usually indicates the payment was computed from stale cached
 * prices (it can also indicate an insufficient WAL balance). This can be used to detect stale
 * prices when executing transactions outside of the walrus client (for example through a wallet
 * or a sponsor). Calling `WalrusClient.reset()` clears the cached prices, so transactions built
 * afterwards will use freshly loaded prices.
 */
export function isStalePriceAbort(
	error: SuiClientTypes.ExecutionError | null | undefined,
): boolean {
	if (error?.$kind !== 'MoveAbort') {
		return false;
	}

	const location = error.MoveAbort.location;

	return (
		location?.module === 'balance' &&
		(!location.package || normalizeSuiAddress(location.package) === normalizeSuiAddress('0x2'))
	);
}

/** Thrown when blob is blocked by a quorum of storage nodes. */
export class BlobBlockedError extends Error {}
