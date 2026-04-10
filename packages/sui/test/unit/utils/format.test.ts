// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from 'vitest';

import { parseToMist, parseToUnits } from '../../../src/utils/format.js';

describe('parseToUnits', () => {
	test('parses whole and fractional amounts', () => {
		expect(parseToUnits('1', 9)).toEqual(1000000000n);
		expect(parseToUnits('1.5', 9)).toEqual(1500000000n);
		expect(parseToUnits('0.000000001', 9)).toEqual(1n);
		expect(parseToUnits('0', 9)).toEqual(0n);
	});

	test('handles negative values', () => {
		expect(parseToUnits('-1.5', 9)).toEqual(-1500000000n);
		expect(parseToUnits('-0.5', 9)).toEqual(-500000000n);
	});

	test('normalizes negative zero to 0n', () => {
		expect(parseToUnits('-0', 9)).toEqual(0n);
		expect(parseToUnits('-0.0', 9)).toEqual(0n);
		expect(parseToUnits('-0.000000000', 9)).toEqual(0n);
	});

	test('accepts leading zeros (ecosystem norm)', () => {
		expect(parseToUnits('01.5', 9)).toEqual(1500000000n);
		expect(parseToUnits('007', 9)).toEqual(7000000000n);
	});

	test('accepts shorthand decimal notation', () => {
		expect(parseToUnits('.5', 9)).toEqual(500000000n);
		expect(parseToUnits('.000000001', 9)).toEqual(1n);
	});

	test('works with different decimal places', () => {
		expect(parseToUnits('1.5', 6)).toEqual(1500000n);
		expect(parseToUnits('42', 0)).toEqual(42n);
	});

	test('throws on too many decimal places', () => {
		expect(() => parseToUnits('1.0000000001', 9)).toThrow('Too many decimal places');
	});

	test('rejects invalid input', () => {
		expect(() => parseToUnits('', 9)).toThrow('Invalid amount');
		expect(() => parseToUnits('0x1', 9)).toThrow('Invalid amount');
		expect(() => parseToUnits('1.', 9)).toThrow('Invalid amount');
		expect(() => parseToUnits('1.2.3', 9)).toThrow('Invalid amount');
		expect(() => parseToUnits(' 1 ', 9)).toThrow('Invalid amount');
		expect(() => parseToUnits('1e5', 9)).toThrow('Invalid amount');
	});

	test('throws on invalid decimals', () => {
		expect(() => parseToUnits('1', -1)).toThrow('Invalid decimals');
		expect(() => parseToUnits('1', 1.5)).toThrow('Invalid decimals');
	});

	test('preserves precision above Number.MAX_SAFE_INTEGER', () => {
		expect(parseToUnits('10000000', 9)).toEqual(10_000_000_000_000_000n);
		expect(parseToUnits('9007199.254740993', 9)).toEqual(9_007_199_254_740_993n);
		expect(parseToUnits('340282366920938463463374607431.768211455', 9)).toEqual(2n ** 128n - 1n);
	});
});

describe('parseToMist', () => {
	test('parses SUI decimal strings into MIST', () => {
		expect(parseToMist('1')).toEqual(1000000000n);
		expect(parseToMist('1.5')).toEqual(1500000000n);
		expect(parseToMist('0.000000001')).toEqual(1n);
	});

	test('handles negative values', () => {
		expect(parseToMist('-1.5')).toEqual(-1500000000n);
	});

	test('rejects invalid input', () => {
		expect(() => parseToMist('1.')).toThrow('Invalid amount');
		expect(() => parseToMist('1.0000000001')).toThrow('Too many decimal places');
	});

	test('preserves precision above Number.MAX_SAFE_INTEGER', () => {
		expect(parseToMist('9007199.254740993')).toEqual(9_007_199_254_740_993n);
	});
});
