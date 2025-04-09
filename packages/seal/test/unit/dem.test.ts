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
			expect(ciphertext.Aes256Gcm?.blob.length).toBe(16 + testMessage.length);

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
			'b0c4eee6fbd97a2fb86bbd1e0dafa47d2ce5c9e8975a50c2d9eae02ebede8fee6b6434e68584be475b89089fce4c451cbd4c0d6e00dbcae1241abaf237df2eccdd86b890d35e4e8ae9418386012891d8413483d64179ce1d7fe69ad25d546495df54a1',
		);
		const mac = fromHex('5de3ffdd9d7a258e651ebdba7d80839df2e19ea40cd35b6e1b06375181a0c2f2');

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
