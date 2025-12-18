// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { p256 as secp256r1 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { PasskeyKeypair } from '../../../src/keypairs/passkey/index.js';
import type { PasskeyProvider } from '../../../src/keypairs/passkey/keypair.js';
import {
	PasskeyPublicKey,
	SECP256R1_SPKI_HEADER,
} from '../../../src/keypairs/passkey/publickey.js';
import type {
	AuthenticationCredential,
	RegistrationCredential,
} from '../../../src/keypairs/passkey/types.js';

export function compressedPubKeyToDerSPKI(compressedPubKey: Uint8Array): Uint8Array {
	// Combine header with the uncompressed public key coordinates.
	const uncompressedPubKey = secp256r1.Point.fromBytes(compressedPubKey).toBytes(false);
	return new Uint8Array([...SECP256R1_SPKI_HEADER, ...uncompressedPubKey]);
}

export class MockPasskeySigner implements PasskeyProvider {
	private sk: Uint8Array;
	private authenticatorData: Uint8Array;
	private pk: Uint8Array | null;
	private changeDigest: boolean;
	private changeClientDataJson: boolean;
	private changeAuthenticatorData: boolean;
	private changeSignature: boolean;

	constructor(options?: {
		sk?: Uint8Array;
		pk?: Uint8Array;
		authenticatorData?: Uint8Array;
		changeDigest?: boolean;
		changeClientDataJson?: boolean;
		changeAuthenticatorData?: boolean;
		changeSignature?: boolean;
	}) {
		this.sk = options?.sk ?? secp256r1.utils.randomSecretKey();
		this.pk = options?.pk ?? null;
		this.authenticatorData =
			options?.authenticatorData ??
			new Uint8Array([
				88, 14, 103, 167, 58, 122, 146, 250, 216, 102, 207, 153, 185, 74, 182, 103, 89, 162, 151,
				100, 181, 113, 130, 31, 171, 174, 46, 139, 29, 123, 54, 228, 29, 0, 0, 0, 0,
			]);
		this.changeDigest = options?.changeDigest ?? false;
		this.changeClientDataJson = options?.changeClientDataJson ?? false;
		this.changeAuthenticatorData = options?.changeAuthenticatorData ?? false;
		this.changeSignature = options?.changeSignature ?? false;
	}

	async create(): Promise<RegistrationCredential> {
		const pk = this.pk;
		const credentialResponse: AuthenticatorAttestationResponse = {
			attestationObject: new Uint8Array().slice().buffer,
			clientDataJSON: new TextEncoder()
				.encode(
					JSON.stringify({
						type: 'webauthn.create',
						challenge: '',
						origin: 'https://www.sui.io',
						crossOrigin: false,
					}),
				)
				.slice().buffer,
			getPublicKey: () =>
				pk
					? compressedPubKeyToDerSPKI(pk).slice().buffer
					: new Uint8Array([
							48, 89, 48, 19, 6, 7, 42, 134, 72, 206, 61, 2, 1, 6, 8, 42, 134, 72, 206, 61, 3, 1, 7,
							3, 66, 0, 4, 232, 238, 71, 180, 129, 19, 164, 11, 106, 184, 25, 185, 136, 226, 178,
							64, 72, 105, 218, 94, 85, 28, 244, 5, 19, 172, 167, 65, 137, 42, 193, 31, 97, 55, 49,
							168, 234, 185, 163, 251, 162, 235, 213, 185, 116, 178, 194, 7, 128, 238, 255, 59, 121,
							255, 175, 188, 137, 89, 147, 168, 103, 128, 97, 52,
						]).slice().buffer,
			getPublicKeyAlgorithm: () => -7,
			getTransports: () => ['usb', 'ble', 'nfc'],
			getAuthenticatorData: () => this.authenticatorData.slice().buffer,
		};

		const credential = {
			id: 'mock-credential-id',
			rawId: new Uint8Array([1, 2, 3]).buffer,
			response: credentialResponse,
			type: 'public-key',
			authenticatorAttachment: 'cross-platform',
			getClientExtensionResults: () => ({}),
		};

		return credential as RegistrationCredential;
	}

	async get(challenge: Uint8Array): Promise<AuthenticationCredential> {
		// Manually mangle the digest bytes if changeDigest.
		if (this.changeDigest) {
			challenge = sha256(challenge);
		}

		const clientDataJSON = this.changeClientDataJson
			? JSON.stringify({
					type: 'webauthn.create', // Wrong type for clientDataJson.
					challenge: btoa(String.fromCharCode(...challenge)),
					origin: 'https://www.sui.io',
					crossOrigin: false,
				})
			: JSON.stringify({
					type: 'webauthn.get',
					challenge: btoa(String.fromCharCode(...challenge)),
					origin: 'https://www.sui.io',
					crossOrigin: false,
				});

		// Sign authenticatorData || sha256(clientDataJSON).
		const dataToSign = new Uint8Array([
			...this.authenticatorData,
			...sha256(new TextEncoder().encode(clientDataJSON)),
		]);

		// Manually mangle the signature if changeSignature.
		const signature = this.changeSignature
			? secp256r1.sign(dataToSign, secp256r1.utils.randomSecretKey(), { format: 'der' })
			: secp256r1.sign(dataToSign, this.sk, { format: 'der' });

		const authResponse: AuthenticatorAssertionResponse = {
			authenticatorData: this.changeAuthenticatorData
				? new Uint8Array([1]).buffer // Change authenticator data
				: this.authenticatorData.slice().buffer,
			clientDataJSON: new TextEncoder().encode(clientDataJSON).slice().buffer,
			signature: signature.slice().buffer,
			userHandle: null,
		};

		const credential = {
			id: 'mock-credential-id',
			rawId: new Uint8Array([1, 2, 3]).buffer,
			type: 'public-key',
			response: authResponse,
			authenticatorAttachment: 'cross-platform',
			getClientExtensionResults: () => ({}),
		};

		return credential as AuthenticationCredential;
	}
}

/**
 * Helper function to create a passkey keypair with mock provider for testing
 */
export async function createMockPasskeyKeypair(options?: {
	sk?: Uint8Array;
	pk?: Uint8Array;
	authenticatorData?: Uint8Array;
	changeDigest?: boolean;
	changeClientDataJson?: boolean;
	changeAuthenticatorData?: boolean;
	changeSignature?: boolean;
}): Promise<PasskeyKeypair> {
	const mockProvider = new MockPasskeySigner(options);
	return await PasskeyKeypair.getPasskeyInstance(mockProvider);
}

/**
 * Helper function to create a passkey public key for testing
 */
export function createMockPasskeyPublicKey(sk?: Uint8Array): PasskeyPublicKey {
	const privateKey = sk ?? secp256r1.utils.randomSecretKey();
	const publicKey = secp256r1.getPublicKey(privateKey);
	return new PasskeyPublicKey(publicKey);
}
