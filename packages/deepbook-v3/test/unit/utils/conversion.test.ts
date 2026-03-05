// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { convertPrice, convertQuantity, convertRate } from '../../../src/utils/conversion.js';

const FLOAT_SCALAR = 1_000_000_000; // 1e9
const DEEP_SCALAR = 1_000_000; // 1e6

describe('convertQuantity', () => {
	it('scales number input by scalar', () => {
		expect(convertQuantity(1.5, FLOAT_SCALAR)).toBe(1_500_000_000n);
	});

	it('returns 0n for number zero', () => {
		expect(convertQuantity(0, FLOAT_SCALAR)).toBe(0n);
	});

	it('handles small fractional numbers', () => {
		expect(convertQuantity(0.001, DEEP_SCALAR)).toBe(1_000n);
	});

	it('passes bigint through without scaling', () => {
		expect(convertQuantity(1_500_000_000n, FLOAT_SCALAR)).toBe(1_500_000_000n);
	});

	it('passes bigint zero through', () => {
		expect(convertQuantity(0n, FLOAT_SCALAR)).toBe(0n);
	});

	it('rounds fractional results via Math.round', () => {
		// 1.0000005 * 1e6 = 1000000.5 → Math.round → 1000001 (round half up)
		expect(convertQuantity(1.0000005, DEEP_SCALAR)).toBe(1_000_001n);
	});
});

describe('convertPrice', () => {
	it('scales number input with cross-scalar formula', () => {
		// price=1.5, formula: Math.round((1.5 * 1e9 * 1e6) / 1e9) = 1500000
		expect(convertPrice(1.5, FLOAT_SCALAR, DEEP_SCALAR, FLOAT_SCALAR)).toBe(1_500_000n);
	});

	it('passes bigint through without scaling', () => {
		expect(convertPrice(1_500_000n, FLOAT_SCALAR, DEEP_SCALAR, FLOAT_SCALAR)).toBe(1_500_000n);
	});

	it('handles equal base/quote scalars (stable pair)', () => {
		// price=1.0 with same scalar: Math.round((1.0 * 1e9 * 1e6) / 1e6) = 1000000000
		expect(convertPrice(1.0, FLOAT_SCALAR, DEEP_SCALAR, DEEP_SCALAR)).toBe(1_000_000_000n);
	});

	it('returns 0n for number zero', () => {
		expect(convertPrice(0, FLOAT_SCALAR, DEEP_SCALAR, FLOAT_SCALAR)).toBe(0n);
	});
});

describe('convertRate', () => {
	it('scales number input by floatScalar', () => {
		// 0.001 * 1e9 = 1000000
		expect(convertRate(0.001, FLOAT_SCALAR)).toBe(1_000_000n);
	});

	it('passes bigint through without scaling', () => {
		expect(convertRate(1_000_000n, FLOAT_SCALAR)).toBe(1_000_000n);
	});

	it('returns 0n for number zero', () => {
		expect(convertRate(0, FLOAT_SCALAR)).toBe(0n);
	});
});
