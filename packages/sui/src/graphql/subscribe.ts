// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { GraphQLQueryResult } from './client.js';
import { isRetryableStatus, SuiGraphQLRequestError } from './errors.js';
import { ServerSentEventParser } from './sse-parser.js';

/**
 * Read a GraphQL-over-SSE response body.
 * @yields GraphQL responses, preserving partial data and errors.
 */
export async function* readGraphQLSSE<Result>(
	response: Response,
	signal: AbortSignal,
	maxMessageSize: number,
): AsyncGenerator<GraphQLQueryResult<Result>> {
	if (!response.ok) {
		await response.body?.cancel();
		throw new SuiGraphQLRequestError(
			`GraphQL subscription failed: ${response.statusText} (${response.status})`,
			{ status: response.status, retryable: isRetryableStatus(response.status) },
		);
	}
	if (
		response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !==
			'text/event-stream' ||
		!response.body
	) {
		await response.body?.cancel();
		throw new SuiGraphQLRequestError('GraphQL subscription requires a text/event-stream response');
	}
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	const parser = new ServerSentEventParser(maxMessageSize);
	const abort = () => {
		void reader.cancel(signal.reason).catch(() => {});
	};
	signal.addEventListener('abort', abort, { once: true });
	try {
		while (true) {
			signal.throwIfAborted();
			let chunk: ReadableStreamReadResult<Uint8Array>;
			try {
				chunk = await reader.read();
			} catch (cause) {
				signal.throwIfAborted();
				throw new SuiGraphQLRequestError('GraphQL subscription body could not be read', {
					retryable: true,
					cause,
				});
			}
			signal.throwIfAborted();
			for (const message of parser.feed(decoder.decode(chunk.value, { stream: !chunk.done }))) {
				signal.throwIfAborted();
				if (message.event === 'complete') return;
				if (message.event === 'error') {
					throw new SuiGraphQLRequestError(`GraphQL subscription error: ${message.data}`);
				}
				if (message.event && message.event !== 'next' && message.event !== 'message') {
					throw new SuiGraphQLRequestError(`Unexpected GraphQL SSE event: ${message.event}`);
				}
				let result: GraphQLQueryResult<Result>;
				try {
					result = JSON.parse(message.data);
				} catch (cause) {
					throw new SuiGraphQLRequestError('Invalid GraphQL subscription response', { cause });
				}
				yield result;
			}
			// Sui closes a finished subscription without sending a `complete` event. A message
			// without its terminating blank line is incomplete and dropped, as `EventSource` does.
			if (chunk.done) return;
		}
	} finally {
		signal.removeEventListener('abort', abort);
		await reader.cancel().catch(() => {});
		reader.releaseLock();
	}
}
