// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { parseSerializedSignature } from '../../../src/cryptography/index.js';
import { decodeSuiPrivateKey } from '../../../src/cryptography/keypair.js';
import {
	MLDSA65_PUBLIC_KEY_SIZE,
	MLDSA65_SIGNATURE_SIZE,
	MLDSA65Keypair,
} from '../../../src/keypairs/mldsa65/index.js';
import { verifyPersonalMessageSignature } from '../../../src/verify/index.js';
import vector from './mldsa65-vectors.json' with { type: 'json' };

const SEED = new Uint8Array(32).fill(2);

// Test case generated against the Sui keytool for the seed above.
const SUI_ADDRESS = '0xa44576e02f83a9e1bddac6fd742a77931d1689d9a61122eb3125dee425f6dd36';
const SUI_PRIVATE_KEY = 'suiprivkey1qupqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyghdug7';

describe('mldsa65-keypair', () => {
	it('new keypair', () => {
		const keypair = new MLDSA65Keypair();
		expect(keypair.getPublicKey().toRawBytes().length).toBe(MLDSA65_PUBLIC_KEY_SIZE);
		expect(keypair.getKeyScheme()).toBe('MLDSA65');
	});

	it('create keypair from secret key matches keytool', () => {
		const keypair = MLDSA65Keypair.fromSecretKey(SEED);
		expect(keypair.toSuiAddress()).toEqual(SUI_ADDRESS);
		expect(keypair.getSecretKey()).toEqual(SUI_PRIVATE_KEY);

		const parsed = decodeSuiPrivateKey(SUI_PRIVATE_KEY);
		expect(parsed.scheme).toBe('MLDSA65');
		expect(parsed.secretKey).toEqual(SEED);

		const imported = MLDSA65Keypair.fromSecretKey(SUI_PRIVATE_KEY);
		expect(imported.getPublicKey().equals(keypair.getPublicKey())).toBe(true);
		expect(MLDSA65Keypair.fromSeed(SEED).toSuiAddress()).toEqual(SUI_ADDRESS);
	});

	it('creating keypair from invalid secret key throws error', () => {
		expect(() => MLDSA65Keypair.fromSecretKey(new Uint8Array(31))).toThrow(
			'Wrong secretKey size. Expected 32 bytes, got 31.',
		);
		expect(() =>
			MLDSA65Keypair.fromSecretKey(
				'suiprivkey1qzse89atw7d3zum8ujep76d2cxmgduyuast0y9fu23xcl0mpafgkktllhyc',
			),
		).toThrow('Expected a MLDSA65 keypair, got ED25519');
	});

	it('exported secret key survives the caller wiping the import buffer', () => {
		const seed = new Uint8Array(32).fill(2);
		const keypair = MLDSA65Keypair.fromSecretKey(seed);
		seed.fill(0);

		expect(keypair.getSecretKey()).toEqual(SUI_PRIVATE_KEY);
		expect(MLDSA65Keypair.fromSecretKey(keypair.getSecretKey()).toSuiAddress()).toEqual(
			SUI_ADDRESS,
		);
	});

	it('signature of data is valid and hedged', async () => {
		const keypair = MLDSA65Keypair.fromSecretKey(SEED);
		const data = new TextEncoder().encode('hello world');
		const first = await keypair.sign(data);
		const second = await keypair.sign(data);

		expect(first.length).toBe(MLDSA65_SIGNATURE_SIZE);
		expect(first).not.toEqual(second);
		expect(await keypair.getPublicKey().verify(data, first)).toBe(true);
		expect(await keypair.getPublicKey().verify(data, second)).toBe(true);

		const tampered = first.slice();
		tampered[100] ^= 1;
		expect(await keypair.getPublicKey().verify(data, tampered)).toBe(false);
		expect(await keypair.getPublicKey().verify(new TextEncoder().encode('bye'), first)).toBe(false);
	});

	it('serialized signature carries the flag, signature and public key', async () => {
		const keypair = MLDSA65Keypair.fromSecretKey(SEED);
		const message = new TextEncoder().encode('hello');
		const { signature } = await keypair.signPersonalMessage(message);

		const parsed = parseSerializedSignature(signature);
		if (parsed.signatureScheme !== 'MLDSA65') {
			throw new Error(`expected an MLDSA65 signature, got ${parsed.signatureScheme}`);
		}
		expect(parsed.bytes[0]).toBe(0x07);
		expect(parsed.signature.length).toBe(MLDSA65_SIGNATURE_SIZE);
		expect(parsed.publicKey).toEqual(keypair.getPublicKey().toRawBytes());

		const recovered = await verifyPersonalMessageSignature(message, signature, {
			address: SUI_ADDRESS,
		});
		expect(recovered.toSuiAddress()).toEqual(SUI_ADDRESS);
	});

	it('verifies a signature produced by the Rust signer', async () => {
		const keypair = MLDSA65Keypair.fromSecretKey(fromHex(vector.seed));
		expect(keypair.toSuiAddress()).toEqual(vector.address);
		expect(keypair.getSecretKey()).toEqual(vector.suiprivkey);

		const message = new TextEncoder().encode(vector.personalMessage);
		const parsed = parseSerializedSignature(vector.signature);
		if (parsed.signatureScheme !== 'MLDSA65') {
			throw new Error(`expected an MLDSA65 signature, got ${parsed.signatureScheme}`);
		}
		expect(parsed.publicKey).toEqual(keypair.getPublicKey().toRawBytes());
		expect(await keypair.getPublicKey().verifyPersonalMessage(message, vector.signature)).toBe(
			true,
		);
		const recovered = await verifyPersonalMessageSignature(message, vector.signature);
		expect(recovered.toSuiAddress()).toEqual(vector.address);
	});
});
