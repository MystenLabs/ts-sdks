// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiGraphQLRequestError } from './errors.js';

export interface ServerSentEvent {
	/** The `event` field, or `''` when the message has none. */
	event: string;
	/** The `data` lines joined with `\n`. */
	data: string;
}

const LINE_BREAK = /[\r\n]/g;

/**
 * An incremental parser for the `text/event-stream` format
 * (https://html.spec.whatwg.org/multipage/server-sent-events.html#parsing-an-event-stream).
 *
 * It takes decoded text. Decode the body with a streaming `TextDecoder`, which joins multibyte
 * characters split across chunks and strips the leading byte order mark.
 *
 * It differs from `EventSource` in two ways, both for GraphQL over SSE:
 * - a message with an `event` field but no `data` is dispatched, so `event: complete` is seen;
 * - `id` and `retry` are ignored, because the caller does not reconnect.
 */
export class ServerSentEventParser {
	#maxMessageSize: number;
	/** The text of a line whose terminator has not arrived yet. */
	#line = '';
	/** The previous chunk ended with CR, so an LF at the start of the next one ends the same line. */
	#skipLF = false;
	#event = '';
	#data: string[] = [];
	#size = 0;

	/** @param maxMessageSize the maximum characters buffered for one message, including the unterminated line. */
	constructor(maxMessageSize: number) {
		this.#maxMessageSize = maxMessageSize;
	}

	/**
	 * Parse the next chunk of text.
	 * @yields each message completed by this chunk, in order. Iterate it to the end before the next call.
	 * @throws {SuiGraphQLRequestError} when a message exceeds `maxMessageSize`, after the messages before it.
	 */
	*feed(chunk: string): Generator<ServerSentEvent> {
		let start = 0;
		if (this.#skipLF && chunk.length > 0) {
			this.#skipLF = false;
			if (chunk[0] === '\n') start = 1;
		}
		while (start < chunk.length) {
			LINE_BREAK.lastIndex = start;
			const match = LINE_BREAK.exec(chunk);
			if (!match) {
				this.#line += chunk.slice(start);
				this.#checkSize();
				return;
			}
			const end = match.index;
			const line = this.#line + chunk.slice(start, end);
			this.#line = '';
			start = end + 1;
			if (chunk[end] === '\r') {
				if (start === chunk.length) this.#skipLF = true;
				else if (chunk[start] === '\n') start++;
			}
			const message = this.#processLine(line);
			if (message) yield message;
		}
	}

	#processLine(line: string): ServerSentEvent | undefined {
		if (line === '') {
			const message =
				this.#data.length > 0 || this.#event
					? { event: this.#event, data: this.#data.join('\n') }
					: undefined;
			this.#event = '';
			this.#data = [];
			this.#size = 0;
			return message;
		}
		if (line[0] === ':') return undefined; // comment, e.g. a keepalive
		const colon = line.indexOf(':');
		const field = colon === -1 ? line : line.slice(0, colon);
		let value = colon === -1 ? '' : line.slice(colon + 1);
		if (value[0] === ' ') value = value.slice(1);
		if (field === 'event') {
			this.#event = value;
		} else if (field === 'data') {
			this.#data.push(value);
			this.#size += value.length + 1;
			this.#checkSize();
		}
		return undefined;
	}

	#checkSize() {
		if (this.#size + this.#line.length > this.#maxMessageSize) {
			throw new SuiGraphQLRequestError('GraphQL SSE message exceeds maxMessageSize');
		}
	}
}
