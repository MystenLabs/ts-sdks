// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { createEncoder } from '../src/bcs-encode.js';
import { createDecoder } from '../src/bcs-decode.js';
import { bcs } from '../src/bcs.js';

/** Encode a ULEB value using the encoder. Returns the raw bytes. */
function encodeLeb(value: number): Uint8Array {
	const enc = createEncoder();
	enc.initEncode();
	enc.ensure(10);
	enc.writeUleb(value);
	return enc.getEncodeResult();
}

/** Decode a ULEB value from raw bytes using the decoder. Returns { value, length }. */
function decodeLeb(bytes: number[] | Uint8Array): { value: number; length: number } {
	const dec = createDecoder();
	dec.init(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
	const value = dec.readUleb();
	return { value, length: dec.offset };
}

describe('ULEB Encoding and Decoding', () => {
	describe('encoder writeUleb', () => {
		it('should encode zero', () => {
			expect([...encodeLeb(0)]).toEqual([0]);
		});

		it('should encode small positive numbers', () => {
			expect([...encodeLeb(1)]).toEqual([1]);
			expect([...encodeLeb(127)]).toEqual([127]);
		});

		it('should encode multi-byte numbers', () => {
			expect([...encodeLeb(128)]).toEqual([0x80, 0x01]);
			expect([...encodeLeb(129)]).toEqual([0x81, 0x01]);
			expect([...encodeLeb(255)]).toEqual([0xff, 0x01]);
			expect([...encodeLeb(300)]).toEqual([0xac, 0x02]);
		});

		it('should encode large numbers correctly', () => {
			expect([...encodeLeb(16384)]).toEqual([0x80, 0x80, 0x01]);
			expect([...encodeLeb(2097152)]).toEqual([0x80, 0x80, 0x80, 0x01]);
		});

		it('should encode 2^31', () => {
			expect([...encodeLeb(2147483648)]).toEqual([0x80, 0x80, 0x80, 0x80, 0x08]);
		});

		it('should encode 2^32 - 1', () => {
			expect([...encodeLeb(4294967295)]).toEqual([0xff, 0xff, 0xff, 0xff, 0x0f]);
		});

		it('should encode 2^32', () => {
			expect([...encodeLeb(4294967296)]).toEqual([0x80, 0x80, 0x80, 0x80, 0x10]);
		});

		it('should encode 2^40 - 1', () => {
			expect([...encodeLeb(1099511627775)]).toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0x1f]);
		});

		it('should encode 2^53 - 1 (MAX_SAFE_INTEGER)', () => {
			expect([...encodeLeb(Number.MAX_SAFE_INTEGER)]).toEqual([
				0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x0f,
			]);
		});
	});

	describe('decoder readUleb', () => {
		it('should decode zero', () => {
			const result = decodeLeb([0]);
			expect(result.value).toBe(0);
			expect(result.length).toBe(1);
		});

		it('should decode small positive numbers', () => {
			expect(decodeLeb([1]).value).toBe(1);
			expect(decodeLeb([127]).value).toBe(127);
		});

		it('should decode multi-byte numbers', () => {
			expect(decodeLeb([0x80, 0x01]).value).toBe(128);
			expect(decodeLeb([0x81, 0x01]).value).toBe(129);
			expect(decodeLeb([0xff, 0x01]).value).toBe(255);
			expect(decodeLeb([0xac, 0x02]).value).toBe(300);
		});

		it('should decode large numbers correctly', () => {
			expect(decodeLeb([0x80, 0x80, 0x01]).value).toBe(16384);
			expect(decodeLeb([0x80, 0x80, 0x80, 0x01]).value).toBe(2097152);
		});

		it('should return correct length for encoded data', () => {
			expect(decodeLeb([1]).length).toBe(1);
			expect(decodeLeb([0x80, 0x01]).length).toBe(2);
			expect(decodeLeb([0x80, 0x80, 0x01]).length).toBe(3);

			const result = decodeLeb([0x80, 0x01, 0xff, 0xff]);
			expect(result.value).toBe(128);
			expect(result.length).toBe(2);
		});

		it('should handle Uint8Array input', () => {
			const result = decodeLeb(new Uint8Array([0x80, 0x01]));
			expect(result.value).toBe(128);
			expect(result.length).toBe(2);
		});

		it('should decode 2^31', () => {
			expect(decodeLeb([0x80, 0x80, 0x80, 0x80, 0x08]).value).toBe(2147483648);
		});

		it('should decode 2^32 - 1', () => {
			expect(decodeLeb([0xff, 0xff, 0xff, 0xff, 0x0f]).value).toBe(4294967295);
		});

		it('should decode 2^32', () => {
			expect(decodeLeb([0x80, 0x80, 0x80, 0x80, 0x10]).value).toBe(4294967296);
		});

		it('should decode 2^40 - 1', () => {
			expect(decodeLeb([0xff, 0xff, 0xff, 0xff, 0xff, 0x1f]).value).toBe(1099511627775);
		});

		it('should decode 2^53 - 1 (MAX_SAFE_INTEGER)', () => {
			expect(decodeLeb([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x0f]).value).toBe(
				Number.MAX_SAFE_INTEGER,
			);
		});
	});

	describe('round-trip encoding/decoding', () => {
		it('should round-trip encode and decode various values', () => {
			const testValues = [
				0,
				1,
				127,
				128,
				129,
				255,
				256,
				300,
				1000,
				16384,
				65535,
				1000000,
				2097152,
				2147483648, // 2^31
				4294967295, // 2^32 - 1
				4294967296, // 2^32
				1099511627775, // 2^40 - 1
				Number.MAX_SAFE_INTEGER, // 2^53 - 1
			];

			for (const value of testValues) {
				const encoded = encodeLeb(value);
				const decoded = decodeLeb(encoded);
				expect(decoded.value).toBe(value);
				expect(decoded.length).toBe(encoded.length);
			}
		});

		it('should correctly report consumed bytes when buffer has extra data', () => {
			const encoded = encodeLeb(300);
			const withExtra = new Uint8Array([...encoded, 0xaa, 0xbb, 0xcc]);

			const result = decodeLeb(withExtra);
			expect(result.value).toBe(300);
			expect(result.length).toBe(encoded.length);
		});
	});

	describe('malformed input via BcsType.parse', () => {
		// The low-level decoder does not bounds-check individual byte reads
		// (for performance). Malformed ULEB input is caught at the BcsType.parse()
		// layer via the post-decode offset check.
		it('should throw when parsing a vector from empty bytes', () => {
			expect(() => bcs.vector(bcs.u8()).parse(new Uint8Array([]))).toThrow();
		});

		it('should throw when parsing a string from truncated ULEB', () => {
			// 0x80 is a continuation byte with no terminator
			expect(() => bcs.string().parse(new Uint8Array([0x80]))).toThrow();
		});
	});
});
