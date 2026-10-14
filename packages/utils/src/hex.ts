// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export function fromHex(hexStr: string): Uint8Array<ArrayBuffer> {
	const normalized = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
	const padded = normalized.length % 2 === 0 ? normalized : `0${normalized}`;
	const bytes = new Uint8Array(padded.length / 2);

	for (let i = 0; i < bytes.length; i++) {
		const high = hexDigit(padded.charCodeAt(i * 2));
		const low = hexDigit(padded.charCodeAt(i * 2 + 1));
		if (high < 0 || low < 0) {
			throw new Error(`Invalid hex string ${hexStr}`);
		}
		bytes[i] = high * 16 + low;
	}

	return bytes;
}

function hexDigit(code: number): number {
	if (code >= 48 && code <= 57) return code - 48;
	if (code >= 97 && code <= 102) return code - 87;
	if (code >= 65 && code <= 70) return code - 55;
	return -1;
}

const HEX_BYTES = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

export function toHex(bytes: Uint8Array): string {
	let hex = '';
	for (let i = 0; i < bytes.length; i++) {
		hex += HEX_BYTES[bytes[i]];
	}
	return hex;
}
