// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { AesGcm256, Hmac256Ctr } from '../../src/dem.js';

const testMessage = new TextEncoder().encode(
	'On the guards’ platform at Elsinore, Horatio waits with Barnardo and Marcellus to question a ghost that has twice before appeared.',
);
const testAad = new Uint8Array([1, 2, 3, 4]);

describe('AES encryption', () => {
	describe('AesGcm256', () => {
		it('should encrypt and decrypt successfully', async () => {
			const aes = new AesGcm256(testMessage, testAad);
			const key = await aes.generateKey();
			expect(key.length).toBe(32);

			const ciphertext = await aes.encrypt(key);
			if (!('Aes256Gcm' in ciphertext)) {
				throw new Error('Invalid ciphertext');
			}
			const aadArray = ciphertext.Aes256Gcm.aad ?? [];
			expect(new Uint8Array(aadArray)).toEqual(testAad);

			// tag is 16 bytes
			expect((ciphertext.Aes256Gcm?.blob as Uint8Array)?.length).toBe(16 + testMessage.length);

			const decrypted = await AesGcm256.decrypt(key, ciphertext);
			expect(decrypted).toEqual(testMessage);
		});

		it('should fail decryption with wrong key', async () => {
			const aes = new AesGcm256(testMessage, testAad);
			const key = await aes.generateKey();
			const wrongKey = await aes.generateKey();
			const ciphertext = await aes.encrypt(key);

			await expect(AesGcm256.decrypt(wrongKey, ciphertext)).rejects.toThrow();
		});

		it('should fail decryption with wrong AAD', async () => {
			const aes = new AesGcm256(testMessage, testAad);
			const key = await aes.generateKey();
			const ciphertext = await aes.encrypt(key);
			if (!('Aes256Gcm' in ciphertext)) {
				throw new Error('Invalid ciphertext');
			}
			ciphertext.Aes256Gcm.aad = new Uint8Array([1]);

			await expect(AesGcm256.decrypt(key, ciphertext)).rejects.toThrow();
		});

		it('should handle empty AAD', async () => {
			const emptyAad = new Uint8Array();
			const aes = new AesGcm256(testMessage, emptyAad);
			const key = await aes.generateKey();

			const ciphertext = await aes.encrypt(key);
			const decrypted = await AesGcm256.decrypt(key, ciphertext);

			expect(decrypted).toEqual(testMessage);
		});

		it('should handle empty message', async () => {
			const emptyMessage = new Uint8Array();
			const aes = new AesGcm256(emptyMessage, testAad);
			const key = await aes.generateKey();

			const ciphertext = await aes.encrypt(key);
			const decrypted = await AesGcm256.decrypt(key, ciphertext);

			expect(decrypted).toEqual(emptyMessage);
		});
	});
});

describe('Hmac256Ctr', () => {
	it('should encrypt and decrypt successfully', async () => {
		const hmac = new Hmac256Ctr(testMessage, testAad);
		const key = await hmac.generateKey();
		expect(key.length).toBe(32);

		const ciphertext = await hmac.encrypt(key);
		const decrypted = await Hmac256Ctr.decrypt(key, ciphertext);

		expect(decrypted).toEqual(testMessage);
	});

	it('test vector', async () => {
		const plaintext = new TextEncoder().encode(
			'The difference between a Miracle and a Fact is exactly the difference between a mermaid and a seal.',
		);
		const aad = new TextEncoder().encode('Mark Twain');
		const key = fromHex('5bfdfd7c814903f1311bebacfffa3c001cbeb1cbb3275baa9aafe21fadd9f396');
		const blob = fromHex(
			'feadb8c8f781036f86b6a9f436cac6f9f68ba8fc8b8444f0331a5820f78580f32034f698f7ce15f25defae1749f0131c0a8b8c5e751b96aacf507d0dbd4d7790440d196a339fcb8498ca7dd236014e353729b7aa2cf524284a8d2305d2378494eadd6f',
		);
		const mac = fromHex('85d498365972c3dc7a53f94232f9cb10dcc94eff064d6835d41d7a7536b47b51');

		const c = {
			Hmac256Ctr: {
				blob,
				mac,
				aad,
			},
		};

		expect(await Hmac256Ctr.decrypt(key, c)).toEqual(plaintext);
		await expect(new Hmac256Ctr(plaintext, aad).encrypt(key)).resolves.toEqual(c);
	});
});
