// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { GraphQLQueryResult } from './client.js';

/** A transport/protocol failure, distinct from GraphQL errors delivered in a response. */
export class SuiGraphQLSubscriptionError extends Error {
	readonly status?: number;
	readonly retryable: boolean;
	constructor(
		message: string,
		options: { status?: number; retryable?: boolean; cause?: unknown } = {},
	) {
		super(message, { cause: options.cause });
		this.name = 'SuiGraphQLSubscriptionError';
		this.status = options.status;
		this.retryable = options.retryable ?? false;
	}
}

/**
 * Parse SSE incrementally, including CR/LF split across network chunks and multiline data.
 * @yields GraphQL responses, preserving partial data and errors.
 */
export async function* readGraphQLSSE<Result>(
	response: Response,
	signal: AbortSignal,
	maxMessageSize: number,
): AsyncGenerator<GraphQLQueryResult<Result>> {
	if (!response.ok) {
		await response.body?.cancel();
		throw new SuiGraphQLSubscriptionError(
			`GraphQL subscription failed: ${response.statusText} (${response.status})`,
			{
				status: response.status,
				retryable: response.status === 408 || response.status === 429 || response.status >= 500,
			},
		);
	}
	if (
		!response.headers.get('content-type')?.toLowerCase().startsWith('text/event-stream') ||
		!response.body
	) {
		await response.body?.cancel();
		throw new SuiGraphQLSubscriptionError(
			'GraphQL subscription requires a text/event-stream response',
		);
	}
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let event = '';
	let data: string[] = [];
	let size = 0;
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
				throw new SuiGraphQLSubscriptionError('GraphQL subscription body could not be read', {
					retryable: true,
					cause,
				});
			}
			signal.throwIfAborted();
			buffer += decoder.decode(chunk.value, { stream: !chunk.done });
			let end: number;
			while ((end = buffer.search(/[\r\n]/)) !== -1) {
				// A trailing CR may be the first byte of CRLF in the next network chunk.
				if (buffer[end] === '\r' && end + 1 === buffer.length && !chunk.done) break;
				const line = buffer.slice(0, end);
				if (size + line.length > maxMessageSize)
					throw new SuiGraphQLSubscriptionError('GraphQL SSE message exceeds maxMessageSize');
				buffer = buffer.slice(end + (buffer[end] === '\r' && buffer[end + 1] === '\n' ? 2 : 1));
				if (line === '') {
					if (event === 'complete') return;
					if (data.length) {
						if (event === 'error')
							throw new SuiGraphQLSubscriptionError(
								`GraphQL subscription error: ${data.join('\n')}`,
							);
						if (event !== 'next' && event !== '' && event !== 'message')
							throw new SuiGraphQLSubscriptionError(`Unexpected GraphQL SSE event: ${event}`);
						let result: GraphQLQueryResult<Result>;
						try {
							result = JSON.parse(data.join('\n'));
						} catch (cause) {
							throw new SuiGraphQLSubscriptionError('Invalid GraphQL subscription response', {
								cause,
							});
						}
						yield result;
					}
					event = '';
					data = [];
					size = 0;
				} else if (!line.startsWith(':')) {
					const colon = line.indexOf(':');
					const field = colon < 0 ? line : line.slice(0, colon);
					let value = colon < 0 ? '' : line.slice(colon + 1);
					if (value.startsWith(' ')) value = value.slice(1);
					if (field === 'event') event = value;
					if (field === 'data') {
						data.push(value);
						size += value.length + 1;
					}
				}
			}
			if (size + buffer.length > maxMessageSize)
				throw new SuiGraphQLSubscriptionError('GraphQL SSE message exceeds maxMessageSize');
			if (chunk.done)
				throw new SuiGraphQLSubscriptionError(
					'GraphQL subscription ended without a complete event',
					{ retryable: true },
				);
		}
	} finally {
		signal.removeEventListener('abort', abort);
		await reader.cancel().catch(() => {});
		reader.releaseLock();
	}
}
