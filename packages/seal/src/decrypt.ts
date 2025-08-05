// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';

import type { EncryptedObject } from './bcs.js';
import type { G1Element } from './bls12381.js';
import { G2Element } from './bls12381.js';
import { AesGcm256, Hmac256Ctr } from './dem.js';
import { InvalidCiphertextError, UnsupportedFeatureError } from './error.js';
import { BonehFranklinBLS12381Services, decryptRandomness, verifyNonce } from './ibe.js';
import { deriveKey, KeyPurpose } from './kdf.js';
import type { KeyCacheKey } from './types.js';
import { createFullId } from './utils.js';
import { combine } from './shamir.js';

export interface DecryptOptions {
	encryptedObject: typeof EncryptedObject.$inferType;
	keys: Map<KeyCacheKey, G1Element>;
}

/**
 * Decrypt the given encrypted bytes with the given cached secret keys for the full ID.
 * It's assumed that fetchKeys has been called to fetch the secret keys for enough key servers
 * otherwise, this will throw an error.
 * Also, it's assumed that the keys were verified by the caller.
 *
 * @returns - The decrypted plaintext corresponding to ciphertext.
 */
export async function decrypt({ encryptedObject, keys }: DecryptOptions): Promise<Uint8Array> {
	if (!encryptedObject.encryptedShares.BonehFranklinBLS12381) {
		throw new UnsupportedFeatureError('Encryption mode not supported');
	}

	const fullId = createFullId(encryptedObject.packageId, encryptedObject.id);

	// Get the indices of the service whose keys are in the keystore.
	const inKeystore = encryptedObject.services
		.map((_, i) => i)
		.filter((i) => keys.has(`${fullId}:${encryptedObject.services[i][0]}`));

	if (inKeystore.length < encryptedObject.threshold) {
		throw new Error('Not enough shares. Please fetch more keys.');
	}

	const encryptedShares = encryptedObject.encryptedShares.BonehFranklinBLS12381.encryptedShares;
	if (encryptedShares.length !== encryptedObject.services.length) {
		throw new InvalidCiphertextError(
			`Mismatched shares ${encryptedShares.length} and services ${encryptedObject.services.length}`,
		);
	}

	const nonce = G2Element.fromBytes(encryptedObject.encryptedShares.BonehFranklinBLS12381.nonce);

	// Decrypt each share.
	const shares = inKeystore.map((i) => {
		const [objectId, index] = encryptedObject.services[i];
		// Use the index as the unique info parameter to allow for multiple shares per key server.
		const share = BonehFranklinBLS12381Services.decrypt(
			nonce,
			keys.get(`${fullId}:${objectId}`)!,
			encryptedShares[i],
			fromHex(fullId),
			[objectId, index],
		);
		// The Shamir secret sharing library expects the index/x-coordinate to be at the end of the share.
		return { index, share };
	});

	// Combine the decrypted shares into the key.
	const baseKey = combine(shares);

	// Decrypt randomness and check validity of the nonce
	const randomnessKey = deriveKey(
		KeyPurpose.EncryptedRandomness,
		baseKey,
		encryptedShares,
		encryptedObject.threshold,
		encryptedObject.services.map(([objectIds, _]) => objectIds),
	);
	if (
		!verifyNonce(
			nonce,
			decryptRandomness(
				encryptedObject.encryptedShares.BonehFranklinBLS12381.encryptedRandomness,
				randomnessKey,
			),
		)
	) {
		throw new InvalidCiphertextError('Invalid nonce');
	}

	// Derive the DEM key and decrypt the ciphertext
	const demKey = deriveKey(
		KeyPurpose.DEM,
		baseKey,
		encryptedObject.encryptedShares.BonehFranklinBLS12381.encryptedShares,
		encryptedObject.threshold,
		encryptedObject.services.map(([objectId, _]) => objectId),
	);

	if (encryptedObject.ciphertext.Aes256Gcm) {
		return AesGcm256.decrypt(demKey, encryptedObject.ciphertext);
	} else if (encryptedObject.ciphertext.Hmac256Ctr) {
		return Hmac256Ctr.decrypt(demKey, encryptedObject.ciphertext);
	} else if (encryptedObject.ciphertext.Plain) {
		// In case `Plain` mode is used, return the key.
		return demKey;
	} else {
		throw new InvalidCiphertextError('Invalid ciphertext type');
	}
}
