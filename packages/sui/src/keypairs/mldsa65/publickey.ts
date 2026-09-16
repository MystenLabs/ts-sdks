// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';

import {
	bytesEqual,
	parseSerializedKeypairSignature,
	PublicKey,
} from '../../cryptography/publickey.js';
import type { PublicKeyInitData } from '../../cryptography/publickey.js';
import { SIGNATURE_SCHEME_TO_FLAG } from '../../cryptography/signature-scheme.js';

export const MLDSA65_PUBLIC_KEY_SIZE = 1952;
export const MLDSA65_SIGNATURE_SIZE = 3309;

/**
 * An ML-DSA-65 (FIPS 204) public key
 */
export class MLDSA65PublicKey extends PublicKey {
	static SIZE = MLDSA65_PUBLIC_KEY_SIZE;
	private data: Uint8Array<ArrayBuffer>;

	/**
	 * Create a new MLDSA65PublicKey object
	 * @param value ML-DSA-65 public key as buffer or base-64 encoded string
	 */
	constructor(value: PublicKeyInitData) {
		super();

		if (typeof value === 'string') {
			this.data = fromBase64(value);
		} else if (value instanceof Uint8Array) {
			this.data = value as Uint8Array<ArrayBuffer>;
		} else {
			this.data = Uint8Array.from(value);
		}

		if (this.data.length !== MLDSA65_PUBLIC_KEY_SIZE) {
			throw new Error(
				`Invalid public key input. Expected ${MLDSA65_PUBLIC_KEY_SIZE} bytes, got ${this.data.length}`,
			);
		}
	}

	/**
	 * Checks if two ML-DSA-65 public keys are equal
	 */
	override equals(publicKey: MLDSA65PublicKey): boolean {
		return super.equals(publicKey);
	}

	/**
	 * Return the byte array representation of the ML-DSA-65 public key
	 */
	toRawBytes(): Uint8Array<ArrayBuffer> {
		return this.data;
	}

	/**
	 * Return the signature scheme flag of the ML-DSA-65 public key
	 */
	flag(): number {
		return SIGNATURE_SCHEME_TO_FLAG['MLDSA65'];
	}

	/**
	 * Verifies that the signature is valid for for the provided message.
	 * Pure ML-DSA-65 with an empty context string.
	 */
	async verify(message: Uint8Array, signature: Uint8Array | string): Promise<boolean> {
		let bytes;
		if (typeof signature === 'string') {
			const parsed = parseSerializedKeypairSignature(signature);
			if (parsed.signatureScheme !== 'MLDSA65') {
				throw new Error('Invalid signature scheme');
			}

			if (!bytesEqual(this.toRawBytes(), parsed.publicKey)) {
				throw new Error('Signature does not match public key');
			}

			bytes = parsed.signature;
		} else {
			bytes = signature;
		}

		if (bytes.length !== MLDSA65_SIGNATURE_SIZE) {
			return false;
		}

		return ml_dsa65.verify(bytes, message, this.toRawBytes());
	}
}
