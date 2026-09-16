// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { parseSerializedSignature } from '../../../src/cryptography/index.js';
import { decodeSuiPrivateKey } from '../../../src/cryptography/keypair.js';
import {
	MLDSA65_PUBLIC_KEY_SIZE,
	MLDSA65_SIGNATURE_SIZE,
	MLDSA65Keypair,
} from '../../../src/keypairs/mldsa65/index.js';
import { Transaction } from '../../../src/transactions/index.js';
import {
	verifyPersonalMessageSignature,
	verifyTransactionSignature,
} from '../../../src/verify/index.js';

const SEED = new Uint8Array(32).fill(2);

// Test case generated against the Sui keytool for the seed above.
const SUI_ADDRESS = '0x687afa13b5510548e8ab9c57b34544c8ade5507559cfb944db0453fae2a68d4c';
const SUI_PRIVATE_KEY = 'suiprivkey1pqpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyrndku7';

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
		expect(parsed.bytes[0]).toBe(0x08);
		expect(parsed.signature.length).toBe(MLDSA65_SIGNATURE_SIZE);
		expect(parsed.publicKey).toEqual(keypair.getPublicKey().toRawBytes());

		const recovered = await verifyPersonalMessageSignature(message, signature, {
			address: SUI_ADDRESS,
		});
		expect(recovered.toSuiAddress()).toEqual(SUI_ADDRESS);
	});

	it('signs Transactions', async () => {
		const keypair = new MLDSA65Keypair();
		const tx = new Transaction();
		tx.setSender(keypair.getPublicKey().toSuiAddress());
		tx.setGasPrice(5);
		tx.setGasBudget(100);
		tx.setGasPayment([
			{
				objectId: (Math.random() * 100000).toFixed(0).padEnd(64, '0'),
				version: String((Math.random() * 10000).toFixed(0)),
				digest: toBase58(
					new Uint8Array([
						0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8,
						9, 1, 2,
					]),
				),
			},
		]);

		const bytes = await tx.build();

		const serializedSignature = (await keypair.signTransaction(bytes)).signature;

		expect(await keypair.getPublicKey().verifyTransaction(bytes, serializedSignature)).toEqual(
			true,
		);
		expect(!!(await verifyTransactionSignature(bytes, serializedSignature))).toEqual(true);
	});

	it('signs PersonalMessages', async () => {
		const keypair = new MLDSA65Keypair();
		const message = new TextEncoder().encode('hello world');

		const serializedSignature = (await keypair.signPersonalMessage(message)).signature;

		expect(
			await keypair.getPublicKey().verifyPersonalMessage(message, serializedSignature),
		).toEqual(true);
		expect(!!(await verifyPersonalMessageSignature(message, serializedSignature))).toEqual(true);
	});
});
