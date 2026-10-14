// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export function fromBase64(base64String: string): Uint8Array<ArrayBuffer> {
	const binary = atob(base64String);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

const CHUNK_SIZE = 8192;
export function toBase64(bytes: Uint8Array): string {
	if (bytes.length <= CHUNK_SIZE) {
		return btoa(String.fromCharCode.apply(null, bytes as unknown as number[]));
	}

	let output = '';
	for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
		const chunk = bytes.slice(i, i + CHUNK_SIZE);
		output += String.fromCharCode.apply(null, chunk as unknown as number[]);
	}

	return btoa(output);
}
