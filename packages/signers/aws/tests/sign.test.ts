// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { PublicKey } from '@mysten/sui/cryptography';
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

type EcdsaCurve = typeof secp256k1 | typeof secp256r1;

/**
 * Produce a DER-encoded ECDSA signature exactly as AWS KMS would for a `MessageType: 'RAW'` +
 * `ECDSA_SHA_256` request: SHA-256 the message, sign, and DER-encode. Crucially KMS does **not**
 * low-S normalize — it returns the raw ECDSA output, which is high-S roughly half the time — so we
 * pass `lowS: false` to faithfully emulate that. The signer's `getConcatenatedSignature` is what
 * performs the low-S normalization Sui requires; if the mock normalized for it, that code path
 * would never be exercised.
 */
async function kmsEcdsaSignDER(
	curve: EcdsaCurve,
	secretKey: Uint8Array,
	message: Uint8Array,
): Promise<Uint8Array> {
	const digest = await sha256(message);
	return curve.sign(digest, secretKey, { prehash: false, lowS: false, format: 'der' });
}

/**
 * Extract the 64-byte compact signature from a serialized Sui signature
 * (1 flag byte + 64 signature bytes + 33 public-key bytes).
 */
function extractCompactSignature(signature: Uint8Array | string): Uint8Array {
	const bytes = signature instanceof Uint8Array ? signature : fromBase64(signature);
	return bytes.slice(1, 65);
}

describe('AwsKmsSigner signing', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Stand in for AWS KMS `Sign` with a local keypair so signing is verified end-to-end without
	// live AWS: each scheme produces the same response shape KMS returns (raw 64 bytes for Ed25519,
	// DER-encoded and NOT low-S normalized for the ECDSA curves), and the resulting signature is
	// checked against the public key.

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
			const message = fromBase64((body as { Message: string }).Message);
			return { Signature: toBase64(await kmsEcdsaSignDER(secp256k1, secretKey, message)) } as never;
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
			const message = fromBase64((body as { Message: string }).Message);
			return { Signature: toBase64(await kmsEcdsaSignDER(secp256r1, secretKey, message)) } as never;
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

	// AWS KMS returns high-S ECDSA signatures (it does not normalize), and Sui rejects high-S, so
	// the signer MUST low-S normalize. The mock here emulates KMS faithfully (lowS: false), then we
	// drive `signPersonalMessage` with different messages until the KMS-side signature is high-S
	// (~50% per attempt) and assert the signer's output is low-S and verifies — the normalization
	// path the happy-path tests above can't guarantee they exercise.
	async function expectHighSNormalized(
		curve: EcdsaCurve,
		publicKey: PublicKey,
		secretKey: Uint8Array,
	) {
		const client = new AwsKmsClient({
			region: 'us-east-1',
			accessKeyId: 'AKID',
			secretAccessKey: 'SECRET',
		});
		let lastWasHighS = false;
		vi.spyOn(client, 'runCommand').mockImplementation(async (_command, body) => {
			const signedBytes = fromBase64((body as { Message: string }).Message);
			const der = curve.sign(signedBytes, secretKey, { prehash: true, lowS: false, format: 'der' });
			lastWasHighS = curve.Signature.fromBytes(der, 'der').hasHighS();
			return { Signature: toBase64(der) } as never;
		});

		const signer = new AwsKmsSigner({ kmsKeyId: 'k', client, publicKey });
		for (let i = 0; i < 100; i++) {
			const message = new TextEncoder().encode(`high-s probe ${i}`);
			const { signature } = await signer.signPersonalMessage(message);
			if (!lastWasHighS) continue;

			// KMS returned a high-S signature; the signer must have normalized it to low-S.
			const sigBytes = extractCompactSignature(signature);
			expect(curve.Signature.fromBytes(sigBytes, 'compact').hasHighS()).toBe(false);
			expect(await publicKey.verifyPersonalMessage(message, signature)).toBe(true);
			return;
		}
		throw new Error('KMS mock never produced a high-S signature to normalize');
	}

	it('normalizes a high-S Secp256k1 signature from KMS to low-S', async () => {
		const secretKey = secp256k1.utils.randomSecretKey();
		const publicKey = Secp256k1Keypair.fromSecretKey(secretKey).getPublicKey();
		await expectHighSNormalized(secp256k1, publicKey, secretKey);
	});

	it('normalizes a high-S Secp256r1 signature from KMS to low-S', async () => {
		const secretKey = secp256r1.utils.randomSecretKey();
		const publicKey = Secp256r1Keypair.fromSecretKey(secretKey).getPublicKey();
		await expectHighSNormalized(secp256r1, publicKey, secretKey);
	});
});
