// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { bcs, BcsReader, BcsWriter, toHex } from '../src/index.js';
import { ulebEncode } from '../src/uleb.js';

function prng(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function randomBigInt(random: () => number, bits: number) {
	let value = 0n;
	for (let i = 0; i < bits; i += 8) {
		value = (value << 8n) | BigInt(Math.floor(random() * 256));
	}
	return value & ((1n << BigInt(bits)) - 1n);
}

function readULEB(bytes: number[]) {
	const reader = new BcsReader(new Uint8Array(bytes));
	const value = reader.readULEB();
	return { value, next: reader.read8() };
}

describe('BcsReader', () => {
	describe('readULEB', () => {
		it('decodes values at every encoded length boundary', () => {
			const values = [
				0,
				1,
				127,
				128,
				2 ** 14 - 1,
				2 ** 14,
				2 ** 21 - 1,
				2 ** 21,
				2 ** 28 - 1,
				2 ** 28,
				2 ** 31 - 1,
				2 ** 31,
				2 ** 32 - 1,
				2 ** 32,
				2 ** 35,
				2 ** 42,
				2 ** 49,
				Number.MAX_SAFE_INTEGER,
			];

			for (const value of values) {
				const encoded = ulebEncode(value);
				expect(readULEB([...encoded, 0xaa])).toEqual({ value, next: 0xaa });
			}
		});

		it('rejects values above MAX_SAFE_INTEGER', () => {
			expect(() => readULEB([...ulebEncode(2n ** 53n), 0])).toThrow(
				'ULEB decode error: value exceeds MAX_SAFE_INTEGER',
			);
			expect(() => readULEB([...ulebEncode(2n ** 64n - 1n), 0])).toThrow(
				'ULEB decode error: value exceeds MAX_SAFE_INTEGER',
			);
		});

		it('rejects non-canonical encodings of every length', () => {
			for (const bytes of [
				[0x80, 0x00],
				[0xff, 0x80, 0x00],
				[0x80, 0x80, 0x80, 0x00],
				[0x80, 0x80, 0x80, 0x80, 0x00],
				[0xff, 0xff, 0xff, 0xff, 0xff, 0x00],
			]) {
				expect(() => readULEB([...bytes, 0])).toThrow('ULEB decode error: non-canonical encoding');
			}
		});

		it('rejects truncated input', () => {
			for (const bytes of [
				[],
				[0x80],
				[0xff, 0xff],
				[0x80, 0x80, 0x80, 0x80],
				[0xff, 0xff, 0xff, 0xff, 0xff],
			]) {
				expect(() => new BcsReader(new Uint8Array(bytes)).readULEB()).toThrow(
					'ULEB decode error: buffer overflow',
				);
			}
		});

		it('reads from a view with a non-zero byte offset', () => {
			const backing = new Uint8Array([
				0xee,
				0xee,
				...ulebEncode(300),
				...ulebEncode(2 ** 40),
				0xee,
			]);
			const reader = new BcsReader(backing.subarray(2));
			expect(reader.readULEB()).toBe(300);
			expect(reader.readULEB()).toBe(2 ** 40);
			expect(reader.read8()).toBe(0xee);
		});

		it('round-trips random values', () => {
			const random = prng(1);
			for (let i = 0; i < 5000; i++) {
				const value = Math.floor(random() * 2 ** Math.floor(random() * 54));
				const writer = new BcsWriter();
				writer.writeULEB(value).write8(0x42);
				const reader = new BcsReader(writer.toBytes());
				expect(reader.readULEB()).toBe(value);
				expect(reader.read8()).toBe(0x42);
			}
		});
	});

	describe('read64 / read128 / read256', () => {
		it('reads u64 values around the 2^32 and 2^53 boundaries exactly', () => {
			const values = [
				0n,
				1n,
				2n ** 32n - 1n,
				2n ** 32n,
				2n ** 32n + 1n,
				2n ** 53n - 1n,
				2n ** 53n,
				2n ** 53n + 1n,
				2n ** 63n,
				2n ** 64n - 2n,
				2n ** 64n - 1n,
			];

			for (const value of values) {
				expect(bcs.u64().parse(bcs.u64().serialize(value).toBytes())).toBe(value.toString());
			}
		});

		it('reads u128 and u256 limb boundaries exactly', () => {
			for (const bits of [128, 256]) {
				const type = bits === 128 ? bcs.u128() : bcs.u256();
				const max = (1n << BigInt(bits)) - 1n;
				const values = [0n, 1n, 2n ** 53n, 2n ** 64n - 1n, 2n ** 64n, 2n ** 128n - 1n, max];

				for (const value of values.filter((v) => v <= max)) {
					expect(type.parse(type.serialize(value).toBytes())).toBe(value.toString());
				}
			}
		});

		it('round-trips random u64, u128 and u256 values', () => {
			const random = prng(2);
			const types = [
				[64, bcs.u64()],
				[128, bcs.u128()],
				[256, bcs.u256()],
			] as const;

			for (let i = 0; i < 2000; i++) {
				for (const [bits, type] of types) {
					const value = randomBigInt(random, Math.ceil(random() * bits));
					const bytes = type.serialize(value).toBytes();
					expect(type.parse(bytes)).toBe(value.toString());
					expect(type.serialize(type.parse(bytes)).toHex()).toBe(toHex(bytes));
				}
			}
		});

		it('advances the cursor by the width of the value', () => {
			const reader = new BcsReader(
				new Uint8Array([...new Uint8Array(8).fill(0xff), ...new Uint8Array(16).fill(0), 7]),
			);
			expect(reader.read64()).toBe((2n ** 64n - 1n).toString());
			expect(reader.read128()).toBe('0');
			expect(reader.read8()).toBe(7);
		});
	});

	describe('readBytes', () => {
		it('does not read past the end of a view into the rest of the buffer', () => {
			const buffer = new Uint8Array([5, 1, 2, 3, 9, 9]);
			const view = buffer.subarray(0, 4);
			expect(() => bcs.byteVector().parse(view)).toThrow(RangeError);
			expect(() => new BcsReader(view.subarray(1)).readBytes(4)).toThrow(RangeError);
			expect(new BcsReader(view.subarray(1)).readBytes(3)).toEqual(new Uint8Array([1, 2, 3]));
		});
	});
});
