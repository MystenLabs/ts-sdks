// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { formatAmount, formatSui, parseAmount, parseSui } from '../../../src/utils/format.js';

describe('formatAmount', () => {
	it('formats whole numbers', () => {
		expect(formatAmount(1000000000n, 9)).toEqual('1');
		expect(formatAmount(5000000000n, 9)).toEqual('5');
		expect(formatAmount(0n, 9)).toEqual('0');
	});

	it('formats fractional amounts and strips trailing zeros', () => {
		expect(formatAmount(1500000000n, 9)).toEqual('1.5');
		expect(formatAmount(1230000000n, 9)).toEqual('1.23');
		expect(formatAmount(100000000n, 9)).toEqual('0.1');
		expect(formatAmount(1n, 9)).toEqual('0.000000001');
	});

	it('works with different decimal places', () => {
		expect(formatAmount(1000000n, 6)).toEqual('1');
		expect(formatAmount(1500000n, 6)).toEqual('1.5');
		expect(formatAmount(42n, 0)).toEqual('42');
	});

	it('handles negative values', () => {
		expect(formatAmount(-1n, 9)).toEqual('-0.000000001');
		expect(formatAmount(-1500000000n, 9)).toEqual('-1.5');
		expect(formatAmount(-1000000000n, 9)).toEqual('-1');
	});

	it('throws on invalid decimals', () => {
		expect(() => formatAmount(1n, -1)).toThrow('Invalid decimals');
		expect(() => formatAmount(1n, 78)).toThrow('Invalid decimals');
	});

	it('handles values beyond MAX_SAFE_INTEGER', () => {
		const u128Max = 2n ** 128n - 1n;
		expect(formatAmount(u128Max, 9)).toEqual('340282366920938463463374607431.768211455');
	});
});

describe('parseAmount', () => {
	it('parses whole and fractional amounts', () => {
		expect(parseAmount('1', 9)).toEqual(1000000000n);
		expect(parseAmount('1.5', 9)).toEqual(1500000000n);
		expect(parseAmount('0.000000001', 9)).toEqual(1n);
		expect(parseAmount('0', 9)).toEqual(0n);
	});

	it('handles negative values', () => {
		expect(parseAmount('-1.5', 9)).toEqual(-1500000000n);
		expect(parseAmount('-0.5', 9)).toEqual(-500000000n);
	});

	it('works with different decimal places', () => {
		expect(parseAmount('1.5', 6)).toEqual(1500000n);
		expect(parseAmount('42', 0)).toEqual(42n);
	});

	it('throws on too many decimal places', () => {
		expect(() => parseAmount('1.0000000001', 9)).toThrow('Too many decimal places');
	});

	it('rejects invalid input', () => {
		expect(() => parseAmount('', 9)).toThrow('Invalid amount');
		expect(() => parseAmount('0x1', 9)).toThrow('Invalid amount');
		expect(() => parseAmount('.5', 9)).toThrow('Invalid amount');
		expect(() => parseAmount('1.2.3', 9)).toThrow('Invalid amount');
		expect(() => parseAmount(' 1 ', 9)).toThrow('Invalid amount');
		expect(() => parseAmount('1e5', 9)).toThrow('Invalid amount');
	});

	it('throws on invalid decimals', () => {
		expect(() => parseAmount('1', -1)).toThrow('Invalid decimals');
		expect(() => parseAmount('1', 78)).toThrow('Invalid decimals');
	});

	it('handles values beyond MAX_SAFE_INTEGER', () => {
		const u128Max = 2n ** 128n - 1n;
		expect(parseAmount('340282366920938463463374607431.768211455', 9)).toEqual(u128Max);
	});
});

describe('formatAmount/parseAmount round-trip', () => {
	it('round-trips across value ranges and decimal configurations', () => {
		const cases: [bigint, number][] = [
			[0n, 9],
			[1n, 9],
			[1500000000n, 9],
			[999999999n, 9],
			[-1n, 9],
			[-1500000000n, 9],
			[1500000n, 6],
			[42n, 0],
			[2n ** 128n - 1n, 9],
		];
		for (const [value, decimals] of cases) {
			expect(parseAmount(formatAmount(value, decimals), decimals)).toEqual(value);
		}
	});
});

describe('formatSui/parseSui', () => {
	it('formats MIST to SUI and back', () => {
		expect(formatSui(1000000000n)).toEqual('1');
		expect(formatSui(1500000000n)).toEqual('1.5');
		expect(parseSui('1')).toEqual(1000000000n);
		expect(parseSui('1.5')).toEqual(1500000000n);
	});
});
