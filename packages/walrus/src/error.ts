// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

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

/** Thrown when blob is blocked by a quorum of storage nodes. */
export class BlobBlockedError extends Error {}
