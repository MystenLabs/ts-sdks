// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { GraphQLQueryResult } from './client.js';
import { httpStatusReason } from '../client/errors.js';
import { cancelQuietly } from '../client/utils.js';
import { SuiGraphQLRequestError } from './errors.js';
import { ServerSentEventParser } from './sse-parser.js';

/** The largest SSE message, in characters, before the subscription fails. */
const MAX_MESSAGE_SIZE = 16 * 1024 * 1024;

/**
 * Read a GraphQL-over-SSE response body.
 * @yields GraphQL responses, preserving partial data and errors.
 */
export async function* readGraphQLSSE<Result>(
	response: Response,
	signal: AbortSignal,
): AsyncGenerator<GraphQLQueryResult<Result>> {
	// A custom `fetch` that ignores the signal can resolve after the abort.
	if (signal.aborted) {
		cancelQuietly(response.body);
		signal.throwIfAborted();
	}
	if (!response.ok) {
		cancelQuietly(response.body);
		throw new SuiGraphQLRequestError(
			`GraphQL subscription failed: ${response.statusText} (${response.status})`,
			{ reason: httpStatusReason(response.status) },
		);
	}
	if (
		response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !==
			'text/event-stream' ||
		!response.body
	) {
		cancelQuietly(response.body);
		throw new SuiGraphQLRequestError('GraphQL subscription requires a text/event-stream response');
	}
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	const parser = new ServerSentEventParser(MAX_MESSAGE_SIZE);
	const abort = () => {
		cancelQuietly(reader, signal.reason);
	};
	signal.addEventListener('abort', abort, { once: true });
	try {
		while (true) {
			let chunk: ReadableStreamReadResult<Uint8Array>;
			try {
				chunk = await reader.read();
			} catch (cause) {
				signal.throwIfAborted();
				throw new SuiGraphQLRequestError('GraphQL subscription body could not be read', {
					reason: 'Unavailable',
					cause,
				});
			}
			signal.throwIfAborted();
			for (const message of parser.feed(decoder.decode(chunk.value, { stream: !chunk.done }))) {
				signal.throwIfAborted();
				if (message.event === 'complete') return;
				if (message.event && message.event !== 'next' && message.event !== 'message') continue;
				let result: GraphQLQueryResult<Result>;
				try {
					result = JSON.parse(message.data);
				} catch (cause) {
					throw new SuiGraphQLRequestError('Invalid GraphQL subscription response', { cause });
				}
				yield result;
			}
			// Sui closes a finished subscription without a `complete` event.
			if (chunk.done) return;
		}
	} finally {
		signal.removeEventListener('abort', abort);
		cancelQuietly(reader);
		reader.releaseLock();
	}
}
