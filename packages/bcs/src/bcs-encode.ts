// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * BCS encode — closure-based state isolation.
 *
 * createEncoder() returns an object whose methods close over private buffer state.
 * Each encoder instance is fully independent. A singleton encoder is exported for
 * use by BcsType and bcs.ts.
 */

const textEncoder = new TextEncoder();

function ulebToBytes(n: number): Uint8Array {
	if (n < 0x80) return new Uint8Array([n]);
	const bytes: number[] = [];
	let v = n;
	while (v > 0) {
		let byte = v & 0x7f;
		v >>>= 7;
		if (v > 0) byte |= 0x80;
		bytes.push(byte);
	}
	return new Uint8Array(bytes);
}

export function createEncoder() {
	const INITIAL_SIZE = 4096;
	const MAX_GROWTH = 10 * 1024 * 1024; // 10MB

	let buf: Uint8Array;
	let view: DataView;
	let bufSize: number;
	let wo = 0;
	let maxSize = Infinity;

	function ensure(n: number) {
		const need = wo + n;
		if (need > maxSize) {
			throw new TypeError(
				`BCS serialization exceeds maxSize: need ${need} bytes, limit is ${maxSize}`,
			);
		}
		if (need <= bufSize) return;
		bufSize += Math.max(Math.min(MAX_GROWTH, bufSize), need - bufSize);
		const ab = new ArrayBuffer(bufSize);
		const next = new Uint8Array(ab);
		next.set(buf);
		buf = next;
		view = new DataView(ab);
	}

	function writeUleb(n: number) {
		if (n < 0x80) {
			buf[wo++] = n;
			return;
		}
		// For values that fit in uint32, use the fast bitwise path
		if (n <= 0xffffffff) {
			let v = n >>> 0;
			while (v > 0) {
				let byte = v & 0x7f;
				v >>>= 7;
				if (v > 0) byte |= 0x80;
				buf[wo++] = byte;
			}
			return;
		}
		// For values > 2^32, use Math.floor division to avoid truncation
		let v = n;
		while (v > 0) {
			let byte = v & 0x7f;
			v = Math.floor(v / 128);
			if (v > 0) byte |= 0x80;
			buf[wo++] = byte;
		}
	}

	function writeRawBytes(bytes: Uint8Array): void {
		const n = bytes.length;
		ensure(n);
		buf.set(bytes, wo);
		wo += n;
	}

	// Fixed-size shared buffer avoids allocation for small payloads (~9x faster
	// than allocating fresh per serialize). The result is always a copy via slice(),
	// so the consumer owns independent bytes.
	const sharedAb = new ArrayBuffer(INITIAL_SIZE);
	const sharedBuf = new Uint8Array(sharedAb);
	const sharedView = new DataView(sharedAb);

	function initEncode(): void {
		buf = sharedBuf;
		view = sharedView;
		bufSize = INITIAL_SIZE;
		wo = 0;
	}

	function getEncodeResult(): Uint8Array<ArrayBuffer> {
		return buf.slice(0, wo) as Uint8Array<ArrayBuffer>;
	}

	function fastSerialize(
		writeFn: (value: unknown) => void,
		value: unknown,
		sizeLimit?: number,
	): Uint8Array<ArrayBuffer> {
		const saved = { buf, view, bufSize, wo, maxSize };
		initEncode();
		maxSize = sizeLimit ?? Infinity;
		try {
			writeFn(value);
			return getEncodeResult();
		} finally {
			buf = saved.buf;
			view = saved.view;
			bufSize = saved.bufSize;
			wo = saved.wo;
			maxSize = saved.maxSize;
		}
	}

	function encodeU8(v: number) {
		ensure(1);
		buf[wo++] = v;
	}
	function encodeU16(v: number) {
		ensure(2);
		view.setUint16(wo, v, true);
		wo += 2;
	}
	function encodeU32(v: number) {
		ensure(4);
		view.setUint32(wo, v, true);
		wo += 4;
	}

	function encodeU64(v: string | number | bigint) {
		ensure(8);
		view.setBigUint64(wo, BigInt(v), true);
		wo += 8;
	}

	function encodeU128(v: string | number | bigint) {
		ensure(16);
		const big = BigInt(v);
		view.setBigUint64(wo, big & 0xffff_ffff_ffff_ffffn, true);
		view.setBigUint64(wo + 8, big >> 64n, true);
		wo += 16;
	}

	function encodeU256(v: string | number | bigint) {
		ensure(32);
		const big = BigInt(v);
		const m = 0xffff_ffff_ffff_ffffn;
		view.setBigUint64(wo, big & m, true);
		view.setBigUint64(wo + 8, (big >> 64n) & m, true);
		view.setBigUint64(wo + 16, (big >> 128n) & m, true);
		view.setBigUint64(wo + 24, big >> 192n, true);
		wo += 32;
	}

	function encodeBool(v: boolean) {
		ensure(1);
		buf[wo++] = v ? 1 : 0;
	}

	function encodeFixedBytes(v: Iterable<number>, size: number) {
		ensure(size);
		buf.set(v instanceof Uint8Array ? v : new Uint8Array(v), wo);
		wo += size;
	}

	function encodeString(v: string) {
		const len = v.length;
		if (len < 128) {
			ensure(5 + len);
			let allAscii = true;
			for (let i = 0; i < len; i++) {
				if (v.charCodeAt(i) > 0x7f) {
					allAscii = false;
					break;
				}
			}
			if (allAscii) {
				buf[wo++] = len;
				for (let i = 0; i < len; i++) buf[wo + i] = v.charCodeAt(i);
				wo += len;
				return;
			}
		}
		const enc = textEncoder.encode(v);
		ensure(5 + enc.length);
		writeUleb(enc.length);
		buf.set(enc, wo);
		wo += enc.length;
	}

	function encodeByteVector(v: Iterable<number>) {
		const arr = v instanceof Uint8Array ? v : new Uint8Array(v);
		ensure(5 + arr.length);
		writeUleb(arr.length);
		buf.set(arr, wo);
		wo += arr.length;
	}

	function bulkEncodeU8(a: Uint8Array | number[]) {
		const n = a.length;
		ensure(n);
		if (a instanceof Uint8Array) buf.set(a, wo);
		else for (let i = 0; i < n; i++) buf[wo + i] = a[i];
		wo += n;
	}
	function bulkEncodeU16(a: number[]) {
		const n = a.length;
		ensure(n * 2);
		for (let i = 0; i < n; i++) {
			view.setUint16(wo, a[i], true);
			wo += 2;
		}
	}
	function bulkEncodeU32(a: number[]) {
		const n = a.length;
		ensure(n * 4);
		for (let i = 0; i < n; i++) {
			view.setUint32(wo, a[i], true);
			wo += 4;
		}
	}
	function bulkEncodeU64(a: (string | number | bigint)[]) {
		const n = a.length;
		ensure(n * 8);
		for (let i = 0; i < n; i++) {
			view.setBigUint64(wo, BigInt(a[i]), true);
			wo += 8;
		}
	}
	function bulkEncodeBool(a: boolean[]) {
		const n = a.length;
		ensure(n);
		for (let i = 0; i < n; i++) buf[wo++] = a[i] ? 1 : 0;
	}

	function getBulkEncoder(kind: string): ((a: unknown) => void) | null {
		switch (kind) {
			case 'u8':
				return bulkEncodeU8 as (a: unknown) => void;
			case 'u16':
				return bulkEncodeU16 as (a: unknown) => void;
			case 'u32':
				return bulkEncodeU32 as (a: unknown) => void;
			case 'u64':
				return bulkEncodeU64 as (a: unknown) => void;
			case 'bool':
				return bulkEncodeBool as (a: unknown) => void;
			default:
				return null;
		}
	}

	function buildStructEncoder(
		keys: string[],
		writers: ((v: unknown) => void)[],
	): (v: unknown) => void {
		const n = keys.length;
		const [k0, k1, k2, k3, k4, k5, k6, k7] = keys;
		const [w0, w1, w2, w3, w4, w5, w6, w7] = writers;
		// prettier-ignore
		switch (n) {
			case 1: return (v) => { const $=v as Record<string,unknown>; w0!($[k0!]); };
			case 2: return (v) => { const $=v as Record<string,unknown>; w0!($[k0!]); w1!($[k1!]); };
			case 3: return (v) => { const $=v as Record<string,unknown>; w0!($[k0!]); w1!($[k1!]); w2!($[k2!]); };
			case 4: return (v) => { const $=v as Record<string,unknown>; w0!($[k0!]); w1!($[k1!]); w2!($[k2!]); w3!($[k3!]); };
			case 5: return (v) => { const $=v as Record<string,unknown>; w0!($[k0!]); w1!($[k1!]); w2!($[k2!]); w3!($[k3!]); w4!($[k4!]); };
			case 6: return (v) => { const $=v as Record<string,unknown>; w0!($[k0!]); w1!($[k1!]); w2!($[k2!]); w3!($[k3!]); w4!($[k4!]); w5!($[k5!]); };
			case 7: return (v) => { const $=v as Record<string,unknown>; w0!($[k0!]); w1!($[k1!]); w2!($[k2!]); w3!($[k3!]); w4!($[k4!]); w5!($[k5!]); w6!($[k6!]); };
			case 8: return (v) => { const $=v as Record<string,unknown>; w0!($[k0!]); w1!($[k1!]); w2!($[k2!]); w3!($[k3!]); w4!($[k4!]); w5!($[k5!]); w6!($[k6!]); w7!($[k7!]); };
			default: return (v) => { const $=v as Record<string,unknown>; for (let i = 0; i < n; i++) writers[i]!($[keys[i]!]); };
		}
	}

	function buildEnumEncoder(
		variantKeys: string[],
		variantWriters: (((v: unknown) => void) | null)[],
	): (v: unknown) => void {
		const n = variantKeys.length;
		const encoders: ((v: unknown) => void)[] = [];
		for (let j = 0; j < n; j++) {
			const key = variantKeys[j]!;
			const writer = variantWriters[j];
			const ulebBytes = ulebToBytes(j);
			const ulebLen = ulebBytes.length;
			if (writer === null) {
				encoders.push(() => {
					ensure(ulebLen);
					buf.set(ulebBytes, wo);
					wo += ulebLen;
				});
			} else {
				encoders.push((v) => {
					ensure(ulebLen);
					buf.set(ulebBytes, wo);
					wo += ulebLen;
					writer((v as Record<string, unknown>)[key]);
				});
			}
		}
		const kindIndex = new Map<string, number>();
		for (let j = 0; j < n; j++) kindIndex.set(variantKeys[j]!, j);
		return (v: unknown) => {
			const $ = v as Record<string, unknown>;
			const kind = $.$kind as string | undefined;
			if (kind !== undefined) {
				const j = kindIndex.get(kind);
				if (j !== undefined) {
					encoders[j]!(v);
					return;
				}
			}
			for (let j = 0; j < n; j++) {
				if (Object.hasOwn($, variantKeys[j]!) && $[variantKeys[j]!] !== undefined) {
					encoders[j]!(v);
					return;
				}
			}
			throw new TypeError(`No matching variant found for enum`);
		};
	}

	function buildTupleEncoder(writers: ((v: unknown) => void)[]): (v: unknown) => void {
		const n = writers.length;
		const [e0, e1, e2, e3, e4] = writers;
		// prettier-ignore
		switch (n) {
			case 2: return (v) => { const $=v as unknown[]; e0!($[0]); e1!($[1]); };
			case 3: return (v) => { const $=v as unknown[]; e0!($[0]); e1!($[1]); e2!($[2]); };
			case 4: return (v) => { const $=v as unknown[]; e0!($[0]); e1!($[1]); e2!($[2]); e3!($[3]); };
			case 5: return (v) => { const $=v as unknown[]; e0!($[0]); e1!($[1]); e2!($[2]); e3!($[3]); e4!($[4]); };
			default: return (v) => { const $=v as unknown[]; for (let i = 0; i < n; i++) writers[i]!($[i]); };
		}
	}

	function buildVectorEncoder(
		elemWriter: (v: unknown) => void,
		kind?: string,
	): (v: unknown) => void {
		const bulk = kind ? getBulkEncoder(kind) : null;
		if (bulk)
			return (v: unknown) => {
				const $ = v as unknown[];
				ensure(10);
				writeUleb($.length);
				bulk($);
			};
		return (v: unknown) => {
			const $ = v as unknown[];
			const len = $.length;
			ensure(10);
			writeUleb(len);
			for (let i = 0; i < len; i++) elemWriter($[i]);
		};
	}

	function buildFixedArrayEncoder(
		len: number,
		elemWriter: (v: unknown) => void,
		kind?: string,
	): (v: unknown) => void {
		const bulk = kind ? getBulkEncoder(kind) : null;
		if (bulk) return bulk;
		return (v: unknown) => {
			const $ = v as unknown[];
			for (let i = 0; i < len; i++) elemWriter($[i]);
		};
	}

	function buildOptionEncoder(innerWriter: (v: unknown) => void): (v: unknown) => void {
		return (v: unknown) => {
			if (v == null) {
				encodeU8(0);
			} else {
				encodeU8(1);
				innerWriter(v);
			}
		};
	}

	function buildMapEncoder(
		keyWriter: (v: unknown) => void,
		valueWriter: (v: unknown) => void,
	): (v: unknown) => void {
		return (v: unknown) => {
			const map = v as Map<unknown, unknown>;

			// Save main buffer state, switch to a temp buffer for key serialization
			const savedBuf = buf,
				savedView = view,
				savedSize = bufSize,
				savedOffset = wo;
			let tempSize = 256;
			let tempAb = new ArrayBuffer(tempSize);
			buf = new Uint8Array(tempAb);
			view = new DataView<ArrayBuffer>(tempAb);
			bufSize = tempSize;

			// Serialize each key separately (reusing the temp buffer between keys)
			const entries = [...map.entries()].map(([key, val]) => {
				wo = 0;
				keyWriter(key);
				return [buf.slice(0, wo) as Uint8Array<ArrayBuffer>, val] as const;
			});

			// Restore main buffer state
			buf = savedBuf;
			view = savedView;
			bufSize = savedSize;
			wo = savedOffset;

			// Sort by serialized key bytes, then write
			entries.sort(([a], [b]) => compareBcsBytes(a, b));
			ensure(10);
			writeUleb(entries.length);
			for (const [keyBytes, val] of entries) {
				writeRawBytes(keyBytes);
				valueWriter(val);
			}
		};
	}

	return {
		initEncode,
		getEncodeResult,
		fastSerialize,
		ensure,
		writeUleb,
		writeRawBytes,
		encodeU8,
		encodeU16,
		encodeU32,
		encodeU64,
		encodeU128,
		encodeU256,
		encodeBool,
		encodeFixedBytes,
		encodeString,
		encodeByteVector,
		bulkEncodeU8,
		bulkEncodeU16,
		bulkEncodeU32,
		bulkEncodeU64,
		bulkEncodeBool,
		buildStructEncoder,
		buildEnumEncoder,
		buildTupleEncoder,
		buildVectorEncoder,
		buildFixedArrayEncoder,
		buildOptionEncoder,
		buildMapEncoder,
		get offset() {
			return wo;
		},
		set offset(v: number) {
			wo = v;
		},
	};
}

export type Encoder = ReturnType<typeof createEncoder>;

export function compareBcsBytes(a: Uint8Array, b: Uint8Array): number {
	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		if (a[i] !== b[i]) return a[i]! - b[i]!;
	}
	return a.length - b.length;
}

export const encoder = createEncoder();
