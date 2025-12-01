// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from '@mysten/bcs';
import { blake2b } from '@noble/hashes/blake2b';
import { bytesToHex } from '@noble/hashes/utils';

import { bcs } from '../bcs/index.js';
import { normalizeSuiAddress, SUI_ADDRESS_LENGTH } from '../utils/sui-types.js';
import type { IntentScope } from './intent.js';
import { messageWithIntent } from './intent.js';
import { SIGNATURE_FLAG_TO_SCHEME, SIGNATURE_SCHEME_TO_SIZE } from './signature-scheme.js';

/**
 * Value to be converted into public key.
 */
export type PublicKeyInitData = string | Uint8Array | Iterable<number>;

export function bytesEqual(a: Uint8Array, b: Uint8Array) {
	if (a === b) return true;

	if (a.length !== b.length) {
		return false;
	}

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
}

/**
 * A public key
 */
export abstract class PublicKey {
	/**
	 * Checks if two public keys are equal
	 */
	equals(publicKey: PublicKey) {
		return bytesEqual(this.toRawBytes(), publicKey.toRawBytes());
	}

	/**
	 * Return the base-64 representation of the public key
	 */
	toBase64() {
		return toBase64(this.toRawBytes());
	}

	toString(): never {
		throw new Error(
			'`toString` is not implemented on public keys. Use `toBase64()` or `toRawBytes()` instead.',
		);
	}

	/**
	 * Return the Sui representation of the public key encoded in
	 * base-64. A Sui public key is formed by the concatenation
	 * of the scheme flag with the raw bytes of the public key
	 */
	toSuiPublicKey(): string {
		const bytes = this.toSuiBytes();
		return toBase64(bytes);
	}

	verifyWithIntent(
		bytes: Uint8Array,
		signature: Uint8Array | string,
		intent: IntentScope,
	): Promise<boolean> {
		const intentMessage = messageWithIntent(intent, bytes);
		const digest = blake2b(intentMessage, { dkLen: 32 });

		return this.verify(digest, signature);
	}

	/**
	 * Verifies that the signature is valid for for the provided PersonalMessage
	 */
	verifyPersonalMessage(message: Uint8Array, signature: Uint8Array | string): Promise<boolean> {
		return this.verifyWithIntent(
			bcs.byteVector().serialize(message).toBytes(),
			signature,
			'PersonalMessage',
		);
	}

	/**
	 * Verifies that the signature is valid for for the provided Transaction
	 */
	verifyTransaction(transaction: Uint8Array, signature: Uint8Array | string): Promise<boolean> {
		return this.verifyWithIntent(transaction, signature, 'TransactionData');
	}

	/**
	 * Verifies that the public key is associated with the provided address
	 */
	verifyAddress(address: string): boolean {
		return this.toSuiAddress() === address;
	}

	/**
	 * Returns the bytes representation of the public key
	 * prefixed with the signature scheme flag
	 */
	toSuiBytes(): Uint8Array<ArrayBuffer> {
		const rawBytes = this.toRawBytes();
		const suiBytes = new Uint8Array(rawBytes.length + 1);
		suiBytes.set([this.flag()]);
		suiBytes.set(rawBytes, 1);

		return suiBytes;
	}

	/**
	 * Return the Sui address associated with this Ed25519 public key
	 */
	toSuiAddress(): string {
		// Each hex char represents half a byte, hence hex address doubles the length
		return normalizeSuiAddress(
			bytesToHex(blake2b(this.toSuiBytes(), { dkLen: 32 })).slice(0, SUI_ADDRESS_LENGTH * 2),
		);
	}

	/**
	 * Return the byte array representation of the public key
	 */
	abstract toRawBytes(): Uint8Array<ArrayBuffer>;

	/**
	 * Return signature scheme flag of the public key
	 */
	abstract flag(): number;

	/**
	 * Verifies that the signature is valid for for the provided message
	 */
	abstract verify(data: Uint8Array, signature: Uint8Array | string): Promise<boolean>;
}

export function parseSerializedKeypairSignature(serializedSignature: string) {
	const bytes = fromBase64(serializedSignature);

	const signatureScheme =
		SIGNATURE_FLAG_TO_SCHEME[bytes[0] as keyof typeof SIGNATURE_FLAG_TO_SCHEME];

	switch (signatureScheme) {
		case 'ED25519':
		case 'Secp256k1':
		case 'Secp256r1':
			const size =
				SIGNATURE_SCHEME_TO_SIZE[signatureScheme as keyof typeof SIGNATURE_SCHEME_TO_SIZE];
			const signature = bytes.slice(1, bytes.length - size);
			const publicKey = bytes.slice(1 + signature.length);

			return {
				serializedSignature,
				signatureScheme,
				signature,
				publicKey,
				bytes,
			};
		default:
			throw new Error('Unsupported signature scheme');
	}
}
