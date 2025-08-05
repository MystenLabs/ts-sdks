// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';
import { equalBytes } from '@noble/curves/abstract/utils';
import { hmac } from '@noble/hashes/hmac';
import { sha3_256 } from '@noble/hashes/sha3';

import type { Ciphertext } from './bcs.js';
import { DecryptionError, InvalidCiphertextError } from './error.js';
import { flatten, xorUnchecked } from './utils.js';

// Use a fixed IV for AES. This is okay because the key is unique for each message.
export const iv = Uint8Array.from([
	138, 55, 153, 253, 198, 46, 121, 219, 160, 128, 89, 7, 214, 156, 148, 220,
]);

async function generateAesKey(): Promise<Uint8Array> {
	const key = await crypto.subtle.generateKey(
		{
			name: 'AES-GCM',
			length: 256,
		},
		true,
		['encrypt', 'decrypt'],
	);
	return await crypto.subtle.exportKey('raw', key).then((keyData) => new Uint8Array(keyData));
}

export interface EncryptionInput {
	encrypt(key: Uint8Array): Promise<typeof Ciphertext.$inferInput>;
	generateKey(): Promise<Uint8Array>;
}

export class AesGcm256 implements EncryptionInput {
	readonly plaintext: Uint8Array;
	readonly aad: Uint8Array;

	constructor(msg: Uint8Array, aad: Uint8Array) {
		this.plaintext = msg;
		this.aad = aad;
	}

	generateKey(): Promise<Uint8Array> {
		return generateAesKey();
	}

	async encrypt(key: Uint8Array): Promise<typeof Ciphertext.$inferInput> {
		const aesCryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);

		const blob = new Uint8Array(
			await crypto.subtle.encrypt(
				{
					name: 'AES-GCM',
					iv,
					additionalData: this.aad,
				},
				aesCryptoKey,
				this.plaintext,
			),
		);

		return {
			Aes256Gcm: {
				blob,
				aad: this.aad ?? [],
			},
		};
	}

	static async decrypt(
		key: Uint8Array,
		ciphertext: typeof Ciphertext.$inferInput,
	): Promise<Uint8Array> {
		if (!('Aes256Gcm' in ciphertext)) {
			throw new InvalidCiphertextError(`Invalid ciphertext ${ciphertext}`);
		}

		try {
			const aesCryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
			return new Uint8Array(
				await crypto.subtle.decrypt(
					{
						name: 'AES-GCM',
						iv,
						additionalData: new Uint8Array(ciphertext.Aes256Gcm.aad ?? []),
					},
					aesCryptoKey,
					new Uint8Array(ciphertext.Aes256Gcm.blob),
				),
			);
		} catch (e) {
			throw new DecryptionError(`Decryption failed`);
		}
	}
}

/**
 * Authenticated encryption using CTR mode with HMAC-SHA3-256 as a PRF.
 * 1. Derive an encryption key, <i>k<sub>1</sub> = <b>hmac</b>(key, 1)</i>.
 * 2. Chunk the message into blocks of 32 bytes, <i>m = m<sub>1</sub> || ... || m<sub>n</sub></i>.
 * 3. Let the ciphertext be defined by <i>c = c<sub>1</sub> || ... || c<sub>n</sub></i> where <i>c<sub>i</sub> = m<sub>i</sub> ⊕ <b>hmac</b>(k<sub>1</sub>, i)</i>.
 * 4. Compute a MAC over the AAD and the ciphertext, <i>mac = <b>hmac</b>(k<sub>2</sub>, aad || c) where k<sub>2</sub> = <b>hmac</b>(key, 2)</i>.
 * 5. Return <i>mac || c</i>.
 */
export class Hmac256Ctr implements EncryptionInput {
	readonly plaintext: Uint8Array;
	readonly aad: Uint8Array;

	constructor(msg: Uint8Array, aad: Uint8Array) {
		this.plaintext = msg;
		this.aad = aad;
	}

	generateKey(): Promise<Uint8Array> {
		return generateAesKey();
	}

	async encrypt(key: Uint8Array): Promise<typeof Ciphertext.$inferInput> {
		const blob = Hmac256Ctr.encryptInCtrMode(key, this.plaintext);
		const mac = Hmac256Ctr.computeMac(key, this.aad, blob);
		return {
			Hmac256Ctr: {
				blob,
				mac,
				aad: this.aad ?? [],
			},
		};
	}

	static async decrypt(
		key: Uint8Array,
		ciphertext: typeof Ciphertext.$inferInput,
	): Promise<Uint8Array> {
		if (!('Hmac256Ctr' in ciphertext)) {
			throw new InvalidCiphertextError(`Invalid ciphertext ${ciphertext}`);
		}
		const aad = new Uint8Array(ciphertext.Hmac256Ctr.aad ?? []);
		const blob = new Uint8Array(ciphertext.Hmac256Ctr.blob);
		const mac = Hmac256Ctr.computeMac(key, aad, blob);
		if (!equalBytes(mac, new Uint8Array(ciphertext.Hmac256Ctr.mac))) {
			throw new DecryptionError(`Invalid MAC ${mac}`);
		}
		return Hmac256Ctr.encryptInCtrMode(key, blob);
	}

	private static computeMac(key: Uint8Array, aad: Uint8Array, ciphertext: Uint8Array): Uint8Array {
		const macInput = flatten([MacKeyTag, toBytes(aad.length), aad, ciphertext]);
		const mac = hmac(sha3_256, key, macInput);
		return mac;
	}

	private static encryptInCtrMode(key: Uint8Array, msg: Uint8Array): Uint8Array {
		const blockSize = 32;
		const result = new Uint8Array(msg.length);
		for (let i = 0; i * blockSize < msg.length; i++) {
			const block = msg.subarray(i * blockSize, (i + 1) * blockSize);
			const mask = hmac(sha3_256, key, flatten([EncryptionKeyTag, toBytes(i)]));
			const encryptedBlock = xorUnchecked(block, mask);
			result.set(encryptedBlock, i * blockSize);
		}
		return result;
	}
}

/**
 * Convert a u64 to bytes using little-endian representation.
 */
function toBytes(n: number): Uint8Array {
	return bcs.u64().serialize(n).toBytes();
}

const EncryptionKeyTag = new TextEncoder().encode('HMAC-CTR-ENC');
const MacKeyTag = new TextEncoder().encode('HMAC-CTR-MAC');
