// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

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

function littleEndian(value: bigint, size: number) {
	const bytes = new Uint8Array(size);
	for (let i = 0; i < size; i++) {
		bytes[i] = Number((value >> BigInt(8 * i)) & 0xffn);
	}
	return bytes;
}

function write(fn: (writer: BcsWriter) => void) {
	const writer = new BcsWriter({ initialSize: 1 });
	fn(writer);
	return writer.toBytes();
}

describe('BcsWriter', () => {
	describe('writeULEB', () => {
		it('matches ulebEncode at every encoded length boundary', () => {
			const values = [0, 1, 0x7f, 0x80, 0x3fff, 0x4000, 0x1fffff, 0x200000, 0xfffffff, 0x10000000];
			values.push(2 ** 31 - 1, 2 ** 31, 2 ** 32 - 1, 2 ** 32, 2 ** 35, Number.MAX_SAFE_INTEGER);

			for (const value of values) {
				const bytes = write((writer) => writer.writeULEB(value));
				expect(toHex(bytes), `${value}`).toBe(toHex(new Uint8Array(ulebEncode(value))));
				expect(new BcsReader(bytes).readULEB()).toBe(value);
			}
		});

		it('grows the buffer when the value straddles the end', () => {
			const writer = new BcsWriter({ initialSize: 2 });
			writer
				.write8(1)
				.writeULEB(2 ** 32 - 1)
				.write8(2);
			expect(toHex(writer.toBytes())).toBe('01ffffffff0f02');
		});
	});

	describe('write64 / write128 / write256', () => {
		it('writes values around the 2^32 and 2^53 boundaries exactly', () => {
			const values = [0n, 1n, 2n ** 32n - 1n, 2n ** 32n, 2n ** 53n - 1n, 2n ** 53n, 2n ** 64n - 1n];
			for (const value of values) {
				expect(toHex(write((writer) => writer.write64(value)))).toBe(toHex(littleEndian(value, 8)));
				if (value <= BigInt(Number.MAX_SAFE_INTEGER)) {
					expect(toHex(write((writer) => writer.write64(Number(value))))).toBe(
						toHex(littleEndian(value, 8)),
					);
				}
			}
		});

		it('writes u128 and u256 limb boundaries exactly', () => {
			for (const [size, bits] of [
				[16, 128],
				[32, 256],
			] as const) {
				const max = (1n << BigInt(bits)) - 1n;
				for (const value of [0n, 1n, 2n ** 32n, 2n ** 64n - 1n, 2n ** 64n, 2n ** 96n + 7n, max]) {
					const bytes = write((writer) =>
						size === 16 ? writer.write128(value) : writer.write256(value),
					);
					expect(toHex(bytes)).toBe(toHex(littleEndian(value, size)));
				}
			}
		});

		it('keeps the previous encoding of unvalidated out-of-range values', () => {
			// Values are range-checked by the BcsType before they reach the writer; writing directly
			// encodes negatives as zero and keeps the low bytes of oversized values
			expect(toHex(write((writer) => writer.write64(-1)))).toBe('0000000000000000');
			expect(toHex(write((writer) => writer.write64(2n ** 64n + 5n)))).toBe('0500000000000000');
			expect(toHex(write((writer) => writer.write128(-5n)))).toBe('00'.repeat(16));
			expect(toHex(write((writer) => writer.write256(2n ** 256n + 1n)))).toBe(
				'01' + '00'.repeat(31),
			);
		});

		it('round-trips random values', () => {
			const random = prng(7);
			for (let i = 0; i < 500; i++) {
				let value = 0n;
				for (let b = 0; b < 32; b++) {
					value = (value << 8n) | BigInt(Math.floor(random() * 256));
				}
				const u64 = value & (2n ** 64n - 1n);
				const u128 = value & (2n ** 128n - 1n);
				expect(bcs.u64().parse(bcs.u64().serialize(u64).toBytes())).toBe(u64.toString());
				expect(bcs.u128().parse(bcs.u128().serialize(u128).toBytes())).toBe(u128.toString());
				expect(bcs.u256().parse(bcs.u256().serialize(value).toBytes())).toBe(value.toString());
			}
		});
	});
});

describe('u64 inputs', () => {
	it('encodes numbers, decimal strings and bigints identically', () => {
		for (const value of [0, 1, 255, 2 ** 32, 2 ** 53 - 1]) {
			const expected = toHex(bcs.u64().serialize(BigInt(value)).toBytes());
			expect(toHex(bcs.u64().serialize(value).toBytes())).toBe(expected);
			expect(toHex(bcs.u64().serialize(String(value)).toBytes())).toBe(expected);
		}
		expect(toHex(bcs.u64().serialize('000000000000012').toBytes())).toBe('0c00000000000000');
		expect(toHex(bcs.u64().serialize('18446744073709551615').toBytes())).toBe('ff'.repeat(8));
	});

	it('rejects invalid values', () => {
		for (const value of [-1, 1.5, 2 ** 64, '-1', '1.5', 'abc', '18446744073709551616']) {
			expect(() => bcs.u64().serialize(value), `${value}`).toThrow();
		}
	});
});

describe('string', () => {
	it('round-trips ASCII and non-ASCII strings on both sides of the fast-path length', () => {
		for (const value of ['', 'a', 'x'.repeat(64), 'x'.repeat(65), 'héllo', '😀'.repeat(20)]) {
			expect(bcs.string().parse(bcs.string().serialize(value).toBytes())).toBe(value);
		}
	});

	it('rejects invalid UTF-8 in short and long strings', () => {
		expect(() => bcs.string().parse(new Uint8Array([2, 0xc3, 0x28]))).toThrow();
		expect(() => bcs.string().parse(new Uint8Array([66, ...Array(65).fill(0x61), 0xff]))).toThrow();
	});

	it('keeps a leading byte order mark', () => {
		expect(bcs.string().parse(new Uint8Array([4, 0xef, 0xbb, 0xbf, 0x61]))).toBe('﻿a');
	});
});

describe('option', () => {
	it('encodes like an enum with None and Some variants', () => {
		const type = bcs.option(bcs.u8());
		expect(toHex(type.serialize(null).toBytes())).toBe('00');
		expect(toHex(type.serialize(undefined).toBytes())).toBe('00');
		expect(toHex(type.serialize(7).toBytes())).toBe('0107');
		expect(type.parse(new Uint8Array([0]))).toBe(null);
		expect(type.parse(new Uint8Array([1, 7]))).toBe(7);
		expect(() => type.parse(new Uint8Array([2]))).toThrow('Unknown value 2 for enum Option<u8>');
		expect(() => type.serialize(256)).toThrow();
	});

	it('distinguishes None from Some(None) when nested', () => {
		const type = bcs.option(bcs.option(bcs.u8()));
		expect(type.parse(new Uint8Array([0]))).toBe(null);
		expect(type.parse(new Uint8Array([1, 0]))).toBe(null);
		expect(type.parse(new Uint8Array([1, 1, 5]))).toBe(5);
	});
});

describe('enum', () => {
	const type = bcs.enum('E', { A: bcs.u8(), B: bcs.u16(), C: null });

	it('writes the variant named by the value', () => {
		expect(toHex(type.serialize({ B: 5 }).toBytes())).toBe('010500');
		expect(toHex(type.serialize({ C: true }).toBytes())).toBe('02');
		expect(toHex(type.serialize({ $kind: 'A', B: 5 } as never).toBytes())).toBe('010500');
	});

	it('requires exactly one variant', () => {
		expect(() => type.serialize({} as never)).toThrow('Expected object with one key');
		expect(() => type.serialize({ A: 1, B: 2 } as never)).toThrow('Expected object with one key');
		expect(() => type.serialize({ D: 1 } as never)).toThrow('Expected object with one key');
	});

	it('reads a variant named __proto__ as an own property', () => {
		const fields = JSON.parse('{"__proto__": null, "B": null}');
		fields.__proto__ = bcs.u8();
		const parsed = bcs.enum('P', fields).parse(new Uint8Array([0, 7]));
		expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
		expect(Object.getOwnPropertyDescriptor(parsed, '__proto__')?.value).toBe(7);
		expect(parsed.$kind).toBe('__proto__');
	});

	it('reads the variant key before $kind', () => {
		expect(Object.keys(type.parse(new Uint8Array([1, 5, 0])))).toEqual(['B', '$kind']);
	});
});

describe('transform', () => {
	it('converts the input once per serialize and still validates both layers', () => {
		const input = vi.fn((value: string) => Number(value));
		const validate = vi.fn();
		const type = bcs.u8().transform({ input, validate });

		expect(toHex(type.serialize('7').toBytes())).toBe('07');
		expect(input).toHaveBeenCalledTimes(1);
		expect(validate).toHaveBeenCalledTimes(1);

		expect(() => type.serialize('300')).toThrow();
		expect(() => bcs.vector(type).serialize(['1', '300'])).toThrow();
		expect(() => type.validate('300')).toThrow();
	});

	it('honours a reassigned validate', () => {
		const type = bcs.u8().transform({ input: (value: string) => Number(value) });
		type.validate = () => {
			throw new Error('rejected');
		};

		expect(() => type.serialize('1')).toThrow('rejected');
		expect(() => bcs.vector(type).serialize(['1'])).toThrow('rejected');
	});

	it('supports nested serialize calls inside input', () => {
		const inner = bcs.struct('Inner', { x: bcs.u32() });
		const type = bcs.struct('Outer', {
			a: bcs.u8(),
			b: bcs.u8(),
			w: bcs.byteVector().transform({
				input: (value: { x: number }) => inner.serialize(value).toBytes(),
			}),
		});

		expect(toHex(type.serialize({ a: 0xaa, b: 0xbb, w: { x: 0x01020304 } }).toBytes())).toBe(
			'aabb0404030201',
		);
	});
});

describe('byte inputs', () => {
	it('does not alias the caller array in the serialized output', () => {
		const input = new Uint8Array([1, 2, 3]);
		const bytes = bcs.byteVector().serialize(input).toBytes();
		input[0] = 9;
		expect(toHex(bytes)).toBe('03010203');
	});
});
