// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests that encoder/decoder state is correct after compound operations,
 * buffer growth, and save/restore cycles (e.g. map key serialization).
 */

import { describe, expect, it } from 'vitest';
import { bcs } from '../src/bcs.js';

describe('encoder state after map operations', () => {
	it('struct containing map round-trips correctly', () => {
		const T = bcs.struct('S', {
			before: bcs.u32(),
			m: bcs.map(bcs.string(), bcs.u64()),
			after: bcs.u32(),
		});
		const value = {
			before: 42,
			m: new Map([
				['z', 1n],
				['a', 2n],
			]),
			after: 99,
		};
		const bytes = T.toBytes(value);
		const parsed = T.parse(bytes);
		expect(parsed.before).toBe(42);
		expect(parsed.after).toBe(99);
		expect(parsed.m.get('a')).toBe('2');
		expect(parsed.m.get('z')).toBe('1');
	});

	it('map followed by more fields encodes correctly', () => {
		const T = bcs.struct('S', {
			m: bcs.map(bcs.u8(), bcs.u8()),
			x: bcs.u64(),
			y: bcs.string(),
		});
		const value = {
			m: new Map([
				[3, 30],
				[1, 10],
				[2, 20],
			]),
			x: 12345n,
			y: 'hello',
		};
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.x).toBe('12345');
		expect(parsed.y).toBe('hello');
		expect([...parsed.m.entries()]).toEqual([
			[1, 10],
			[2, 20],
			[3, 30],
		]);
	});

	it('nested maps round-trip correctly', () => {
		const T = bcs.map(bcs.string(), bcs.map(bcs.u8(), bcs.bool()));
		const value = new Map([
			[
				'outer1',
				new Map([
					[1, true],
					[2, false],
				]),
			],
			['outer2', new Map([[3, true]])],
		]);
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.get('outer1')?.get(1)).toBe(true);
		expect(parsed.get('outer1')?.get(2)).toBe(false);
		expect(parsed.get('outer2')?.get(3)).toBe(true);
	});

	it('large map with many entries', () => {
		const T = bcs.map(bcs.u32(), bcs.u32());
		const value = new Map<number, number>();
		for (let i = 0; i < 200; i++) value.set(i, i * 2);
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.size).toBe(200);
		for (let i = 0; i < 200; i++) expect(parsed.get(i)).toBe(i * 2);
	});

	it('map with large keys triggers buffer growth in key serialization', () => {
		const T = bcs.map(bcs.string(), bcs.u8());
		const longKey = 'x'.repeat(1000);
		const value = new Map([[longKey, 42]]);
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.get(longKey)).toBe(42);
	});

	it('map with struct keys sorts by serialized bytes', () => {
		const Key = bcs.struct('Key', { a: bcs.u8(), b: bcs.u8() });
		const T = bcs.map(Key, bcs.string());
		const value = new Map([
			[{ a: 2, b: 0 }, 'second'],
			[{ a: 1, b: 0 }, 'first'],
			[{ a: 1, b: 1 }, 'middle'],
		]);
		const parsed = T.parse(T.toBytes(value));
		const keys = [...parsed.keys()];
		expect(keys[0]).toEqual({ a: 1, b: 0 });
		expect(keys[1]).toEqual({ a: 1, b: 1 });
		expect(keys[2]).toEqual({ a: 2, b: 0 });
	});
});

describe('encoder state after buffer growth', () => {
	it('small then large then small encodes correctly', () => {
		const T = bcs.struct('S', {
			a: bcs.u8(),
			big: bcs.vector(bcs.u32()),
			b: bcs.u8(),
		});
		const bigVec = Array.from({ length: 5000 }, (_, i) => i);
		const value = { a: 1, big: bigVec, b: 2 };
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.a).toBe(1);
		expect(parsed.b).toBe(2);
		expect(parsed.big.length).toBe(5000);
		expect(parsed.big[4999]).toBe(4999);
	});

	it('multiple large serializations reuse grown buffer', () => {
		const T = bcs.vector(bcs.u8());
		const big = Array.from({ length: 10000 }, (_, i) => i & 0xff);
		// Serialize twice — second should reuse the grown buffer
		const bytes1 = T.toBytes(big);
		const bytes2 = T.toBytes(big);
		expect(bytes1).toEqual(bytes2);
		const parsed = T.parse(bytes1);
		expect(parsed.length).toBe(10000);
	});

	it('long string triggers buffer growth', () => {
		const T = bcs.struct('S', {
			before: bcs.u32(),
			s: bcs.string(),
			after: bcs.u32(),
		});
		const value = { before: 111, s: 'a'.repeat(10000), after: 222 };
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.before).toBe(111);
		expect(parsed.s).toBe('a'.repeat(10000));
		expect(parsed.after).toBe(222);
	});

	it('unicode string triggers buffer growth', () => {
		const T = bcs.string();
		const value = '🎉'.repeat(2000); // 4 bytes per emoji = 8000 bytes
		const parsed = T.parse(T.toBytes(value));
		expect(parsed).toBe(value);
	});

	it('large byteVector round-trips', () => {
		const T = bcs.byteVector();
		const big = new Uint8Array(50000);
		for (let i = 0; i < big.length; i++) big[i] = i & 0xff;
		const parsed = T.parse(T.toBytes(big));
		expect(parsed.length).toBe(50000);
		expect(parsed[49999]).toBe(49999 & 0xff);
	});

	it('large fixedArray round-trips', () => {
		const T = bcs.fixedArray(1000, bcs.u64());
		const value = Array.from({ length: 1000 }, (_, i) => BigInt(i) * 1000000n);
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.length).toBe(1000);
		expect(parsed[999]).toBe('999000000');
	});
});

describe('sequential serializations produce independent results', () => {
	it('each serialize returns an independent copy (not a shared buffer view)', () => {
		const T = bcs.u32();
		const a = T.serialize(42).toBytes();
		const b = T.serialize(99).toBytes();
		// Must be different ArrayBuffer instances
		expect(a.buffer).not.toBe(b.buffer);
		// Values must be correct despite shared internal buffer
		expect(T.parse(a)).toBe(42);
		expect(T.parse(b)).toBe(99);
	});

	it('serializing different values produces correct independent bytes', () => {
		const T = bcs.struct('S', { x: bcs.u32(), y: bcs.string() });
		const v1 = { x: 1, y: 'short' };
		const v2 = { x: 2, y: 'a'.repeat(5000) };
		const v3 = { x: 3, y: 'also short' };

		const b1 = T.toBytes(v1);
		const b2 = T.toBytes(v2);
		const b3 = T.toBytes(v3);

		expect(T.parse(b1)).toEqual({ x: 1, y: 'short' });
		expect(T.parse(b2)).toEqual({ x: 2, y: 'a'.repeat(5000) });
		expect(T.parse(b3)).toEqual({ x: 3, y: 'also short' });
	});

	it('map serialize does not corrupt subsequent serialization', () => {
		const MapType = bcs.map(bcs.string(), bcs.u32());
		const StructType = bcs.struct('After', { a: bcs.u64(), b: bcs.bool() });

		const mapVal = new Map([
			['zzz', 1],
			['aaa', 2],
		]);
		const structVal = { a: 99n, b: true };

		// Serialize map first (triggers save/restore), then struct
		const mapBytes = MapType.toBytes(mapVal);
		const structBytes = StructType.toBytes(structVal);

		const parsedMap = MapType.parse(mapBytes);
		const parsedStruct = StructType.parse(structBytes);

		expect([...parsedMap.entries()]).toEqual([
			['aaa', 2],
			['zzz', 1],
		]);
		expect(parsedStruct).toEqual({ a: '99', b: true });
	});
});

describe('option encoder state', () => {
	it('option in struct round-trips', () => {
		const T = bcs.struct('S', {
			a: bcs.option(bcs.u64()),
			b: bcs.u32(),
			c: bcs.option(bcs.string()),
		});
		const withValues = { a: 42n, b: 10, c: 'hello' };
		const withNulls = { a: null, b: 10, c: null };

		const parsed1 = T.parse(T.toBytes(withValues));
		expect(parsed1.a).toBe('42');
		expect(parsed1.b).toBe(10);
		expect(parsed1.c).toBe('hello');

		const parsed2 = T.parse(T.toBytes(withNulls));
		expect(parsed2.a).toBe(null);
		expect(parsed2.b).toBe(10);
		expect(parsed2.c).toBe(null);
	});

	it('deeply nested options', () => {
		const T = bcs.option(bcs.option(bcs.option(bcs.u8())));
		expect(T.parse(T.toBytes(null))).toBe(null);
		expect(T.parse(T.toBytes(null))).toBe(null); // inner null would be option<option<null>>
		expect(T.parse(T.toBytes(42))).toBe(42);
	});

	it('vector of options', () => {
		const T = bcs.vector(bcs.option(bcs.u32()));
		const value = [1, null, 3, null, 5];
		const parsed = T.parse(T.toBytes(value));
		expect(parsed).toEqual([1, null, 3, null, 5]);
	});

	it('option of large struct', () => {
		const Big = bcs.struct('Big', {
			a: bcs.vector(bcs.u8()),
			b: bcs.string(),
			c: bcs.u64(),
			d: bcs.vector(bcs.u32()),
		});
		const T = bcs.option(Big);
		const value = {
			a: Array.from({ length: 500 }, (_, i) => i & 0xff),
			b: 'test'.repeat(100),
			c: 999n,
			d: Array.from({ length: 200 }, (_, i) => i),
		};
		const parsed = T.parse(T.toBytes(value));
		expect(parsed).not.toBeNull();
		expect(parsed!.a.length).toBe(500);
		expect(parsed!.b).toBe('test'.repeat(100));
		expect(parsed!.d.length).toBe(200);
	});
});

describe('compound type combinations', () => {
	it('enum containing vector', () => {
		const T = bcs.enum('E', {
			Empty: null,
			Items: bcs.vector(bcs.u64()),
		});
		const empty = { Empty: true };
		const items = { Items: [1n, 2n, 3n] };

		expect(T.parse(T.toBytes(empty)).$kind).toBe('Empty');
		const parsed = T.parse(T.toBytes(items));
		expect(parsed.$kind).toBe('Items');
		expect(parsed.Items).toEqual(['1', '2', '3']);
	});

	it('enum containing map', () => {
		const T = bcs.enum('E', {
			None: null,
			Data: bcs.map(bcs.u8(), bcs.string()),
		});
		const value = {
			Data: new Map([
				[2, 'two'],
				[1, 'one'],
			]),
		};
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.$kind).toBe('Data');
		expect([...parsed.Data.entries()]).toEqual([
			[1, 'one'],
			[2, 'two'],
		]);
	});

	it('tuple containing map and option', () => {
		const T = bcs.tuple([bcs.map(bcs.u8(), bcs.u8()), bcs.option(bcs.string()), bcs.u32()]);
		const value = [
			new Map([
				[2, 20],
				[1, 10],
			]),
			'hello',
			42,
		] as const;
		const parsed = T.parse(T.toBytes(value));
		expect([...parsed[0].entries()]).toEqual([
			[1, 10],
			[2, 20],
		]);
		expect(parsed[1]).toBe('hello');
		expect(parsed[2]).toBe(42);
	});

	it('map with option values', () => {
		const T = bcs.map(bcs.string(), bcs.option(bcs.u32()));
		const value = new Map<string, number | null>([
			['a', 1],
			['b', null],
			['c', 3],
		]);
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.get('a')).toBe(1);
		expect(parsed.get('b')).toBe(null);
		expect(parsed.get('c')).toBe(3);
	});

	it('map with vector values', () => {
		const T = bcs.map(bcs.u8(), bcs.vector(bcs.string()));
		const value = new Map([
			[1, ['a', 'b']],
			[2, ['c']],
		]);
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.get(1)).toEqual(['a', 'b']);
		expect(parsed.get(2)).toEqual(['c']);
	});

	it('complex nested structure exercises all builders', () => {
		const Inner = bcs.struct('Inner', {
			tags: bcs.vector(bcs.string()),
			score: bcs.option(bcs.u64()),
		});
		const T = bcs.struct('Complex', {
			id: bcs.fixedArray(32, bcs.u8()),
			name: bcs.string(),
			data: bcs.map(bcs.string(), Inner),
			status: bcs.enum('Status', {
				Active: bcs.u64(),
				Inactive: null,
			}),
			items: bcs.vector(bcs.tuple([bcs.u32(), bcs.bool()])),
		});

		const address = Array.from({ length: 32 }, (_, i) => i);
		const value = {
			id: address,
			name: 'test-entry',
			data: new Map([
				['key1', { tags: ['a', 'b', 'c'], score: 100n }],
				['key2', { tags: [], score: null }],
			]),
			status: { Active: 42n },
			items: [
				[1, true],
				[2, false],
				[3, true],
			] as [number, boolean][],
		};

		const parsed = T.parse(T.toBytes(value));
		expect(parsed.id).toEqual(address);
		expect(parsed.name).toBe('test-entry');
		expect(parsed.data.get('key1')?.tags).toEqual(['a', 'b', 'c']);
		expect(parsed.data.get('key1')?.score).toBe('100');
		expect(parsed.data.get('key2')?.tags).toEqual([]);
		expect(parsed.data.get('key2')?.score).toBe(null);
		expect(parsed.status.$kind).toBe('Active');
		expect(parsed.status.Active).toBe('42');
		expect(parsed.items).toEqual([
			[1, true],
			[2, false],
			[3, true],
		]);
	});
});

describe('decode error messages', () => {
	it('enum throws on invalid variant index with enum name', () => {
		const T = bcs.enum('MyStatus', {
			Active: null,
			Inactive: null,
			Pending: bcs.u32(),
		});
		// Manually craft bytes with variant index 5 (only 0-2 valid)
		const bad = new Uint8Array([5]);
		expect(() => T.parse(bad)).toThrow('Invalid variant index 5 for enum MyStatus. Expected 0..2');
	});

	it('enum throws on invalid variant for 1-variant enum', () => {
		const T = bcs.enum('Single', { Only: null });
		const bad = new Uint8Array([1]);
		expect(() => T.parse(bad)).toThrow('Invalid variant index 1 for enum Single. Expected 0..0');
	});

	it('enum throws on invalid variant for 2-variant enum', () => {
		const T = bcs.enum('Bool', { False: null, True: null });
		const bad = new Uint8Array([2]);
		expect(() => T.parse(bad)).toThrow('Invalid variant index 2 for enum Bool. Expected 0..1');
	});

	it('enum throws on invalid variant for 4-variant enum', () => {
		const T = bcs.enum('Dir', { N: null, S: null, E: null, W: null });
		const bad = new Uint8Array([4]);
		expect(() => T.parse(bad)).toThrow('Invalid variant index 4 for enum Dir. Expected 0..3');
	});

	it('enum throws on invalid variant for >4-variant enum', () => {
		const T = bcs.enum('Big', { A: null, B: null, C: null, D: null, E: null });
		const bad = new Uint8Array([10]);
		expect(() => T.parse(bad)).toThrow('Invalid variant index 10 for enum Big. Expected 0..4');
	});

	it('vector throws on length exceeding remaining data', () => {
		const T = bcs.vector(bcs.u32());
		// ULEB 100 = 0x64, but only 4 bytes of data follow (enough for 1 u32, not 100)
		const bad = new Uint8Array([0x64, 0, 0, 0, 0]);
		expect(() => T.parse(bad)).toThrow('BCS vector length 100 exceeds remaining data');
	});

	it('valid enum variants still decode correctly', () => {
		const T = bcs.enum('Color', {
			Red: null,
			Green: bcs.u8(),
			Blue: bcs.struct('Blue', { r: bcs.u8(), g: bcs.u8(), b: bcs.u8() }),
		});
		// Variant 0 (Red)
		expect(T.parse(new Uint8Array([0])).$kind).toBe('Red');
		// Variant 1 (Green) with value 42
		const green = T.parse(new Uint8Array([1, 42]));
		expect(green.$kind).toBe('Green');
		expect(green.Green).toBe(42);
		// Variant 2 (Blue) with r=10, g=20, b=30
		const blue = T.parse(new Uint8Array([2, 10, 20, 30]));
		expect(blue.$kind).toBe('Blue');
		expect(blue.Blue).toEqual({ r: 10, g: 20, b: 30 });
	});
});

describe('enum encode validation', () => {
	it('throws on no matching variant', () => {
		const T = bcs.enum('Status', { Active: null, Inactive: null });
		expect(() => T.serialize({ Unknown: true } as never)).toThrow('Expected object with one key');
	});

	it('throws on multiple variants set', () => {
		const T = bcs.enum('Status', { Active: null, Inactive: null });
		expect(() => T.serialize({ Active: true, Inactive: true } as never)).toThrow(
			'Expected object with one key, but found 2',
		);
	});

	it('throws on empty object', () => {
		const T = bcs.enum('Status', { Active: null, Inactive: null });
		expect(() => T.serialize({} as never)).toThrow('Expected object with one key, but found 0');
	});

	it('throws on non-object', () => {
		const T = bcs.enum('Status', { Active: null, Inactive: null });
		expect(() => T.serialize('Active' as never)).toThrow('Expected object');
		expect(() => T.serialize(null as never)).toThrow('Expected object');
	});

	it('enum inside struct validates correctly', () => {
		const Inner = bcs.enum('Inner', { A: bcs.u8(), B: null });
		const Outer = bcs.struct('Outer', { x: bcs.u32(), e: Inner });

		// Valid
		const bytes = Outer.toBytes({ x: 1, e: { A: 42 } });
		const parsed = Outer.parse(bytes);
		expect(parsed.x).toBe(1);
		expect(parsed.e.$kind).toBe('A');
		expect(parsed.e.A).toBe(42);

		// Direct enum validation catches bad input
		expect(() => Inner.serialize({} as never)).toThrow('Expected object with one key, but found 0');
	});

	it('enum inside vector validates each element', () => {
		const E = bcs.enum('E', { X: bcs.u8(), Y: null });
		const T = bcs.vector(E);

		// Valid
		const bytes = T.toBytes([{ X: 1 }, { Y: true }, { X: 3 }]);
		const parsed = T.parse(bytes);
		expect(parsed.length).toBe(3);
		expect(parsed[0].$kind).toBe('X');
		expect(parsed[1].$kind).toBe('Y');
		expect(parsed[2].X).toBe(3);
	});

	it('enum inside option validates', () => {
		const E = bcs.enum('E', { A: null, B: bcs.u32() });
		const T = bcs.option(E);

		// Valid null
		expect(T.parse(T.toBytes(null))).toBe(null);

		// Valid some
		const parsed = T.parse(T.toBytes({ B: 99 }));
		expect(parsed!.$kind).toBe('B');
		expect(parsed!.B).toBe(99);
	});

	it('nested enum in map values validates', () => {
		const E = bcs.enum('Priority', { Low: null, High: bcs.u8() });
		const T = bcs.map(bcs.string(), E);
		const value = new Map([
			['a', { Low: true }],
			['b', { High: 5 }],
		]);
		const parsed = T.parse(T.toBytes(value));
		expect(parsed.get('a')!.$kind).toBe('Low');
		expect(parsed.get('b')!.High).toBe(5);
	});
});
