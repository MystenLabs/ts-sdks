// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * BCS decode — closure-based state isolation.
 *
 * createDecoder() returns an object whose methods close over private `o` (offset)
 * and `d` (data) variables. Each decoder instance is fully independent.
 *
 * A module-level singleton decoder is created at load time and exported directly.
 * BcsType and bcs.ts destructure the methods they need from it. Standalone
 * BcsReader instances create their own decoder via createDecoder().
 */

const textDecoder = new TextDecoder();

export function createDecoder() {
	let o = 0;
	let d: Uint8Array;

	function init(data: Uint8Array) {
		o = 0;
		d = data;
	}

	function readUleb(): number {
		let b = d[o++]!;
		if (!(b & 0x80)) return b;
		let total = b & 0x7f;
		let shift = 7;
		do {
			b = d[o++]!;
			total = shift < 28 ? total | ((b & 0x7f) << shift) : total + (b & 0x7f) * 2 ** shift;
			shift += 7;
		} while (b & 0x80);
		return total;
	}

	function decodeU8(): number {
		return d[o++]!;
	}

	function decodeU16(): number {
		const v = d[o]! | (d[o + 1]! << 8);
		o += 2;
		return v;
	}

	function decodeU32(): number {
		const v = (d[o]! | (d[o + 1]! << 8) | (d[o + 2]! << 16) | (d[o + 3]! << 24)) >>> 0;
		o += 4;
		return v;
	}

	function decodeU64(): string {
		const lo = (d[o]! | (d[o + 1]! << 8) | (d[o + 2]! << 16) | (d[o + 3]! << 24)) >>> 0;
		const hi = (d[o + 4]! | (d[o + 5]! << 8) | (d[o + 6]! << 16) | (d[o + 7]! << 24)) >>> 0;
		o += 8;
		if (hi < 0x200000) return String(hi * 0x100000000 + lo);
		return (BigInt(hi) * 0x100000000n + BigInt(lo)).toString(10);
	}

	function decodeU128(): string {
		const p0 = (d[o]! | (d[o + 1]! << 8) | (d[o + 2]! << 16) | (d[o + 3]! << 24)) >>> 0;
		const p1 = (d[o + 4]! | (d[o + 5]! << 8) | (d[o + 6]! << 16) | (d[o + 7]! << 24)) >>> 0;
		const p2 = (d[o + 8]! | (d[o + 9]! << 8) | (d[o + 10]! << 16) | (d[o + 11]! << 24)) >>> 0;
		const p3 = (d[o + 12]! | (d[o + 13]! << 8) | (d[o + 14]! << 16) | (d[o + 15]! << 24)) >>> 0;
		o += 16;
		return (
			BigInt(p3) * 0x1000000000000000000000000n +
			BigInt(p2) * 0x10000000000000000n +
			BigInt(p1) * 0x100000000n +
			BigInt(p0)
		).toString(10);
	}

	function decodeU256(): string {
		const parts: number[] = [];
		for (let i = 0; i < 8; i++) {
			const off = o + i * 4;
			parts.push((d[off]! | (d[off + 1]! << 8) | (d[off + 2]! << 16) | (d[off + 3]! << 24)) >>> 0);
		}
		o += 32;
		let r = 0n;
		for (let i = 7; i >= 0; i--) r = (r << 32n) | BigInt(parts[i]);
		return r.toString(10);
	}

	function decodeBool(): boolean {
		const v = d[o++]!;
		if (v > 1) throw new TypeError(`Invalid BCS bool value: ${v}. Expected 0 or 1`);
		return v === 1;
	}

	function decodeFixedBytes(size: number): Uint8Array {
		const v = d.slice(o, o + size);
		o += size;
		return v;
	}

	function decodeString(): string {
		const len = readUleb();
		// ASCII fast path: String.fromCharCode avoids TextDecoder overhead for short strings
		if (len < 128) {
			const start = o;
			let allAscii = true;
			for (let i = 0; i < len; i++) {
				if (d[start + i]! > 0x7f) {
					allAscii = false;
					break;
				}
			}
			if (allAscii) {
				let s = '';
				for (let i = 0; i < len; i++) s += String.fromCharCode(d[start + i]!);
				o += len;
				return s;
			}
		}
		const v = textDecoder.decode(d.subarray(o, o + len));
		o += len;
		return v;
	}

	function decodeByteVector(): Uint8Array {
		const len = readUleb();
		const v = d.slice(o, o + len);
		o += len;
		return v;
	}

	function bulkDecodeU8(n: number): number[] {
		const r = new Array(n);
		for (let i = 0; i < n; i++) r[i] = d[o + i];
		o += n;
		return r;
	}

	function bulkDecodeU16(n: number): number[] {
		const r = new Array(n);
		let p = o;
		for (let i = 0; i < n; i++) {
			r[i] = d[p]! | (d[p + 1]! << 8);
			p += 2;
		}
		o = p;
		return r;
	}

	function bulkDecodeU32(n: number): number[] {
		const r = new Array(n);
		let p = o;
		for (let i = 0; i < n; i++) {
			r[i] = (d[p]! | (d[p + 1]! << 8) | (d[p + 2]! << 16) | (d[p + 3]! << 24)) >>> 0;
			p += 4;
		}
		o = p;
		return r;
	}

	function bulkDecodeU64(n: number): string[] {
		const r = new Array(n);
		let p = o;
		for (let i = 0; i < n; i++) {
			const lo = (d[p]! | (d[p + 1]! << 8) | (d[p + 2]! << 16) | (d[p + 3]! << 24)) >>> 0;
			const hi = (d[p + 4]! | (d[p + 5]! << 8) | (d[p + 6]! << 16) | (d[p + 7]! << 24)) >>> 0;
			p += 8;
			r[i] =
				hi < 0x200000
					? String(hi * 0x100000000 + lo)
					: (BigInt(hi) * 0x100000000n + BigInt(lo)).toString(10);
		}
		o = p;
		return r;
	}

	function bulkDecodeBool(n: number): boolean[] {
		const r = new Array(n);
		let p = o;
		for (let i = 0; i < n; i++) r[i] = d[p++] === 1;
		o = p;
		return r;
	}

	function getBulkDecoder(kind: string): ((n: number) => unknown[]) | null {
		switch (kind) {
			case 'u8':
				return bulkDecodeU8;
			case 'u16':
				return bulkDecodeU16;
			case 'u32':
				return bulkDecodeU32;
			case 'u64':
				return bulkDecodeU64;
			case 'bool':
				return bulkDecodeBool;
			default:
				return null;
		}
	}

	function buildStructDecoder(keys: string[], readers: (() => unknown)[]): () => unknown {
		const n = keys.length;
		const [k0, k1, k2, k3, k4, k5, k6, k7] = keys;
		const [r0, r1, r2, r3, r4, r5, r6, r7] = readers;
		// prettier-ignore
		switch (n) {
			case 1: return () => ({ [k0!]: r0!() });
			case 2: return () => ({ [k0!]: r0!(), [k1!]: r1!() });
			case 3: return () => ({ [k0!]: r0!(), [k1!]: r1!(), [k2!]: r2!() });
			case 4: return () => ({ [k0!]: r0!(), [k1!]: r1!(), [k2!]: r2!(), [k3!]: r3!() });
			case 5: return () => ({ [k0!]: r0!(), [k1!]: r1!(), [k2!]: r2!(), [k3!]: r3!(), [k4!]: r4!() });
			case 6: return () => ({ [k0!]: r0!(), [k1!]: r1!(), [k2!]: r2!(), [k3!]: r3!(), [k4!]: r4!(), [k5!]: r5!() });
			case 7: return () => ({ [k0!]: r0!(), [k1!]: r1!(), [k2!]: r2!(), [k3!]: r3!(), [k4!]: r4!(), [k5!]: r5!(), [k6!]: r6!() });
			case 8: return () => ({ [k0!]: r0!(), [k1!]: r1!(), [k2!]: r2!(), [k3!]: r3!(), [k4!]: r4!(), [k5!]: r5!(), [k6!]: r6!(), [k7!]: r7!() });
			default: return () => { const obj: Record<string, unknown> = {}; for (let i = 0; i < n; i++) obj[keys[i]!] = readers[i]!(); return obj; };
		}
	}

	function buildEnumDecoder(
		variantKeys: string[],
		variantReaders: ((() => unknown) | null)[],
		enumName?: string,
	): () => unknown {
		const n = variantKeys.length;
		const decoders: (() => unknown)[] = [];
		for (let j = 0; j < n; j++) {
			const key = variantKeys[j]!;
			const reader = variantReaders[j];
			decoders.push(
				reader === null
					? () => ({ [key]: true, $kind: key })
					: () => ({ [key]: reader(), $kind: key }),
			);
		}

		function invalidVariant(i: number): never {
			throw new TypeError(
				`Invalid variant index ${i} for enum ${enumName ?? '(unknown)'}. Expected 0..${n - 1}`,
			);
		}

		const [d0, d1, d2, d3] = decoders;
		// prettier-ignore
		switch (n) {
			case 1: return () => { const i = decodeU8(); return i === 0 ? d0!() : invalidVariant(i); };
			case 2: return () => { const i = decodeU8(); return i === 0 ? d0!() : i === 1 ? d1!() : invalidVariant(i); };
			case 3: return () => { const i = decodeU8(); return i === 0 ? d0!() : i === 1 ? d1!() : i === 2 ? d2!() : invalidVariant(i); };
			case 4: return () => { const i = decodeU8(); return i === 0 ? d0!() : i === 1 ? d1!() : i === 2 ? d2!() : i === 3 ? d3!() : invalidVariant(i); };
			default: return () => { const i = readUleb(); return i < n ? decoders[i]!() : invalidVariant(i); };
		}
	}

	function buildTupleDecoder(readers: (() => unknown)[]): () => unknown {
		const n = readers.length;
		const [d0, d1, d2, d3, d4] = readers;
		// prettier-ignore
		switch (n) {
			case 2: return () => [d0!(), d1!()];
			case 3: return () => [d0!(), d1!(), d2!()];
			case 4: return () => [d0!(), d1!(), d2!(), d3!()];
			case 5: return () => [d0!(), d1!(), d2!(), d3!(), d4!()];
			default: return () => { const r = new Array(n); for (let i = 0; i < n; i++) r[i] = readers[i]!(); return r; };
		}
	}

	function buildVectorDecoder(elemReader: () => unknown, kind?: string): () => unknown {
		const bulk = kind ? getBulkDecoder(kind) : null;
		const elemSize =
			kind === 'u8' || kind === 'bool'
				? 1
				: kind === 'u16'
					? 2
					: kind === 'u32'
						? 4
						: kind === 'u64'
							? 8
							: 1;
		if (bulk)
			return () => {
				const n = readUleb();
				if (n * elemSize > d.length - o)
					throw new TypeError(`BCS vector length ${n} exceeds remaining data`);
				return bulk(n);
			};
		return () => {
			const n = readUleb();
			if (n > d.length - o) throw new TypeError(`BCS vector length ${n} exceeds remaining data`);
			const r = new Array(n);
			for (let i = 0; i < n; i++) r[i] = elemReader();
			return r;
		};
	}

	function buildFixedArrayDecoder(
		len: number,
		elemReader: () => unknown,
		kind?: string,
	): () => unknown {
		const bulk = kind ? getBulkDecoder(kind) : null;
		if (bulk) return () => bulk(len);
		return () => {
			const r = new Array(len);
			for (let i = 0; i < len; i++) r[i] = elemReader();
			return r;
		};
	}

	function buildOptionDecoder(innerReader: () => unknown): {
		decode: () => unknown;
		parse: (bytes: Uint8Array) => unknown;
	} {
		return {
			decode: () => (decodeBool() ? innerReader() : null),
			parse: (bytes) => {
				init(bytes);
				return decodeBool() ? innerReader() : null;
			},
		};
	}

	function buildMapDecoder(keyReader: () => unknown, valueReader: () => unknown): () => unknown {
		return () => {
			const length = readUleb();
			const result = new Map();
			for (let i = 0; i < length; i++) result.set(keyReader(), valueReader());
			return result;
		};
	}

	return {
		init,
		readUleb,
		decodeU8,
		decodeU16,
		decodeU32,
		decodeU64,
		decodeU128,
		decodeU256,
		decodeBool,
		decodeFixedBytes,
		decodeString,
		decodeByteVector,
		bulkDecodeU8,
		bulkDecodeU16,
		bulkDecodeU32,
		bulkDecodeU64,
		bulkDecodeBool,
		buildStructDecoder,
		buildEnumDecoder,
		buildTupleDecoder,
		buildVectorDecoder,
		buildFixedArrayDecoder,
		buildOptionDecoder,
		buildMapDecoder,
		save(): { d: Uint8Array; o: number } {
			return { d, o };
		},
		restore(s: { d: Uint8Array; o: number }) {
			d = s.d;
			o = s.o;
		},
		get offset() {
			return o;
		},
		set offset(v: number) {
			o = v;
		},
		get data() {
			return d;
		},
	};
}

export type Decoder = ReturnType<typeof createDecoder>;

export const decoder = createDecoder();
