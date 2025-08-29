// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from 'vitest';

import { normalizeSuiAddress } from '../../../src/utils';

describe('normalizeSuiAddress', () => {
	test('normalizes Sui addresses', () => {
		expect(normalizeSuiAddress('0xdeadbeef')).toBe(
			'0x00000000000000000000000000000000000000000000000000000000deadbeef',
		);
		expect(normalizeSuiAddress('deadbeef')).toBe(
			'0x00000000000000000000000000000000000000000000000000000000deadbeef',
		);
		expect(normalizeSuiAddress('0x0')).toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		);
	});

	test('throws when address is not valid', () => {
		expect(() => normalizeSuiAddress('0xbadchars')).toThrowError('Invalid Sui address: 0xbadchars');
	});
});
