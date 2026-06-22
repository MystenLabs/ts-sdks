// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { PublicKey, SignatureFlag } from '@mysten/sui/cryptography';
import { SIGNATURE_FLAG_TO_SCHEME, Signer } from '@mysten/sui/cryptography';
import { fromBase64, toBase64 } from '@mysten/sui/utils';

import type { AwsClientOptions } from './aws-client.js';
import { AwsKmsClient } from './aws-client.js';
import { getConcatenatedSignature } from './utils.js';

/**
 * Configuration options for initializing the AwsKmsSigner.
 */
export interface AwsKmsSignerOptions {
	/** AWS KMS Key ID used for signing */
	kmsKeyId: string;
	/** Options for setting up the AWS KMS client */
	client: AwsKmsClient;
	/** Public key */
	publicKey: PublicKey;
}

/**
 * Aws KMS Signer integrates AWS Key Management Service (KMS) with the Sui blockchain
 * to provide signing capabilities using AWS-managed cryptographic keys.
 */
export class AwsKmsSigner extends Signer {
	#publicKey: PublicKey;
	/** AWS KMS client instance */
	#client: AwsKmsClient;
	/** AWS KMS Key ID used for signing */
	#kmsKeyId: string;

	/**
	 * Creates an instance of AwsKmsSigner. It's expected to call the static `fromKeyId` method to create an instance.
	 * For example:
	 * ```
	 * const signer = await AwsKmsSigner.fromKeyId(keyId, options);
	 * ```
	 * @throws Will throw an error if required AWS credentials or region are not provided.
	 */
	constructor({ kmsKeyId, client, publicKey }: AwsKmsSignerOptions) {
		super();
		if (!kmsKeyId) throw new Error('KMS Key ID is required');

		this.#client = client;
		this.#kmsKeyId = kmsKeyId;
		this.#publicKey = publicKey;
	}

	/**
	 * Retrieves the key scheme used by this signer.
	 * @returns The scheme derived from the public key — `Ed25519`, `Secp256k1`, or `Secp256r1`.
	 */
	getKeyScheme() {
		return SIGNATURE_FLAG_TO_SCHEME[this.#publicKey.flag() as SignatureFlag];
	}

	/**
	 * Retrieves the public key associated with this signer.
	 * @returns The public key instance (`Ed25519PublicKey`, `Secp256k1PublicKey`, or `Secp256r1PublicKey`).
	 * @throws Will throw an error if the public key has not been initialized.
	 */
	getPublicKey() {
		return this.#publicKey;
	}

	/**
	 * Signs the given data using AWS KMS.
	 * @param bytes - The data to be signed as a Uint8Array.
	 * @returns A promise that resolves to the signature as a Uint8Array.
	 * @throws Will throw an error if the public key is not initialized or if signing fails.
	 */
	async sign(bytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
		const keyScheme = this.getKeyScheme();

		// Ed25519 keys use the EdDSA signing algorithm and return a raw 64-byte signature,
		// so no DER parsing or low-S normalization (required for the ECDSA curves) is needed.
		if (keyScheme === 'ED25519') {
			const signResponse = await this.#client.runCommand('Sign', {
				KeyId: this.#kmsKeyId,
				Message: toBase64(bytes),
				MessageType: 'RAW',
				SigningAlgorithm: 'ED25519_SHA_512',
			});

			return fromBase64(signResponse.Signature) as Uint8Array<ArrayBuffer>;
		}

		const signResponse = await this.#client.runCommand('Sign', {
			KeyId: this.#kmsKeyId,
			Message: toBase64(bytes),
			MessageType: 'RAW',
			SigningAlgorithm: 'ECDSA_SHA_256',
		});

		// Concatenate the signature components into a compact form
		return getConcatenatedSignature(fromBase64(signResponse.Signature), keyScheme);
	}

	/**
	 * Prepares the signer by fetching and setting the public key from AWS KMS.
	 * It is recommended to initialize an `AwsKmsSigner` instance using this function.
	 * @returns A promise that resolves once a `AwsKmsSigner` instance is prepared (public key is set).
	 */
	static async fromKeyId(keyId: string, options: AwsClientOptions) {
		const client = new AwsKmsClient(options);

		const pubKey = await client.getPublicKey(keyId);

		return new AwsKmsSigner({
			kmsKeyId: keyId,
			client,
			publicKey: pubKey,
		});
	}
}
