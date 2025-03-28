// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toHex } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { EncryptedObject } from '../../src/bcs';
import { G1Element, G2Element, Scalar } from '../../src/bls12381';
import { decrypt } from '../../src/decrypt';
import { AesGcm256, Hmac256Ctr, Plain } from '../../src/dem';
import { encrypt, KemType } from '../../src/encrypt';
import { BonehFranklinBLS12381Services, DST } from '../../src/ibe';
import { kdf } from '../../src/kdf';
import { KeyCacheKey } from '../../src/types';
import { createFullId } from '../../src/utils';

describe('Seal encryption tests', () => {
	function generateKeyPair(): [Scalar, G2Element] {
		const sk = Scalar.random();
		const pk = G2Element.generator().multiply(sk);
		return [sk, pk];
	}

	function extractUserSecretKey(sk: Scalar, id: Uint8Array): G1Element {
		return G1Element.hashToCurve(id).multiply(sk);
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

		const id = createFullId(DST, parsed.packageId, parsed.id);
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

		const id = createFullId(DST, parsed.packageId, parsed.id);
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

	it('test encryption round-trip with Plain-mode', async () => {
		const [sk1, pk1] = generateKeyPair();
		const [sk2, pk2] = generateKeyPair();
		const [sk3, pk3] = generateKeyPair();

		const objectId1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
		const objectId2 = '0x0000000000000000000000000000000000000000000000000000000000000002';
		const objectId3 = '0x0000000000000000000000000000000000000000000000000000000000000003';

		const { encryptedObject, key } = await encrypt({
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
			encryptionInput: new Plain(),
		});

		const parsed = EncryptedObject.parse(encryptedObject);

		const id = createFullId(DST, parsed.packageId, parsed.id);
		const idBytes = fromHex(id);

		const usk1 = extractUserSecretKey(sk1, idBytes);
		const usk2 = extractUserSecretKey(sk2, idBytes);
		const usk3 = extractUserSecretKey(sk3, idBytes);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([
					[`${id}:${objectId1}`, usk1],
					[`${id}:${objectId2}`, usk2],
					[`${id}:${objectId3}`, usk3],
				]),
			}),
		).resolves.toEqual(key);

		await expect(
			decrypt({
				encryptedObject: parsed,
				keys: new Map<KeyCacheKey, G1Element>([
					[`${id}:${objectId2}`, usk2],
					[`${id}:${objectId3}`, usk3],
				]),
			}),
		).resolves.toEqual(key);

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
		const hash = G1Element.hashToCurve(fromHex(createFullId(DST, packageId, innerId)));
		const expected =
			'b32685b6ffd1f373faf3abb10c05772e033f75da8af729c3611d81aea845670db48ceadd0132d3a667dbbaa36acefac7';
		expect(toHex(hash.toBytes())).toEqual(expected);
	});

	it('kdf regression test', () => {
		const x = G1Element.generator().pairing(
			G2Element.generator().multiply(Scalar.fromNumber(12345)),
		);
		const nonce = G2Element.generator().multiply(Scalar.fromNumber(12345));
		const key = kdf(x, nonce, new Uint8Array([0]), '0x0000000000000000000000000000000000000000000000000000000000000000', 42);
		expect(key).toEqual(
			fromHex('b037a9c0a1f7f6abeaad0f5da4d84c194c51536666ca3a7ea84ece820e180a1d'),
		);
	});

	it('Rust test vector decryption', async () => {
		// Test created with seal-cli using the command:
		// cargo run --bin seal-cli encrypt-hmac --message 48656C6C6F2C20776F726C6421 --aad 0x0000000000000000000000000000000000000000000000000000000000000001 --package-id 0x0 --id 0x381dd9078c322a4663c392761a0211b527c127b29583851217f948d62131f409 --threshold 2 aeb258b9fb9a2f29f74eb0a1a895860bb1c6ba3f9ea7075366de159e4764413e9ec0597ac9c0dad409723935440a45f40eee4728630ae3ea40a68a819375bba1d78d7810f901d8a469d785d00cfed6bd28f01d41e49c5652d924e9d19fddcf62 b1076a26f4f82f39d0e767fcd2118659362afe40bce4e8d553258c86756bb74f888bca79f2d6b71edf6e25af89efa83713a223b48a19d2e551897ac92ac7458336cd489be3be025e348ca93f4c94d22594f96f0e08990e51a7de9da8ff29c98f 95fcb465af3791f31d53d80db6c8dcf9f83a419b2570614ecfbb068f47613da17cb9ffc66bb052b9546f17196929538f0bd2d38e1f515d9916e2db13dc43e0ccbd4cb3d7cbb13ffecc0b68b37481ebaaaa17cad18096a9c2c27a797f17d78623 -- 0x34401905bebdf8c04f3cd5f04f442a39372c8dc321c29edfb4f9cb30b23ab96 0xd726ecf6f7036ee3557cd6c7b93a49b231070e8eecada9cfa157e40e3f02e5d3 0xdba72804cc9504a82bbaa13ed4a83a0e2c6219d7e45125cf57fd10cbab957a97
		const encryptedObject = fromHex(
			'00000000000000000000000000000000000000000000000000000000000000000020381dd9078c322a4663c392761a0211b527c127b29583851217f948d62131f40903034401905bebdf8c04f3cd5f04f442a39372c8dc321c29edfb4f9cb30b23ab9601d726ecf6f7036ee3557cd6c7b93a49b231070e8eecada9cfa157e40e3f02e5d302dba72804cc9504a82bbaa13ed4a83a0e2c6219d7e45125cf57fd10cbab957a970302008c7e9c702be331084ba1c40d54bd07569612087991b8e9717542077712c37805de9576eb7a25dce369630c0f65f7ccfc02087e48776dc0b81d78b30a2dac08c0541fa34e027b3907e626d60e4b8549e0d7e415839cca34929b198a22b9fad14b0377f32f4c3c551e93c46986703c671b370aa54a24c77111c9663afc7b97b68df93afb9add95cf87d0fb96e09c2d1b3c3f2012b055f349982e41d0fac3c5765f8f4c3fb320455e880dff07bfdfb888d6a9eda0b8688798888896d65897069ab45869f27f39a71e0ffdda584c4ec2d3f13a21a359ed3bc596d28a0320fd97959645010d7727ea2390be3b1f37874ad8c50120000000000000000000000000000000000000000000000000000000000000000191e8e72a6120830fc5f937c2c89ae3f08eea2c49a56dafb250c489aa1c515a5f',
		);
		const parsed = EncryptedObject.parse(encryptedObject);
		const id = createFullId(DST, parsed.packageId, parsed.id);

		let usk0 = G1Element.fromBytes(
			fromHex(
				'8244fcbe49870a4d4aa947b7034a873e168580e18b5834ea34940dc9f492eda03a9b20c3c3c120b1a462f1642575e0cc',
			),
		);
		let usk1 = G1Element.fromBytes(
			fromHex(
				'a0f04b759ed2ff477f0fe5b672992235205d2af502f659d4bbb484b745e35fd7a9ff11e37e12111023a891c3fa98a2d3',
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
		const id = createFullId(DST, parsed.packageId, parsed.id);
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

		const id = createFullId(DST, parsed.packageId, parsed.id);
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
});
