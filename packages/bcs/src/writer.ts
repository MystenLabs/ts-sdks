// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Encoding } from './types.js';
import { encodeStr } from './utils.js';
import { createEncoder } from './bcs-encode.js';
import type { Encoder } from './bcs-encode.js';

export interface BcsWriterOptions {
	/** The initial size (in bytes) of the buffer that will be allocated */
	initialSize?: number;
	/** The maximum size (in bytes) that the buffer is allowed to grow to */
	maxSize?: number;
	/** @deprecated No longer used — buffer grows automatically. */
	allocateSize?: number;
}

/**
 * Class used to write BCS data into a buffer. Initializer requires
 * some size of a buffer to init; default value for this buffer is 1KB.
 *
 * Most methods are chainable, so it is possible to write them in one go.
 *
 * @example
 * let serialized = new BcsWriter()
 *   .write8(10)
 *   .write32(1000000)
 *   .write64(10000001000000)
 *   .hex();
 */
export class BcsWriter {
	#enc: Encoder;

	constructor(_options?: BcsWriterOptions, enc?: Encoder) {
		this.#enc = enc ?? createEncoder();
		this.#enc.initEncode();
	}

	get bytePosition(): number {
		return this.#enc.offset;
	}

	/**
	 * Shift current cursor position by `bytes`.
	 *
	 * @param {Number} bytes Number of bytes to
	 * @returns {this} Self for possible chaining.
	 */
	shift(bytes: number): this {
		this.#enc.offset += bytes;
		return this;
	}
	/**
	 * Ensure the buffer has at least `bytes` bytes of capacity remaining.
	 * @param bytes Number of bytes to reserve.
	 * @returns {this}
	 */
	reserve(bytes: number): this {
		this.#enc.ensure(bytes);
		return this;
	}
	/**
	 * Write a U8 value into a buffer and shift cursor position by 1.
	 * @param {Number} value Value to write.
	 * @returns {this}
	 */
	write8(value: number | bigint): this {
		this.#enc.encodeU8(Number(value));
		return this;
	}
	/**
	 * Write a U16 value into a buffer and shift cursor position by 2.
	 * @param {Number} value Value to write.
	 * @returns {this}
	 */
	write16(value: number | bigint): this {
		this.#enc.encodeU16(Number(value));
		return this;
	}
	/**
	 * Write a U32 value into a buffer and shift cursor position by 4.
	 * @param {Number} value Value to write.
	 * @returns {this}
	 */
	write32(value: number | bigint): this {
		this.#enc.encodeU32(Number(value));
		return this;
	}
	/**
	 * Write a U64 value into a buffer and shift cursor position by 8.
	 * @param {bigint} value Value to write.
	 * @returns {this}
	 */
	write64(value: number | bigint): this {
		this.#enc.encodeU64(value);
		return this;
	}
	/**
	 * Write a U128 value into a buffer and shift cursor position by 16.
	 *
	 * @param {bigint} value Value to write.
	 * @returns {this}
	 */
	write128(value: number | bigint): this {
		this.#enc.encodeU128(value);
		return this;
	}
	/**
	 * Write a U256 value into a buffer and shift cursor position by 32.
	 *
	 * @param {bigint} value Value to write.
	 * @returns {this}
	 */
	write256(value: number | bigint): this {
		this.#enc.encodeU256(value);
		return this;
	}
	/**
	 * Write raw bytes into the buffer and shift cursor by the length of the bytes.
	 * @param {Uint8Array} bytes Bytes to write.
	 * @returns {this}
	 */
	writeBytes(bytes: Uint8Array): this {
		this.#enc.writeRawBytes(bytes);
		return this;
	}
	/**
	 * Write a ULEB value into a buffer and shift cursor position by number of bytes
	 * written.
	 * @param {Number} value Value to write.
	 * @returns {this}
	 */
	writeULEB(value: number): this {
		this.#enc.ensure(10);
		this.#enc.writeUleb(value);
		return this;
	}
	/**
	 * Write a vector into a buffer by first writing the vector length and then calling
	 * a callback on each passed value.
	 *
	 * @param {Array<Any>} vector Array of elements to write.
	 * @param {WriteVecCb} cb Callback to call on each element of the vector.
	 * @returns {this}
	 */
	writeVec(vector: any[], cb: (writer: BcsWriter, el: any, i: number, len: number) => void): this {
		this.writeULEB(vector.length);
		for (let i = 0; i < vector.length; i++) cb(this, vector[i], i, vector.length);
		return this;
	}

	/**
	 * Adds support for iterations over the object.
	 * @returns {Uint8Array}
	 */
	// oxlint-disable-next-line require-yields
	*[Symbol.iterator](): Iterator<number, Iterable<number>> {
		const bytes = this.toBytes();
		for (let i = 0; i < bytes.length; i++) yield bytes[i]!;
		return bytes;
	}

	/**
	 * Get underlying buffer taking only value bytes (in case initial buffer size was bigger).
	 * @returns {Uint8Array} Resulting bcs.
	 */
	toBytes(): Uint8Array<ArrayBuffer> {
		return this.#enc.getEncodeResult();
	}

	/**
	 * Represent data as 'hex' or 'base64'
	 * @param encoding Encoding to use: 'base64' or 'hex'
	 */
	toString(encoding: Encoding): string {
		return encodeStr(this.toBytes(), encoding);
	}
}
