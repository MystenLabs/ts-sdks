// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_CODES = Array.from(ALPHABET, (char) => char.charCodeAt(0));
const DIGIT_VALUES = new Int8Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i++) {
	DIGIT_VALUES[ALPHABET.charCodeAt(i)] = i;
}

// Base conversion works on limbs so each step stays well inside the 2^53 float-exact range:
// encoding accumulates base-58^5 limbs from 16-bit input chunks (< 2^46),
// decoding accumulates base-2^16 limbs from 5-character chunks (< 2^46).
const B58_5 = 58 ** 5;

// Same check as @scure/base, which also accepts Uint8Arrays from other realms (iframes, vm)
function isBytes(value: unknown): value is Uint8Array {
	return (
		value instanceof Uint8Array ||
		(ArrayBuffer.isView(value) &&
			value.constructor.name === 'Uint8Array' &&
			(value as Uint8Array).BYTES_PER_ELEMENT === 1)
	);
}

export function toBase58(buffer: Uint8Array): string {
	if (!isBytes(buffer)) {
		throw new TypeError('toBase58 expects a Uint8Array');
	}

	const length = buffer.length;
	let zeros = 0;
	while (zeros < length && buffer[zeros] === 0) {
		zeros++;
	}

	const limbs: number[] = [];
	let i = zeros;
	if ((length - zeros) % 2 === 1) {
		limbs.push(buffer[i++]);
	}
	for (; i < length; i += 2) {
		let carry = buffer[i] * 256 + buffer[i + 1];
		for (let j = 0; j < limbs.length; j++) {
			const x = limbs[j] * 65536 + carry;
			carry = Math.floor(x / B58_5);
			limbs[j] = x - carry * B58_5;
		}
		while (carry > 0) {
			const next = Math.floor(carry / B58_5);
			limbs.push(carry - next * B58_5);
			carry = next;
		}
	}

	// Each limb holds 5 base58 digits; the most significant limb is written without padding
	const digits: number[] = [];
	for (let k = 0; k < zeros; k++) {
		digits.push(ALPHABET_CODES[0]);
	}
	for (let j = limbs.length - 1; j >= 0; j--) {
		let limb = limbs[j];
		const start = digits.length;
		const width = j === limbs.length - 1 ? 0 : 5;
		for (let k = 0; k < 5 && (limb > 0 || k < width); k++) {
			const next = Math.floor(limb / 58);
			digits.push(ALPHABET_CODES[limb - next * 58]);
			limb = next;
		}
		// Digits were produced least-significant first
		for (let a = start, b = digits.length - 1; a < b; a++, b--) {
			const tmp = digits[a];
			digits[a] = digits[b];
			digits[b] = tmp;
		}
	}

	// Chunked so long inputs stay under engine limits on function argument counts
	let result = '';
	for (let start = 0; start < digits.length; start += 8192) {
		result += String.fromCharCode.apply(null, digits.slice(start, start + 8192));
	}
	return result;
}

export function fromBase58(str: string): Uint8Array<ArrayBuffer> {
	if (typeof str !== 'string') {
		throw new TypeError('fromBase58 expects a string');
	}

	const length = str.length;
	let zeros = 0;
	while (zeros < length && str.charCodeAt(zeros) === 49 /* '1' */) {
		zeros++;
	}

	const limbs: number[] = [];
	let i = zeros;
	const head = (length - zeros) % 5;
	while (i < length) {
		const chunkLength = i === zeros && head !== 0 ? head : 5;
		let carry = 0;
		let multiplier = 1;
		for (let k = 0; k < chunkLength; k++) {
			const code = str.charCodeAt(i + k);
			const digit = code < 128 ? DIGIT_VALUES[code] : -1;
			if (digit < 0) {
				throw new Error(`Invalid base58 character "${str[i + k]}"`);
			}
			carry = carry * 58 + digit;
			multiplier *= 58;
		}
		i += chunkLength;

		for (let j = 0; j < limbs.length; j++) {
			const x = limbs[j] * multiplier + carry;
			carry = Math.floor(x / 65536);
			limbs[j] = x - carry * 65536;
		}
		while (carry > 0) {
			limbs.push(carry % 65536);
			carry = Math.floor(carry / 65536);
		}
	}

	let byteLength = limbs.length * 2;
	if (byteLength > 0 && limbs[limbs.length - 1] < 256) {
		byteLength--;
	}

	const out = new Uint8Array(zeros + byteLength);
	let pos = out.length - 1;
	for (let j = 0; j < limbs.length; j++) {
		out[pos--] = limbs[j] & 0xff;
		if (pos >= zeros) {
			out[pos--] = limbs[j] >> 8;
		}
	}

	return out;
}
