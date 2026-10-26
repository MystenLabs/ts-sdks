// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { parseSerializedSignature } from '../../../src/cryptography/index.js';
import { decodeSuiPrivateKey } from '../../../src/cryptography/keypair.js';
import { mnemonicToSeed, mnemonicToSeedHex } from '../../../src/cryptography/mnemonics.js';
import {
	DEFAULT_MLDSA65_DERIVATION_PATH,
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

const DERIVATION_CASES = [
	[
		'act wing dilemma glory episode region allow mad tourist humble muffin oblige',
		'776e86532c6983454353f4860ae5e3f10c11bd4bcaec9455e1b05c0e14947075',
		'suiprivkey1qamkapjn935cx32r206gvzh9u0cscydaf09we9z4uxc9crs5j3c82q5m0tk',
		'0xd0f33625a23608ac4f3fd938a461ab15ed688af783eb4c54c19ab68e37a420dd',
	],
	[
		'flag rebel cabbage captain minimum purpose long already valley horn enrich salt',
		'fc8b67af3bdadbd1314772ffcd2ed2fccbe09fe051cc07c3c05d3992edca3a6d',
		'suiprivkey1ql7gkea080ddh5f3gae0lnfw6t7vhcylupgucp7rcpwnnyhdegax6hx9cww',
		'0xd6de2b6e6d68114bbb6c4bbe3af4f174dcf51b27e5393b7606203cda8c933a93',
	],
	[
		'area renew bar language pudding trial small host remind supreme cabbage era',
		'8d6bb89cf774f0c879648a8eaff68cb9131e0cb1a88c209a13453ea5cc306958',
		'suiprivkey1q7xkhwyu7a60pjrevj9gatlk3ju3x8svkx5gcgy6zdznafwvxp54swwyjt4',
		'0x48e9fcc44df5766d6be8e824c2781c40dd196f6a6b2e7244b78b02ab05249d66',
	],
];

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

	it('derives keypairs from mnemonics at the default path', () => {
		for (const [mnemonic, seedHex, suiPrivateKey, address] of DERIVATION_CASES) {
			const keypair = MLDSA65Keypair.deriveKeypair(mnemonic);
			expect(keypair.toSuiAddress()).toEqual(address);
			expect(keypair.getSecretKey()).toEqual(suiPrivateKey);
			expect(decodeSuiPrivateKey(suiPrivateKey).secretKey).toEqual(fromHex(seedHex));

			const explicit = MLDSA65Keypair.deriveKeypair(mnemonic, DEFAULT_MLDSA65_DERIVATION_PATH);
			expect(explicit.toSuiAddress()).toEqual(address);

			const fromSeed = MLDSA65Keypair.deriveKeypairFromSeed(mnemonicToSeed(mnemonic));
			expect(fromSeed.toSuiAddress()).toEqual(address);
			expect(
				MLDSA65Keypair.deriveKeypairFromSeed(mnemonicToSeedHex(mnemonic)).toSuiAddress(),
			).toEqual(address);
		}
	});

	it('rejects derivation paths for other schemes or with unhardened levels', () => {
		const mnemonic = DERIVATION_CASES[0][0];
		expect(() => MLDSA65Keypair.deriveKeypair(mnemonic, "m/44'/784'/0'/0'/0'")).toThrow(
			'Invalid derivation path',
		);
		expect(() => MLDSA65Keypair.deriveKeypair(mnemonic, "m/94'/784'/0'/0/0")).toThrow(
			'Invalid derivation path',
		);
		expect(() => MLDSA65Keypair.deriveKeypair('aaa')).toThrow('Invalid mnemonic');
		for (const index of ["2147483653'", "4294967301'", "05'"]) {
			expect(() => MLDSA65Keypair.deriveKeypair(mnemonic, `m/94'/784'/${index}/0'/0'`)).toThrow(
				'Invalid derivation path',
			);
		}

		// Sibling accounts differ.
		expect(
			MLDSA65Keypair.deriveKeypair(mnemonic, "m/94'/784'/1'/0'/0'").toSuiAddress(),
		).not.toEqual(DERIVATION_CASES[0][3]);
	});
});
