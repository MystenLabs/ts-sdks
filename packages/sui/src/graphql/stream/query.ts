// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ErrorClass } from '../../client/stream/adapter.js';
import { SuiStreamError } from '../../client/stream/index.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { GraphQLQueryOptions, GraphQLQueryResult, SuiGraphQLClient } from '../client.js';
import { isConnectionLost, isNetworkFailure, SuiGraphQLRequestError } from '../errors.js';
import { LedgerStreamStateDocument } from '../generated/queries.js';

/** Response error codes that mean the same request may succeed later. */
const TRANSIENT_ERROR_CODES = new Set([
	'INTERNAL_SERVER_ERROR',
	'REQUEST_TIMEOUT',
	'RESOURCE_EXHAUSTED',
	'SERVICE_UNAVAILABLE',
]);

/** Response error codes that mean the request itself is wrong. */
const PERMANENT_ERROR_CODES = new Set([
	'BAD_USER_INPUT',
	'FEATURE_UNAVAILABLE',
	'GRAPHQL_PARSE_FAILED',
	'GRAPHQL_VALIDATION_FAILED',
]);

type ResponseErrors = NonNullable<GraphQLQueryResult<unknown>['errors']>;

const transient = (errors: ResponseErrors) =>
	errors.every((error) => TRANSIENT_ERROR_CODES.has(String(error.extensions?.code)));

/**
 * A subscription result with errors carries no edge to commit, such as a match whose node failed
 * to resolve, so the stream reconnects from its last cursor unless the request itself is wrong.
 */
export const transientLive = (errors: ResponseErrors) =>
	!errors.some((error) => PERMANENT_ERROR_CODES.has(String(error.extensions?.code)));

export function classifyGraphQLError(error: unknown): ErrorClass {
	return error instanceof SuiGraphQLRequestError && error.retryable ? 'retry' : 'fatal';
}

const notIndexed = new WeakSet<object>();

/** The index is behind the data a stream needs; retried like any transient failure. */
export function notIndexedYet(message: string) {
	const error = new SuiGraphQLRequestError(message, { retryable: true });
	notIndexed.add(error);
	return error;
}

/**
 * RESOURCE_EXHAUSTED covers a full server ("no subscription slots, retry later") and per-item limits
 * (such as rendering a large Move value), which fail the same way on every attempt. A streak of
 * them at one resume point gets several minutes of backoff to clear, then ends the stream.
 */
const RESOURCE_EXHAUSTED_ATTEMPTS = 10;

export function graphQLAttemptLimit(error: unknown): number | undefined {
	if (!(error instanceof SuiGraphQLRequestError) || !Array.isArray(error.cause)) return undefined;
	const codes = (error.cause as ResponseErrors).map((cause) => cause.extensions?.code);
	return codes.includes('RESOURCE_EXHAUSTED') ? RESOURCE_EXHAUSTED_ATTEMPTS : undefined;
}

export function graphQLRetryReason(error: unknown): SuiClientTypes.StreamRetryReason {
	if (!(error instanceof SuiGraphQLRequestError)) return 'ServerError';
	if (isConnectionLost(error)) return 'Disconnected';
	if (isNetworkFailure(error)) return 'Network';
	if (notIndexed.has(error)) return 'NotIndexed';
	if (error.status !== undefined) {
		if (error.status === 429) return 'RateLimited';
		if (error.status === 408 || error.status === 504) return 'Timeout';
		if (error.status === 502 || error.status === 503) return 'Unavailable';
		return 'ServerError';
	}
	// Response errors are kept as the cause.
	const codes = Array.isArray(error.cause)
		? (error.cause as ResponseErrors).map((cause) => cause.extensions?.code)
		: [];
	if (codes.includes('REQUEST_TIMEOUT')) return 'Timeout';
	if (codes.includes('SERVICE_UNAVAILABLE')) return 'Unavailable';
	// RESOURCE_EXHAUSTED covers server load and per-item limits alike. A lagging subscriber and a
	// server-side interruption arrive as INTERNAL_SERVER_ERROR, so GraphQL can't report them as
	// SlowConsumer or Disconnected.
	return 'ServerError';
}

export function unwrap<Result>(
	result: GraphQLQueryResult<Result>,
	retryable: (errors: ResponseErrors) => boolean = transient,
): Result {
	const errors = result.errors ?? [];
	// Pruned history cannot come back by retrying.
	if (errors.some((error) => error.extensions?.code === 'OUT_OF_RANGE')) {
		throw new SuiStreamError(
			'HistoryUnavailable',
			errors.map((error) => error.message).join('\n'),
			{
				cause: errors,
			},
		);
	}
	if (errors.length > 0) {
		throw new SuiGraphQLRequestError(errors.map((error) => error.message).join('\n'), {
			retryable: retryable(errors),
			cause: errors,
		});
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

/**
 * The chain identity and the indexed tip in one request, with the oldest retained checkpoint for
 * checkpoint streams.
 */
export async function readChainTip(
	client: SuiGraphQLClient,
	checkpointRetention: boolean,
	signal: AbortSignal,
): Promise<{ chain: string; tip: bigint; retainedFrom?: bigint }> {
	const data = await queryData(client, {
		query: LedgerStreamStateDocument,
		variables: { checkpointRetention },
		signal,
	});
	if (!data.checkpoint) throw notIndexedYet('No checkpoint has been indexed yet');
	const first = data.serviceConfig?.availableRange.first;
	return {
		chain: data.chainIdentifier,
		tip: BigInt(data.checkpoint.sequenceNumber),
		retainedFrom: first ? BigInt(first.sequenceNumber) : undefined,
	};
}
