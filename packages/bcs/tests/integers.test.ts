// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Validates integer encode/decode correctness by:
 * 1. Round-tripping through encode → decode and checking the value matches
 * 2. Encoding via our optimized path and comparing bytes against a reference
 *    DataView/BigInt implementation
 * 3. Testing boundary values where fast-path thresholds and bit widths change
 */

import { describe, expect, it } from 'vitest';
import { bcs } from '../src/bcs.js';

// ── Reference encoder: simple, obviously-correct DataView-based implementation ──

function refEncodeU8(v: number): Uint8Array {
	return new Uint8Array([v]);
}
function refEncodeU16(v: number): Uint8Array {
	const b = new ArrayBuffer(2);
	new DataView(b).setUint16(0, v, true);
	return new Uint8Array(b);
}
function refEncodeU32(v: number): Uint8Array {
	const b = new ArrayBuffer(4);
	new DataView(b).setUint32(0, v, true);
	return new Uint8Array(b);
}
function refEncodeU64(v: bigint): Uint8Array {
	const b = new ArrayBuffer(8);
	new DataView(b).setBigUint64(0, v, true);
	return new Uint8Array(b);
}
function refEncodeU128(v: bigint): Uint8Array {
	const b = new ArrayBuffer(16);
	const dv = new DataView(b);
	dv.setBigUint64(0, v & 0xffff_ffff_ffff_ffffn, true);
	dv.setBigUint64(8, v >> 64n, true);
	return new Uint8Array(b);
}
function refEncodeU256(v: bigint): Uint8Array {
	const b = new ArrayBuffer(32);
	const dv = new DataView(b);
	const m = 0xffff_ffff_ffff_ffffn;
	dv.setBigUint64(0, v & m, true);
	dv.setBigUint64(8, (v >> 64n) & m, true);
	dv.setBigUint64(16, (v >> 128n) & m, true);
	dv.setBigUint64(24, v >> 192n, true);
	return new Uint8Array(b);
}

// ── Helpers ──

const U8 = bcs.u8();
const U16 = bcs.u16();
const U32 = bcs.u32();
const U64 = bcs.u64();
const U128 = bcs.u128();
const U256 = bcs.u256();

/** Verify round-trip and byte-level match against reference encoder */
function checkU8(v: number) {
	const bytes = U8.toBytes(v);
	expect([...bytes]).toEqual([...refEncodeU8(v)]);
	expect(U8.parse(bytes)).toBe(v);
}
function checkU16(v: number) {
	const bytes = U16.toBytes(v);
	expect([...bytes]).toEqual([...refEncodeU16(v)]);
	expect(U16.parse(bytes)).toBe(v);
}
function checkU32(v: number) {
	const bytes = U32.toBytes(v);
	expect([...bytes]).toEqual([...refEncodeU32(v)]);
	expect(U32.parse(bytes)).toBe(v);
}
function checkU64(v: bigint) {
	const bytes = U64.toBytes(v);
	expect([...bytes]).toEqual([...refEncodeU64(v)]);
	expect(U64.parse(bytes)).toBe(v.toString());
}
function checkU128(v: bigint) {
	const bytes = U128.toBytes(v);
	expect([...bytes]).toEqual([...refEncodeU128(v)]);
	expect(U128.parse(bytes)).toBe(v.toString());
}
function checkU256(v: bigint) {
	const bytes = U256.toBytes(v);
	expect([...bytes]).toEqual([...refEncodeU256(v)]);
	expect(U256.parse(bytes)).toBe(v.toString());
}

// ── Tests ──

describe('u8 codec', () => {
	it('boundary values', () => {
		checkU8(0);
		checkU8(1);
		checkU8(127);
		checkU8(128);
		checkU8(255);
	});
});

describe('u16 codec', () => {
	it('boundary values', () => {
		checkU16(0);
		checkU16(1);
		checkU16(255);
		checkU16(256);
		checkU16(0x7fff);
		checkU16(0x8000);
		checkU16(0xffff);
	});
});

describe('u32 codec', () => {
	it('boundary values', () => {
		checkU32(0);
		checkU32(1);
		checkU32(0xffff);
		checkU32(0x10000);
		checkU32(0x7fffffff);
		checkU32(0x80000000);
		checkU32(0xffffffff);
	});
});

describe('u64 codec', () => {
	it('zero and small values', () => {
		checkU64(0n);
		checkU64(1n);
		checkU64(255n);
		checkU64(256n);
	});

	it('32-bit boundary', () => {
		checkU64(0xffffffffn);
		checkU64(0x100000000n);
		checkU64(0x100000001n);
	});

	// The decoder uses a fast path for hi < 0x200000 (number arithmetic)
	// and falls back to BigInt otherwise. Test around this threshold.
	it('fast-path threshold (hi = 0x200000)', () => {
		// hi = 0x1fffff (just below threshold — uses fast number path)
		checkU64(0x1fffffffffffffn);
		// hi = 0x200000 (exactly at threshold — uses BigInt path)
		checkU64(0x20000000000000n);
		// hi = 0x200001 (just above threshold)
		checkU64(0x20000100000000n);
	});

	it('values around Number.MAX_SAFE_INTEGER', () => {
		// MAX_SAFE_INTEGER = 2^53 - 1 = 0x1fffffffffffff
		checkU64(BigInt(Number.MAX_SAFE_INTEGER) - 1n);
		checkU64(BigInt(Number.MAX_SAFE_INTEGER));
		checkU64(BigInt(Number.MAX_SAFE_INTEGER) + 1n);
	});

	it('large values and max', () => {
		checkU64(0xfedcba9876543210n);
		checkU64(0xfffffffffffffffen);
		checkU64(0xffffffffffffffffn);
	});

	it('random values across the range', () => {
		const values = [
			0x123456789n,
			0xdeadbeefn,
			0x1_0000_0000n,
			0xff_ffff_ffffn,
			0x1234_5678_9abc_def0n,
			0x8000_0000_0000_0000n,
		];
		for (const v of values) checkU64(v);
	});
});

describe('u128 codec', () => {
	it('zero and small', () => {
		checkU128(0n);
		checkU128(1n);
		checkU128(0xffffffffn);
	});

	it('64-bit boundary', () => {
		checkU128(0xffffffffffffffffn);
		checkU128(0x10000000000000000n);
	});

	it('large values and max', () => {
		checkU128(0xfedcba9876543210_fedcba9876543210n);
		checkU128((1n << 128n) - 1n);
	});

	it('each 32-bit part independently', () => {
		// Only p0 set
		checkU128(0xdeadbeefn);
		// Only p1 set
		checkU128(0xdeadbeef_00000000n);
		// Only p2 set
		checkU128(0xdeadbeef_0000000000000000n);
		// Only p3 set
		checkU128(0xdeadbeef_000000000000000000000000n);
	});
});

describe('u256 codec', () => {
	it('zero and small', () => {
		checkU256(0n);
		checkU256(1n);
		checkU256(0xffffffffn);
	});

	it('128-bit boundary', () => {
		checkU256((1n << 128n) - 1n);
		checkU256(1n << 128n);
	});

	it('max value', () => {
		checkU256((1n << 256n) - 1n);
	});

	it('each 32-bit part independently', () => {
		for (let i = 0; i < 8; i++) {
			checkU256(0xdeadbeefn << BigInt(i * 32));
		}
	});

	it('alternating bit patterns', () => {
		const a = (1n << 256n) / 3n; // 0x5555...
		checkU256(a);
		const b = a << 1n; // 0xaaaa...
		checkU256(b & ((1n << 256n) - 1n));
	});
});

describe('bool codec', () => {
	const Bool = bcs.bool();
	it('round-trips', () => {
		expect(Bool.parse(Bool.toBytes(true))).toBe(true);
		expect(Bool.parse(Bool.toBytes(false))).toBe(false);
	});
	it('encodes as expected bytes', () => {
		expect([...Bool.toBytes(true)]).toEqual([1]);
		expect([...Bool.toBytes(false)]).toEqual([0]);
	});
});

describe('ULEB codec via uleb128 type', () => {
	const Uleb = bcs.uleb128();

	it('single-byte values (0-127)', () => {
		for (const v of [0, 1, 63, 127]) {
			const bytes = Uleb.toBytes(v);
			expect(bytes.length).toBe(1);
			expect(Uleb.parse(bytes)).toBe(v);
		}
	});

	it('multi-byte boundaries', () => {
		// 128 = first 2-byte value
		expect(Uleb.parse(Uleb.toBytes(128))).toBe(128);
		// 16384 = first 3-byte value
		expect(Uleb.parse(Uleb.toBytes(16384))).toBe(16384);
		// 2097152 = first 4-byte value
		expect(Uleb.parse(Uleb.toBytes(2097152))).toBe(2097152);
		// 268435456 = first 5-byte value
		expect(Uleb.parse(Uleb.toBytes(268435456))).toBe(268435456);
	});

	it('powers of 2', () => {
		for (let i = 0; i < 32; i++) {
			const v = 2 ** i;
			expect(Uleb.parse(Uleb.toBytes(v))).toBe(v);
		}
	});
});

describe('vector bulk decode parity', () => {
	// Vectors of primitives use bulk decoders — verify they match element-by-element

	it('vector<u8> matches element decode', () => {
		const values = [0, 1, 127, 128, 255];
		const VecType = bcs.vector(bcs.u8());
		const parsed = VecType.parse(VecType.toBytes(values));
		expect(parsed).toEqual(values);
	});

	it('vector<u16> matches element decode', () => {
		const values = [0, 1, 255, 256, 0x7fff, 0x8000, 0xffff];
		const VecType = bcs.vector(bcs.u16());
		const parsed = VecType.parse(VecType.toBytes(values));
		expect(parsed).toEqual(values);
	});

	it('vector<u32> matches element decode', () => {
		const values = [0, 1, 0xffff, 0x10000, 0x7fffffff, 0x80000000, 0xffffffff];
		const VecType = bcs.vector(bcs.u32());
		const parsed = VecType.parse(VecType.toBytes(values));
		expect(parsed).toEqual(values);
	});

	it('vector<u64> matches element decode', () => {
		const values = [0n, 1n, 0xffffffffn, 0x100000000n, 0xffffffffffffffffn];
		const VecType = bcs.vector(bcs.u64());
		const parsed = VecType.parse(VecType.toBytes(values));
		expect(parsed).toEqual(values.map(String));
	});

	it('vector<bool> matches element decode', () => {
		const values = [true, false, true, true, false];
		const VecType = bcs.vector(bcs.bool());
		const parsed = VecType.parse(VecType.toBytes(values));
		expect(parsed).toEqual(values);
	});
});

describe('cross-type consistency', () => {
	// Encode a u64 value, then decode the same bytes as u128 with zero-padding
	it('u64 bytes are the low 8 bytes of equivalent u128', () => {
		const v = 0xdeadbeef12345678n;
		const u64Bytes = U64.toBytes(v);
		const u128Bytes = U128.toBytes(v);
		// First 8 bytes should match
		expect([...u64Bytes]).toEqual([...u128Bytes.slice(0, 8)]);
		// Remaining 8 bytes of u128 should be zero
		expect([...u128Bytes.slice(8)]).toEqual(new Array(8).fill(0));
	});

	it('u128 bytes are the low 16 bytes of equivalent u256', () => {
		const v = 0xdeadbeef12345678_aabbccdd11223344n;
		const u128Bytes = U128.toBytes(v);
		const u256Bytes = U256.toBytes(v);
		expect([...u128Bytes]).toEqual([...u256Bytes.slice(0, 16)]);
		expect([...u256Bytes.slice(16)]).toEqual(new Array(16).fill(0));
	});
});
