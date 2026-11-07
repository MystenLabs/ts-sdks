// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, test } from 'vitest';

import { createCoinReservationRef } from '../../../src/utils/coin-reservation.js';
import { isCoinReservationDigest, normalizeSuiAddress } from '../../../src/utils/index.js';

const OWNER = normalizeSuiAddress('0xabc');
const CHAIN = toBase58(new Uint8Array(32).fill(1));

describe('coin reservation utils', () => {
	test('isCoinReservationDigest recognises a ref from createCoinReservationRef', () => {
		const ref = createCoinReservationRef(100n, OWNER, CHAIN, '7');

		expect(ref.version).toBe('0');
		expect(isCoinReservationDigest(ref.digest)).toBe(true);
	});

	test('isCoinReservationDigest rejects a normal object digest', () => {
		expect(isCoinReservationDigest(toBase58(new Uint8Array(32).fill(7)))).toBe(false);
	});

	test('isCoinReservationDigest rejects digests shorter than 32 bytes', () => {
		expect(isCoinReservationDigest('')).toBe(false);
		expect(isCoinReservationDigest('1')).toBe(false);
		expect(isCoinReservationDigest(toBase58(new Uint8Array(12).fill(7)))).toBe(false);
	});
});
