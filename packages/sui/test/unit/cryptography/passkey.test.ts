// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { p256 as secp256r1 } from '@noble/curves/nist.js';
import { blake2b } from '@noble/hashes/blake2.js';
import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { messageWithIntent } from '../../../src/cryptography/index.js';
import { PasskeyKeypair } from '../../../src/keypairs/passkey/index.js';
import { findCommonPublicKey } from '../../../src/keypairs/passkey/keypair.js';
import {
	parseSerializedPasskeySignature,
	PasskeyPublicKey,
} from '../../../src/keypairs/passkey/publickey.js';
import { fromBase64 } from '../../../src/utils/index.js';
import { createMockPasskeyKeypair, MockPasskeySigner } from './test-utils.js';

describe('passkey signer E2E testing', () => {
	it('should retrieve the correct sui address', async () => {
		const signer = await createMockPasskeyKeypair();
		const publicKey = signer.getPublicKey();
		expect(publicKey.toSuiAddress()).toEqual(
			'0x05d52348e3e3a785e1e458ebe74d71e21dd4db2ba3088484cab22eca5a07da02',
		);
	});

	it('should sign a personal message and verify against pubkey', async () => {
		const sk = secp256r1.utils.randomSecretKey();
		const pk = secp256r1.getPublicKey(sk);
		const authenticatorData = new Uint8Array([
			88, 14, 103, 167, 58, 122, 146, 250, 216, 102, 207, 153, 185, 74, 182, 103, 89, 162, 151, 100,
			181, 113, 130, 31, 171, 174, 46, 139, 29, 123, 54, 228, 29, 0, 0, 0, 0,
		]);
		const signer = await createMockPasskeyKeypair({
			sk: sk,
			pk: pk,
			authenticatorData: authenticatorData,
		});
		const testMessage = new TextEncoder().encode('Hello world!');
		const { signature } = await signer.signPersonalMessage(testMessage);

		// Verify signature against pubkey.
		const publicKey = signer.getPublicKey();
		const isValid = await publicKey.verifyPersonalMessage(testMessage, signature);
		expect(isValid).toBe(true);

		// Parsed signature as expected.
		const parsed = parseSerializedPasskeySignature(signature);
		expect(parsed.signatureScheme).toEqual('Passkey');
		expect(parsed.publicKey).toEqual(pk);
		expect(new Uint8Array(parsed.authenticatorData!)).toEqual(authenticatorData);

		const messageBytes = bcs.byteVector().serialize(testMessage).toBytes();
		const intentMessage = messageWithIntent('PersonalMessage', messageBytes);
		const digest = blake2b(intentMessage, { dkLen: 32 });
		const clientDataJSON = {
			type: 'webauthn.get',
			challenge: Buffer.from(digest).toString('base64'),
			origin: 'https://www.sui.io',
			crossOrigin: false,
		};
		expect(parsed.clientDataJson).toEqual(JSON.stringify(clientDataJSON));
	});

	it('should sign a transaction and verify against pubkey', async () => {
		const sk = secp256r1.utils.randomSecretKey();
		const pk = secp256r1.getPublicKey(sk);
		const authenticatorData = new Uint8Array([
			88, 14, 103, 167, 58, 122, 146, 250, 216, 102, 207, 153, 185, 74, 182, 103, 89, 162, 151, 100,
			181, 113, 130, 31, 171, 174, 46, 139, 29, 123, 54, 228, 29, 0, 0, 0, 0,
		]);
		const signer = await createMockPasskeyKeypair({
			sk: sk,
			pk: pk,
			authenticatorData: authenticatorData,
		});

		const messageBytes = fromBase64(
			'AAABACACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgEBAQABAABnEUWt6SNz7OPa4hXLyCw9tI5Y7rNxhh5DFljH1jLT6QEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAIMqiyOLCIblSqii0TkS8PjMoj3tmA7S24hBMyonz2Op/ZxFFrekjc+zj2uIVy8gsPbSOWO6zcYYeQxZYx9Yy0+noAwAAAAAAAICWmAAAAAAAAA==',
		);
		const intentMessage = messageWithIntent('TransactionData', messageBytes);
		const digest = blake2b(intentMessage, { dkLen: 32 });
		const clientDataJSON = {
			type: 'webauthn.get',
			challenge: Buffer.from(digest).toString('base64'),
			origin: 'https://www.sui.io',
			crossOrigin: false,
		};
		const clientDataJSONString = JSON.stringify(clientDataJSON);

		// Sign the test message.
		const { signature } = await signer.signTransaction(messageBytes);

		// Verify signature against pubkey.
		const publicKey = signer.getPublicKey();
		let isValid = await publicKey.verifyTransaction(messageBytes, signature);
		expect(isValid).toBe(true);

		// Parsed signature as expected.
		const parsed = parseSerializedPasskeySignature(signature);
		expect(parsed.signatureScheme).toEqual('Passkey');
		expect(parsed.publicKey).toEqual(pk);
		expect(new Uint8Array(parsed.authenticatorData!)).toEqual(authenticatorData);
		expect(parsed.clientDataJson).toEqual(clientDataJSONString);

		// Case 1: passkey returns a signature on wrong digest, fails to verify.
		const signerWrongDigest = await createMockPasskeyKeypair({
			sk: sk,
			pk: pk,
			authenticatorData: authenticatorData,
			changeDigest: true,
		});

		const { signature: wrongSignature } = await signerWrongDigest.signTransaction(messageBytes);
		isValid = await publicKey.verifyTransaction(messageBytes, wrongSignature);
		expect(isValid).toBe(false);

		// Case 2: passkey returns wrong type on client data json, fails to verify.
		const signerWrongClientDataJson = await createMockPasskeyKeypair({
			sk: sk,
			pk: pk,
			authenticatorData: authenticatorData,
			changeClientDataJson: true,
		});
		const { signature: wrongSignature2 } =
			await signerWrongClientDataJson.signTransaction(intentMessage);
		isValid = await publicKey.verifyTransaction(messageBytes, wrongSignature2);
		expect(isValid).toBe(false);

		// Case 3: passkey returns mismatched authenticator data, fails to verify.
		const signerWrongAuthenticatorData = await createMockPasskeyKeypair({
			sk: sk,
			pk: pk,
			authenticatorData: authenticatorData,
			changeAuthenticatorData: true,
		});
		const { signature: wrongSignature3 } =
			await signerWrongAuthenticatorData.signTransaction(intentMessage);
		isValid = await publicKey.verifyTransaction(messageBytes, wrongSignature3);
		expect(isValid).toBe(false);

		// Case 4: passkey returns a signature from a mismatch secret key, fails to verify.
		const signerWrongSignature = await createMockPasskeyKeypair({
			sk: sk,
			pk: pk,
			authenticatorData: authenticatorData,
			changeSignature: true,
		});
		const { signature: wrongSignature4 } =
			await signerWrongSignature.signTransaction(intentMessage);
		isValid = await publicKey.verifyTransaction(messageBytes, wrongSignature4);
		expect(isValid).toBe(false);
	});

	it('should verify a transaction from rust implementation', async () => {
		// generated test vector from `test_passkey_authenticator` in crates/sui-types/src/unit_tests/passkey_authenticator_test.rs
		const sig = fromBase64(
			'BiVYDmenOnqS+thmz5m5SrZnWaKXZLVxgh+rri6LHXs25B0AAAAAgwF7InR5cGUiOiJ3ZWJhdXRobi5nZXQiLCJjaGFsbGVuZ2UiOiJ4NkszMGNvSGlGMF9iczVVVjNzOEVfcGNPNkhMZ0xBb1A3ZE1uU0U5eERNIiwib3JpZ2luIjoiaHR0cHM6Ly93d3cuc3VpLmlvIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfWICAJqKTgco/tSNg4BuVg/f3x+I8NLYN6QqvxHahKNe0PIhBe3EuhfZf8OL4hReW8acT1TVwmPMcnv4SWiAHaX2dAKBYTKkrLK2zLcfP/hD1aiAn/E0L3XLC4epejnzGRhTuA==',
		);
		const txBytes = fromBase64(
			'AAABACACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgEBAQABAAAt3HtjT61oHCWWztGfhSC2ianNwi6LL2eOLPvZTdJWMgEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAIMqiyOLCIblSqii0TkS8PjMoj3tmA7S24hBMyonz2Op/Ldx7Y0+taBwlls7Rn4UgtompzcIuiy9njiz72U3SVjLoAwAAAAAAAICWmAAAAAAAAA==',
		);
		const parsed = parseSerializedPasskeySignature(sig);
		expect(parsed.signatureScheme).toEqual('Passkey');
		const pubkey = new PasskeyPublicKey(parsed.publicKey);
		const isValid = await pubkey.verifyTransaction(txBytes, sig);
		expect(isValid).toBe(true);
	});

	it('should verify a transaction from a real passkey output', async () => {
		// generated test vector from a real iphone passkey output from broswer app: https://github.com/joyqvq/sui-webauthn-poc
		const sig = fromBase64(
			'BiVJlg3liA6MaHQ0Fw9kdmBbj+SuuaKGMseZXPO6gx2XYx0AAAAAhgF7InR5cGUiOiJ3ZWJhdXRobi5nZXQiLCJjaGFsbGVuZ2UiOiJZRG9vQ2RGRnRLLVJBZ3JzaUZqM1hpU1VPQ2pzWXJPWnRGcHVISGhvNDhZIiwib3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo1MTczIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfWIChCx2fLGV+dwNRbTqfCvii70DMj1HiHij5oR9KjZmFMpGQJz3l0ZsNpi0zGQtw81Hj+X+CSshhkcteCzVOJlpKAN2ZM3l9Wxn5TYJFdHc9VphEGzoyTTOfUjpZ7fQV2gt6A==',
		);
		const txBytes = fromBase64(
			'AAAAAFTTJ1JTZKCS6Q6aQS2bkY5gsmP//JTTwIzqsKqnltvLAS6VBPgonu3+e2qJUje77aMw0hTzv7mfKxBglq17ccifBgIAAAAAAAAgb2Je8hW/vUH9otcR+oc1RdjZ2W2oaCNgMu0gTpAVfbNU0ydSU2SgkukOmkEtm5GOYLJj//yU08CM6rCqp5bby+gDAAAAAAAAgIQeAAAAAAAA',
		);
		const parsed = parseSerializedPasskeySignature(sig);
		expect(parsed.signatureScheme).toEqual('Passkey');
		const pubkey = new PasskeyPublicKey(parsed.publicKey);
		const isValid = await pubkey.verifyTransaction(txBytes, sig);
		expect(isValid).toBe(true);
	});

	it('should sign and recover to an unique public key', async () => {
		const sk = secp256r1.utils.randomSecretKey();
		const pk = secp256r1.getPublicKey(sk);
		const authenticatorData = new Uint8Array([]);
		const signer = await createMockPasskeyKeypair({
			sk: sk,
			pk: pk,
			authenticatorData: authenticatorData,
		});
		const address = signer.getPublicKey().toSuiAddress();

		const testMessage = new TextEncoder().encode('Hello world!');
		const mockProvider = new MockPasskeySigner({
			sk: sk,
			pk: pk,
			authenticatorData: authenticatorData,
		});
		const possiblePks = await PasskeyKeypair.signAndRecover(mockProvider, testMessage);

		const testMessage2 = new TextEncoder().encode('Hello world 2!');
		const possiblePks2 = await PasskeyKeypair.signAndRecover(mockProvider, testMessage2);

		const commonPk = findCommonPublicKey(possiblePks, possiblePks2);
		const signer2 = new PasskeyKeypair(commonPk.toRawBytes(), mockProvider);

		// the address from recovered pk is the same as the one constructed from the same mock provider
		expect(signer2.getPublicKey().toSuiAddress()).toEqual(address);
	});
});
