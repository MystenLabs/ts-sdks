// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs, fromBase64, fromHex, toBase64, toHex } from '@mysten/bcs';
import { bls12_381 } from '@noble/curves/bls12-381';

import { KeyServerMove, KeyServerMoveV1 } from './bcs.js';
import {
	InvalidKeyServerError,
	InvalidKeyServerVersionError,
	SealAPIError,
	UnsupportedNetworkError,
} from './error.js';
import { DST_POP } from './ibe.js';
import { PACKAGE_VERSION } from './version.js';
import type { SealCompatibleClient } from './types.js';
import type { G1Element } from './bls12381.js';
import { flatten, Version } from './utils.js';
import { elgamalDecrypt } from './elgamal.js';
import type { Certificate } from './session-key.js';

export const EXPECTED_SERVER_VERSION = 1;

export type KeyServer = {
	objectId: string;
	name: string;
	url: string;
	keyType: KeyServerType;
	pk: Uint8Array;
};

export enum KeyServerType {
	BonehFranklinBLS12381 = 0,
}

export const SERVER_VERSION_REQUIREMENT = new Version('0.4.1');
export const MYSTEN_LABS_KEY_SERVER_1 =
	'0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75';
export const MYSTEN_LABS_KEY_SERVER_2 =
	'0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8';

/**
 * Returns a static list of Seal key server object ids, corresponding to Mysten ran Seal servers.
 * @param network - The network to use.
 * @returns The object id's of the key servers.
 */
export function getAllowlistedKeyServers(network: 'testnet' | 'mainnet'): string[] {
	if (network === 'testnet') {
		return [MYSTEN_LABS_KEY_SERVER_1, MYSTEN_LABS_KEY_SERVER_2];
	} else {
		// TODO: add mainnet key servers
		throw new UnsupportedNetworkError(`Unsupported network ${network}`);
	}
}

/**
 * Given a list of key server object IDs, returns a list of SealKeyServer
 * from onchain state containing name, objectId, URL and pk.
 *
 * @param objectIds - The key server object IDs.
 * @param client - The SuiClient to use.
 * @returns - An array of SealKeyServer.
 */
export async function retrieveKeyServers({
	objectIds,
	client,
}: {
	objectIds: string[];
	client: SealCompatibleClient;
}): Promise<KeyServer[]> {
	return await Promise.all(
		objectIds.map(async (objectId) => {
			// First get the KeyServer object and validate it.
			const res = await client.core.getObject({
				objectId,
			});
			const ks = KeyServerMove.parse(await res.object.content);
			if (
				EXPECTED_SERVER_VERSION < Number(ks.firstVersion) ||
				EXPECTED_SERVER_VERSION > Number(ks.lastVersion)
			) {
				throw new InvalidKeyServerVersionError(
					`Key server ${objectId} supports versions between ${ks.firstVersion} and ${ks.lastVersion} (inclusive), but SDK expects version ${EXPECTED_SERVER_VERSION}`,
				);
			}

			// Then fetch the expected versioned object and parse it.
			const resVersionedKs = await client.core.getDynamicField({
				parentId: objectId,
				name: {
					type: 'u64',
					bcs: bcs.u64().serialize(EXPECTED_SERVER_VERSION).toBytes(),
				},
			});

			const ksVersioned = KeyServerMoveV1.parse(resVersionedKs.dynamicField.value.bcs);

			if (ksVersioned.keyType !== KeyServerType.BonehFranklinBLS12381) {
				throw new InvalidKeyServerError(
					`Server ${objectId} has invalid key type: ${ksVersioned.keyType}`,
				);
			}

			return {
				objectId,
				name: ksVersioned.name,
				url: ksVersioned.url,
				keyType: ksVersioned.keyType,
				pk: new Uint8Array(ksVersioned.pk),
			};
		}),
	);
}

/**
 * Given a KeyServer, fetch the proof of possession (PoP) from the URL and verify it
 * against the pubkey. This should be used only rarely when the dapp uses a dynamic
 * set of key servers.
 *
 * @param server - The KeyServer to verify.
 * @returns - True if the key server is valid, false otherwise.
 */
export async function verifyKeyServer(
	server: KeyServer,
	timeout: number,
	apiKeyName?: string,
	apiKey?: string,
): Promise<boolean> {
	const requestId = crypto.randomUUID();
	const response = await fetch(server.url! + '/v1/service?service_id=' + server.objectId, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'Request-Id': requestId,
			'Client-Sdk-Type': 'typescript',
			'Client-Sdk-Version': PACKAGE_VERSION,
			...(apiKeyName && apiKey ? { apiKeyName: apiKey } : {}),
		},
		signal: AbortSignal.timeout(timeout),
	});

	await SealAPIError.assertResponse(response, requestId);
	verifyKeyServerVersion(response);
	const serviceResponse = await response.json();

	if (serviceResponse.service_id !== server.objectId) {
		return false;
	}
	const fullMsg = flatten([DST_POP, server.pk, fromHex(server.objectId)]);
	return bls12_381.verifyShortSignature(fromBase64(serviceResponse.pop), fullMsg, server.pk);
}

/**
 * Verify the key server version. Throws an `InvalidKeyServerError` if the version is not supported.
 *
 * @param response - The response from the key server.
 */
export function verifyKeyServerVersion(response: Response) {
	const keyServerVersion = response.headers.get('X-KeyServer-Version');
	if (keyServerVersion == null) {
		throw new InvalidKeyServerVersionError('Key server version not found');
	}
	if (new Version(keyServerVersion).older_than(SERVER_VERSION_REQUIREMENT)) {
		throw new InvalidKeyServerVersionError(
			`Key server version ${keyServerVersion} is not supported`,
		);
	}
}

export interface DerivedKey {
	toString(): string;
}

/**
 * A user secret key for the Boneh-Franklin BLS12381 scheme.
 * This is a wrapper around the G1Element type.
 */
export class BonehFranklinBLS12381DerivedKey implements DerivedKey {
	representation: string;

	constructor(public key: G1Element) {
		this.representation = toHex(key.toBytes());
	}

	toString(): string {
		return this.representation;
	}
}

/**
 * Options for fetching keys from the key server.
 */
export interface FetchKeysOptions {
	/** The URL of the key server. */
	url: string;
	/** The Base64 string of request signature. */
	requestSignature: string;
	/** The transaction bytes. */
	transactionBytes: Uint8Array;
	/** The ephemeral secret key. */
	encKey: Uint8Array;
	/** The ephemeral public key. */
	encKeyPk: Uint8Array;
	/** The ephemeral verification key. */
	encVerificationKey: Uint8Array;
	/** The certificate. */
	certificate: Certificate;
	/** Request timeout in milliseconds. */
	timeout: number;
	/** Optional API key name. */
	apiKeyName?: string;
	/** Optional API key. */
	apiKey?: string;
	/** Optional abort signal for cancellation. */
	signal?: AbortSignal;
}

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
export async function fetchKeysForAllIds({
	url,
	requestSignature,
	transactionBytes,
	encKey,
	encKeyPk,
	encVerificationKey,
	certificate,
	timeout,
	apiKeyName,
	apiKey,
	signal,
}: FetchKeysOptions): Promise<{ fullId: string; key: Uint8Array }[]> {
	const body = {
		ptb: toBase64(transactionBytes.slice(1)), // removes the byte of the transaction type version
		enc_key: toBase64(encKeyPk),
		enc_verification_key: toBase64(encVerificationKey),
		request_signature: requestSignature, // already b64
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
			...(apiKeyName && apiKey ? { apiKeyName: apiKey } : {}),
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
