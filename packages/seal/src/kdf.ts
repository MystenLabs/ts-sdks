// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';
import { sha3_256 } from '@noble/hashes/sha3.js';

import { G1Element } from './bls12381.js';
import type { G2Element, GTElement } from './bls12381.js';
import {
	ENCRYPTED_SHARE_LENGTH,
	flatten,
	KEY_LENGTH,
	MAX_U8,
	SUI_ADDRESS_LENGTH,
} from './utils.js';

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
	if (!Number.isInteger(index) || index < 0 || index > MAX_U8) {
		throw new Error(`Invalid index ${index}`);
	}
	const objectIdBytes = fromHex(objectId);
	if (objectIdBytes.length !== SUI_ADDRESS_LENGTH) {
		throw new Error(`Invalid object id ${objectId}`);
	}
	const hash = sha3_256.create();
	hash.update(KDF_DST);
	hash.update(element.toBytes());
	hash.update(nonce.toBytes());
	hash.update(hashToG1(id).toBytes());
	hash.update(objectIdBytes);
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
	if (!Number.isInteger(threshold) || threshold <= 0 || threshold > MAX_U8) {
		throw new Error(`Invalid threshold ${threshold}`);
	}

	if (encryptedShares.length !== keyServers.length) {
		throw new Error(
			`Mismatched shares ${encryptedShares.length} and key servers ${keyServers.length}`,
		);
	}
	const keyServerBytes = keyServers.map((keyServer) => fromHex(keyServer));
	if (keyServerBytes.some((keyServer) => keyServer.length !== SUI_ADDRESS_LENGTH)) {
		throw new Error(`Invalid key servers ${keyServers}`);
	}
	if (encryptedShares.some((share) => share.length !== ENCRYPTED_SHARE_LENGTH)) {
		throw new Error(`Invalid encrypted shares ${encryptedShares}`);
	}

	if (baseKey.length !== KEY_LENGTH) {
		throw new Error(`Invalid base key ${baseKey}`);
	}

	const hash = sha3_256.create();
	hash.update(DERIVE_KEY_DST);
	hash.update(baseKey);
	hash.update(tag(purpose));
	hash.update(new Uint8Array([threshold]));
	encryptedShares.forEach((share) => hash.update(share));
	keyServerBytes.forEach((keyServer) => hash.update(keyServer));
	return hash.digest();
}
