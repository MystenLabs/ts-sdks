// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toHex } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { EncryptedObject } from '../../src/bcs';
import { G1Element, G2Element, Scalar } from '../../src/bls12381';
import { decrypt } from '../../src/decrypt';
import { AesGcm256, Hmac256Ctr } from '../../src/dem';
import { encrypt, KemType } from '../../src/encrypt';
import { BonehFranklinBLS12381Services } from '../../src/ibe';
import { hashToG1, kdf } from '../../src/kdf';
import { KeyCacheKey } from '../../src/types';
import { createFullId } from '../../src/utils';

describe('Seal encryption tests', () => {
	function generateKeyPair(): [Scalar, G2Element] {
		const sk = Scalar.random();
		const pk = G2Element.generator().multiply(sk);
		return [sk, pk];
	}

	function extractUserSecretKey(sk: Scalar, id: Uint8Array): G1Element {
		return hashToG1(id).multiply(sk);
	}

	it('sanity checks for encryption format', async () => {
		const [, pk1] = generateKeyPair();
		const [, pk2] = generateKeyPair();
		const [, pk3] = generateKeyPair();

		const msg = new TextEncoder().encode('My super secret message');
		const aad = new Uint8Array([1, 2, 3, 4]);

		const { encryptedObject } = await encrypt({
			keyServers: [
				{
					objectId: '0x0000000000000000000000000000000000000000000000000000000000000001',
					pk: pk1.toBytes(),
					name: 'test',
					url: 'https://test.com',
					keyType: 0,
				},
				{
					objectId: '0x0000000000000000000000000000000000000000000000000000000000000002',
					pk: pk2.toBytes(),
					name: 'test2',
					url: 'https://test2.com',
					keyType: 0,
				},
				{
					objectId: '0x0000000000000000000000000000000000000000000000000000000000000003',
					pk: pk3.toBytes(),
					name: 'test3',
					url: 'https://test3.com',
					keyType: 0,
				},
			],
			kemType: KemType.BonehFranklinBLS12381DemCCA,
			threshold: 2,
			packageId: '0x0000000000000000000000000000000000000000000000000000000000000000',
			id: toHex(new Uint8Array([1, 2, 3, 4])),
			encryptionInput: new AesGcm256(msg, aad),
		});
		const parsed = EncryptedObject.parse(encryptedObject);

		expect(parsed.version).toEqual(0);
		expect(parsed.id).toEqual(toHex(new Uint8Array([1, 2, 3, 4])));
		expect(parsed.packageId).toEqual(
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		);
		expect(parsed.services.length).toEqual(3);
		expect(parsed.threshold).toEqual(2);
	});

	it('test encryption round-trip with AesGcm-mode', async () => {
		const [sk1, pk1] = generateKeyPair();
		const [sk2, pk2] = generateKeyPair();
		const [sk3, pk3] = generateKeyPair();

		const msg = new TextEncoder().encode('My super secret message');
		const aad = new Uint8Array([1, 2, 3, 4]);

		const objectId1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
		const objectId2 = '0x0000000000000000000000000000000000000000000000000000000000000002';
		const objectId3 = '0x0000000000000000000000000000000000000000000000000000000000000003';

		const { encryptedObject } = await encrypt({
			keyServers: [
				{
					objectId: objectId1,
					pk: pk1.toBytes(),
					name: 'test',
					url: 'https://test.com',
					keyType: 0,
				},
				{
					objectId: objectId2,
					pk: pk2.toBytes(),
					name: 'test2',
					url: 'https://test2.com',
					keyType: 0,
				},
				{
					objectId: objectId3,
					pk: pk3.toBytes(),
					name: 'test3',
					url: 'https://test3.com',
					keyType: 0,
				},
			],
			kemType: KemType.BonehFranklinBLS12381DemCCA,
			threshold: 2,
			packageId: '0x0000000000000000000000000000000000000000000000000000000000000000',
			id: '01020304',
			encryptionInput: new AesGcm256(msg, aad),
		});

		const parsed = EncryptedObject.parse(encryptedObject);

		const id = createFullId(parsed.packageId, parsed.id);
		const idBytes = fromHex(id);

		const usk1 = extractUserSecretKey(sk1, idBytes);
		const usk2 = extractUserSecretKey(sk2, idBytes);
		const usk3 = extractUserSecretKey(sk3, idBytes);

		// Sanity checks for verify_user_secret_key
		expect(BonehFranklinBLS12381Services.verifyUserSecretKey(usk1, id, pk1)).toBeTruthy();
		expect(BonehFranklinBLS12381Services.verifyUserSecretKey(usk2, id, pk2)).toBeTruthy();
		expect(BonehFranklinBLS12381Services.verifyUserSecretKey(usk3, id, pk3)).toBeTruthy();
		expect(
			BonehFranklinBLS12381Services.verifyUserSecretKey(usk1, toHex(new Uint8Array([1, 2])), pk1),
		).toBeFalsy();
		expect(
			BonehFranklinBLS12381Services.verifyUserSecretKey(G1Element.generator(), id, pk1),
		).toBeFalsy();
		expect(
			BonehFranklinBLS12381Services.verifyUserSecretKey(usk1, id, G2Element.generator()),
		).toBeFalsy();

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([
					[`${id}:${objectId1}`, usk1],
					[`${id}:${objectId2}`, usk2],
					[`${id}:${objectId3}`, usk3],
				]),
			}),
		).resolves.toEqual(msg);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([
					[`${id}:${objectId2}`, usk2],
					[`${id}:${objectId3}`, usk3],
				]),
			}),
		).resolves.toEqual(msg);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([[`${id}:${objectId1}`, usk1]]),
			}),
		).rejects.toThrow();
	});

	it('test encryption round-trip with Hmac256Ctr-mode', async () => {
		const [sk1, pk1] = generateKeyPair();
		const [sk2, pk2] = generateKeyPair();
		const [sk3, pk3] = generateKeyPair();

		const msg = new TextEncoder().encode('My super secret message');
		const aad = new Uint8Array([1, 2, 3, 4]);

		const objectId1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
		const objectId2 = '0x0000000000000000000000000000000000000000000000000000000000000002';
		const objectId3 = '0x0000000000000000000000000000000000000000000000000000000000000003';

		const { encryptedObject } = await encrypt({
			keyServers: [
				{
					objectId: objectId1,
					pk: pk1.toBytes(),
					name: 'test',
					url: 'https://test.com',
					keyType: 0,
				},
				{
					objectId: objectId2,
					pk: pk2.toBytes(),
					name: 'test2',
					url: 'https://test2.com',
					keyType: 0,
				},
				{
					objectId: objectId3,
					pk: pk3.toBytes(),
					name: 'test3',
					url: 'https://test3.com',
					keyType: 0,
				},
			],
			kemType: KemType.BonehFranklinBLS12381DemCCA,
			threshold: 2,
			packageId: '0x0000000000000000000000000000000000000000000000000000000000000000',
			id: '01020304',
			encryptionInput: new Hmac256Ctr(msg, aad),
		});

		const parsed = EncryptedObject.parse(encryptedObject);

		const id = createFullId(parsed.packageId, parsed.id);
		const idBytes = fromHex(id);

		const usk1 = extractUserSecretKey(sk1, idBytes);
		const usk2 = extractUserSecretKey(sk2, idBytes);
		const usk3 = extractUserSecretKey(sk3, idBytes);

		// Sanity checks for verify_user_secret_key
		expect(BonehFranklinBLS12381Services.verifyUserSecretKey(usk1, id, pk1)).toBeTruthy();
		expect(BonehFranklinBLS12381Services.verifyUserSecretKey(usk2, id, pk2)).toBeTruthy();
		expect(BonehFranklinBLS12381Services.verifyUserSecretKey(usk3, id, pk3)).toBeTruthy();
		expect(
			BonehFranklinBLS12381Services.verifyUserSecretKey(usk1, toHex(new Uint8Array([1, 2])), pk1),
		).toBeFalsy();
		expect(
			BonehFranklinBLS12381Services.verifyUserSecretKey(G1Element.generator(), id, pk1),
		).toBeFalsy();
		expect(
			BonehFranklinBLS12381Services.verifyUserSecretKey(usk1, id, G2Element.generator()),
		).toBeFalsy();

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([
					[`${id}:${objectId1}`, usk1],
					[`${id}:${objectId2}`, usk2],
					[`${id}:${objectId3}`, usk3],
				]),
				publicKeys: [pk1, pk2, pk3],
			}),
		).resolves.toEqual(msg);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([
					[`${id}:${objectId2}`, usk2],
					[`${id}:${objectId3}`, usk3],
				]),
				publicKeys: [pk1, pk2, pk3],
			}),
		).resolves.toEqual(msg);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([[`${id}:${objectId1}`, usk1]]),
			}),
		).rejects.toThrow();
	});

	it('G1 hash-to-curve regression test', async () => {
		const packageId = toHex(new Uint8Array(32));
		const innerId = toHex(new Uint8Array([1, 2, 3, 4]));
		const hash = hashToG1(fromHex(createFullId(packageId, innerId)));
		const expected =
			'a2f2624fda29c88ccacd286b560572d8c1261a5687e0c0cdbdcbef93bf0ec5c373563fac64a2cb5bb326cc6181ee65d7';
		expect(toHex(hash.toBytes())).toEqual(expected);
	});

	it('kdf regression test', () => {
		const x = G1Element.generator().pairing(
			G2Element.generator().multiply(Scalar.fromNumber(12345)),
		);
		const nonce = G2Element.generator().multiply(Scalar.fromNumber(12345));
		const key = kdf(
			x,
			nonce,
			new Uint8Array([0]),
			'0x0000000000000000000000000000000000000000000000000000000000000000',
			42,
		);
		expect(key).toEqual(
			fromHex('89befdfd6aecdce1305ddbca891d1c29f0507cfd5225cd6b11e52e60f088ea87'),
		);
	});

	it('Rust test vector decryption', async () => {
		// Test created with seal-cli using the command:
		// cargo run --bin seal-cli encrypt-hmac --message 48656C6C6F2C20776F726C6421 --aad 0x0000000000000000000000000000000000000000000000000000000000000001 --package-id 0x0 --id 0x381dd9078c322a4663c392761a0211b527c127b29583851217f948d62131f409 --threshold 2 877da4fe90156295283ff79e8473305b15744b8c7a49448444fa8b11db41eb0d3342eca266a0dcb5ea2be821c77862761834150b3f9b92094c205015f715bcddee2b66e313d72c77261a66aa4f7e3206ee1b898e44a0464ef202cc101d22cd01 8a87e93fa775d39af2b2c55467e092b6723ecc60e327bd88810e0ad15785489bd52e887a8ad352032a4cf7bc950e9c7a102d1167365ac90af850f5d306ee5f5296116d957808ade429917accf65270a33801bcf6a7d9cff17f303e82290beebf 9091d93753906661a9fcd7c705f96bdde5a9f93205f6144afaa9f950185c314a33c647a85308754b62b70a6cab45a3a60280b900f78998f710d84544371450d909b861d3ac2a508f9eb716c5198f8911d18018b083d21a5131863b5b3226a0fa -- 0x034401905bebdf8c04f3cd5f04f442a39372c8dc321c29edfb4f9cb30b23ab96 0xd726ecf6f7036ee3557cd6c7b93a49b231070e8eecada9cfa157e40e3f02e5d3 0xdba72804cc9504a82bbaa13ed4a83a0e2c6219d7e45125cf57fd10cbab957a97
		const encryptedObject = fromHex(
			'00000000000000000000000000000000000000000000000000000000000000000020381dd9078c322a4663c392761a0211b527c127b29583851217f948d62131f40903034401905bebdf8c04f3cd5f04f442a39372c8dc321c29edfb4f9cb30b23ab9601d726ecf6f7036ee3557cd6c7b93a49b231070e8eecada9cfa157e40e3f02e5d302dba72804cc9504a82bbaa13ed4a83a0e2c6219d7e45125cf57fd10cbab957a97030200b07b9e0e0bc81812957adee90c1eab51e738641f82983f17fee55ac15b75d86bf92e59ebf1cc1548a3db27d18ee315391086bb95f3333d16276d181bdf10c71d15c41d923d71d5c05383dda26b43004af78d7e08a6b086ebc3ea2e5d8752871b0305874fce4f5e944c97b13f60c2dcf1ff34410d2fcb07dc15405140a38d520606dbd23990a1c26f9ce2ce5776506cc18768485525511e59fc1c3ad346c95bb9cc288e7584add871e16e3aaf067f77bddf7df52ddf81ce0ecb130822328ac063c3dd39b21a4847f3aad9a816fadd2541ead355d4120f876e29bff825e5c53bedf6010d05d48cbd0c25cc230193f9389a012000000000000000000000000000000000000000000000000000000000000000018ba15d967ab74e1975c3149806cb483b5ce730be8039c46d18c2eb7c551f9fc4',
		);
		const parsed = EncryptedObject.parse(encryptedObject);
		const id = createFullId(parsed.packageId, parsed.id);

		// Created with cargo run --bin seal-cli extract --package-id 0x0 --id 0x381dd9078c322a4663c392761a0211b527c127b29583851217f948d62131f409 --master-key 1aa66668afc1893b66eb5ad690b14b32b41797dd92f7220b11f7441b11d22bfb
		const usk0 = G1Element.fromBytes(
			fromHex(
				'9376bdfac1abac0d81685c6ac9c944636709b76b500edaf20332b02b14de1b483996c68de07e77efad144ce01c6388e4',
			),
		);

		// Created with cargo run --bin seal-cli extract --package-id 0x0 --id 0x381dd9078c322a4663c392761a0211b527c127b29583851217f948d62131f409 --master-key 0740419bedd2fdfb036f468a99d95d2f37ad66eb3111b815ca19ec001c35388a
		const usk1 = G1Element.fromBytes(
			fromHex(
				'a19f8891f888b65c4809bfa3181f8b26457c15bb41dbe61109b4ff5e06064e8afc95f70980f1ec1ef9b674b51f0d678d',
			),
		);

		const objectId0 = '0x034401905bebdf8c04f3cd5f04f442a39372c8dc321c29edfb4f9cb30b23ab96';
		const objectId1 = '0xd726ecf6f7036ee3557cd6c7b93a49b231070e8eecada9cfa157e40e3f02e5d3';

		const msg = new TextEncoder().encode('Hello, world!');
		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([
					[`${id}:${objectId0}`, usk0],
					[`${id}:${objectId1}`, usk1],
				]),
			}),
		).resolves.toEqual(msg);
	});

	it('test single key server', async () => {
		const [sk1, pk1] = generateKeyPair();

		const msg = new TextEncoder().encode('My super secret message');
		const aad = new Uint8Array([1, 2, 3, 4]);

		const objectId1 = '0x0000000000000000000000000000000000000000000000000000000000000001';

		const { encryptedObject } = await encrypt({
			keyServers: [
				{
					objectId: objectId1,
					pk: pk1.toBytes(),
					name: 'test',
					url: 'https://test.com',
					keyType: 0,
				},
			],
			kemType: KemType.BonehFranklinBLS12381DemCCA,
			threshold: 1,
			packageId: '0x0000000000000000000000000000000000000000000000000000000000000000',
			id: '01020304',
			encryptionInput: new AesGcm256(msg, aad),
		});

		const parsed = EncryptedObject.parse(encryptedObject);
		const id = createFullId(parsed.packageId, parsed.id);
		const idBytes = fromHex(id);
		const usk1 = extractUserSecretKey(sk1, idBytes);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([[`${id}:${objectId1}`, usk1]]),
			}),
		).resolves.toEqual(msg);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>(),
			}),
		).rejects.toThrow();
	});

	it('test threshold = 1', async () => {
		const [sk1, pk1] = generateKeyPair();
		const [sk2, pk2] = generateKeyPair();
		const [, pk3] = generateKeyPair();

		const msg = new TextEncoder().encode('My super secret message');
		const aad = new Uint8Array([1, 2, 3, 4]);

		const objectId1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
		const objectId2 = '0x0000000000000000000000000000000000000000000000000000000000000002';
		const objectId3 = '0x0000000000000000000000000000000000000000000000000000000000000003';

		const { encryptedObject } = await encrypt({
			keyServers: [
				{
					objectId: objectId1,
					pk: pk1.toBytes(),
					name: 'test',
					url: 'https://test.com',
					keyType: 0,
				},
				{
					objectId: objectId2,
					pk: pk2.toBytes(),
					name: 'test2',
					url: 'https://test2.com',
					keyType: 0,
				},
				{
					objectId: objectId3,
					pk: pk3.toBytes(),
					name: 'test3',
					url: 'https://test3.com',
					keyType: 0,
				},
			],
			kemType: KemType.BonehFranklinBLS12381DemCCA,
			threshold: 1,
			packageId: '0x0000000000000000000000000000000000000000000000000000000000000000',
			id: '01020304',
			encryptionInput: new AesGcm256(msg, aad),
		});

		const parsed = EncryptedObject.parse(encryptedObject);

		const id = createFullId(parsed.packageId, parsed.id);
		const idBytes = fromHex(id);

		const usk1 = extractUserSecretKey(sk1, idBytes);
		const usk2 = extractUserSecretKey(sk2, idBytes);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([[`${id}:${objectId1}`, usk1]]),
			}),
		).resolves.toEqual(msg);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([[`${id}:${objectId2}`, usk2]]),
			}),
		).resolves.toEqual(msg);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>(),
			}),
		).rejects.toThrow();
	});

	it('check share consistency', async () => {
		// Test vector with inconsistent shares: Using the two last shares should succeed, but it fails if all shares are provided or if the consistency is checked.
		// Generated using this unit test:https://github.com/MystenLabs/seal/blob/828e0e90ea0282c59836c4d9cb7ec9e9f47d5d3a/crates/crypto/src/lib.rs#L668-L725
		const encryptedObject = EncryptedObject.parse(
			fromHex(
				'0063583d1c8cdcba3f77ecb865abf9ba6f15c0b0ea9b3c64a68d2eb7148e93f5b7040102030403a666b51aa8e0bfc007dbeffb209235fba72a0d842fee1d34d3ae92b77f7abac401d5a88eed8e4284a0249a1fb5e2ddf74cb2abe7626cf6bec85cf2610166a7d2e902b75f15765eef4e1979749b31ec2c687a63fcf72125babc61a0de2181be2a236a030200b33413ae30e25016257f17dc95cea8cfd6b07fcc90625bb0d0056c4743599e53d68f20a3f616e7246d66f3529a4aa12e0133559cdcb961506c24874aebfd2dc2361464f4ce29fd4353d0f612a19364c40c2ef532cebace91339d1dd7eb685c4f035c38df0a2ce80ae34505da3b56e765a2be97f0a21a91bbfa4362dee6baeb2ed5ae8e3655be0bc0993ff9feb479127232bf4de6e7153d10057297b9241d388d734bfec5dad0d9cb56508aa6d76c1acf3bc198d128d7ed3cc28bfb8ecb9e0b911a28063b9bc6b2f379e96957c17cda4ce3c6ed10bb24bdd5b1e7ad36392bedcb12010df33e1c157c227d498ada367fbf0109736f6d657468696e67276ac2d6c05a7c36152deb200070788d203f4e7413dbb8f14f437e021838d93a',
			),
		);
		const msg = new TextEncoder().encode('Hello, World!');
		const id = createFullId(encryptedObject.packageId, encryptedObject.id);

		// Derived keys
		const usks = [
			'8f7dbef2f6d0b80d3ab36f732b35d8afce136cd302ca1ab165ceee8672c19a9e50a2144f9ebceb2cf17ed10261291d13',
			'adf809b14b17975cfa5b9359ef9fd697a9d04222ab3b6f7dbe40e5977ee451a6f2cf85849bda0b1cae1d879f5cd2bcfa',
			'81a88dee8731f8ff8fa88f7ca205fe60c2846446c32495f40fe6795f1c29997ac8755a58722b857e60581b6adb22a327',
		];

		// Giving all shares, decryption fails
		const allKeys = new Map<KeyCacheKey, G1Element>([
			[`${id}:${encryptedObject.services[0][0]}`, G1Element.fromBytes(fromHex(usks[0]))],
			[`${id}:${encryptedObject.services[1][0]}`, G1Element.fromBytes(fromHex(usks[1]))],
			[`${id}:${encryptedObject.services[2][0]}`, G1Element.fromBytes(fromHex(usks[2]))],
		]);
		await expect(
			decrypt({
				encryptedObject,
				keys: allKeys,
			}),
		).rejects.toThrow();

		// But giving only the two last shares, decryption succeeds
		const keys = new Map<KeyCacheKey, G1Element>([
			[`${id}:${encryptedObject.services[1][0]}`, G1Element.fromBytes(fromHex(usks[1]))],
			[`${id}:${encryptedObject.services[2][0]}`, G1Element.fromBytes(fromHex(usks[2]))],
		]);
		await expect(
			decrypt({
				encryptedObject,
				keys,
			}),
		).resolves.toEqual(msg);

		// ...but if we give the public keys, the share consistency is checked and the decryption fails
		const publicKeys = [
			'8528086b8cebb4ebd1fabb75393a4d77b91d4b3d77295c4d3997871cd40ffd3129ee51f0baf4976a3476897bad6b527b12f4ba6942c192d154bfd966e35329d0c6d1eec2b78adb29a5ef00501a89d41751b24121a284b8dfe8ffa96d86f366d2',
			'8a93ff79be2c8a127b70506c9124d15db2361c52305f68f6c566b1c15ed23b36f27b627b928109376f9ec593fb14a83d0a3d21dcb6dc52f27ed88e83d2e2f47fa8720aa7b06945cfd36f7e34a49e060598e09637173deb0bc6c5b0c306c7a64e',
			'a4940de9e0125302ce243a2fe0bae7ef8a5197a55e4038eb5a78256ed020512f527da02ab712f12f947bed1fef03334e129695636762efb81de28e7a0202a8995a7548bc977fdf135f3e6b176e5f3eaad79885891470564f78dd011ad4c8f1b4',
		].map((pk) => G2Element.fromBytes(fromHex(pk)));
		await expect(
			decrypt({
				encryptedObject,
				keys,
				publicKeys,
			}),
		).rejects.toThrow();
	});
});
