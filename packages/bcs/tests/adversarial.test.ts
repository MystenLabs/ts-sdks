// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Adversarial tests: try to break the API with unusual patterns.
 * Custom readers, writers, validators, transforms, edge cases.
 */

import { describe, expect, test } from 'vitest';
import { bcs, BcsType, BcsReader, BcsWriter, toHex, fromHex } from '../src/index.js';
import { decoder } from '../src/bcs-decode.js';
const { init: initDecode } = decoder;

// ── Custom readers that do unusual things ───────────────────────────

describe('adversarial custom readers', () => {
	test('custom reader that reads multiple values', () => {
		// Reader that consumes a length-prefixed array manually
		const customArray = new BcsType<number[], number[]>({
			name: 'customArray',
			read: (reader: BcsReader) => {
				const len = reader.readULEB();
				const arr: number[] = [];
				for (let i = 0; i < len; i++) arr.push(reader.read32());
				return arr;
			},
			write: (value: number[], writer: BcsWriter) => {
				writer.writeULEB(value.length);
				for (const v of value) writer.write32(v);
			},
		});
		const input = [1, 2, 3, 100, 999];
		expect(customArray.parse(customArray.toBytes(input))).toEqual(input);
	});

	test('custom reader nested in struct with standard types', () => {
		const customU32 = new BcsType<number, number>({
			name: 'customU32',
			read: (reader: BcsReader) => reader.read32(),
			write: (value: number, writer: BcsWriter) => writer.write32(value),
		});

		const mixed = bcs.struct('Mixed', {
			before: bcs.u8(),
			custom: customU32,
			after: bcs.string(),
		});

		const input = { before: 0xff, custom: 42, after: 'hello' };
		const parsed = mixed.parse(mixed.toBytes(input));
		expect(parsed).toEqual(input);
	});

	test('custom reader that uses shift()', () => {
		// Skip some bytes then read
		const skipAndRead = new BcsType<number, { skip: number; value: number }>({
			name: 'skipAndRead',
			read: (reader: BcsReader) => {
				reader.shift(4); // skip 4 bytes
				return reader.read32();
			},
			write: (value, writer: BcsWriter) => {
				// Write 4 padding bytes then the value
				writer.write32(0);
				writer.write32(value.value);
			},
		});
		const bytes = skipAndRead.toBytes({ skip: 0, value: 42 });
		expect(skipAndRead.parse(bytes)).toBe(42);
	});

	test('custom reader with readVec', () => {
		const custom = new BcsType<number[], number[]>({
			name: 'customVec',
			read: (reader: BcsReader) => {
				return reader.readVec((r) => r.read16());
			},
			write: (value, writer: BcsWriter) => {
				writer.writeVec(value, (w, v) => w.write16(v));
			},
		});
		const input = [1, 100, 65535];
		expect(custom.parse(custom.toBytes(input))).toEqual(input);
	});

	test('two custom types back-to-back in struct', () => {
		const customA = new BcsType<number, number>({
			name: 'cA',
			read: (reader: BcsReader) => reader.read16(),
			write: (v: number, w: BcsWriter) => w.write16(v),
		});
		const customB = new BcsType<string, string>({
			name: 'cB',
			read: (reader: BcsReader) => {
				const len = reader.readULEB();
				const bytes = reader.readBytes(len);
				return new TextDecoder().decode(bytes);
			},
			write: (v: string, w: BcsWriter) => {
				const bytes = new TextEncoder().encode(v);
				w.writeULEB(bytes.length);
				w.writeBytes(bytes);
			},
		});
		const s = bcs.struct('S', { a: customA, b: customB, c: bcs.u32() });
		const input = { a: 1000, b: 'test', c: 42 };
		expect(s.parse(s.toBytes(input))).toEqual(input);
	});

	test('custom type in enum variant', () => {
		const customU32 = new BcsType<number, number>({
			name: 'customU32',
			read: (reader: BcsReader) => reader.read32(),
			write: (v: number, w: BcsWriter) => w.write32(v),
		});
		const e = bcs.enum('E', { None: null, Custom: customU32, Standard: bcs.u64() });
		expect(e.parse(e.toBytes({ Custom: 42 }))).toEqual({ $kind: 'Custom', Custom: 42 });
		expect(e.parse(e.toBytes({ None: true }))).toEqual({ $kind: 'None', None: true });
		expect(e.parse(e.toBytes({ Standard: 99n }))).toEqual({ $kind: 'Standard', Standard: '99' });
	});

	test('custom type in option', () => {
		const customU32 = new BcsType<number, number>({
			name: 'customU32',
			read: (reader: BcsReader) => reader.read32(),
			write: (v: number, w: BcsWriter) => w.write32(v),
		});
		const opt = bcs.option(customU32);
		expect(opt.parse(opt.toBytes(42))).toBe(42);
		expect(opt.parse(opt.toBytes(null))).toBe(null);
	});

	test('custom type in tuple', () => {
		const customU32 = new BcsType<number, number>({
			name: 'customU32',
			read: (reader: BcsReader) => reader.read32(),
			write: (v: number, w: BcsWriter) => w.write32(v),
		});
		const t = bcs.tuple([bcs.u8(), customU32, bcs.string()]);
		const input = [0xff, 42, 'hi'] as [number, number, string];
		expect(t.parse(t.toBytes(input))).toEqual(input);
	});

	test('custom type in fixedArray', () => {
		const customU16 = new BcsType<number, number>({
			name: 'customU16',
			read: (reader: BcsReader) => reader.read16(),
			write: (v: number, w: BcsWriter) => w.write16(v),
		});
		const fa = bcs.fixedArray(3, customU16);
		expect(fa.parse(fa.toBytes([1, 2, 3]))).toEqual([1, 2, 3]);
	});

	test('custom type used as map key', () => {
		const customStr = new BcsType<string, string>({
			name: 'customStr',
			read: (reader: BcsReader) => {
				const len = reader.readULEB();
				const bytes = reader.readBytes(len);
				return new TextDecoder().decode(bytes);
			},
			write: (v: string, w: BcsWriter) => {
				const bytes = new TextEncoder().encode(v);
				w.writeULEB(bytes.length);
				w.writeBytes(bytes);
			},
		});
		const m = bcs.map(customStr, bcs.u32());
		const input = new Map([
			['a', 1],
			['b', 2],
		]);
		const parsed = m.parse(m.toBytes(input));
		expect(parsed.get('a')).toBe(1);
		expect(parsed.get('b')).toBe(2);
	});
});

// ── Custom writers with unusual patterns ────────────────────────────

describe('adversarial custom writers', () => {
	test('writer that uses writeVec', () => {
		const custom = new BcsType<number[], number[]>({
			name: 'custom',
			read: (reader: BcsReader) => reader.readVec((r) => r.read32()),
			write: (value, writer: BcsWriter) => {
				writer.writeVec(value, (w, v) => w.write32(v));
			},
		});
		const input = [10, 20, 30];
		expect(custom.parse(custom.toBytes(input))).toEqual(input);
	});

	test('writer that writes nothing (zero-size type)', () => {
		const unit = new BcsType<null, null>({
			name: 'unit',
			read: () => null,
			write: () => {},
		});
		const bytes = unit.toBytes(null);
		expect(bytes.length).toBe(0);
		expect(unit.parse(bytes)).toBe(null);
	});

	test('writer for fixed-size type via serialize option', () => {
		const fixedU32 = new BcsType<number, number>({
			name: 'fixedU32',
			read: (reader: BcsReader) => reader.read32(),
			write: (value: number, writer: BcsWriter) => writer.write32(value),
			serialize: (value: number) => {
				const buf = new Uint8Array(4);
				new DataView(buf.buffer).setUint32(0, value, true);
				return buf;
			},
		});
		expect(toHex(fixedU32.toBytes(42))).toBe('2a000000');
		expect(fixedU32.parse(fixedU32.toBytes(42))).toBe(42);
	});
});

// ── Validators ──────────────────────────────────────────────────────

describe('custom validators', () => {
	test('validator that throws on invalid input', () => {
		const positiveU32 = bcs.u32({
			validate: (v) => {
				if (v <= 0) throw new Error('must be positive');
			},
		});
		expect(() => positiveU32.toBytes(0)).toThrow('must be positive');
		expect(() => positiveU32.toBytes(-1)).toThrow(); // built-in range check
		expect(positiveU32.parse(positiveU32.toBytes(1))).toBe(1);
	});

	test('validator on struct', () => {
		const t = bcs.struct(
			'S',
			{ x: bcs.u32(), y: bcs.u32() },
			{
				validate: (v) => {
					if (v.x > v.y) throw new Error('x must be <= y');
				},
			},
		);
		expect(() => t.toBytes({ x: 10, y: 5 })).toThrow('x must be <= y');
		expect(t.parse(t.toBytes({ x: 1, y: 2 }))).toEqual({ x: 1, y: 2 });
	});

	test('validator on serialize() path', () => {
		const t = bcs.u8({
			validate: (v) => {
				if (v === 42) throw new Error('not 42');
			},
		});
		expect(() => t.serialize(42)).toThrow('not 42');
		expect(() => t.toBytes(42)).toThrow('not 42');
	});

	test('validator on write() path', () => {
		const t = bcs.u8({
			validate: (v) => {
				if (v === 0) throw new Error('no zero');
			},
		});
		expect(() => t.write(0)).toThrow('no zero');
	});
});

// ── Transform edge cases ────────────────────────────────────────────

describe('transform edge cases', () => {
	test('transform that changes type completely', () => {
		// Store a Date as u64 milliseconds
		const dateType = bcs.u64().transform({
			input: (d: Date) => BigInt(d.getTime()),
			output: (ms) => new Date(Number(ms)),
		});
		const now = new Date('2024-01-01T00:00:00Z');
		const parsed = dateType.parse(dateType.toBytes(now));
		expect(parsed.getTime()).toBe(now.getTime());
	});

	test('transform on struct', () => {
		const raw = bcs.struct('Raw', { x: bcs.u32(), y: bcs.u32() });
		const point = raw.transform({
			name: 'Point',
			input: (p: { x: number; y: number }) => p, // same shape
			output: (v) => ({ ...v, sum: v.x + v.y }),
		});
		const parsed = point.parse(point.toBytes({ x: 10, y: 20 }));
		expect(parsed.sum).toBe(30);
	});

	test('transform on enum', () => {
		const raw = bcs.enum('E', { None: null, Value: bcs.u32() });
		const t = raw.transform({
			output: (v) => (v.$kind === 'None' ? null : v.Value),
			input: (v: number | null) => (v === null ? { None: true } : { Value: v }),
		});
		expect(t.parse(t.toBytes(null))).toBe(null);
		expect(t.parse(t.toBytes(42))).toBe(42);
	});

	test('transform with validation', () => {
		const t = bcs.u32().transform({
			input: (s: string) => parseInt(s),
			output: (n) => n.toString(),
			validate: (s) => {
				if (!/^\d+$/.test(s)) throw new Error('must be numeric string');
			},
		});
		expect(() => t.toBytes('abc')).toThrow('must be numeric string');
		expect(t.parse(t.toBytes('42'))).toBe('42');
	});
});

// ── Lazy type edge cases ────────────────────────────────────────────

describe('lazy edge cases', () => {
	test('mutually recursive types via lazy', () => {
		type Even = { value: number; next: Odd | null };
		type Odd = { value: number; next: Even | null };
		const EvenType: BcsType<Even, Even> = bcs.struct('Even', {
			value: bcs.u32(),
			next: bcs.option(bcs.lazy(() => OddType)),
		});
		const OddType: BcsType<Odd, Odd> = bcs.struct('Odd', {
			value: bcs.u32(),
			next: bcs.option(bcs.lazy(() => EvenType)),
		});
		const input: Even = { value: 2, next: { value: 3, next: { value: 4, next: null } } };
		const parsed = EvenType.parse(EvenType.toBytes(input));
		expect(parsed.value).toBe(2);
		expect(parsed.next!.value).toBe(3);
		expect(parsed.next!.next!.value).toBe(4);
		expect(parsed.next!.next!.next).toBe(null);
	});

	test('lazy in vector', () => {
		type Tree = { children: Tree[] };
		const TreeType: BcsType<Tree, Tree> = bcs.struct('Tree', {
			children: bcs.vector(bcs.lazy(() => TreeType)),
		});
		const input: Tree = { children: [{ children: [] }, { children: [{ children: [] }] }] };
		const parsed = TreeType.parse(TreeType.toBytes(input));
		expect(parsed.children.length).toBe(2);
		expect(parsed.children[1].children.length).toBe(1);
	});
});

// ── Position tracking / state consistency ───────────────────────────

describe('decode state consistency', () => {
	test('multiple parses in sequence', () => {
		const t = bcs.u32();
		// Each parse should be independent
		expect(t.parse(t.toBytes(1))).toBe(1);
		expect(t.parse(t.toBytes(2))).toBe(2);
		expect(t.parse(t.toBytes(3))).toBe(3);
	});

	test('parse does not affect other types', () => {
		const a = bcs.u32();
		const b = bcs.string();
		const bytesA = a.toBytes(42);
		const bytesB = b.toBytes('hello');
		// Parse B, then parse A — should be independent
		expect(b.parse(bytesB)).toBe('hello');
		expect(a.parse(bytesA)).toBe(42);
	});

	test('struct parse leaves clean state for next parse', () => {
		const s = bcs.struct('S', { a: bcs.u32(), b: bcs.string() });
		const u = bcs.u8();
		const sBytes = s.toBytes({ a: 1, b: 'hi' });
		const uBytes = u.toBytes(99);
		expect(s.parse(sBytes)).toEqual({ a: 1, b: 'hi' });
		expect(u.parse(uBytes)).toBe(99);
	});

	test('serialize does not corrupt decode state', () => {
		const t = bcs.struct('S', { x: bcs.u32() });
		const bytes = t.toBytes({ x: 42 });
		// Parse starts a decode
		// Serialize something in the middle (different encoder state)
		const other = bcs.u64();
		other.toBytes(999n);
		// Decode state should be independent (encode uses separate state)
		expect(t.parse(bytes)).toEqual({ x: 42 });
	});

	test('fromHex and fromBase64 work correctly', () => {
		const t = bcs.struct('S', { a: bcs.u32(), b: bcs.bool() });
		const val = { a: 42, b: true };
		const hex = t.toHex(val);
		const b64 = t.toBase64(val);
		expect(t.fromHex(hex)).toEqual(val);
		expect(t.fromBase64(b64)).toEqual(val);
	});
});

// ── Large / stress tests ────────────────────────────────────────────

describe('stress tests', () => {
	test('large vector (10k elements)', () => {
		const t = bcs.vector(bcs.u32());
		const input = Array.from({ length: 10000 }, (_, i) => i);
		const parsed = t.parse(t.toBytes(input));
		expect(parsed.length).toBe(10000);
		expect(parsed[0]).toBe(0);
		expect(parsed[9999]).toBe(9999);
	});

	test('deeply nested structs (10 levels)', () => {
		let type: any = bcs.u32();
		for (let i = 0; i < 10; i++) {
			type = bcs.struct(`L${i}`, { inner: type });
		}
		let val: any = 42;
		for (let i = 0; i < 10; i++) val = { inner: val };
		const parsed = type.parse(type.toBytes(val));
		let result = parsed;
		for (let i = 0; i < 10; i++) result = result.inner;
		expect(result).toBe(42);
	});

	test('many struct types do not crash', () => {
		// Create 100 struct types — simulates codegen
		const types: BcsType<any, any>[] = [];
		for (let i = 0; i < 100; i++) {
			types.push(
				bcs.struct(`Gen${i}`, {
					[`a${i}`]: bcs.u32(),
					[`b${i}`]: bcs.string(),
				}),
			);
		}
		// Roundtrip each
		for (let i = 0; i < 100; i++) {
			const val = { [`a${i}`]: i, [`b${i}`]: `val${i}` };
			const parsed = types[i].parse(types[i].toBytes(val));
			expect(parsed[`a${i}`]).toBe(i);
			expect(parsed[`b${i}`]).toBe(`val${i}`);
		}
	});

	test('buffer growth during serialize', () => {
		// Force the shared buffer to grow by serializing large data
		const bigVec = bcs.vector(bcs.u32());
		const bigInput = Array.from({ length: 5000 }, (_, i) => i);
		const parsed = bigVec.parse(bigVec.toBytes(bigInput));
		expect(parsed.length).toBe(5000);
		// Then serialize something small — should still work
		const small = bcs.u8();
		expect(small.parse(small.toBytes(42))).toBe(42);
	});
});

// ── SerializedBcs ───────────────────────────────────────────────────

describe('SerializedBcs', () => {
	test('parse() on SerializedBcs roundtrips', () => {
		const t = bcs.struct('S', { x: bcs.u32() });
		const serialized = t.serialize({ x: 42 });
		expect(serialized.parse()).toEqual({ x: 42 });
	});

	test('toBytes returns same bytes as serialize', () => {
		const t = bcs.u64();
		const serialized = t.serialize(1000000n);
		expect(toHex(t.toBytes(1000000n))).toBe(toHex(serialized.toBytes()));
	});
});
