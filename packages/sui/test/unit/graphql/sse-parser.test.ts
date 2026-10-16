// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SuiGraphQLRequestError } from '../../../src/graphql/errors.js';
import type { ServerSentEvent } from '../../../src/graphql/sse-parser.js';
import { ServerSentEventParser } from '../../../src/graphql/sse-parser.js';

function parse(chunks: string[], maxMessageSize = 1024) {
	const parser = new ServerSentEventParser(maxMessageSize);
	const events: ServerSentEvent[] = [];
	for (const chunk of chunks) events.push(...parser.feed(chunk));
	return events;
}

/** Every way of splitting `text` into two chunks, plus one character per chunk. */
function splits(text: string) {
	const result = [[text], Array.from(text)];
	for (let i = 1; i < text.length; i++) result.push([text.slice(0, i), text.slice(i)]);
	return result;
}

describe('ServerSentEventParser', () => {
	describe('line endings', () => {
		it.each([
			['LF', '\n'],
			['CRLF', '\r\n'],
			['CR', '\r'],
		])('parses %s regardless of chunk boundaries', (_, eol) => {
			const text = `event: next${eol}data: a${eol}data: b${eol}${eol}data: c${eol}${eol}`;
			for (const chunks of splits(text)) {
				expect(parse(chunks)).toEqual([
					{ event: 'next', data: 'a\nb' },
					{ event: '', data: 'c' },
				]);
			}
		});

		it('parses mixed line endings', () => {
			expect(parse(['data: a\rdata: b\ndata: c\r\n\r\n'])).toEqual([
				{ event: '', data: 'a\nb\nc' },
			]);
		});

		it('treats CR then LF in the next chunk as one line break, but CR then CR as two', () => {
			expect(parse(['data: a\r', '\ndata: b\r', '\r'])).toEqual([{ event: '', data: 'a\nb' }]);
		});

		it('keeps a pending CR across empty chunks', () => {
			expect(parse(['data: a\r', '', '\n\n'])).toEqual([{ event: '', data: 'a' }]);
		});
	});

	describe('fields', () => {
		it('strips exactly one leading space from values', () => {
			expect(parse(['data:a\n\ndata:  b\n\ndata: \n\n'])).toEqual([
				{ event: '', data: 'a' },
				{ event: '', data: ' b' },
				{ event: '', data: '' },
			]);
		});

		it('keeps colons after the first in values', () => {
			expect(parse(['data: {"a":"b:c"}\n\n'])).toEqual([{ event: '', data: '{"a":"b:c"}' }]);
		});

		it('treats a line without a colon as a field with an empty value', () => {
			expect(parse(['data\ndata\n\n'])).toEqual([{ event: '', data: '\n' }]);
		});

		it('ignores comments, id, retry and unknown fields', () => {
			expect(parse([': keepalive\nid: 1\nretry: 10\nfoo: bar\nDATA: x\ndata: y\n:\n\n'])).toEqual([
				{ event: '', data: 'y' },
			]);
		});

		it('preserves non-ASCII text', () => {
			expect(parse(['event: é\ndata: 漢🙂\n\n'])).toEqual([{ event: 'é', data: '漢🙂' }]);
		});
	});

	describe('dispatch', () => {
		it('dispatches a named event without data', () => {
			expect(parse(['event: complete\n\n'])).toEqual([{ event: 'complete', data: '' }]);
		});

		it('does not dispatch blank lines or comment-only blocks', () => {
			expect(parse(['\n\n: ping\n\n\r\n'])).toEqual([]);
		});

		it('resets the event name after each message', () => {
			expect(parse(['event: next\ndata: 1\n\ndata: 2\n\n'])).toEqual([
				{ event: 'next', data: '1' },
				{ event: '', data: '2' },
			]);
		});

		it('does not dispatch a message until its blank line arrives', () => {
			expect(parse(['data: 1\n', 'data: 2'])).toEqual([]);
		});
	});

	describe('maxMessageSize', () => {
		it('bounds an unterminated line across chunks', () => {
			const parser = new ServerSentEventParser(10);
			expect([...parser.feed('data: 12')]).toEqual([]);
			expect(() => [...parser.feed('3456789')]).toThrow(SuiGraphQLRequestError);
		});

		it('bounds accumulated data lines', () => {
			expect(() => parse(['data: 12345\n'.repeat(3)], 10)).toThrow('maxMessageSize');
		});

		it('resets the bound for each message', () => {
			expect(parse(['data: 12345\n\n'.repeat(3)], 10)).toHaveLength(3);
		});

		it('yields earlier messages before reporting an oversized one', () => {
			const parser = new ServerSentEventParser(10);
			const iterator = parser.feed(`data: 1\n\ndata: ${'x'.repeat(20)}\n`);
			expect(iterator.next()).toEqual({ value: { event: '', data: '1' }, done: false });
			expect(() => iterator.next()).toThrow('maxMessageSize');
		});
	});
});
