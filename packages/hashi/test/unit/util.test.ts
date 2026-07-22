// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { assertHex32, entry, reverseTxidBytes, type ConfigEntry } from '../../src/util.js';
import { HashiConfigError, InvalidParamsError } from '../../src/errors.js';

describe('assertHex32', () => {
	it('accepts a 0x-prefixed 64-char lowercase hex string', () => {
		expect(() => assertHex32(`0x${'a'.repeat(64)}`, 'txid')).not.toThrow();
	});

	it('accepts uppercase and mixed-case hex', () => {
		expect(() => assertHex32(`0x${'A'.repeat(64)}`, 'txid')).not.toThrow();
		expect(() => assertHex32(`0x${'aB'.repeat(32)}`, 'txid')).not.toThrow();
	});

	it('rejects a missing 0x prefix', () => {
		expect(() => assertHex32('a'.repeat(64), 'txid')).toThrow(InvalidParamsError);
	});

	it('rejects a string that is too short or too long', () => {
		expect(() => assertHex32(`0x${'a'.repeat(63)}`, 'txid')).toThrow(InvalidParamsError);
		expect(() => assertHex32(`0x${'a'.repeat(65)}`, 'txid')).toThrow(InvalidParamsError);
	});

	it('rejects non-hex characters', () => {
		expect(() => assertHex32(`0x${'z'.repeat(64)}`, 'txid')).toThrow(InvalidParamsError);
	});

	it('rejects non-string values', () => {
		for (const v of [undefined, null, 123, {}, []]) {
			expect(() => assertHex32(v, 'txid')).toThrow(InvalidParamsError);
		}
	});

	it('interpolates fieldName into the error message', () => {
		try {
			assertHex32('not-hex', 'recipient');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(InvalidParamsError);
			expect((err as InvalidParamsError).reason).toContain('`recipient`');
			expect((err as InvalidParamsError).detail).toContain('"not-hex"');
		}
	});
});

describe('reverseTxidBytes', () => {
	// Real fixture captured during SEDEFI-190 diagnosis: a UI deposit's
	// user-facing (display-order) txid and the bytes that ended up on-chain
	// when the frontend recorded it via `utxo::utxo_id`.
	const DISPLAY = '0x043f682206d246cffdc23106820dc3aa87985a52cccd2d4275bbc3f492f71c0e';
	const INTERNAL = '0e1cf792f4c3bb75422dcdcc525a9887aac30d820631c2fdcf46d20622683f04';

	it('reverses display order to internal order using the real-world fixture', () => {
		expect(reverseTxidBytes(DISPLAY)).toBe(INTERNAL);
	});

	it('preserves a palindromic txid (sanity: trivial case still works)', () => {
		const palindrome = `0x${'ab'.repeat(32)}`;
		expect(reverseTxidBytes(palindrome)).toBe('ab'.repeat(32));
	});

	it('returns plain hex without 0x prefix, 64 chars', () => {
		const out = reverseTxidBytes(DISPLAY);
		expect(out.startsWith('0x')).toBe(false);
		expect(out.length).toBe(64);
	});

	it('rejects malformed input via assertHex32', () => {
		expect(() => reverseTxidBytes('not-hex')).toThrow(InvalidParamsError);
		expect(() => reverseTxidBytes(`0x${'a'.repeat(63)}`)).toThrow(InvalidParamsError);
		expect(() => reverseTxidBytes('a'.repeat(64))).toThrow(InvalidParamsError);
	});
});

describe('entry', () => {
	const fixture: ConfigEntry[] = [
		{ key: 'paused', value: { $kind: 'Bool', Bool: true } },
		{ key: 'min', value: { $kind: 'U64', U64: '546' } },
		{ key: 'chain', value: { $kind: 'Address', Address: `0x${'a'.repeat(64)}` } },
	];

	it('returns the narrowed variant when key and variant match', () => {
		const u64 = entry(fixture, 'min', 'U64');
		expect(u64.U64).toBe('546');
		const addr = entry(fixture, 'chain', 'Address');
		expect(addr.Address).toBe(`0x${'a'.repeat(64)}`);
		const paused = entry(fixture, 'paused', 'Bool');
		expect(paused.Bool).toBe(true);
	});

	it('throws HashiConfigError.missing when the key is absent', () => {
		try {
			entry(fixture, 'nonexistent', 'U64');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(HashiConfigError);
			const e = err as HashiConfigError;
			expect(e.key).toBe('nonexistent');
			expect(e.expectedVariant).toBe('U64');
			expect(e.actualVariant).toBeUndefined();
			expect(e.message).toContain('"nonexistent"');
		}
	});

	it('throws HashiConfigError.wrongVariant when the variant differs', () => {
		try {
			entry(fixture, 'paused', 'U64');
			expect.fail('expected to throw');
		} catch (err) {
			expect(err).toBeInstanceOf(HashiConfigError);
			const e = err as HashiConfigError;
			expect(e.key).toBe('paused');
			expect(e.expectedVariant).toBe('U64');
			expect(e.actualVariant).toBe('Bool');
		}
	});

	it('returns the first match when duplicate keys exist', () => {
		const dupes: ConfigEntry[] = [
			{ key: 'min', value: { $kind: 'U64', U64: '1' } },
			{ key: 'min', value: { $kind: 'U64', U64: '2' } },
		];
		expect(entry(dupes, 'min', 'U64').U64).toBe('1');
	});
});
