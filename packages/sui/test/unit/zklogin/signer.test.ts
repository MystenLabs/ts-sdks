// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs, fromBase64, toBase64 } from '@mysten/bcs';
import { describe, expect, test } from 'vitest';

import type { IntentScope } from '../../../src/cryptography/intent.js';
import type { SignatureWithBytes } from '../../../src/cryptography/keypair.js';
import { Signer } from '../../../src/cryptography/keypair.js';
import { Ed25519Keypair } from '../../../src/keypairs/ed25519/index.js';
import { parseZkLoginSignature, toZkLoginPublicIdentifier } from '../../../src/zklogin/index.js';
import { extractClaimValue } from '../../../src/zklogin/jwt-utils.js';
import { ZkLoginSigner } from '../../../src/zklogin/signer.js';

// A real proof fixture: signing `anEphemeralSignature` with these inputs / maxEpoch produces `aSignature`.
const aSignature =
	'BQNNMTE3MDE4NjY4MTI3MDQ1MTcyMTM5MTQ2MTI3OTg2NzQ3NDg2NTc3NTU1NjY1ODY1OTc0MzQ4MTA5NDEyNDA0ODMzNDY3NjkzNjkyNjdNMTQxMjA0Mzg5OTgwNjM2OTIyOTczODYyNDk3NTQyMzA5NzI3MTUxNTM4NzY1Mzc1MzAxNjg4ODM5ODE1MTM1ODQ1ODYxNzIxOTU4NDEBMQMCTDE4Njc0NTQ1MDE2MDI1ODM4NDg4NTI3ODc3ODI3NjE5OTY1NjAxNzAxMTgyNDkyOTk1MDcwMTQ5OTkyMzA4ODY4NTI1NTY5OTgyNzNNMTQ0NjY0MTk2OTg2NzkxMTYzMTM0NzUyMTA2NTQ1NjI5NDkxMjgzNDk1OTcxMDE3NjkyNTY5NTkwMTAwMDMxODg4ODYwOTEwODAzMTACTTExMDcyOTU0NTYyOTI0NTg4NDk2MTQ4NjMyNDc0MDc4NDMyNDA2NjMzMjg4OTQ4MjU2NzE4ODA5NzE0ODYxOTg2MTE5MzAzNTI5NzYwTTE5NzkwNTE2MDEwNzg0OTM1MTAwMTUwNjE0OTg5MDk3OTA4MjMzODk5NzE4NjQ1NTM2MTMwNzI3NzczNzEzNDA3NjExMTYxMzY4MDQ2AgExATADTTEwNDIzMjg5MDUxODUzMDMzOTE1MzgwODEwNTE2MTMwMjA1NzQ3MTgyODY3NTk2NDU3MTM5OTk5MTc2NzE0NDc2NDE1MTQ4Mzc2MzUwTTIxNzg1NzE5Njk1ODQ4MDEzOTA4MDYxNDkyOTg5NzY1Nzc3Nzg4MTQyMjU1ODk3OTg2MzAwMjQxNTYxMjgwMTk2NzQ1MTc0OTM0NDU3ATExeUpwYzNNaU9pSm9kSFJ3Y3pvdkwyRmpZMjkxYm5SekxtZHZiMmRzWlM1amIyMGlMQwFmZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkltSTVZV00yTURGa01UTXhabVEwWm1aa05UVTJabVl3TXpKaFlXSXhPRGc0T0RCalpHVXpZamtpTENKMGVYQWlPaUpLVjFRaWZRTTEzMzIyODk3OTMwMTYzMjE4NTMyMjY2NDMwNDA5NTEwMzk0MzE2OTg1Mjc0NzY5MTI1NjY3MjkwNjAwMzIxNTY0MjU5NDY2NTExNzExrgAAAAAAAABhAEp+O5GEAF/5tKNDdWBObNf/1uIrbOJmE+xpnlBD2Vikqhbd0zLrQ2NJyquYXp4KrvWUOl7Hso+OK0eiV97ffwucM8VdtG2hjf/RUGNO5JNUH+D/gHtE9sHe6ZEnxwZL7g==';
const aSignatureInputs = {
	addressSeed: '13322897930163218532266430409510394316985274769125667290600321564259466511711',
	headerBase64:
		'eyJhbGciOiJSUzI1NiIsImtpZCI6ImI5YWM2MDFkMTMxZmQ0ZmZkNTU2ZmYwMzJhYWIxODg4ODBjZGUzYjkiLCJ0eXAiOiJKV1QifQ',
	issBase64Details: {
		indexMod4: 1,
		value: 'yJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLC',
	},
	proofPoints: {
		a: [
			'11701866812704517213914612798674748657755566586597434810941240483346769369267',
			'14120438998063692297386249754230972715153876537530168883981513584586172195841',
			'1',
		],
		b: [
			[
				'1867454501602583848852787782761996560170118249299507014999230886852556998273',
				'14466419698679116313475210654562949128349597101769256959010003188886091080310',
			],
			[
				'11072954562924588496148632474078432406633288948256718809714861986119303529760',
				'19790516010784935100150614989097908233899718645536130727773713407611161368046',
			],
			['1', '0'],
		],
		c: [
			'10423289051853033915380810516130205747182867596457139999176714476415148376350',
			'21785719695848013908061492989765777788142255897986300241561280196745174934457',
			'1',
		],
	},
};
const anEphemeralSignature =
	'AEp+O5GEAF/5tKNDdWBObNf/1uIrbOJmE+xpnlBD2Vikqhbd0zLrQ2NJyquYXp4KrvWUOl7Hso+OK0eiV97ffwucM8VdtG2hjf/RUGNO5JNUH+D/gHtE9sHe6ZEnxwZL7g==';
// The legacy zkLogin address for the fixture's addressSeed + google issuer.
const anAddress = '0xf7badc2b245c7f74d7509a4aa357ecf80a29e7713fb4c44b0e7541ec43885ee1';
const maxEpoch = 174;

// An ephemeral signer that returns a fixed, known signature so the wrapped output is deterministic.
class FixedEphemeralSigner extends Signer {
	#inner = new Ed25519Keypair();
	sign(data: Uint8Array) {
		return this.#inner.sign(data);
	}
	override async signWithIntent(
		bytes: Uint8Array,
		_intent: IntentScope,
	): Promise<SignatureWithBytes> {
		return { bytes: toBase64(bytes), signature: anEphemeralSignature };
	}
	getKeyScheme() {
		return this.#inner.getKeyScheme();
	}
	getPublicKey() {
		return this.#inner.getPublicKey();
	}
}

// A real ephemeral signer that records the (bytes, intent) it is asked to sign, so we can assert the
// base-class routing (byteVector wrapping for personal messages, correct intents) actually happens.
class RecordingSigner extends Signer {
	calls: { bytes: Uint8Array; intent: IntentScope }[] = [];
	#inner = new Ed25519Keypair();
	sign(data: Uint8Array) {
		return this.#inner.sign(data);
	}
	override signWithIntent(bytes: Uint8Array, intent: IntentScope): Promise<SignatureWithBytes> {
		this.calls.push({ bytes, intent });
		return this.#inner.signWithIntent(bytes, intent);
	}
	getKeyScheme() {
		return this.#inner.getKeyScheme();
	}
	getPublicKey() {
		return this.#inner.getPublicKey();
	}
}

function makeSigner(legacyAddress = false) {
	return new ZkLoginSigner({
		ephemeralSigner: new FixedEphemeralSigner(),
		maxEpoch,
		inputs: aSignatureInputs,
		legacyAddress,
	});
}

describe('ZkLoginSigner', () => {
	test('signTransaction wraps the ephemeral signature in a zkLogin signature', async () => {
		const tx = new Uint8Array([1, 2, 3]);
		const { bytes, signature } = await makeSigner().signTransaction(tx);
		expect(signature).toBe(aSignature);
		expect(bytes).toBe(toBase64(tx));
	});

	test('signPersonalMessage also produces a zkLogin signature', async () => {
		const message = new Uint8Array([1, 2, 3]);
		const { bytes, signature } = await makeSigner().signPersonalMessage(message);
		// Both intents wrap the same fixed ephemeral signature with the same proof inputs.
		expect(signature).toBe(aSignature);
		// The returned bytes are the original message, not the byteVector-wrapped form.
		expect(bytes).toBe(toBase64(message));
	});

	test('derives the current (non-legacy) address from the proof', () => {
		const iss = extractClaimValue<string>(aSignatureInputs.issBase64Details, 'iss');
		const expected = toZkLoginPublicIdentifier(BigInt(aSignatureInputs.addressSeed), iss, {
			legacyAddress: false,
		}).toSuiAddress();

		const signer = makeSigner(false);
		expect(signer.getPublicKey().toSuiAddress()).toBe(expected);
		expect(signer.toSuiAddress()).toBe(expected);
	});

	test('derives the legacy address from the proof when legacyAddress is true', () => {
		const signer = makeSigner(true);
		expect(signer.getPublicKey().toSuiAddress()).toBe(anAddress);
	});

	test('propagates legacyAddress into derivation (legacy and current differ for a short seed)', () => {
		// A small addressSeed whose big-endian form is < 32 bytes, so the legacy (trimmed) and current
		// (zero-padded) derivations genuinely diverge — unlike the 32-byte fixture seed above, which
		// produces the same address either way.
		const inputs = { ...aSignatureInputs, addressSeed: '12345' };
		const iss = extractClaimValue<string>(inputs.issBase64Details, 'iss');
		const seed = BigInt(inputs.addressSeed);

		const legacy = new ZkLoginSigner({
			ephemeralSigner: new FixedEphemeralSigner(),
			maxEpoch,
			inputs,
			legacyAddress: true,
		});
		const current = new ZkLoginSigner({
			ephemeralSigner: new FixedEphemeralSigner(),
			maxEpoch,
			inputs,
			legacyAddress: false,
		});

		expect(legacy.getPublicKey().toSuiAddress()).not.toBe(current.getPublicKey().toSuiAddress());
		expect(legacy.getPublicKey().toSuiAddress()).toBe(
			toZkLoginPublicIdentifier(seed, iss, { legacyAddress: true }).toSuiAddress(),
		);
		expect(current.getPublicKey().toSuiAddress()).toBe(
			toZkLoginPublicIdentifier(seed, iss, { legacyAddress: false }).toSuiAddress(),
		);
	});

	test('routes intents and bytes to the ephemeral signer (personal message is byteVector-wrapped)', async () => {
		const ephemeral = new RecordingSigner();
		const signer = new ZkLoginSigner({
			ephemeralSigner: ephemeral,
			maxEpoch,
			inputs: aSignatureInputs,
			legacyAddress: false,
		});

		const tx = new Uint8Array([1, 2, 3, 4]);
		await signer.signTransaction(tx);
		expect(ephemeral.calls.at(-1)).toEqual({ bytes: tx, intent: 'TransactionData' });

		const message = new Uint8Array([9, 8, 7]);
		await signer.signPersonalMessage(message);
		expect(ephemeral.calls.at(-1)).toEqual({
			bytes: bcs.byteVector().serialize(message).toBytes(),
			intent: 'PersonalMessage',
		});
	});

	test('wraps the real ephemeral signWithIntent output as the zkLogin userSignature', async () => {
		const ephemeral = new Ed25519Keypair();
		const signer = new ZkLoginSigner({
			ephemeralSigner: ephemeral,
			maxEpoch,
			inputs: aSignatureInputs,
			legacyAddress: false,
		});

		const tx = new Uint8Array([1, 2, 3, 4]);
		const { signature } = await signer.signTransaction(tx);

		const parsed = parseZkLoginSignature(fromBase64(signature).slice(1));
		expect(String(parsed.maxEpoch)).toBe(String(maxEpoch));
		expect(parsed.inputs.addressSeed).toBe(aSignatureInputs.addressSeed);

		// Ed25519 is deterministic, so re-signing the same (bytes, intent) reproduces the embedded sig.
		const direct = await ephemeral.signWithIntent(tx, 'TransactionData');
		expect(toBase64(parsed.userSignature)).toBe(direct.signature);
	});

	test('validates a provided address and throws on mismatch', () => {
		const iss = extractClaimValue<string>(aSignatureInputs.issBase64Details, 'iss');
		const address = toZkLoginPublicIdentifier(BigInt(aSignatureInputs.addressSeed), iss, {
			legacyAddress: false,
		}).toSuiAddress();

		expect(
			() =>
				new ZkLoginSigner({
					ephemeralSigner: new FixedEphemeralSigner(),
					maxEpoch,
					inputs: aSignatureInputs,
					legacyAddress: false,
					address,
				}),
		).not.toThrow();

		expect(
			() =>
				new ZkLoginSigner({
					ephemeralSigner: new FixedEphemeralSigner(),
					maxEpoch,
					inputs: aSignatureInputs,
					legacyAddress: false,
					address: '0x0000000000000000000000000000000000000000000000000000000000000000',
				}),
		).toThrow(/does not match the provided address/);
	});

	test('reports the ZkLogin key scheme', () => {
		expect(makeSigner().getKeyScheme()).toBe('ZkLogin');
	});

	test('sign() throws — a raw signature is not a valid zkLogin signature', () => {
		expect(() => makeSigner().sign(new Uint8Array([1, 2, 3]))).toThrow(/does not support signing/);
	});
});
