// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A transport or protocol failure of a GraphQL query or subscription. GraphQL errors delivered in
 * a response body are returned in `errors` instead, except by ledger streams, which throw them.
 */
export class SuiGraphQLRequestError extends Error {
	/** The HTTP status, when the server responded with a non-2xx status. */
	readonly status?: number;
	/** Whether repeating the same request may succeed (network failures, HTTP 408/429/5xx). */
	readonly retryable: boolean;
	constructor(
		message: string,
		options: { status?: number; retryable?: boolean; cause?: unknown } = {},
	) {
		super(message, { cause: options.cause });
		this.name = 'SuiGraphQLRequestError';
		this.status = options.status;
		this.retryable = options.retryable ?? false;
	}
}

export function isRetryableStatus(status: number) {
	return status === 408 || status === 429 || status >= 500;
}
