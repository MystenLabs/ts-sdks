// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ErrorClass, StreamFamily } from '../../client/stream/adapter.js';
import { SuiStreamError } from '../../client/stream/index.js';
import type { GraphQLQueryOptions, GraphQLQueryResult, SuiGraphQLClient } from '../client.js';
import { SuiGraphQLRequestError } from '../errors.js';
import { LedgerStreamStateDocument } from '../generated/queries.js';

/**
 * How stream failures surface:
 * - Transport failures, response `errors`, and an index that has not caught up yet throw
 *   `SuiGraphQLRequestError`. Its `retryable` flag decides whether the stream retries.
 * - A successful response that breaks the API's shape throws `SuiStreamError('Protocol')`.
 */

/** Response error codes that mean the same request may succeed later. */
const TRANSIENT_ERROR_CODES = new Set([
	'INTERNAL_SERVER_ERROR',
	'REQUEST_TIMEOUT',
	'RESOURCE_EXHAUSTED',
	'SERVICE_UNAVAILABLE',
]);

export function classifyGraphQLError(error: unknown): ErrorClass {
	return error instanceof SuiGraphQLRequestError && error.retryable ? 'retry' : 'fatal';
}

/** The index is behind the data a stream needs; retried like any transient failure. */
export function notIndexedYet(message: string) {
	return new SuiGraphQLRequestError(message, { retryable: true });
}

export function unwrap<Result>(result: GraphQLQueryResult<Result>): Result {
	const errors = result.errors ?? [];
	if (errors.length > 0) {
		throw new SuiGraphQLRequestError(errors.map((error) => error.message).join('\n'), {
			retryable: errors.every((error) => TRANSIENT_ERROR_CODES.has(String(error.extensions?.code))),
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

export interface IndexState {
	chain: string;
	/** Oldest checkpoint still queryable, if the server prunes. */
	first: bigint | null;
	/** Newest indexed checkpoint. */
	tip: bigint;
}

/** One request: the chain and the checkpoint range that `family` queries can read. */
export async function readIndexState(
	client: SuiGraphQLClient,
	family: StreamFamily,
	signal: AbortSignal,
): Promise<IndexState> {
	const data = await queryData(client, {
		query: LedgerStreamStateDocument,
		variables: { field: family },
		signal,
	});
	const { first, last } = data.serviceConfig.availableRange;
	if (!last) throw notIndexedYet('No checkpoint has been indexed yet');
	return {
		chain: data.chainIdentifier,
		first: first ? BigInt(first.sequenceNumber) : null,
		tip: BigInt(last.sequenceNumber),
	};
}
