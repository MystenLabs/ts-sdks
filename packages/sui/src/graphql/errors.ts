// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '../client/types.js';

/**
 * A transport failure of a GraphQL query or subscription, or a malformed response. GraphQL errors
 * delivered in a response body are returned in `errors` instead.
 */
export class SuiGraphQLRequestError extends Error {
	/** Why repeating the same request may succeed; undefined when it can't. */
	readonly reason?: SuiClientTypes.RetryReason;

	constructor(
		message: string,
		options: { reason?: SuiClientTypes.RetryReason; cause?: unknown } = {},
	) {
		super(message, { cause: options.cause });
		this.name = 'SuiGraphQLRequestError';
		this.reason = options.reason;
	}
}

/** Why an HTTP error status may clear on retry, if it may; matches gRPC's codes for the status. */
export function httpStatusReason(status: number): SuiClientTypes.RetryReason | undefined {
	if (status === 429) return 'RateLimited';
	if (status === 503) return 'Unavailable';
	if (status === 501) return undefined;
	if (status === 408 || status >= 500) return 'ServerError';
	return undefined;
}
