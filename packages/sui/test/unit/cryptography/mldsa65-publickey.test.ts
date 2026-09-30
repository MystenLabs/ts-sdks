// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase64, toHex } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { SIGNATURE_SCHEME_TO_FLAG } from '../../../src/cryptography/index.js';
import {
	MLDSA65_PUBLIC_KEY_SIZE,
	MLDSA65_SIGNATURE_SIZE,
	MLDSA65Keypair,
	MLDSA65PublicKey,
} from '../../../src/keypairs/mldsa65/index.js';
import { publicKeyFromRawBytes, publicKeyFromSuiBytes } from '../../../src/verify/index.js';

// Public key for the seed `[2; 32]`; the address is the Sui keytool golden for that seed.
const VALID_PUBLIC_KEY = MLDSA65Keypair.fromSecretKey(new Uint8Array(32).fill(2))
	.getPublicKey()
	.toRawBytes();
const SUI_ADDRESS = '0x687afa13b5510548e8ab9c57b34544c8ade5507559cfb944db0453fae2a68d4c';

describe('MLDSA65PublicKey', () => {
	it('invalid', () => {
		expect(() => {
			new MLDSA65PublicKey(new Uint8Array(MLDSA65_PUBLIC_KEY_SIZE - 1));
		}).toThrow(`Expected ${MLDSA65_PUBLIC_KEY_SIZE} bytes`);

		expect(() => {
			new MLDSA65PublicKey(toBase64(new Uint8Array(MLDSA65_PUBLIC_KEY_SIZE + 1)));
		}).toThrow();

		expect(() => {
			new MLDSA65PublicKey(toHex(VALID_PUBLIC_KEY));
		}).toThrow();

		expect(() => {
			new MLDSA65PublicKey('12345');
		}).toThrow();
	});

	it('toBase64 and toRawBytes', () => {
		const base64 = toBase64(VALID_PUBLIC_KEY);
		const key = new MLDSA65PublicKey(base64);
		expect(key.toBase64()).toEqual(base64);
		expect(key.toRawBytes().length).toBe(MLDSA65_PUBLIC_KEY_SIZE);
		expect(new MLDSA65PublicKey(key.toRawBytes()).equals(key)).toBe(true);
		expect(new MLDSA65PublicKey(Array.from(VALID_PUBLIC_KEY)).equals(key)).toBe(true);
	});

	it('flag, toSuiBytes and toSuiAddress match Sui', () => {
		const key = new MLDSA65PublicKey(VALID_PUBLIC_KEY);
		expect(key.flag()).toBe(SIGNATURE_SCHEME_TO_FLAG.MLDSA65);
		expect(key.flag()).toBe(0x08);

		const suiBytes = key.toSuiBytes();
		expect(suiBytes.length).toBe(1 + MLDSA65_PUBLIC_KEY_SIZE);
		expect(suiBytes[0]).toBe(0x08);
		expect(key.toSuiPublicKey()).toEqual(toBase64(suiBytes));

		expect(key.toSuiAddress()).toEqual(SUI_ADDRESS);
		expect(key.verifyAddress(SUI_ADDRESS)).toBe(true);
	});

	it('round-trips through the verify helpers', () => {
		const key = new MLDSA65PublicKey(VALID_PUBLIC_KEY);
		expect(publicKeyFromRawBytes('MLDSA65', VALID_PUBLIC_KEY).equals(key)).toBe(true);
		expect(publicKeyFromSuiBytes(key.toSuiPublicKey()).toSuiAddress()).toEqual(SUI_ADDRESS);
		expect(() =>
			publicKeyFromSuiBytes(key.toSuiPublicKey(), { address: '0x' + '00'.repeat(32) }),
		).toThrow('Public key bytes do not match the provided address');
	});

	it('verify rejects a signature of the wrong length', async () => {
		const key = new MLDSA65PublicKey(VALID_PUBLIC_KEY);
		expect(await key.verify(new Uint8Array(32), new Uint8Array(MLDSA65_SIGNATURE_SIZE - 1))).toBe(
			false,
		);
	});

	it('verify rejects a serialized signature for another public key', async () => {
		const message = new TextEncoder().encode('hello');
		const { signature } = await MLDSA65Keypair.fromSecretKey(
			new Uint8Array(32).fill(2),
		).signPersonalMessage(message);
		const other = new MLDSA65PublicKey(new Uint8Array(MLDSA65_PUBLIC_KEY_SIZE).fill(1));
		await expect(other.verify(message, signature)).rejects.toThrow(
			'Signature does not match public key',
		);
	});
});
