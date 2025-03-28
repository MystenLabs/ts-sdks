// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { hkdf } from '@noble/hashes/hkdf';
import { hmac } from '@noble/hashes/hmac';
import { sha3_256 } from '@noble/hashes/sha3';

import { G1Element } from './bls12381.js';
import type { G2Element, GTElement } from './bls12381.js';
import { fromHex } from '@mysten/bcs';

/**
 * The default key derivation function.
 *
 * @param element The GTElement to derive the key from.
 * @param info Optional context and application specific information.
 * @returns The derived key.
 */
export function kdf(
	element: GTElement,
	nonce: G2Element,
	id: Uint8Array,
	objectId: string,
	index: number,
): Uint8Array {
	// This permutation flips the order of 6 pairs of coefficients of the GT element.
	// The permutation may be computed as:
	// for i in 0..3 {
	//   for j in 0..2 {
	//     PERMUTATION[i + j * 3] = i * 2 + j;
	//   }
	// }
	const GT_ELEMENT_BYTE_LENGTH = 576;
	const PERMUTATION = [0, 2, 4, 1, 3, 5];
	const COEFFICIENT_SIZE = GT_ELEMENT_BYTE_LENGTH / PERMUTATION.length;

	const bytes = element.toBytes();
	let permutedBytes = new Uint8Array(GT_ELEMENT_BYTE_LENGTH);
	PERMUTATION.forEach((pi, i) => {
		permutedBytes.set(
			bytes.slice(i * COEFFICIENT_SIZE, (i + 1) * COEFFICIENT_SIZE),
			pi * COEFFICIENT_SIZE,
		);
	});
	const info = new Uint8Array([...fromHex(objectId), index]);
	const inputBytes = new Uint8Array([
		...permutedBytes,
		...nonce.toBytes(),
		...G1Element.hashToCurve(id).toBytes(),
	]);
	return hkdf(sha3_256, inputBytes, '', info, 32);
}

export enum KeyPurpose {
	EncryptedRandomness,
	DEM,
}

export function deriveKey(purpose: KeyPurpose, baseKey: Uint8Array): Uint8Array {
	switch (purpose) {
		case KeyPurpose.EncryptedRandomness:
			return hmac(sha3_256, baseKey, new Uint8Array([0]));
		case KeyPurpose.DEM:
			return hmac(sha3_256, baseKey, new Uint8Array([1]));
	}
}
