// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parse } from 'valibot';
import { describe, expect, test } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { SuiAddress } from '../../../src/transactions/data/internal.js';
import { Transaction } from '../../../src/transactions/index.js';
import {
	isValidSuiAddress,
	isValidSuiObjectId,
	normalizeStructTag,
	normalizeSuiAddress,
	normalizeSuiObjectId,
	parseStructTag,
} from '../../../src/utils/sui-types.js';

const FULL = '0x00000000000000000000000000000000000000000000000000000000deadbeef';
const MAX = `0x${'f'.repeat(64)}`;

describe('normalizeSuiAddress', () => {
	test('pads short hex addresses', () => {
		expect(normalizeSuiAddress('0xdeadbeef')).toBe(FULL);
		expect(normalizeSuiAddress('0x0')).toBe(`0x${'0'.repeat(64)}`);
		expect(normalizeSuiAddress('0x2')).toBe(`0x${'0'.repeat(63)}2`);
	});

	test('accepts input without a 0x prefix', () => {
		expect(normalizeSuiAddress('deadbeef')).toBe(FULL);
	});

	test('lowercases uppercase hex and prefixes', () => {
		expect(normalizeSuiAddress('0xDEADBEEF')).toBe(FULL);
		expect(normalizeSuiAddress('0XDEADBEEF')).toBe(FULL);
	});

	test('accepts full-length addresses', () => {
		expect(normalizeSuiAddress(MAX)).toBe(MAX);
		expect(normalizeSuiAddress(MAX.slice(2))).toBe(MAX);
	});

	test('throws on non-hex input', () => {
		expect(() => normalizeSuiAddress('0xzz')).toThrowError('Invalid Sui address: 0xzz');
		expect(() => normalizeSuiAddress('0xbadchars')).toThrowError('Invalid Sui address: 0xbadchars');
		expect(() => normalizeSuiAddress('@org/pkg')).toThrowError('Invalid Sui address: @org/pkg');
		expect(() => normalizeSuiAddress('name.sui')).toThrowError('Invalid Sui address: name.sui');
		expect(() => normalizeSuiAddress('0x 1')).toThrowError('Invalid Sui address');
		expect(() => normalizeSuiAddress('0x0x1')).toThrowError('Invalid Sui address');
	});

	test('throws on empty input', () => {
		expect(() => normalizeSuiAddress('')).toThrowError('Invalid Sui address');
		expect(() => normalizeSuiAddress('0x')).toThrowError('Invalid Sui address');
	});

	test('throws on input longer than 32 bytes', () => {
		expect(() => normalizeSuiAddress(`${MAX}0`)).toThrowError('Invalid Sui address');
		expect(() => normalizeSuiAddress(`0x00${MAX.slice(2)}`)).toThrowError('Invalid Sui address');
	});

	test('forceAdd0x treats a leading 0x as part of the value', () => {
		expect(() => normalizeSuiAddress('0x1', true)).toThrowError('Invalid Sui address');
		expect(normalizeSuiAddress('1', true)).toBe(`0x${'0'.repeat(63)}1`);
	});

	test('normalizeSuiObjectId follows the same rules', () => {
		expect(normalizeSuiObjectId('0xDEADBEEF')).toBe(FULL);
		expect(() => normalizeSuiObjectId('0xzz')).toThrowError('Invalid Sui address: 0xzz');
	});
});

describe('isValidSuiAddress', () => {
	test('returns false instead of throwing for invalid input', () => {
		for (const value of ['', '0x', '0xzz', '@org/pkg', `${MAX}0`, '0x2']) {
			expect(isValidSuiAddress(value)).toBe(false);
			expect(isValidSuiObjectId(value)).toBe(false);
		}
	});

	test('returns true for full-length addresses', () => {
		expect(isValidSuiAddress(FULL)).toBe(true);
		expect(isValidSuiAddress(MAX)).toBe(true);
	});
});

describe('struct tags', () => {
	test('parseStructTag keeps MVR names and normalizes hex addresses', () => {
		expect(parseStructTag('@mysten/sui::coin::Coin<0x2::sui::SUI>')).toEqual({
			address: '@mysten/sui',
			module: 'coin',
			name: 'Coin',
			typeParams: [
				{
					address: `0x${'0'.repeat(63)}2`,
					module: 'sui',
					name: 'SUI',
					typeParams: [],
				},
			],
		});
	});

	test('normalizeStructTag throws on non-hex, non-MVR addresses', () => {
		expect(() => normalizeStructTag('0xzz::m::T')).toThrowError('Invalid Sui address: 0xzz');
		expect(() => normalizeStructTag('0x2::m::T<0xzz::m::T>')).toThrowError(
			'Invalid Sui address: 0xzz',
		);
	});
});

describe('transaction inputs', () => {
	test('tx.object rejects invalid ids with a clear message', () => {
		const tx = new Transaction();
		expect(() => tx.object('0xzz')).toThrowError('Invalid Sui address: 0xzz');
	});

	test('SuiAddress schema reports a clear message and still normalizes', () => {
		expect(parse(SuiAddress, '0x2')).toBe(`0x${'0'.repeat(63)}2`);
		expect(() => parse(SuiAddress, '0xzz')).toThrowError('Invalid Sui address: 0xzz');
	});

	test('serializing a transaction with an invalid sender fails clearly', async () => {
		const tx = new Transaction();
		tx.setSender('not-an-address');
		await expect(tx.toJSON()).rejects.toThrowError('Invalid Sui address: not-an-address');
	});

	test('bcs.Address keeps its own validation message', () => {
		expect(() => bcs.Address.serialize('0xzz')).toThrowError('Invalid Sui address 0xzz');
		expect(bcs.Address.serialize('0x2').toBytes()).toHaveLength(32);
	});
});
