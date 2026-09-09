// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createParser } from './vendor/eventsource-parser/parse.js';
import type { EventSourceMessage } from './vendor/eventsource-parser/types.js';

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
		response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !==
			'text/event-stream' ||
		!response.body
	) {
		await response.body?.cancel();
		throw new SuiGraphQLSubscriptionError(
			'GraphQL subscription requires a text/event-stream response',
		);
	}
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	const pending: (EventSourceMessage | SuiGraphQLSubscriptionError)[] = [];
	const parser = createParser({
		maxBufferSize: maxMessageSize,
		dispatchEmptyData: true,
		onEvent(message) {
			pending.push(
				message.data.length > maxMessageSize
					? new SuiGraphQLSubscriptionError('GraphQL SSE message exceeds maxMessageSize')
					: message,
			);
		},
		onError(cause) {
			if (cause.type === 'max-buffer-size-exceeded') {
				pending.push(
					new SuiGraphQLSubscriptionError('GraphQL SSE message exceeds maxMessageSize', { cause }),
				);
			}
		},
	});
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
			parser.feed(decoder.decode(chunk.value, { stream: !chunk.done }));
			for (const message of pending) {
				signal.throwIfAborted();
				if (message instanceof SuiGraphQLSubscriptionError) throw message;
				if (message.event === 'complete') return;
				if (message.event === 'error')
					throw new SuiGraphQLSubscriptionError(`GraphQL subscription error: ${message.data}`);
				if (message.event && message.event !== 'next' && message.event !== 'message')
					throw new SuiGraphQLSubscriptionError(`Unexpected GraphQL SSE event: ${message.event}`);
				let result: GraphQLQueryResult<Result>;
				try {
					result = JSON.parse(message.data);
				} catch (cause) {
					throw new SuiGraphQLSubscriptionError('Invalid GraphQL subscription response', { cause });
				}
				yield result;
			}
			pending.length = 0;
			// Sui closes completed subscriptions without sending a GraphQL complete event.
			// Ledger streams reconnect at their own layer when a live subscription ends.
			if (chunk.done) return;
		}
	} finally {
		signal.removeEventListener('abort', abort);
		await reader.cancel().catch(() => {});
		reader.releaseLock();
	}
}
