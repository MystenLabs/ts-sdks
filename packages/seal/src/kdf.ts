// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';
import { sha3_256 } from '@noble/hashes/sha3';

import { G1Element } from './bls12381.js';
import type { G2Element, GTElement } from './bls12381.js';
import { flatten, MAX_U8 } from './utils.js';

/**
 * The domain separation tag for the hash-to-group function.
 */
const DST: Uint8Array = new TextEncoder().encode('SUI-SEAL-IBE-BLS12381-00');
const KDF_DST = new TextEncoder().encode('SUI-SEAL-IBE-BLS12381-H2-00');
const DERIVE_KEY_DST = new TextEncoder().encode('SUI-SEAL-IBE-BLS12381-H3-00');

/**
 * Hash an id to a G1Element.
 *
 * @param id The id to hash.
 * @returns The G1Element.
 */
export function hashToG1(id: Uint8Array): G1Element {
	return G1Element.hashToCurve(flatten([DST, id]));
}

/**
 * The default key derivation function.
 *
 * @returns The derived key.
 */
export function kdf(
	element: GTElement,
	nonce: G2Element,
	id: Uint8Array,
	objectId: string,
	index: number,
): Uint8Array {
	if (index < 0 || index > MAX_U8) {
		throw new Error(`Invalid index ${index}`);
	}
	const hash = sha3_256.create();
	hash.update(KDF_DST);
	hash.update(element.toBytes());
	hash.update(nonce.toBytes());
	hash.update(hashToG1(id).toBytes());
	hash.update(fromHex(objectId));
	hash.update(new Uint8Array([index])); // this is safe because index < 256.
	return hash.digest();
}

export enum KeyPurpose {
	EncryptedRandomness,
	DEM,
}

function tag(purpose: KeyPurpose): Uint8Array {
	switch (purpose) {
		case KeyPurpose.EncryptedRandomness:
			return new Uint8Array([0]);
		case KeyPurpose.DEM:
			return new Uint8Array([1]);
		default:
			throw new Error(`Invalid key purpose ${purpose}`);
	}
}

/**
 * Derive a key from a base key and a list of encrypted shares.
 *
 * @param purpose The purpose of the key.
 * @param baseKey The base key.
 * @param encryptedShares The encrypted shares.
 * @param threshold The threshold.
 * @param keyServers The object ids of the key servers.
 * @returns The derived key.
 */
export function deriveKey(
	purpose: KeyPurpose,
	baseKey: Uint8Array,
	encryptedShares: Uint8Array[],
	threshold: number,
	keyServers: string[],
): Uint8Array {
	if (threshold <= 0 || threshold > MAX_U8) {
		throw new Error(`Invalid threshold ${threshold}`);
	}
	const hash = sha3_256.create();
	hash.update(DERIVE_KEY_DST);
	hash.update(baseKey);
	hash.update(tag(purpose));
	hash.update(new Uint8Array([threshold]));
	encryptedShares.forEach((share) => hash.update(share));
	keyServers.forEach((keyServer) => hash.update(fromHex(keyServer)));
	return hash.digest();
}
