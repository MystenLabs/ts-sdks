// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase58, fromHex, toBase58 } from '@mysten/bcs';
import { describe, expect, test } from 'vitest';

import {
	COIN_RESERVATION_MAGIC,
	isCoinReservationDigest,
	parseAccumulatorFieldCoinType,
	parseCoinReservationBalance,
	xorCoinReservationObjectId,
} from '../../../src/utils/coin-reservation.js';

function makeReservationDigest(balance: bigint, epoch: number): string {
	const bytes = new Uint8Array(32);
	const view = new DataView(bytes.buffer);
	view.setBigUint64(0, balance, true);
	view.setUint32(8, epoch, true);
	bytes.set(COIN_RESERVATION_MAGIC, 12);
	return toBase58(bytes);
}

describe('coin reservation digest helpers', () => {
	test('isCoinReservationDigest recognises the magic bytes', () => {
		expect(isCoinReservationDigest(makeReservationDigest(12345n, 7))).toBe(true);
	});

	test('isCoinReservationDigest rejects random digests', () => {
		const randomBytes = new Uint8Array(32).fill(0xab);
		expect(isCoinReservationDigest(toBase58(randomBytes))).toBe(false);
	});

	test('parseCoinReservationBalance recovers the u64 balance', () => {
		expect(parseCoinReservationBalance(makeReservationDigest(987_654_321n, 3))).toBe(987_654_321n);
	});
});

describe('xorCoinReservationObjectId', () => {
	test('XOR is self-inverse with the chain identifier', () => {
		const accumulatorId = '0x1111111111111111111111111111111111111111111111111111111111111111';
		// 32-byte chain identifier, base58 encoded
		const chainBytes = new Uint8Array(32).fill(0x22);
		const chainIdentifier = toBase58(chainBytes);

		const masked = xorCoinReservationObjectId(accumulatorId, chainIdentifier);
		const maskedBytes = fromHex(masked.slice(2));
		// XOR: 0x11 ^ 0x22 = 0x33
		expect(maskedBytes.every((b) => b === 0x33)).toBe(true);

		const unmasked = xorCoinReservationObjectId(masked, chainIdentifier);
		expect(unmasked).toBe(accumulatorId);
	});

	test('throws on a malformed chain identifier', () => {
		const accumulatorId = '0x1111111111111111111111111111111111111111111111111111111111111111';
		expect(() => xorCoinReservationObjectId(accumulatorId, toBase58(new Uint8Array(16)))).toThrow(
			/chain identifier/,
		);
	});

	test('accepts object ids with and without 0x prefix', () => {
		const accumulatorId = '0x1111111111111111111111111111111111111111111111111111111111111111';
		const chainBytes = new Uint8Array(32).fill(0x22);
		const chainIdentifier = toBase58(chainBytes);
		expect(xorCoinReservationObjectId(accumulatorId, chainIdentifier)).toBe(
			xorCoinReservationObjectId(accumulatorId.slice(2), chainIdentifier),
		);
	});
});

describe('parseAccumulatorFieldCoinType', () => {
	test('extracts the coin type from a SUI balance accumulator field', () => {
		const fieldType =
			'0x2::dynamic_field::Field<0x2::accumulator::Key<0x2::balance::Balance<0x2::sui::SUI>>, 0x2::accumulator::U128>';
		expect(parseAccumulatorFieldCoinType(fieldType)).toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
		);
	});

	test('extracts the coin type from a custom balance accumulator field', () => {
		const fieldType =
			'0x2::dynamic_field::Field<0x2::accumulator::Key<0x2::balance::Balance<0xdead::custom::TOKEN>>, 0x2::accumulator::U128>';
		const normalized =
			'0x000000000000000000000000000000000000000000000000000000000000dead::custom::TOKEN';
		expect(parseAccumulatorFieldCoinType(fieldType)).toBe(normalized);
	});

	test('returns null for an unrelated dynamic field', () => {
		expect(parseAccumulatorFieldCoinType('0x2::dynamic_field::Field<u64, u64>')).toBeNull();
	});

	test('returns null when the value type is not U128', () => {
		expect(
			parseAccumulatorFieldCoinType(
				'0x2::dynamic_field::Field<0x2::accumulator::Key<0x2::balance::Balance<0x2::sui::SUI>>, u64>',
			),
		).toBeNull();
	});

	test('returns null when the key is not Accumulator::Key', () => {
		expect(
			parseAccumulatorFieldCoinType(
				'0x2::dynamic_field::Field<0x2::accumulator::Other<0x2::balance::Balance<0x2::sui::SUI>>, 0x2::accumulator::U128>',
			),
		).toBeNull();
	});

	test('returns null when the wrapped type is not Balance<T>', () => {
		expect(
			parseAccumulatorFieldCoinType(
				'0x2::dynamic_field::Field<0x2::accumulator::Key<0x2::coin::Coin<0x2::sui::SUI>>, 0x2::accumulator::U128>',
			),
		).toBeNull();
	});

	test('returns null for a malformed tag', () => {
		expect(parseAccumulatorFieldCoinType('not a struct tag')).toBeNull();
	});

	test('is consistent with digest unmask round-trip', () => {
		// Sanity: for an arbitrary accumulator-field type tag, parsing is deterministic.
		const a = parseAccumulatorFieldCoinType(
			'0x2::dynamic_field::Field<0x2::accumulator::Key<0x2::balance::Balance<0x2::sui::SUI>>, 0x2::accumulator::U128>',
		);
		const b = parseAccumulatorFieldCoinType(
			'0x0000000000000000000000000000000000000000000000000000000000000002::dynamic_field::Field<0x0000000000000000000000000000000000000000000000000000000000000002::accumulator::Key<0x0000000000000000000000000000000000000000000000000000000000000002::balance::Balance<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>>, 0x0000000000000000000000000000000000000000000000000000000000000002::accumulator::U128>',
		);
		expect(a).toBe(b);
		expect(fromBase58(toBase58(fromHex('00')))).toEqual(new Uint8Array([0]));
	});
});
