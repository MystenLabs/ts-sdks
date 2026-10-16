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
	/** The text of a line whose terminator has not arrived yet. Comment lines are not kept. */
	#line = '';
	/** The current line is a comment, so its text is discarded instead of buffered. */
	#comment = false;
	/** The previous chunk ended with CR, so an LF at the start of the next one ends the same line. */
	#skipLF = false;
	#event = '';
	#data: string[] = [];
	/** Characters in the current message's completed lines, each counting one for its line break. */
	#size = 0;

	/**
	 * @param maxMessageSize the maximum size of one message: the characters of its lines other than
	 * comments, counting each line break as one. An unterminated line counts as it arrives, so the
	 * limit applies the same way however the stream is split into chunks.
	 */
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
			// `#line` is empty only at the start of a line or inside a comment.
			if (this.#line === '' && chunk[start] === ':') this.#comment = true;
			LINE_BREAK.lastIndex = start;
			const match = LINE_BREAK.exec(chunk);
			const end = match ? match.index : chunk.length;
			if (!this.#comment) this.#line += chunk.slice(start, end);
			if (!match) {
				this.#checkSize();
				return;
			}
			const line = this.#line;
			const comment = this.#comment;
			this.#line = '';
			this.#comment = false;
			start = end + 1;
			if (chunk[end] === '\r') {
				if (start === chunk.length) this.#skipLF = true;
				else if (chunk[start] === '\n') start++;
			}
			if (comment) continue; // e.g. a keepalive
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
		this.#size += line.length + 1;
		this.#checkSize();
		const colon = line.indexOf(':');
		const field = colon === -1 ? line : line.slice(0, colon);
		let value = colon === -1 ? '' : line.slice(colon + 1);
		if (value[0] === ' ') value = value.slice(1);
		if (field === 'event') {
			this.#event = value;
		} else if (field === 'data') {
			this.#data.push(value);
		}
		return undefined;
	}

	/** Every partial count is below the count once the line completes, so chunking cannot change the result. */
	#checkSize() {
		if (this.#size + this.#line.length > this.#maxMessageSize) {
			throw new SuiGraphQLRequestError('GraphQL SSE message exceeds maxMessageSize');
		}
	}
}
