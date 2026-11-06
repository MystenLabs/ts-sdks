// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from './types.js';

export class SuiClientError extends Error {}

export class SimulationError extends SuiClientError {
	executionError?: SuiClientTypes.ExecutionError;

	constructor(
		message: string,
		options?: { cause?: unknown; executionError?: SuiClientTypes.ExecutionError },
	) {
		super(message, { cause: options?.cause });
		this.executionError = options?.executionError;
	}
}

export type ObjectErrorReason = 'notFound' | 'deleted' | 'unknown';

export interface ObjectErrorOptions {
	/** A transport-neutral reason shared by all Core API clients. */
	reason: ObjectErrorReason;
	/** The requested object ID, when the lookup identifies one. */
	objectId?: string;
	/** The original transport error or response. */
	cause?: unknown;
}

/** An error returned for an individual object lookup. */
export class ObjectError extends SuiClientError {
	/** The transport's error code. Use `reason` for transport-neutral handling. */
	code: string;
	/** A transport-neutral reason shared by all Core API clients. */
	readonly reason: ObjectErrorReason;
	/** The requested object ID, when the lookup identifies one. */
	readonly objectId?: string;

	constructor(code: string, message: string, options?: ObjectErrorOptions) {
		super(message, { cause: options?.cause });
		this.code = code;
		this.reason = options?.reason ?? 'unknown';
		this.objectId = options?.objectId;
	}
}

export type TransactionErrorReason = 'notFound';

const TRANSACTION_ERROR_MESSAGES: Record<TransactionErrorReason, (digest: string) => string> = {
	notFound: (digest) => `Transaction ${digest} not found`,
};

/** An error returned by a transaction lookup. */
export class TransactionError extends SuiClientError {
	/** A transport-neutral reason shared by all Core API clients. */
	readonly reason: TransactionErrorReason;
	/** The requested transaction digest. */
	readonly digest: string;

	constructor(reason: TransactionErrorReason, digest: string, options?: { cause?: unknown }) {
		super(TRANSACTION_ERROR_MESSAGES[reason](digest), options);
		this.reason = reason;
		this.digest = digest;
	}
}

/**
 * The retry reason for an HTTP error status: 429 is `RateLimited`, 503 is `Unavailable`, 408 and
 * other 5xx except 501 are `ServerError`, and anything else is not retryable.
 */
export function httpStatusReason(status: number): SuiClientTypes.RetryReason | undefined {
	if (status === 429) return 'RateLimited';
	if (status === 503) return 'Unavailable';
	if (status === 501) return undefined;
	if (status === 408 || status >= 500) return 'ServerError';
	return undefined;
}
