// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';

import type { IBEEncryptions } from './bcs.js';
import { EncryptedObject } from './bcs.js';
import type { EncryptionInput } from './dem.js';
import { UserError } from './error.js';
import { BonehFranklinBLS12381Services } from './ibe.js';
import { deriveKey, KeyPurpose } from './kdf.js';
import type { KeyServer } from './key-server.js';
import { createFullId, MAX_U8 } from './utils.js';
import type { Share } from './shamir.js';
import { split } from './shamir.js';

/**
 * Given full ID and what key servers to use, return the encrypted message under the identity and return the bcs bytes of the encrypted object.
 *
 * @param keyServers - A list of KeyServers (same server can be used multiple times)
 * @param kemType - The type of KEM to use.
 * @param packageId - packageId
 * @param id - id
 * @param encryptionInput - Input to the encryption. Should be one of the EncryptionInput types, AesGcmEncryptionInput or Hmac256CtrEncryptionInput.
 * @param threshold - The threshold for the TSS encryption.
 * @returns The bcs bytes of the encrypted object containing all metadata and the 256-bit symmetric key that was used to encrypt the object.
 * Since the key can be used to decrypt, it should not be shared but can be used eg. for backup.
 */
export async function encrypt({
	keyServers,
	kemType,
	threshold,
	packageId,
	id,
	encryptionInput,
}: {
	keyServers: KeyServer[];
	kemType: KemType;
	threshold: number;
	packageId: string;
	id: string;
	encryptionInput: EncryptionInput;
}): Promise<{
	encryptedObject: Uint8Array<ArrayBuffer>;
	key: Uint8Array<ArrayBuffer>;
}> {
	// Check inputs
	if (
		threshold <= 0 ||
		threshold > MAX_U8 ||
		keyServers.length < threshold ||
		keyServers.length > MAX_U8
	) {
		throw new UserError(
			`Invalid key servers or threshold ${threshold} for ${keyServers.length} key servers for package ${packageId}`,
		);
	}

	// Generate a random base key.
	const baseKey = await encryptionInput.generateKey();

	// Split the key into shares and encrypt each share with the public keys of the key servers.
	const shares = split(baseKey, threshold, keyServers.length);

	// Encrypt the shares with the public keys of the key servers.
	const fullId = createFullId(packageId, id);
	const encryptedShares = encryptBatched(
		keyServers,
		kemType,
		fromHex(fullId),
		shares,
		baseKey,
		threshold,
	);

	// Encrypt the object with the derived DEM key.
	const demKey = deriveKey(
		KeyPurpose.DEM,
		baseKey,
		encryptedShares.BonehFranklinBLS12381.encryptedShares,
		threshold,
		keyServers.map(({ objectId }) => objectId),
	);
	const ciphertext = await encryptionInput.encrypt(demKey);

	// Services and indices of their shares are stored as a tuple
	const services: [string, number][] = keyServers.map(({ objectId }, i) => [
		objectId,
		shares[i].index,
	]);

	return {
		encryptedObject: EncryptedObject.serialize({
			version: 0,
			packageId,
			id,
			services,
			threshold,
			encryptedShares,
			ciphertext,
		}).toBytes(),
		key: demKey,
	};
}

export enum KemType {
	BonehFranklinBLS12381DemCCA = 0,
}

export enum DemType {
	AesGcm256 = 0,
	Hmac256Ctr = 1,
}

function encryptBatched(
	keyServers: KeyServer[],
	kemType: KemType,
	id: Uint8Array,
	shares: Share[],
	baseKey: Uint8Array,
	threshold: number,
): typeof IBEEncryptions.$inferType {
	switch (kemType) {
		case KemType.BonehFranklinBLS12381DemCCA:
			return new BonehFranklinBLS12381Services(keyServers).encryptBatched(
				id,
				shares,
				baseKey,
				threshold,
			);
		default:
			throw new Error(`Invalid KEM type ${kemType}`);
	}
}
