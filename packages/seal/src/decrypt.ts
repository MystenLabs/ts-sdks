// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';
import { combine as externalCombine } from 'shamir-secret-sharing';

import type { EncryptedObject } from './bcs.js';
import type { G1Element } from './bls12381.js';
import { G2Element } from './bls12381.js';
import { AesGcm256, Hmac256Ctr } from './dem.js';
import { InvalidCiphertextError, UnsupportedFeatureError } from './error.js';
import { BonehFranklinBLS12381Services, DST } from './ibe.js';
import { deriveKey, KeyPurpose } from './kdf.js';
import type { KeyCacheKey } from './types.js';
import { createFullId } from './utils.js';

export interface DecryptOptions {
	encryptedObject: typeof EncryptedObject.$inferType;
	keys: Map<KeyCacheKey, G1Element>;
}

/**
 * Decrypt the given encrypted bytes with the given cached secret keys for the full ID.
 * It's assumed that fetchKeys has been called to fetch the secret keys for enough key servers
 * otherwise, this will throw an error.
 *
 * @returns - The decrypted plaintext corresponding to ciphertext.
 */
export async function decrypt({ encryptedObject, keys }: DecryptOptions): Promise<Uint8Array> {
	if (!encryptedObject.encryptedShares.BonehFranklinBLS12381) {
		throw new UnsupportedFeatureError('Encryption mode not supported');
	}

	const fullId = createFullId(DST, encryptedObject.packageId, encryptedObject.id);

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
	const shares = inKeystore.map((i: number) => {
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
	const key = await combine(shares);
	const demKey = deriveKey(KeyPurpose.DEM, key);
	if (encryptedObject.ciphertext.Aes256Gcm) {
		try {
			// Decrypt the ciphertext with the key.
			return AesGcm256.decrypt(demKey, encryptedObject.ciphertext);
		} catch {
			throw new Error('Decryption failed');
		}
	} else if (encryptedObject.ciphertext.Plain) {
		// In case `Plain` mode is used, return the key.
		return demKey;
	} else if (encryptedObject.ciphertext.Hmac256Ctr) {
		try {
			return Hmac256Ctr.decrypt(demKey, encryptedObject.ciphertext);
		} catch {
			throw new Error('Decryption failed');
		}
	} else {
		throw new Error('Invalid encrypted object');
	}
}

/**
 * Helper function that combines the shares into the key.
 * @param shares - The shares to combine.
 * @returns - The combined key.
 */
async function combine(shares: { index: number; share: Uint8Array }[]): Promise<Uint8Array> {
	if (shares.length === 0) {
		throw new Error('Invalid shares length');
	} else if (shares.length === 1) {
		// The Shamir secret sharing library expects at least two shares.
		// If there is only one and the threshold is 1, the reconstructed secret is the same as the share.
		return Promise.resolve(shares[0].share);
	}

	// The Shamir secret sharing library expects the index/x-coordinate to be at the end of the share
	return externalCombine(
		shares.map(({ index, share }) => {
			const packedShare = new Uint8Array(share.length + 1);
			packedShare.set(share, 0);
			packedShare[share.length] = index;
			return packedShare;
		}),
	);
}
