// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { bcs, fromBase64, toBase64 } from './../src/index.js';

describe('BCS: Primitives', () => {
	it('should support growing size', () => {
		const Coin = bcs.struct('Coin', {
			value: bcs.u64(),
			owner: bcs.string(),
			is_locked: bcs.bool(),
		});

		const rustBcs = 'gNGxBWAAAAAOQmlnIFdhbGxldCBHdXkA';
		const expected = {
			owner: 'Big Wallet Guy',
			value: '412412400000',
			is_locked: false,
		};

		const setBytes = Coin.serialize(expected, { initialSize: 1, maxSize: 1024 });

		expect(Coin.parse(fromBase64(rustBcs))).toEqual(expected);
		expect(setBytes.toBase64()).toEqual(rustBcs);
	});

	it('should error when attempting to grow beyond the allowed size', () => {
		const Coin = bcs.struct('Coin', {
			value: bcs.u64(),
			owner: bcs.string(),
			is_locked: bcs.bool(),
		});

		const expected = {
			owner: 'Big Wallet Guy',
			value: 412412400000n,
			is_locked: false,
		};

		expect(() => Coin.serialize(expected, { initialSize: 1, maxSize: 1 })).toThrowError();
	});

	it('should work when underlying buffer offset is not 0', () => {
		const Coin = bcs.struct('Coin', {
			value: bcs.u64(),
			owner: bcs.string(),
			is_locked: bcs.bool(),
		});

		const rustBcs = 'gNGxBWAAAAAOQmlnIFdhbGxldCBHdXkA';
		const bytes = fromBase64(rustBcs);

		const buffer = new ArrayBuffer(bytes.length + 10);
		const array = new Uint8Array(buffer, 10, bytes.length);
		for (let i = 0; i < bytes.length; i++) {
			array[i] = bytes[i];
		}

		expect(toBase64(array)).toEqual(rustBcs);
		expect(toBase64(new Uint8Array(buffer).slice(10))).toEqual(rustBcs);

		expect(Coin.parse(array)).toEqual({
			owner: 'Big Wallet Guy',
			value: '412412400000',
			is_locked: false,
		});
	});
});

describe('BCS: invalid small integers', () => {
	const types = [
		['u8', bcs.u8()],
		['u16', bcs.u16()],
		['u32', bcs.u32()],
	] as const;

	for (const [name, type] of types) {
		it(`rejects NaN and fractions for ${name}`, () => {
			for (const value of [NaN, 1.5, 0.1, 254.9]) {
				expect(() => type.serialize(value)).toThrow(`Invalid ${name} value: ${value}`);
			}
		});

		it(`keeps accepting integers in range for ${name}`, () => {
			expect(type.fromHex(type.serialize(0).toHex())).toBe(0);
			expect(type.fromHex(type.serialize(255).toHex())).toBe(255);
		});
	}

	it('rejects NaN inside a struct field', () => {
		const S = bcs.struct('S', { a: bcs.u8(), b: bcs.u32() });
		expect(() => S.serialize({ a: 1, b: NaN })).toThrow('Invalid u32 value: NaN');
	});

	it('rejects negative uleb128 values', () => {
		expect(() => bcs.uleb128().serialize(-1)).toThrow('Invalid ULEB128 value: -1');
		expect(bcs.uleb128().serialize(0).toHex()).toBe('00');
	});
});
