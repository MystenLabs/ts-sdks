// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { p256 as secp256r1 } from '@noble/curves/nist.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AwsKmsClient } from '../src/aws-client.js';
import { AwsKmsSigner } from '../src/aws-kms-signer.js';

/**
 * SHA-256 a message the way AWS KMS does internally for `MessageType: 'RAW'` + `ECDSA_SHA_256`.
 */
async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
	return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource));
}

describe('AwsKmsSigner signing', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Stand in for AWS KMS `Sign` with a local keypair so signing is verified end-to-end without
	// live AWS: each scheme produces the same response shape KMS returns (raw 64 bytes for Ed25519,
	// DER-encoded for the ECDSA curves), and the resulting signature is checked against the public key.

	it('signs with Ed25519 and produces a signature that verifies (raw 64-byte signature)', async () => {
		const keypair = new Ed25519Keypair();
		const publicKey = keypair.getPublicKey();

		const client = new AwsKmsClient({
			region: 'us-east-1',
			accessKeyId: 'AKID',
			secretAccessKey: 'SECRET',
		});
		const runCommand = vi.spyOn(client, 'runCommand').mockImplementation(async (_command, body) => {
			// KMS signs the raw message with EdDSA and returns the raw 64-byte signature.
			const signature = await keypair.sign(fromBase64((body as { Message: string }).Message));
			return { Signature: toBase64(signature) } as never;
		});

		const signer = new AwsKmsSigner({ kmsKeyId: 'k', client, publicKey });
		const message = new TextEncoder().encode('Hello, Ed25519!');
		const { signature } = await signer.signPersonalMessage(message);

		expect(await publicKey.verifyPersonalMessage(message, signature)).toBe(true);
		expect(runCommand).toHaveBeenCalledWith(
			'Sign',
			expect.objectContaining({ SigningAlgorithm: 'ED25519_SHA_512', MessageType: 'RAW' }),
		);
	});

	it('signs with Secp256k1 and produces a signature that verifies (DER -> compact, low-S)', async () => {
		const secretKey = secp256k1.utils.randomSecretKey();
		const publicKey = Secp256k1Keypair.fromSecretKey(secretKey).getPublicKey();

		const client = new AwsKmsClient({
			region: 'us-east-1',
			accessKeyId: 'AKID',
			secretAccessKey: 'SECRET',
		});
		const runCommand = vi.spyOn(client, 'runCommand').mockImplementation(async (_command, body) => {
			// KMS hashes the raw message with SHA-256, signs with ECDSA, and returns DER.
			const digest = await sha256(fromBase64((body as { Message: string }).Message));
			const der = secp256k1.sign(digest, secretKey, { prehash: false, format: 'der' });
			return { Signature: toBase64(der) } as never;
		});

		const signer = new AwsKmsSigner({ kmsKeyId: 'k', client, publicKey });
		const message = new TextEncoder().encode('Hello, Secp256k1!');
		const { signature } = await signer.signPersonalMessage(message);

		expect(await publicKey.verifyPersonalMessage(message, signature)).toBe(true);
		expect(runCommand).toHaveBeenCalledWith(
			'Sign',
			expect.objectContaining({ SigningAlgorithm: 'ECDSA_SHA_256', MessageType: 'RAW' }),
		);
	});

	it('signs with Secp256r1 and produces a signature that verifies (DER -> compact, low-S)', async () => {
		const secretKey = secp256r1.utils.randomSecretKey();
		const publicKey = Secp256r1Keypair.fromSecretKey(secretKey).getPublicKey();

		const client = new AwsKmsClient({
			region: 'us-east-1',
			accessKeyId: 'AKID',
			secretAccessKey: 'SECRET',
		});
		const runCommand = vi.spyOn(client, 'runCommand').mockImplementation(async (_command, body) => {
			const digest = await sha256(fromBase64((body as { Message: string }).Message));
			const der = secp256r1.sign(digest, secretKey, { prehash: false, format: 'der' });
			return { Signature: toBase64(der) } as never;
		});

		const signer = new AwsKmsSigner({ kmsKeyId: 'k', client, publicKey });
		const message = new TextEncoder().encode('Hello, Secp256r1!');
		const { signature } = await signer.signPersonalMessage(message);

		expect(await publicKey.verifyPersonalMessage(message, signature)).toBe(true);
		expect(runCommand).toHaveBeenCalledWith(
			'Sign',
			expect.objectContaining({ SigningAlgorithm: 'ECDSA_SHA_256', MessageType: 'RAW' }),
		);
	});
});
