// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiStreamError } from '../../client/stream/index.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { GraphQLQueryOptions, GraphQLQueryResult, SuiGraphQLClient } from '../client.js';
import { SuiGraphQLRequestError } from '../errors.js';
import { LedgerStreamStateDocument } from '../generated/queries.js';

/** Response error codes that may clear on retry. */
const RETRY_REASONS: Record<string, SuiClientTypes.RetryReason> = {
	INTERNAL_SERVER_ERROR: 'ServerError',
	REQUEST_TIMEOUT: 'ServerError',
	// A reconnect gets a fresh server meter; a limit hit on every attempt fails once the budget runs out.
	RESOURCE_EXHAUSTED: 'RateLimited',
};

/** A result's data, or its errors thrown. The errors may clear on retry only if each of them may. */
export function unwrap<Result>(result: GraphQLQueryResult<Result>): Result {
	const errors = result.errors ?? [];
	const message = errors.map((error) => error.message).join('\n');
	if (errors.length > 0) {
		const reasons = errors.map(({ extensions }) => RETRY_REASONS[String(extensions?.code)]);
		const reason = reasons.every((each) => each !== undefined) ? reasons[0] : undefined;
		throw new SuiGraphQLRequestError(message, { reason, cause: errors });
	}
	if (!result.data) throw new SuiStreamError('Protocol', 'GraphQL response has no data');
	return result.data;
}

export async function queryData<Result, Variables>(
	client: SuiGraphQLClient,
	options: GraphQLQueryOptions<Result, Variables>,
): Promise<Result> {
	return unwrap(await client.query(options));
}

export function notIndexedYet() {
	return new SuiGraphQLRequestError('No checkpoint has been indexed yet', {
		reason: 'Unavailable',
	});
}

/** The chain identity and the indexed tip in one request. */
export async function readChainTip(
	client: SuiGraphQLClient,
	signal: AbortSignal,
): Promise<{ chain: string; tip: bigint }> {
	const data = await queryData(client, { query: LedgerStreamStateDocument, signal });
	if (!data.checkpoint) throw notIndexedYet();
	return { chain: data.chainIdentifier, tip: BigInt(data.checkpoint.sequenceNumber) };
}
