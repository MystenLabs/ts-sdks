// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Tests for the performance optimization changes:
 * - Backward compatibility with BcsReader/BcsWriter custom types
 * - New toBytes/toHex/toBase64/toBase58 encode APIs
 * - Edge cases: empty structs, large structs, nested types, 1-variant enums
 * - Null-prototype decoded objects
 * - The shim reader/writer proxies
 * - ASCII fast path for string encode/decode
 */

import { describe, expect, test } from 'vitest';
import { bcs, BcsType, BcsReader, BcsWriter, toHex, fromHex } from '../src/index.js';
import { decoder } from '../src/bcs-decode.js';
const { init: initDecode } = decoder;

// ── New encode convenience methods ──────────────────────────────────

describe('toBytes/toHex/toBase64/toBase58', () => {
	test('toBytes returns Uint8Array', () => {
		const t = bcs.u32();
		const bytes = t.toBytes(42);
		expect(bytes).toBeInstanceOf(Uint8Array);
		expect(bytes.length).toBe(4);
		expect(toHex(bytes)).toBe('2a000000');
	});

	test('toHex matches serialize().toHex()', () => {
		const t = bcs.struct('S', { a: bcs.u32(), b: bcs.string() });
		const val = { a: 42, b: 'hello' };
		expect(t.toHex(val)).toBe(t.serialize(val).toHex());
	});

	test('toBase64 matches serialize().toBase64()', () => {
		const t = bcs.u64();
		expect(t.toBase64(1000000n)).toBe(t.serialize(1000000n).toBase64());
	});

	test('toBase58 matches serialize().toBase58()', () => {
		const t = bcs.bool();
		expect(t.toBase58(true)).toBe(t.serialize(true).toBase58());
	});

	test('toBytes -> parse roundtrip', () => {
		const t = bcs.struct('S', { x: bcs.u64(), y: bcs.string(), z: bcs.bool() });
		const val = { x: 999n, y: 'test', z: false };
		expect(t.parse(t.toBytes(val))).toEqual({ x: '999', y: 'test', z: false });
	});

	test('toBytes validates input', () => {
		const t = bcs.u8();
		expect(() => t.toBytes(-1)).toThrow();
		expect(() => t.toBytes(256)).toThrow();
	});
});

// ── Backward-compatible BcsReader/BcsWriter custom types ────────────

describe('custom types with BcsReader/BcsWriter', () => {
	test('custom read with BcsReader', () => {
		const customU32 = new BcsType<number, number>({
			name: 'customU32',
			read: (reader: BcsReader) => reader.read32(),
			write: (value: number) => {},
		});
		const bytes = bcs.u32().toBytes(42);
		expect(customU32.parse(bytes)).toBe(42);
	});

	test('custom write with BcsWriter', () => {
		const customU32 = new BcsType<number, number>({
			name: 'customU32',
			read: () => 0,
			write: (value: number, writer: BcsWriter) => writer.write32(value),
		});
		const bytes = customU32.toBytes(42);
		expect(toHex(bytes)).toBe('2a000000');
	});

	test('custom type roundtrip', () => {
		const custom = new BcsType<{ a: number; b: number }, { a: number; b: number }>({
			name: 'custom',
			read: (reader: BcsReader) => ({ a: reader.read32(), b: reader.read16() }),
			write: (value, writer: BcsWriter) => {
				writer.write32(value.a);
				writer.write16(value.b);
			},
		});
		const val = { a: 12345, b: 678 };
		const parsed = custom.parse(custom.toBytes(val));
		expect(parsed).toEqual(val);
	});

	test('custom type nested in struct', () => {
		const customU32 = new BcsType<number, number>({
			name: 'customU32',
			read: (reader: BcsReader) => reader.read32(),
			write: (value: number, writer: BcsWriter) => writer.write32(value),
		});
		const myStruct = bcs.struct('S', { val: customU32, label: bcs.string() });
		const input = { val: 42, label: 'hello' };
		const parsed = myStruct.parse(myStruct.toBytes(input));
		expect(parsed).toEqual(input);
	});

	test('custom type with BcsReader in vector', () => {
		const customU16 = new BcsType<number, number>({
			name: 'customU16',
			read: (reader: BcsReader) => reader.read16(),
			write: (value: number, writer: BcsWriter) => writer.write16(value),
		});
		const vec = bcs.vector(customU16);
		const input = [1, 2, 3, 1000, 65535];
		const parsed = vec.parse(vec.toBytes(input));
		expect(parsed).toEqual(input);
	});

	test('BcsWriter chaining works through shim', () => {
		const custom = new BcsType<number[], number[]>({
			name: 'chained',
			read: (reader: BcsReader) => [reader.read8(), reader.read8(), reader.read8()],
			write: (value, writer: BcsWriter) => {
				writer.write8(value[0]).write8(value[1]).write8(value[2]);
			},
		});
		const bytes = custom.toBytes([1, 2, 3]);
		expect(toHex(bytes)).toBe('010203');
		expect(custom.parse(bytes)).toEqual([1, 2, 3]);
	});

	test('BcsReader readULEB through shim', () => {
		const customVec = new BcsType<number[], number[]>({
			name: 'customVec',
			read: (reader: BcsReader) => {
				const len = reader.readULEB();
				const result: number[] = [];
				for (let i = 0; i < len; i++) result.push(reader.read8());
				return result;
			},
			write: (value, writer: BcsWriter) => {
				writer.writeULEB(value.length);
				for (const v of value) writer.write8(v);
			},
		});
		const input = [10, 20, 30];
		const parsed = customVec.parse(customVec.toBytes(input));
		expect(parsed).toEqual(input);
	});

	test('BcsReader readBytes through shim', () => {
		const custom = new BcsType<Uint8Array, Uint8Array>({
			name: 'customBytes',
			read: (reader: BcsReader) => reader.readBytes(4),
			write: (value, writer: BcsWriter) => writer.writeBytes(value),
		});
		const input = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
		const parsed = custom.parse(custom.toBytes(input));
		expect(Array.from(parsed)).toEqual([0xde, 0xad, 0xbe, 0xef]);
	});

	test('BcsReader read64/read128 through shim', () => {
		const custom64 = new BcsType<string, bigint>({
			name: 'custom64',
			read: (reader: BcsReader) => reader.read64(),
			write: (value, writer: BcsWriter) => writer.write64(value),
		});
		const parsed = custom64.parse(custom64.toBytes(18446744073709551615n));
		expect(parsed).toBe('18446744073709551615');
	});
});

// ── Backward-compatible serialize/write signatures ──────────────────

describe('backward-compatible signatures', () => {
	test('serialize accepts BcsWriterOptions (ignored)', () => {
		const t = bcs.u32();
		const s = t.serialize(42, { initialSize: 1024 });
		expect(toHex(s.toBytes())).toBe('2a000000');
	});

	test('write accepts BcsWriter arg', () => {
		const t = bcs.u32();
		// Should not throw even with writer arg
		t.write(42, new BcsWriter({ initialSize: 256 }));
	});

	test('read works with standalone BcsReader', () => {
		const t = bcs.u32();
		const bytes = t.toBytes(42);
		const reader = new BcsReader(bytes);
		const result = t.read(reader);
		expect(result).toBe(42);
		expect(reader.bytePosition).toBe(4); // position advanced
	});

	test('read works with struct + standalone BcsReader', () => {
		const t = bcs.struct('S', { a: bcs.u32(), b: bcs.string() });
		const bytes = t.toBytes({ a: 42, b: 'hello' });
		const reader = new BcsReader(bytes);
		const result = t.read(reader);
		expect(result).toEqual({ a: 42, b: 'hello' });
		expect(reader.bytePosition).toBe(bytes.length); // consumed all bytes
	});

	test('read with standalone reader does not affect parse', () => {
		const t = bcs.u32();
		const bytes1 = t.toBytes(42);
		const bytes2 = t.toBytes(99);
		// Parse one value
		expect(t.parse(bytes1)).toBe(42);
		// Read from a separate reader — should not interfere
		const reader = new BcsReader(bytes2);
		expect(t.read(reader)).toBe(99);
		// Parse again — should still work independently
		expect(t.parse(bytes1)).toBe(42);
	});

	test('multiple standalone readers are independent', () => {
		const t = bcs.struct('S', { a: bcs.u32(), b: bcs.u32() });
		const bytes1 = t.toBytes({ a: 1, b: 2 });
		const bytes2 = t.toBytes({ a: 100, b: 200 });
		const r1 = new BcsReader(bytes1);
		const r2 = new BcsReader(bytes2);
		// Read from r1 first field
		expect(r1.read32()).toBe(1);
		// Read from r2 first field — r1 should be unaffected
		expect(r2.read32()).toBe(100);
		// Continue reading from r1
		expect(r1.read32()).toBe(2);
		expect(r2.read32()).toBe(200);
	});

	test('multiple standalone writers are independent', () => {
		const w1 = new BcsWriter();
		const w2 = new BcsWriter();
		w1.write32(42);
		w2.write32(99);
		w1.write32(43);
		w2.write32(100);
		expect(toHex(w1.toBytes())).toBe('2a0000002b000000');
		expect(toHex(w2.toBytes())).toBe('6300000064000000');
	});
});

// ── Edge cases ──────────────────────────────────────────────────────

describe('edge cases', () => {
	test('1-variant enum roundtrip', () => {
		const single = bcs.enum('Single', { Only: bcs.u32() });
		const bytes = single.toBytes({ Only: 42 });
		const parsed = single.parse(bytes);
		expect(parsed).toEqual({ $kind: 'Only', Only: 42 });
	});

	test('1-variant enum with null', () => {
		const single = bcs.enum('SingleNull', { Nothing: null });
		const bytes = single.toBytes({ Nothing: true });
		const parsed = single.parse(bytes);
		expect(parsed).toEqual({ $kind: 'Nothing', Nothing: true });
	});

	test('1-variant enum followed by more data', () => {
		// Verify the variant index byte is consumed (not skipped)
		const t = bcs.struct('S', {
			e: bcs.enum('E', { Only: bcs.u8() }),
			after: bcs.u32(),
		});
		const input = { e: { Only: 0xff }, after: 42 };
		const parsed = t.parse(t.toBytes(input));
		expect(parsed.e).toEqual({ $kind: 'Only', Only: 0xff });
		expect(parsed.after).toBe(42);
	});

	test('many-variant enum (>4 variants, uses ULEB)', () => {
		const fields: Record<string, any> = {};
		for (let i = 0; i < 10; i++) fields[`V${i}`] = bcs.u8();
		const e = bcs.enum('Big', fields);
		// Test last variant
		const bytes = e.toBytes({ V9: 99 });
		const parsed = e.parse(bytes);
		expect(parsed).toEqual({ $kind: 'V9', V9: 99 });
	});

	test('empty vector', () => {
		const t = bcs.vector(bcs.u32());
		const bytes = t.toBytes([]);
		expect(t.parse(bytes)).toEqual([]);
	});

	test('empty string', () => {
		const t = bcs.string();
		const bytes = t.toBytes('');
		expect(t.parse(bytes)).toBe('');
	});

	test('non-ASCII string roundtrip', () => {
		const t = bcs.string();
		const input = 'çå∞≠¢õß∂ƒ∫';
		expect(t.parse(t.toBytes(input))).toBe(input);
	});

	test('long ASCII string (>128 chars)', () => {
		const t = bcs.string();
		const input = 'a'.repeat(200);
		expect(t.parse(t.toBytes(input))).toBe(input);
	});

	test('string at ASCII boundary (127 chars)', () => {
		const t = bcs.string();
		const input = 'x'.repeat(127);
		expect(t.parse(t.toBytes(input))).toBe(input);
	});

	test('string at ASCII boundary (128 chars)', () => {
		const t = bcs.string();
		const input = 'y'.repeat(128);
		expect(t.parse(t.toBytes(input))).toBe(input);
	});

	test('mixed ASCII/non-ASCII string', () => {
		const t = bcs.string();
		const input = 'hello café';
		expect(t.parse(t.toBytes(input))).toBe(input);
	});

	test('deeply nested struct', () => {
		const inner = bcs.struct('I', { val: bcs.u32() });
		const mid = bcs.struct('M', { inner, label: bcs.string() });
		const outer = bcs.struct('O', { mid, flag: bcs.bool() });
		const input = { mid: { inner: { val: 42 }, label: 'test' }, flag: true };
		expect(outer.parse(outer.toBytes(input))).toEqual(input);
	});

	test('struct with >8 fields', () => {
		const fields: Record<string, any> = {};
		const val: Record<string, number> = {};
		for (let i = 0; i < 10; i++) {
			fields[`f${i}`] = bcs.u32();
			val[`f${i}`] = i * 100;
		}
		const t = bcs.struct('Big', fields);
		expect(t.parse(t.toBytes(val))).toEqual(val);
	});

	test('struct with >12 fields (fallback path)', () => {
		const fields: Record<string, any> = {};
		const val: Record<string, number> = {};
		for (let i = 0; i < 15; i++) {
			fields[`f${i}`] = bcs.u32();
			val[`f${i}`] = i;
		}
		const t = bcs.struct('Huge', fields);
		expect(t.parse(t.toBytes(val))).toEqual(val);
	});

	test('option(option(u32))', () => {
		const t = bcs.option(bcs.option(bcs.u32()));
		expect(t.parse(t.toBytes(null))).toBe(null);
		expect(t.parse(t.toBytes(null))).toBe(null);
		expect(t.parse(t.toBytes(42))).toBe(42);
	});

	test('option(null) roundtrip', () => {
		const t = bcs.option(bcs.u32());
		expect(t.parse(t.toBytes(null))).toBe(null);
		expect(t.parse(t.toBytes(undefined))).toBe(null);
	});

	test('fixedArray(0, u8)', () => {
		const t = bcs.fixedArray(0, bcs.u8());
		expect(t.parse(t.toBytes([]))).toEqual([]);
	});

	test('vector of structs', () => {
		const inner = bcs.struct('I', { a: bcs.u32(), b: bcs.bool() });
		const t = bcs.vector(inner);
		const input = [
			{ a: 1, b: true },
			{ a: 2, b: false },
			{ a: 3, b: true },
		];
		expect(t.parse(t.toBytes(input))).toEqual(input);
	});

	test('enum with $kind dispatch', () => {
		const e = bcs.enum('E', { A: bcs.u8(), B: bcs.u16(), C: null });
		// With $kind
		const bytes = e.toBytes({ $kind: 'B', B: 1000 } as any);
		const parsed = e.parse(bytes);
		expect(parsed.$kind).toBe('B');
		expect(parsed.B).toBe(1000);
	});
});

// ── Null prototype behavior ─────────────────────────────────────────

describe('decoded object properties', () => {
	test('struct decode produces objects with correct keys', () => {
		const t = bcs.struct('S', { alpha: bcs.u32(), beta: bcs.string() });
		const parsed = t.parse(t.toBytes({ alpha: 1, beta: 'hi' }));
		expect(Object.keys(parsed)).toEqual(['alpha', 'beta']);
		expect(parsed.alpha).toBe(1);
		expect(parsed.beta).toBe('hi');
	});

	test('Object.hasOwn works on decoded structs', () => {
		const t = bcs.struct('S', { x: bcs.u32() });
		const parsed = t.parse(t.toBytes({ x: 42 }));
		expect(Object.hasOwn(parsed, 'x')).toBe(true);
		expect(Object.hasOwn(parsed, 'y')).toBe(false);
	});

	test('enum decode produces objects with $kind', () => {
		const e = bcs.enum('E', { A: bcs.u8(), B: null });
		const parsed = e.parse(e.toBytes({ A: 1 }));
		expect(parsed.$kind).toBe('A');
		expect(Object.hasOwn(parsed, '$kind')).toBe(true);
		expect(Object.hasOwn(parsed, 'A')).toBe(true);
	});
});

// ── Transform ───────────────────────────────────────────────────────

describe('transform with new APIs', () => {
	test('transform toBytes uses input transform', () => {
		const t = bcs.u8().transform({
			input: (val: string) => parseInt(val),
			output: (val) => val.toString(),
		});
		const bytes = t.toBytes('42');
		expect(t.parse(bytes)).toBe('42');
	});

	test('transform toHex', () => {
		const t = bcs.u8().transform({
			input: (val: string) => parseInt(val),
			output: (val) => val.toString(),
		});
		expect(t.toHex('255')).toBe('ff');
	});

	test('double transform roundtrip', () => {
		const base = bcs.u64();
		const t1 = base.transform({ output: (val) => BigInt(val) });
		const t2 = t1.transform({
			input: (val: number) => BigInt(val),
			output: (val) => Number(val),
		});
		expect(t2.parse(t2.toBytes(42))).toBe(42);
	});
});

// ── Lazy types ──────────────────────────────────────────────────────

describe('lazy types', () => {
	test('recursive type via lazy', () => {
		type Node = { value: number; children: Node[] };
		const NodeType: BcsType<Node, Node> = bcs.struct('Node', {
			value: bcs.u32(),
			children: bcs.vector(bcs.lazy(() => NodeType)),
		});
		const input: Node = {
			value: 1,
			children: [
				{ value: 2, children: [] },
				{ value: 3, children: [{ value: 4, children: [] }] },
			],
		};
		const parsed = NodeType.parse(NodeType.toBytes(input));
		expect(parsed.value).toBe(1);
		expect(parsed.children.length).toBe(2);
		expect(parsed.children[1].children[0].value).toBe(4);
	});
});

// ── Bulk encode/decode ──────────────────────────────────────────────

describe('bulk vector operations', () => {
	test('vector<u8> bulk roundtrip', () => {
		const t = bcs.vector(bcs.u8());
		const input = Array.from({ length: 256 }, (_, i) => i);
		expect(t.parse(t.toBytes(input))).toEqual(input);
	});

	test('vector<u16> bulk roundtrip', () => {
		const t = bcs.vector(bcs.u16());
		const input = [0, 1, 255, 256, 65535];
		expect(t.parse(t.toBytes(input))).toEqual(input);
	});

	test('vector<u32> bulk roundtrip', () => {
		const t = bcs.vector(bcs.u32());
		const input = Array.from({ length: 100 }, (_, i) => i * 1000);
		expect(t.parse(t.toBytes(input))).toEqual(input);
	});

	test('vector<u64> bulk roundtrip', () => {
		const t = bcs.vector(bcs.u64());
		const input = [0n, 1n, 2n ** 53n, 2n ** 64n - 1n];
		const parsed = t.parse(t.toBytes(input));
		expect(parsed).toEqual(input.map(String));
	});

	test('vector<bool> bulk roundtrip', () => {
		const t = bcs.vector(bcs.bool());
		const input = [true, false, true, true, false];
		expect(t.parse(t.toBytes(input))).toEqual(input);
	});

	test('fixedArray<u8> bulk roundtrip', () => {
		const t = bcs.fixedArray(32, bcs.u8());
		const input = Array.from({ length: 32 }, (_, i) => i);
		expect(t.parse(t.toBytes(input))).toEqual(input);
	});
});

describe('enum property order', () => {
	test('variant key comes before $kind in decoded enums', () => {
		const E = bcs.enum('E', { A: bcs.u8(), B: null });
		const decoded = E.parse(E.toBytes({ A: 42 }));
		const keys = Object.keys(decoded);
		expect(keys[0]).toBe('A');
		expect(keys[1]).toBe('$kind');
	});

	test('Object.values order matches old behavior', () => {
		const E = bcs.enum('E', { Foo: bcs.bytes(4), Bar: null });
		const decoded = E.parse(E.toBytes({ Foo: new Uint8Array([1, 2, 3, 4]) }));
		const values = Object.values(decoded);
		// First value should be the data, not the $kind string
		expect(values[0]).toBeInstanceOf(Uint8Array);
		expect(values[1]).toBe('Foo');
	});
});

describe('decoded bytes are independent copies', () => {
	test('decodeFixedBytes returns a copy, not a view', () => {
		const t = bcs.bytes(4);
		const input = new Uint8Array([5, 1, 2, 3, 4]);
		// bytes(4) skips no ULEB prefix — but bcs.bytes is fixed size
		const encoded = t.toBytes(new Uint8Array([1, 2, 3, 4]));
		const decoded = t.parse(encoded);
		// Mutate the source — decoded should be unaffected
		encoded[0] = 99;
		expect(decoded[0]).toBe(1);
	});

	test('decodeByteVector returns a copy, not a view', () => {
		const t = bcs.byteVector();
		const encoded = t.toBytes(new Uint8Array([1, 2, 3]));
		const decoded = t.parse(encoded);
		// Mutate the source — decoded should be unaffected
		encoded[1] = 99;
		expect(decoded[0]).toBe(1);
	});
});

describe('per-field validation in compound types', () => {
	test('struct rejects out-of-range u8 field', () => {
		const S = bcs.struct('S', { w: bcs.u8() });
		expect(() => S.toBytes({ w: 256 })).toThrow('Invalid u8 value: 256');
	});

	test('struct rejects out-of-range u16 field', () => {
		const S = bcs.struct('S', { v: bcs.u16() });
		expect(() => S.toBytes({ v: 70000 })).toThrow('Invalid u16 value');
	});

	test('struct rejects negative u32 field', () => {
		const S = bcs.struct('S', { x: bcs.u32() });
		expect(() => S.toBytes({ x: -1 })).toThrow('Invalid u32 value');
	});

	test('enum rejects out-of-range field in variant', () => {
		const E = bcs.enum('E', { Val: bcs.u8() });
		expect(() => E.toBytes({ Val: 300 })).toThrow('Invalid u8 value');
	});

	test('nested struct validates inner fields', () => {
		const Inner = bcs.struct('Inner', { a: bcs.u8() });
		const Outer = bcs.struct('Outer', { inner: Inner });
		expect(() => Outer.toBytes({ inner: { a: 999 } })).toThrow('Invalid u8 value');
	});

	test('transform validates through parent', () => {
		const t = bcs.u8().transform({
			input: (v: string) => parseInt(v),
			output: (v: number) => String(v),
		});
		expect(() => t.toBytes('256')).toThrow('Invalid u8 value');
		expect(t.parse(t.toBytes('42'))).toBe('42');
	});

	test('transform runs its own validate and parent validate exactly once each', () => {
		let parentValidateCount = 0;
		let transformValidateCount = 0;
		const base = new BcsType<number, number>({
			name: 'counted',
			read: () => 0,
			write: () => {},
			validate: () => {
				parentValidateCount++;
			},
		});
		const transformed = base.transform({
			input: (v: string) => Number(v),
			output: (v: number) => String(v),
			validate: () => {
				transformValidateCount++;
			},
		});
		parentValidateCount = 0;
		transformValidateCount = 0;
		transformed.toBytes('5');
		expect(parentValidateCount).toBe(1);
		expect(transformValidateCount).toBe(1);
	});

	test('option validates inner type', () => {
		const t = bcs.option(bcs.u8());
		expect(() => t.toBytes(256)).toThrow('Invalid u8 value');
		expect(t.parse(t.toBytes(null))).toBe(null);
		expect(t.parse(t.toBytes(42))).toBe(42);
	});

	test('tuple validates element types', () => {
		const t = bcs.tuple([bcs.u8(), bcs.u16()]);
		expect(() => t.toBytes([256, 0])).toThrow('Invalid u8 value');
		expect(() => t.toBytes([0, 70000])).toThrow('Invalid u16 value');
	});
});

describe('reentrancy safety', () => {
	test('nested parse inside transform output does not corrupt state', () => {
		const Inner = bcs.bytes(4);
		const Outer = bcs.u32().transform({
			output: (v: number) => Inner.parse(Inner.toBytes(new Uint8Array([v, v, v, v]))),
			input: (v: Uint8Array) => v[0],
		});
		const S = bcs.struct('S', { b: Outer, after: bcs.u8() });
		const bytes = S.toBytes({ b: new Uint8Array([42, 42, 42, 42]), after: 99 });
		const result = S.parse(bytes);
		expect(result.after).toBe(99);
		expect(result.b[0]).toBe(42);
	});

	test('nested toBytes inside transform input does not corrupt state', () => {
		const Inner = bcs.u8();
		const Outer = bcs.u8().transform({
			input: (v: number) => {
				// Reentrant serialize during encode
				Inner.toBytes(v);
				return v;
			},
			output: (v: number) => v,
		});
		const S = bcs.struct('S', { a: Outer, b: bcs.u8() });
		const bytes = S.toBytes({ a: 42, b: 99 });
		const result = S.parse(bytes);
		expect(result).toEqual({ a: 42, b: 99 });
	});
});

describe('strict bool decoding', () => {
	test('rejects byte value 2', () => {
		expect(() => bcs.bool().parse(new Uint8Array([2]))).toThrow('Invalid BCS bool value');
	});

	test('rejects byte value 255', () => {
		expect(() => bcs.bool().parse(new Uint8Array([255]))).toThrow('Invalid BCS bool value');
	});

	test('accepts 0 and 1', () => {
		expect(bcs.bool().parse(new Uint8Array([0]))).toBe(false);
		expect(bcs.bool().parse(new Uint8Array([1]))).toBe(true);
	});
});

describe('transform on bytes uses view internally', () => {
	test('transform output receives view, final result is independent', () => {
		let receivedView: Uint8Array | null = null;
		const t = bcs.bytes(4).transform({
			output: (v: Uint8Array) => {
				receivedView = v;
				return Array.from(v);
			},
			input: (v: number[]) => new Uint8Array(v),
		});
		const input = new Uint8Array([10, 1, 2, 3, 4]);
		// bytes(4) encoded as [1,2,3,4], parse from offset data
		const result = t.parse(t.toBytes([1, 2, 3, 4]));
		expect(result).toEqual([1, 2, 3, 4]);
	});

	test('plain bcs.bytes returns independent copy', () => {
		const t = bcs.bytes(4);
		const encoded = t.toBytes(new Uint8Array([1, 2, 3, 4]));
		const decoded = t.parse(encoded);
		encoded[0] = 99;
		expect(decoded[0]).toBe(1);
	});
});
