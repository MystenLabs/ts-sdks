// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDecoder } from './bcs-decode.js';
import type { Decoder } from './bcs-decode.js';

/**
 * Class used for reading BCS data chunk by chunk. Meant to be used
 * by some wrapper, which will make sure that data is valid and is
 * matching the desired format.
 *
 * @example
 * // data for this example is:
 * // { a: u8, b: u32, c: bool, d: u64 }
 *
 * let reader = new BcsReader("647f1a060001ffffe7890423c78a050102030405");
 * let field1 = reader.read8();
 * let field2 = reader.read32();
 * let field3 = reader.read8() === '1'; // bool
 * let field4 = reader.read64();
 * // ....
 *
 * Reading vectors is another deal in bcs. To read a vector, you first need to read
 * its length using {@link readULEB}. Here's an example:
 * @example
 * // data encoded: { field: [1, 2, 3, 4, 5] }
 * let reader = new BcsReader("050102030405");
 * let vec_length = reader.readULEB();
 * let elements = [];
 * for (let i = 0; i < vec_length; i++) {
 *   elements.push(reader.read8());
 * }
 * console.log(elements); // [1,2,3,4,5]
 *
 * @param {String} data HEX-encoded data (serialized BCS)
 */
export class BcsReader {
	#dec: Decoder;

	/**
	 * @param {Uint8Array} data Data to use as a buffer.
	 * @param decoder Optional: use an existing decoder instead of creating one.
	 */
	constructor(data?: Uint8Array, decoder?: Decoder) {
		this.#dec = decoder ?? createDecoder();
		if (data) this.#dec.init(data);
	}

	get bytes(): Uint8Array {
		return this.#dec.data;
	}
	get bytePosition(): number {
		return this.#dec.offset;
	}
	set bytePosition(value: number) {
		this.#dec.offset = value;
	}
	get position(): number {
		return this.#dec.offset;
	}

	/**
	 * Shift current cursor position by `bytes`.
	 *
	 * @param {Number} bytes Number of bytes to
	 * @returns {this} Self for possible chaining.
	 */
	shift(bytes: number): this {
		this.#dec.offset += bytes;
		return this;
	}
	/**
	 * Read U8 value from the buffer and shift cursor by 1.
	 * @returns
	 */
	read8(): number {
		return this.#dec.decodeU8();
	}
	/**
	 * Read U16 value from the buffer and shift cursor by 2.
	 * @returns
	 */
	read16(): number {
		return this.#dec.decodeU16();
	}
	/**
	 * Read U32 value from the buffer and shift cursor by 4.
	 * @returns
	 */
	read32(): number {
		return this.#dec.decodeU32();
	}
	/**
	 * Read U64 value from the buffer and shift cursor by 8.
	 * @returns
	 */
	read64(): string {
		return this.#dec.decodeU64();
	}
	/**
	 * Read U128 value from the buffer and shift cursor by 16.
	 */
	read128(): string {
		return this.#dec.decodeU128();
	}
	/**
	 * Read U256 value from the buffer and shift cursor by 32.
	 * @returns
	 */
	read256(): string {
		return this.#dec.decodeU256();
	}
	/**
	 * Read `num` number of bytes from the buffer and shift cursor by `num`.
	 * @param num Number of bytes to read.
	 */
	readBytes(num: number): Uint8Array {
		return this.#dec.decodeFixedBytes(num);
	}
	/**
	 * Read ULEB value - an integer of varying size. Used for enum indexes and
	 * vector lengths.
	 * @returns {Number} The ULEB value.
	 */
	readULEB(): number {
		return this.#dec.readUleb();
	}
	/**
	 * Read a BCS vector: read a length and then apply function `cb` X times
	 * where X is the length of the vector, defined as ULEB in BCS bytes.
	 * @param cb Callback to process elements of vector.
	 * @returns {Array<Any>} Array of the resulting values, returned by callback.
	 */
	readVec(cb: (reader: BcsReader, i: number, length: number) => any): any[] {
		const length = this.#dec.readUleb();
		const result = new Array(length);
		for (let i = 0; i < length; i++) result[i] = cb(this, i, length);
		return result;
	}
}
