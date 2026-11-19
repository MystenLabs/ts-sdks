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
 * Incremental `text/event-stream` parser over decoded text. Unlike `EventSource`, it dispatches
 * data-less events so `event: complete` is seen, and ignores `id` and `retry` (no reconnects).
 */
export class ServerSentEventParser {
	#maxMessageSize: number;
	#line = '';
	#comment = false;
	/** A CRLF split across chunks ends one line, not two. */
	#skipLF = false;
	#event = '';
	#data: string[] = [];
	#size = 0;

	constructor(maxMessageSize: number) {
		this.#maxMessageSize = maxMessageSize;
	}

	/**
	 * Parse the next chunk; drain it before the next call.
	 * @yields each message this chunk completes.
	 */
	*feed(chunk: string): Generator<ServerSentEvent> {
		let start = 0;
		if (this.#skipLF && chunk.length > 0) {
			this.#skipLF = false;
			if (chunk[0] === '\n') start = 1;
		}
		while (start < chunk.length) {
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

	// Counts the unterminated line too, so a huge line fails before it is fully buffered.
	#checkSize() {
		if (this.#size + this.#line.length > this.#maxMessageSize) {
			throw new SuiGraphQLRequestError('GraphQL SSE message exceeds maxMessageSize');
		}
	}
}
