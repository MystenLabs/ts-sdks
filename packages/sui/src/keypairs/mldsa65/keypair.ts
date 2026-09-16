// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { randomBytes } from '@noble/hashes/utils.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';

import {
	decodeSuiPrivateKey,
	encodeSuiPrivateKey,
	Keypair,
	PRIVATE_KEY_SIZE,
} from '../../cryptography/keypair.js';
import type { SignatureScheme } from '../../cryptography/signature-scheme.js';
import { MLDSA65PublicKey } from './publickey.js';

/**
 * ML-DSA-65 Keypair data. `seed` is the 32-byte FIPS 204 seed, the only form
 * that is ever exported or stored (`suiprivkey`, keystore). `secretKey` is the
 * 4032-byte signing key expanded from it, kept so signing does not re-expand.
 */
export interface MLDSA65KeypairData {
	seed: Uint8Array;
	secretKey: Uint8Array;
	publicKey: Uint8Array;
}

/**
 * An ML-DSA-65 (FIPS 204) Keypair used for signing transactions.
 */
export class MLDSA65Keypair extends Keypair {
	private keypair: MLDSA65KeypairData;

	/**
	 * Create a new ML-DSA-65 keypair instance.
	 * Generate random keypair if no {@link MLDSA65Keypair} is provided.
	 *
	 * @param keypair ML-DSA-65 keypair
	 */
	constructor(keypair?: MLDSA65KeypairData) {
		super();
		if (keypair) {
			this.keypair = keypair;
		} else {
			this.keypair = expand(randomBytes(PRIVATE_KEY_SIZE));
		}
	}

	/**
	 * Get the key scheme of the keypair MLDSA65
	 */
	getKeyScheme(): SignatureScheme {
		return 'MLDSA65';
	}

	/**
	 * Generate a new random ML-DSA-65 keypair
	 */
	static generate(): MLDSA65Keypair {
		return new MLDSA65Keypair();
	}

	/**
	 * Create an ML-DSA-65 keypair from its 32-byte seed. FIPS 204 fixes the
	 * seed to key expansion, so the same seed yields the same keypair in every
	 * compliant implementation, including the Sui CLI.
	 *
	 * @param secretKey the 32-byte seed as a byte array or Bech32 secret key string
	 */
	static fromSecretKey(secretKey: Uint8Array | string): MLDSA65Keypair {
		if (typeof secretKey === 'string') {
			const decoded = decodeSuiPrivateKey(secretKey);

			if (decoded.scheme !== 'MLDSA65') {
				throw new Error(`Expected a MLDSA65 keypair, got ${decoded.scheme}`);
			}

			return this.fromSecretKey(decoded.secretKey);
		}

		if (secretKey.length !== PRIVATE_KEY_SIZE) {
			throw new Error(
				`Wrong secretKey size. Expected ${PRIVATE_KEY_SIZE} bytes, got ${secretKey.length}.`,
			);
		}

		return new MLDSA65Keypair(expand(secretKey));
	}

	/**
	 * Generate a keypair from a 32 byte seed. Same as {@link fromSecretKey}:
	 * for ML-DSA-65 the seed is the secret key.
	 *
	 * @param seed seed byte array
	 */
	static fromSeed(seed: Uint8Array): MLDSA65Keypair {
		return MLDSA65Keypair.fromSecretKey(seed);
	}

	/**
	 * The public key for this ML-DSA-65 keypair
	 */
	getPublicKey(): MLDSA65PublicKey {
		return new MLDSA65PublicKey(this.keypair.publicKey);
	}

	/**
	 * The Bech32 secret key string for this ML-DSA-65 keypair, encoding the 32-byte seed.
	 */
	getSecretKey(): string {
		return encodeSuiPrivateKey(this.keypair.seed, this.getKeyScheme());
	}

	/**
	 * Return the signature for the provided data using ML-DSA-65.
	 *
	 * Hedged signing: 32 fresh random bytes go into every signature, so signing the
	 * same data twice gives two different valid signatures.
	 */
	async sign(data: Uint8Array) {
		return ml_dsa65.sign(data, this.keypair.secretKey) as Uint8Array<ArrayBuffer>;
	}
}

function expand(seed: Uint8Array): MLDSA65KeypairData {
	const { publicKey, secretKey } = ml_dsa65.keygen(seed);
	return { seed, secretKey, publicKey };
}
