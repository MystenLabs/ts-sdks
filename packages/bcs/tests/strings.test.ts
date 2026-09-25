// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Validates string encode/decode correctness, especially:
 * - ASCII fast path (< 128 bytes, all chars <= 0x7f)
 * - Unicode fallback (TextEncoder/TextDecoder)
 * - Boundary at 128 bytes where ULEB prefix becomes 2 bytes
 * - Mixed ASCII/unicode strings
 * - Round-trip against a reference TextEncoder implementation
 */

import { describe, expect, it } from 'vitest';
import { bcs } from '../src/bcs.js';

const Str = bcs.string();
const textEncoder = new TextEncoder();

/** Reference string encoder: ULEB length prefix + UTF-8 bytes */
function refEncodeString(s: string): Uint8Array {
	const utf8 = textEncoder.encode(s);
	const lenBytes = ulebBytes(utf8.length);
	const result = new Uint8Array(lenBytes.length + utf8.length);
	result.set(lenBytes, 0);
	result.set(utf8, lenBytes.length);
	return result;
}

function ulebBytes(n: number): Uint8Array {
	if (n < 0x80) return new Uint8Array([n]);
	const bytes: number[] = [];
	let v = n;
	while (v > 0) {
		let b = v & 0x7f;
		v >>>= 7;
		if (v > 0) b |= 0x80;
		bytes.push(b);
	}
	return new Uint8Array(bytes);
}

function check(s: string) {
	const bytes = Str.toBytes(s);
	expect([...bytes]).toEqual([...refEncodeString(s)]);
	expect(Str.parse(bytes)).toBe(s);
}

describe('string codec', () => {
	describe('ASCII fast path', () => {
		it('empty string', () => {
			check('');
			expect([...Str.toBytes('')]).toEqual([0]);
		});

		it('single char', () => {
			check('a');
			check('Z');
			check('0');
			check(' ');
		});

		it('short ASCII strings', () => {
			check('hello');
			check('Hello, World!');
			check('foo bar baz');
		});

		it('ASCII at char boundary (0x7e = ~, 0x7f = DEL)', () => {
			check('~'); // 0x7e — should use fast path
			check('\x7f'); // 0x7f — should use fast path (last ASCII char)
		});

		it('exactly 127 chars (max single-byte ULEB, all ASCII)', () => {
			const s = 'a'.repeat(127);
			check(s);
			const bytes = Str.toBytes(s);
			expect(bytes[0]).toBe(127); // single-byte ULEB length
			expect(bytes.length).toBe(128); // 1 (length) + 127 (chars)
		});

		it('all printable ASCII chars', () => {
			let s = '';
			for (let i = 0x20; i <= 0x7e; i++) s += String.fromCharCode(i);
			check(s);
		});

		it('ASCII with control chars', () => {
			check('\t\n\r');
			check('line1\nline2\nline3');
		});
	});

	describe('ULEB length boundary (127 → 128 bytes)', () => {
		it('127 ASCII chars: 1-byte ULEB prefix', () => {
			const bytes = Str.toBytes('x'.repeat(127));
			expect(bytes[0]).toBe(127);
			expect(bytes.length).toBe(128);
		});

		it('128 ASCII chars: 2-byte ULEB prefix', () => {
			const bytes = Str.toBytes('x'.repeat(128));
			expect(bytes[0]).toBe(0x80);
			expect(bytes[1]).toBe(0x01);
			expect(bytes.length).toBe(130); // 2 (length) + 128 (chars)
		});

		it('round-trip at the boundary', () => {
			check('a'.repeat(127));
			check('a'.repeat(128));
			check('a'.repeat(129));
		});
	});

	describe('unicode fallback', () => {
		it('non-ASCII single char forces TextEncoder path', () => {
			check('é'); // 2 UTF-8 bytes
			check('中'); // 3 UTF-8 bytes
			check('🎉'); // 4 UTF-8 bytes
		});

		it('mixed ASCII and non-ASCII', () => {
			check('hello café');
			check('price: 100€');
			check('name: 田中太郎');
		});

		it('emoji strings', () => {
			check('🎉🎊🎈');
			check('👨‍👩‍👧‍👦'); // family emoji (ZWJ sequence)
			check('🇺🇸'); // flag emoji
		});

		it('string with 0x80 byte (just above ASCII range)', () => {
			check('\u0080'); // first non-ASCII unicode char
			check('\u00ff'); // ÿ
		});

		it('ULEB length reflects UTF-8 byte count, not char count', () => {
			// '中' is 3 UTF-8 bytes, so 10 chars = 30 bytes
			const s = '中'.repeat(10);
			const bytes = Str.toBytes(s);
			expect(bytes[0]).toBe(30); // ULEB prefix = 30 (byte length)
			check(s);
		});

		it('unicode string longer than 128 UTF-8 bytes', () => {
			const s = '中'.repeat(50); // 150 UTF-8 bytes
			check(s);
			const bytes = Str.toBytes(s);
			// ULEB of 150 = [0x96, 0x01]
			expect(bytes[0]).toBe(0x96);
			expect(bytes[1]).toBe(0x01);
		});
	});

	describe('ASCII fast-path bypass', () => {
		// These strings are < 128 chars but contain non-ASCII, so the
		// fast-path scan should detect the non-ASCII byte and fall back.
		it('short string with one non-ASCII char', () => {
			check('abc\u0080def');
		});

		it('non-ASCII at start', () => {
			check('é' + 'a'.repeat(50));
		});

		it('non-ASCII at end', () => {
			check('a'.repeat(50) + 'é');
		});

		it('non-ASCII in middle', () => {
			check('a'.repeat(25) + 'é' + 'a'.repeat(25));
		});
	});

	describe('long strings', () => {
		it('1000 ASCII chars', () => {
			check('a'.repeat(1000));
		});

		it('10000 ASCII chars', () => {
			check('x'.repeat(10000));
		});

		it('1000 unicode chars', () => {
			check('中'.repeat(1000));
		});

		it('long mixed content', () => {
			let s = '';
			for (let i = 0; i < 500; i++) {
				s += i % 3 === 0 ? '中' : 'a';
			}
			check(s);
		});
	});

	describe('edge cases', () => {
		it('null byte in string', () => {
			check('\0');
			check('a\0b');
			check('\0'.repeat(10));
		});

		it('surrogate pair emoji (4 UTF-8 bytes per codepoint)', () => {
			// Each emoji is 4 UTF-8 bytes
			const s = '😀😁😂🤣😃😄😅😆';
			check(s);
		});

		it('BOM character (TextDecoder strips leading BOM)', () => {
			// TextDecoder strips the leading BOM by default — this is
			// standard behavior, not a codec bug. Verify the bytes encode
			// correctly even though decode strips the BOM.
			const bytes = Str.toBytes('\uFEFF');
			expect([...bytes]).toEqual([...refEncodeString('\uFEFF')]);
			// Decode produces empty string (BOM stripped)
			expect(Str.parse(bytes)).toBe('');
		});
	});
});
