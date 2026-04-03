// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiClientError } from '../client/errors.js';
import type { Status } from './proto/google/rpc/status.js';

/**
 * Standard gRPC status codes as returned by the Sui node.
 * Based on https://grpc.github.io/grpc/core/md_doc_statuscodes.html
 */
export const GrpcStatusCode = {
	/** Request completed successfully. */
	OK: 0,
	/** Client cancelled the request. */
	CANCELLED: 1,
	/** Unknown error — typically an unclassified server error. */
	UNKNOWN: 2,
	/** Client sent a malformed or invalid argument. */
	INVALID_ARGUMENT: 3,
	/** Request deadline exceeded before the operation could complete. */
	DEADLINE_EXCEEDED: 4,
	/** Requested object or resource does not exist. */
	NOT_FOUND: 5,
	/** Object or resource already exists (e.g. duplicate transaction). */
	ALREADY_EXISTS: 6,
	/** Caller does not have permission to perform this operation. */
	PERMISSION_DENIED: 7,
	/** Some resource has been exhausted (e.g. rate limit, quota). */
	RESOURCE_EXHAUSTED: 8,
	/** Operation rejected due to current system state (e.g. epoch boundary). */
	FAILED_PRECONDITION: 9,
	/** Operation aborted — typically due to a concurrency conflict. */
	ABORTED: 10,
	/** Argument is out of valid range for this operation. */
	OUT_OF_RANGE: 11,
	/** Operation is not implemented or supported by this node version. */
	UNIMPLEMENTED: 12,
	/** Internal server error — likely a Sui node bug. */
	INTERNAL: 13,
	/** Node is temporarily unavailable — retry with backoff. */
	UNAVAILABLE: 14,
	/** Unrecoverable data loss or corruption on the node. */
	DATA_LOSS: 15,
	/** Request does not have valid authentication credentials. */
	UNAUTHENTICATED: 16,
} as const;

/**
 * Error returned by the Sui gRPC node for request-level failures
 * (e.g. object not found, permission denied).
 *
 * Extends the standard Error class so existing `instanceof Error` checks
 * continue to work. Use `instanceof SuiGrpcRequestError` to access the
 * structured `code` and `details` fields.
 *
 * @example
 * ```typescript
 * import { SuiGrpcRequestError, GrpcStatusCode } from '@mysten/sui/grpc';
 *
 * try {
 *   const result = await client.core.getObject({ objectId });
 * } catch (error) {
 *   if (error instanceof SuiGrpcRequestError) {
 *     if (error.code === GrpcStatusCode.NOT_FOUND) {
 *       console.log('Object does not exist');
 *     } else if (error.code === GrpcStatusCode.PERMISSION_DENIED) {
 *       console.log('Access denied');
 *     }
 *   }
 * }
 * ```
 */
export class SuiGrpcRequestError extends SuiClientError {
	/** The gRPC status code. See `GrpcStatusCode` for common values. */
	readonly code: number;
	/**
	 * Structured error details from the node. Each entry has a `typeUrl`
	 * identifying the error detail type and a `value` containing the
	 * encoded payload. May be empty.
	 */
	readonly details: readonly { typeUrl: string; value: Uint8Array }[];

	constructor(status: Status) {
		super(status.message);
		this.name = 'SuiGrpcRequestError';
		this.code = status.code;
		this.details = status.details;
	}
}
