// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';

import { fromBase64, fromHex, toBase64, toHex } from '../src/index.js';

function prng(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function randomBytes(random: () => number, length: number) {
	const bytes = new Uint8Array(length);
	for (let i = 0; i < length; i++) {
		bytes[i] = Math.floor(random() * 256);
	}
	return bytes;
}

const ALL_BYTES = Uint8Array.from({ length: 256 }, (_, i) => i);
const SIZES = [0, 1, 2, 3, 4, 31, 32, 33, 255, 1024, 8191, 8192, 8193, 16384, 20000];

describe('hex', () => {
	it('encodes every byte value as two lowercase digits', () => {
		expect(toHex(new Uint8Array())).toBe('');
		expect(toHex(new Uint8Array([0, 1, 0x0f, 0x10, 0xab, 0xff]))).toBe('00010f10abff');
		expect(toHex(ALL_BYTES)).toBe(Buffer.from(ALL_BYTES).toString('hex'));
	});

	it('decodes empty input', () => {
		expect(fromHex('')).toEqual(new Uint8Array());
		expect(fromHex('0x')).toEqual(new Uint8Array());
	});

	it('left-pads odd-length input', () => {
		expect(fromHex('1')).toEqual(new Uint8Array([1]));
		expect(fromHex('0x1')).toEqual(new Uint8Array([1]));
		expect(fromHex('abc')).toEqual(new Uint8Array([0x0a, 0xbc]));
	});

	it('accepts upper, lower and mixed case digits', () => {
		expect(fromHex('ABCDEF')).toEqual(new Uint8Array([0xab, 0xcd, 0xef]));
		expect(fromHex('abcdef')).toEqual(new Uint8Array([0xab, 0xcd, 0xef]));
		expect(fromHex('0xAbCdEf')).toEqual(new Uint8Array([0xab, 0xcd, 0xef]));
		expect(fromHex(toHex(ALL_BYTES).toUpperCase())).toEqual(ALL_BYTES);
	});

	it('only strips a lowercase 0x prefix, once', () => {
		expect(() => fromHex('0X12')).toThrow('Invalid hex string 0X12');
		expect(() => fromHex('0x0x12')).toThrow('Invalid hex string 0x0x12');
		expect(fromHex('0x0012')).toEqual(new Uint8Array([0, 0x12]));
	});

	it('throws on any non-hex character', () => {
		for (const input of [
			'g0',
			'0g',
			'12 34',
			' 1234',
			'1234 ',
			'12\n34',
			'-1',
			'+1',
			'é1',
			'1.',
			'x1',
		]) {
			expect(() => fromHex(input)).toThrow(`Invalid hex string ${input}`);
		}
	});

	it('round-trips random bytes', () => {
		const random = prng(1);
		for (const size of SIZES) {
			for (let i = 0; i < 10; i++) {
				const bytes = randomBytes(random, size);
				const hex = toHex(bytes);
				expect(hex).toBe(Buffer.from(bytes).toString('hex'));
				expect(fromHex(hex)).toEqual(bytes);
				expect(fromHex(`0x${hex}`)).toEqual(bytes);
				expect(fromHex(hex.toUpperCase())).toEqual(bytes);
			}
		}
	});
});

describe('base64', () => {
	it('handles empty input', () => {
		expect(toBase64(new Uint8Array())).toBe('');
		expect(fromBase64('')).toEqual(new Uint8Array());
	});

	it('encodes with padding', () => {
		expect(toBase64(new Uint8Array([1]))).toBe('AQ==');
		expect(toBase64(new Uint8Array([1, 2]))).toBe('AQI=');
		expect(toBase64(new Uint8Array([1, 2, 3]))).toBe('AQID');
		expect(toBase64(ALL_BYTES)).toBe(Buffer.from(ALL_BYTES).toString('base64'));
	});

	it('accepts input with or without padding', () => {
		expect(fromBase64('AQ==')).toEqual(new Uint8Array([1]));
		expect(fromBase64('AQ')).toEqual(new Uint8Array([1]));
		expect(fromBase64('AQI=')).toEqual(new Uint8Array([1, 2]));
		expect(fromBase64('AQI')).toEqual(new Uint8Array([1, 2]));
	});

	it('ignores ASCII whitespace', () => {
		expect(fromBase64(' AQ ID\n\t')).toEqual(new Uint8Array([1, 2, 3]));
	});

	it('ignores non-zero trailing bits', () => {
		expect(fromBase64('AR==')).toEqual(new Uint8Array([1]));
	});

	it('throws on malformed input', () => {
		for (const input of [
			'A',
			'AQ=',
			'AQID=',
			'=',
			'====',
			'AQ==AQ==',
			'AQ=x',
			'AQ-D',
			'AQ_D',
			'AQ.D',
			'AQé=',
		]) {
			expect(() => fromBase64(input), input).toThrow();
		}
	});

	it('round-trips random bytes', () => {
		const random = prng(2);
		for (const size of SIZES) {
			for (let i = 0; i < 10; i++) {
				const bytes = randomBytes(random, size);
				const base64 = toBase64(bytes);
				expect(base64).toBe(Buffer.from(bytes).toString('base64'));
				expect(fromBase64(base64)).toEqual(bytes);
			}
		}
	});
});

describe('without Buffer', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('encodes and decodes using only web APIs', () => {
		const random = prng(3);
		const bytes = randomBytes(random, 10000);
		const expectedHex = Buffer.from(bytes).toString('hex');
		const expectedBase64 = Buffer.from(bytes).toString('base64');

		vi.stubGlobal('Buffer', undefined);

		expect(toHex(bytes)).toBe(expectedHex);
		expect(fromHex(expectedHex)).toEqual(bytes);
		expect(toBase64(bytes)).toBe(expectedBase64);
		expect(fromBase64(expectedBase64)).toEqual(bytes);
	});
});
