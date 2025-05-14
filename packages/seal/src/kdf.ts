// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';
import { hkdf } from '@noble/hashes/hkdf';
import { hmac } from '@noble/hashes/hmac';
import { sha3_256 } from '@noble/hashes/sha3';

import { G1Element } from './bls12381.js';
import type { G2Element, GTElement } from './bls12381.js';
import { flatten } from './utils.js';

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
	const inputBytes = flatten([
		element.toBytes(),
		nonce.toBytes(),
		G1Element.hashToCurve(id).toBytes(),
	]);

	const info = flatten([fromHex(objectId), new Uint8Array([index])]);

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
