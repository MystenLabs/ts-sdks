// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64, toHex } from '@mysten/bcs';

import { elgamalDecrypt, toPublicKey, toVerificationKey } from './elgamal.js';
import { SealAPIError } from './error.js';
import type { Certificate } from './session-key.js';
import { PACKAGE_VERSION } from './version.js';
import { verifyKeyServerVersion } from './key-server.js';

/**
 * Helper function to request all keys from URL with requestSig, txBytes, ephemeral pubkey.
 * Then decrypt the Seal key with ephemeral secret key. Returns a list decryption keys with
 * their full IDs.
 *
 * @param url - The URL of the key server.
 * @param requestSig - The Base64 string of request signature.
 * @param txBytes - The transaction bytes.
 * @param encKey - The ephemeral secret key.
 * @param certificate - The certificate.
 * @returns - A list of full ID and the decrypted key.
 */
export async function fetchKeysForAllIds(
	url: string,
	requestSig: string,
	txBytes: Uint8Array,
	encKey: Uint8Array,
	certificate: Certificate,
	timeout: number,
	signal?: AbortSignal,
): Promise<{ fullId: string; key: Uint8Array }[]> {
	const encKeyPk = toPublicKey(encKey);
	const encVerificationKey = toVerificationKey(encKey);
	const body = {
		ptb: toBase64(txBytes.slice(1)), // removes the byte of the transaction type version
		enc_key: toBase64(encKeyPk),
		enc_verification_key: toBase64(encVerificationKey),
		request_signature: requestSig, // already b64
		certificate,
	};

	const timeoutSignal = AbortSignal.timeout(timeout);
	const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

	const requestId = crypto.randomUUID();
	const response = await fetch(url + '/v1/fetch_key', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Request-Id': requestId,
			'Client-Sdk-Type': 'typescript',
			'Client-Sdk-Version': PACKAGE_VERSION,
		},
		body: JSON.stringify(body),
		signal: combinedSignal,
	});
	await SealAPIError.assertResponse(response, requestId);
	const resp = await response.json();
	verifyKeyServerVersion(response);

	return resp.decryption_keys.map((dk: { id: Uint8Array; encrypted_key: [string, string] }) => ({
		fullId: toHex(dk.id),
		key: elgamalDecrypt(encKey, dk.encrypted_key.map(fromBase64) as [Uint8Array, Uint8Array]),
	}));
}
