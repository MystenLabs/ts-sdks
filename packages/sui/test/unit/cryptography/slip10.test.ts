// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toHex } from '@mysten/bcs';
import { sha256 } from '@noble/hashes/sha2.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { describe, expect, it } from 'vitest';

import {
	derivePath,
	ED25519_SLIP10_MASTER_KEY,
	MLDSA65_SLIP10_MASTER_KEY,
} from '../../../src/cryptography/slip10.js';

const SEED_1 = '000102030405060708090a0b0c0d0e0f';
const SEED_2 =
	'fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a2' +
	'9f9c999693908d8a8784817e7b7875726f6c696663605d5a5754514e4b484542';

// SLIP-0010 ed25519 test vectors 1 and 2: [seed, path, chain code, private key].
const ED25519_VECTORS: [string, string, string, string][] = [
	[
		SEED_1,
		"m/0'",
		'8b59aa11380b624e81507a27fedda59fea6d0b779a778918a2fd3590e16e9c69',
		'68e0fe46dfb67e368c75379acec591dad19df3cde26e63b93a8e704f1dade7a3',
	],
	[
		SEED_1,
		"m/0'/1'/2'/2'/1000000000'",
		'68789923a0cac2cd5a29172a475fe9e0fb14cd6adb5ad98a3fa70333e7afa230',
		'8f94d394a8e8fd6b1bc2f3f49f5c47e385281d5c17e65324b0f62483e37e8793',
	],
	[
		SEED_2,
		"m/0'/2147483647'/1'/2147483646'/2'",
		'5d70af781f3a37b829f0d060924d5e960bdc02e85423494afc0b1a41bbe196d4',
		'551d333177df541ad876a60ea71f00447931c0a9da16f227c11ea080d7391b8d',
	],
];

// The ML-DSA-65 vectors from satoshilabs/slips#1968: [seed, path, chain code, sha256(public key)].
const MLDSA65_VECTORS: [string, string, string, string][] = [
	[
		SEED_1,
		"m/0'",
		'd8b27c87ec212d6501629199262a9d0d66ec26deab313c26a474bc4ddd5dce7c',
		'1d9d7fce0a1560acef9b117f3e3022cb0bdd46f30a3134db33165baf66b53e7e',
	],
	[
		SEED_1,
		"m/0'/1'/2'/2'/1000000000'",
		'dc65d6cf4fa993c2f04fae2b41d70d8c5ba4c9d2042ea5720bf42a2315a6b7db',
		'9591ff122a7eff9cd64100f2123e678db9c257815ec5570b0b6acd8847e62f24',
	],
	[
		SEED_2,
		"m/0'/2147483647'/1'/2147483646'/2'",
		'55a202d3f7803dd79e31c454e65eb7da49dee824b467bfed5204df980e71571d',
		'4b6c9f1dd1a811fe704c1355e32c43b63007317868ed6c3fce385f11c1b5da39',
	],
];

describe('slip10', () => {
	it('matches the SLIP-0010 ed25519 vectors', () => {
		for (const [seed, path, chainCode, key] of ED25519_VECTORS) {
			const node = derivePath(ED25519_SLIP10_MASTER_KEY, path, fromHex(seed));
			expect(toHex(node.chainCode)).toEqual(chainCode);
			expect(toHex(node.key)).toEqual(key);
		}
	});

	it('matches the ML-DSA-65 vectors from slips#1968', () => {
		for (const [seed, path, chainCode, publicKeyDigest] of MLDSA65_VECTORS) {
			const node = derivePath(MLDSA65_SLIP10_MASTER_KEY, path, fromHex(seed));
			expect(toHex(node.chainCode)).toEqual(chainCode);
			expect(toHex(sha256(ml_dsa65.keygen(node.key).publicKey))).toEqual(publicKeyDigest);
		}
	});

	it('rejects unhardened and malformed paths', () => {
		const seed = fromHex(SEED_1);
		for (const masterKey of [ED25519_SLIP10_MASTER_KEY, MLDSA65_SLIP10_MASTER_KEY]) {
			expect(() => derivePath(masterKey, "m/44'/784'/0'/0/0", seed)).toThrow(
				'Invalid derivation path',
			);
			expect(() => derivePath(masterKey, 'm', seed)).toThrow('Invalid derivation path');
			expect(() => derivePath(masterKey, "44'/784'/0'/0'/0'", seed)).toThrow(
				'Invalid derivation path',
			);
		}
	});

	it('rejects indices that would alias another account', () => {
		const seed = fromHex(SEED_1);
		for (const masterKey of [ED25519_SLIP10_MASTER_KEY, MLDSA65_SLIP10_MASTER_KEY]) {
			// 2^31 + 5 and 2^32 + 5 would both land on hardened index 5.
			expect(() => derivePath(masterKey, "m/44'/784'/2147483653'/0'/0'", seed)).toThrow(
				'Invalid derivation path',
			);
			expect(() => derivePath(masterKey, "m/44'/784'/4294967301'/0'/0'", seed)).toThrow(
				'Invalid derivation path',
			);
			expect(() => derivePath(masterKey, "m/44'/784'/05'/0'/0'", seed)).toThrow(
				'Invalid derivation path',
			);
			expect(() => derivePath(masterKey, "m/44'/784'/2147483647'/0'/0'", seed)).not.toThrow();
		}
	});

	it('rejects seeds outside the SLIP-0010 range', () => {
		expect(() => derivePath(ED25519_SLIP10_MASTER_KEY, "m/0'", new Uint8Array(15))).toThrow(
			'Invalid seed length',
		);
		expect(() => derivePath(ED25519_SLIP10_MASTER_KEY, "m/0'", new Uint8Array(65))).toThrow(
			'Invalid seed length',
		);
		expect(() => derivePath(ED25519_SLIP10_MASTER_KEY, "m/0'", new Uint8Array(16))).not.toThrow();
		expect(() => derivePath(ED25519_SLIP10_MASTER_KEY, "m/0'", new Uint8Array(64))).not.toThrow();
	});
});
