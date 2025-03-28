// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';

import type { IBEEncryptions } from './bcs.js';
import type { GTElement } from './bls12381.js';
import { G1Element, G2Element, Scalar } from './bls12381.js';
import { kdf } from './kdf.js';
import type { KeyServer } from './key-server.js';
import { xor } from './utils.js';

/**
 * The domain separation tag for the hash-to-group function.
 */
export const DST: Uint8Array = new TextEncoder().encode('SUI-SEAL-IBE-BLS12381-00');

/**
 * The domain separation tag for the signing proof of possession.
 */
export const DST_POP: Uint8Array = new TextEncoder().encode('SUI-SEAL-IBE-BLS12381-POP-00');

/**
 * The interface for the key servers.
 */
export abstract class IBEServers {
	objectIds: string[];

	constructor(objectIds: string[]) {
		this.objectIds = objectIds;
	}

	/**
	 * The number of key servers.
	 */
	size(): number {
		return this.objectIds.length;
	}

	/**
	 * Encrypt a batch of messages for the given identity.
	 *
	 * @param id The identity.
	 * @param msgAndInfos The messages and an additional info parameter which will be included in the KDF.
	 * @returns The encrypted messages.
	 */
	abstract encryptBatched(
		id: Uint8Array,
		msgAndInfos: { msg: Uint8Array; index: number }[],
		randomnessKey: Uint8Array,
	): typeof IBEEncryptions.$inferType;
}

/**
 * Identity-based encryption based on the Boneh-Franklin IBE scheme.
 * This object represents a set of key servers that can be used to encrypt messages for a given identity.
 */
export class BonehFranklinBLS12381Services extends IBEServers {
	readonly publicKeys: G2Element[];

	constructor(services: KeyServer[]) {
		super(services.map((service) => service.objectId));
		this.publicKeys = services.map((service) => G2Element.fromBytes(service.pk));
	}

	encryptBatched(
		id: Uint8Array,
		msgAndInfos: { msg: Uint8Array; index: number }[],
		randomnessKey: Uint8Array,
	): typeof IBEEncryptions.$inferType {
		if (this.publicKeys.length === 0 || this.publicKeys.length !== msgAndInfos.length) {
			throw new Error('Invalid public keys');
		}
		const [r, nonce, keys] = encapBatched(this.publicKeys, id);
		const encryptedShares = msgAndInfos.map((msgAndInfo, i) =>
			xor(msgAndInfo.msg, kdf(keys[i], nonce, id, this.objectIds[i], msgAndInfo.index)),
		);
		const encryptedRandomness = xor(randomnessKey, r.toBytes());

		return {
			BonehFranklinBLS12381: {
				nonce: nonce.toBytes(),
				encryptedShares,
				encryptedRandomness,
			},
			$kind: 'BonehFranklinBLS12381',
		};
	}

	/**
	 * Returns true if the user secret key is valid for the given public key and id.
	 * @param user_secret_key - The user secret key.
	 * @param id - The identity.
	 * @param public_key - The public key.
	 * @returns True if the user secret key is valid for the given public key and id.
	 */
	static verifyUserSecretKey(userSecretKey: G1Element, id: string, publicKey: G2Element): boolean {
		const lhs = userSecretKey.pairing(G2Element.generator()).toBytes();
		const rhs = G1Element.hashToCurve(fromHex(id)).pairing(publicKey).toBytes();
		return lhs.length === rhs.length && lhs.every((value, index) => value === rhs[index]);
	}

	/**
	 * Identity-based decryption.
	 *
	 * @param nonce The encryption nonce.
	 * @param sk The user secret key.
	 * @param ciphertext The encrypted message.
	 * @param info An info parameter also included in the KDF.
	 * @returns The decrypted message.
	 */
	static decrypt(
		nonce: G2Element,
		sk: G1Element,
		ciphertext: Uint8Array,
		id: Uint8Array,
		[objectId, index]: [string, number],
	): Uint8Array {
		return xor(ciphertext, kdf(decap(nonce, sk), nonce, id, objectId, index));
	}
}

/**
 * Batched identity-based key-encapsulation mechanism: encapsulate multiple keys for given identity using different key servers.
 *
 * @param publicKeys Public keys for a set of key servers.
 * @param id The identity used to encapsulate the keys.
 * @returns A common nonce of the keys and a list of keys, 32 bytes each.
 */
function encapBatched(publicKeys: G2Element[], id: Uint8Array): [Scalar, G2Element, GTElement[]] {
	if (publicKeys.length === 0) {
		throw new Error('No public keys provided');
	}
	const r = Scalar.random();
	const nonce = G2Element.generator().multiply(r);
	const gid = G1Element.hashToCurve(id).multiply(r);
	return [r, nonce, publicKeys.map((public_key) => gid.pairing(public_key))];
}

/**
 * Decapsulate a key using a user secret key and the nonce.
 *
 * @param usk The user secret key.
 * @param nonce The nonce.
 * @returns The encapsulated key.
 */
function decap(nonce: G2Element, usk: G1Element): GTElement {
	return usk.pairing(nonce);
}
