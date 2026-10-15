// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Encoding } from './types.js';
import { ulebEncode } from './uleb.js';
import { encodeStr } from './utils.js';

export interface BcsWriterOptions {
	/** The initial size (in bytes) of the buffer tht will be allocated */
	initialSize?: number;
	/** The maximum size (in bytes) that the buffer is allowed to grow to */
	maxSize?: number;
	/** The amount of bytes that will be allocated whenever additional memory is required */
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

/**
 * Set of methods that allows data encoding/decoding as standalone
 * BCS value or a part of a composed structure/vector.
 */
export class BcsWriter {
	private dataView: DataView<ArrayBuffer>;
	private bytes: Uint8Array<ArrayBuffer>;
	private bytePosition: number = 0;
	private size: number;
	private maxSize: number;
	private allocateSize: number;

	constructor({
		initialSize = 1024,
		maxSize = Infinity,
		allocateSize = 1024,
	}: BcsWriterOptions = {}) {
		this.size = initialSize;
		this.maxSize = maxSize;
		this.allocateSize = allocateSize;
		this.dataView = new DataView(new ArrayBuffer(initialSize));
		this.bytes = new Uint8Array(this.dataView.buffer);
	}

	private ensureSizeOrGrow(bytes: number) {
		const requiredSize = this.bytePosition + bytes;
		if (requiredSize > this.size) {
			const nextSize = Math.min(
				this.maxSize,
				Math.max(this.size + requiredSize, this.size + this.allocateSize),
			);
			if (requiredSize > nextSize) {
				throw new Error(
					`Attempting to serialize to BCS, but buffer does not have enough size. Allocated size: ${this.size}, Max size: ${this.maxSize}, Required size: ${requiredSize}`,
				);
			}

			this.size = nextSize;
			const nextBuffer = new ArrayBuffer(this.size);
			const nextBytes = new Uint8Array(nextBuffer);
			nextBytes.set(this.bytes);
			this.dataView = new DataView(nextBuffer);
			this.bytes = nextBytes;
		}
	}

	/**
	 * Shift current cursor position by `bytes`.
	 *
	 * @param {Number} bytes Number of bytes to
	 * @returns {this} Self for possible chaining.
	 */
	shift(bytes: number): this {
		this.bytePosition += bytes;
		return this;
	}
	/**
	 * Write a U8 value into a buffer and shift cursor position by 1.
	 * @param {Number} value Value to write.
	 * @returns {this}
	 */
	write8(value: number | bigint): this {
		this.ensureSizeOrGrow(1);
		this.bytes[this.bytePosition] = Number(value);
		return this.shift(1);
	}

	/**
	 * Write a U8 value into a buffer and shift cursor position by 1.
	 * @param {Number} value Value to write.
	 * @returns {this}
	 */
	writeBytes(bytes: Uint8Array): this {
		this.ensureSizeOrGrow(bytes.length);
		this.bytes.set(bytes, this.bytePosition);

		return this.shift(bytes.length);
	}
	/**
	 * Write a U16 value into a buffer and shift cursor position by 2.
	 * @param {Number} value Value to write.
	 * @returns {this}
	 */
	write16(value: number | bigint): this {
		this.ensureSizeOrGrow(2);
		this.dataView.setUint16(this.bytePosition, Number(value), true);
		return this.shift(2);
	}
	/**
	 * Write a U32 value into a buffer and shift cursor position by 4.
	 * @param {Number} value Value to write.
	 * @returns {this}
	 */
	write32(value: number | bigint): this {
		this.ensureSizeOrGrow(4);
		this.dataView.setUint32(this.bytePosition, Number(value), true);
		return this.shift(4);
	}
	/**
	 * Write a U64 value into a buffer and shift cursor position by 8.
	 * @param {bigint} value Value to write.
	 * @returns {this}
	 */
	write64(value: number | bigint): this {
		return this.writeBigLittleEndian(BigInt(value), 8);
	}
	/**
	 * Write a U128 value into a buffer and shift cursor position by 16.
	 *
	 * @param {bigint} value Value to write.
	 * @returns {this}
	 */
	write128(value: number | bigint): this {
		return this.writeBigLittleEndian(BigInt(value), 16);
	}
	/**
	 * Write a U256 value into a buffer and shift cursor position by 16.
	 *
	 * @param {bigint} value Value to write.
	 * @returns {this}
	 */
	write256(value: number | bigint): this {
		return this.writeBigLittleEndian(BigInt(value), 32);
	}

	// Negative values encode as zero and values that overflow `size` keep their low bytes
	private writeBigLittleEndian(value: bigint, size: number): this {
		this.ensureSizeOrGrow(size);
		let remaining = value > 0n ? value : 0n;
		for (let offset = 0; offset < size; offset += 8) {
			this.dataView.setBigUint64(this.bytePosition + offset, BigInt.asUintN(64, remaining), true);
			remaining >>= 64n;
		}

		return this.shift(size);
	}
	/**
	 * Write a ULEB value into a buffer and shift cursor position by number of bytes
	 * written.
	 * @param {Number} value Value to write.
	 * @returns {this}
	 */
	writeULEB(value: number): this {
		if (value >= 0 && Number.isSafeInteger(value)) {
			let remaining = value;
			while (remaining >= 0x80) {
				this.write8((remaining % 0x80) | 0x80);
				remaining = Math.floor(remaining / 0x80);
			}
			return this.write8(remaining);
		}

		ulebEncode(value).forEach((el) => this.write8(el));
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
		Array.from(vector).forEach((el, i) => cb(this, el, i, vector.length));
		return this;
	}

	/**
	 * Adds support for iterations over the object.
	 * @returns {Uint8Array}
	 */
	// oxlint-disable-next-line require-yields
	*[Symbol.iterator](): Iterator<number, Iterable<number>> {
		for (let i = 0; i < this.bytePosition; i++) {
			yield this.dataView.getUint8(i);
		}
		return this.toBytes();
	}

	/**
	 * Get underlying buffer taking only value bytes (in case initial buffer size was bigger).
	 * @returns {Uint8Array} Resulting bcs.
	 */
	toBytes(): Uint8Array<ArrayBuffer> {
		return new Uint8Array(this.dataView.buffer.slice(0, this.bytePosition));
	}

	/**
	 * Represent data as 'hex' or 'base64'
	 * @param encoding Encoding to use: 'base64' or 'hex'
	 */
	toString(encoding: Encoding): string {
		return encodeStr(this.toBytes(), encoding);
	}
}
