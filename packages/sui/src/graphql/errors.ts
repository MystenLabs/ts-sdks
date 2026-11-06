// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClientTypes } from '../client/types.js';

/**
 * A transport failure of a GraphQL query or subscription, or a malformed response. GraphQL errors
 * delivered in a response body are returned in `errors` instead, except by ledger streams, which
 * throw them with the errors as `cause`.
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
