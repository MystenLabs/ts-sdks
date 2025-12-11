// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs, fromBase64, fromHex, toBase64, toHex } from '@mysten/bcs';
import { bls12_381 } from '@noble/curves/bls12-381';

import { KeyServerMove, KeyServerMoveV1, KeyServerMoveV2 } from './bcs.js';
import {
	InvalidClientOptionsError,
	InvalidKeyServerError,
	InvalidKeyServerVersionError,
	SealAPIError,
} from './error.js';
import { DST_POP } from './ibe.js';
import { PACKAGE_VERSION } from './version.js';
import type { KeyServerConfig, SealCompatibleClient } from './types.js';
import type { G1Element } from './bls12381.js';
import { flatten, Version } from './utils.js';
import { elgamalDecrypt } from './elgamal.js';
import type { Certificate } from './session-key.js';

const SUPPORTED_SERVER_VERSIONS = [2, 1]; // Must be configured in descending order.

export type ServerType = 'Independent' | 'Committee';

export type KeyServer = {
	objectId: string;
	name: string;
	url: string;
	keyType: KeyType;
	pk: Uint8Array<ArrayBuffer>;
	serverType: ServerType;
};

export enum KeyType {
	BonehFranklinBLS12381 = 0,
}

export const SERVER_VERSION_REQUIREMENT = new Version('0.4.1');

/**
 * Given a list of key server object IDs, returns a list of SealKeyServer
 * from onchain state containing name, objectId, URL and pk.
 *
 * Supports both V1 (independent servers) and V2 (independent + committee servers).
 * For V2 committee servers, returns the aggregator URL from the config.
 *
 * @param objectIds - The key server object IDs.
 * @param client - The Sui client to use (SuiGrpcClient, SuiGraphQLClient, or SuiJsonRpcClient).
 * @param configs - The key server configurations containing aggregator URLs.
 * @returns - An array of SealKeyServer.
 */
export async function retrieveKeyServers({
	objectIds,
	client,
	configs,
}: {
	objectIds: string[];
	client: SealCompatibleClient;
	configs: Map<string, KeyServerConfig>;
}): Promise<KeyServer[]> {
	return await Promise.all(
		objectIds.map(async (objectId) => {
			// First get the KeyServer object and validate it.
			const res = await client.core.getObject({
				objectId,
				include: { content: true },
			});
			const ks = KeyServerMove.parse(res.object.content);

			// Find the highest supported version.
			const firstVersion = Number(ks.firstVersion);
			const lastVersion = Number(ks.lastVersion);
			const version = SUPPORTED_SERVER_VERSIONS.find((v) => v >= firstVersion && v <= lastVersion);

			if (version === undefined) {
				throw new InvalidKeyServerVersionError(
					`Key server ${objectId} supports versions between ${ks.firstVersion} and ${ks.lastVersion} (inclusive), but SDK expects one of ${SUPPORTED_SERVER_VERSIONS.join(', ')}`,
				);
			}

			// Fetch the versioned object.
			const versionedKeyServer = await client.core.getDynamicField({
				parentId: objectId,
				name: {
					type: 'u64',
					bcs: bcs.u64().serialize(version).toBytes(),
				},
			});

			// Parse based on version.
			switch (version) {
				case 2: {
					const ksV2 = KeyServerMoveV2.parse(versionedKeyServer.dynamicField.value.bcs);
					if (ksV2.keyType !== KeyType.BonehFranklinBLS12381) {
						throw new InvalidKeyServerError(
							`Server ${objectId} has invalid key type: ${ksV2.keyType}`,
						);
					}

					// Return based on server type.
					switch (ksV2.serverType.$kind) {
						case 'Independent': {
							if (configs.get(objectId)?.aggregatorUrl) {
								throw new InvalidClientOptionsError(
									`Independent server ${objectId} should not have aggregatorUrl in config`,
								);
							}
							return {
								objectId,
								name: ksV2.name,
								url: ksV2.serverType.Independent.url,
								keyType: ksV2.keyType,
								pk: new Uint8Array(ksV2.pk),
								serverType: 'Independent',
							};
						}
						case 'Committee': {
							// For committee mode, get aggregator URL from config
							const config = configs.get(objectId);
							if (!config?.aggregatorUrl) {
								throw new InvalidClientOptionsError(
									`Committee server ${objectId} requires aggregatorUrl in config`,
								);
							}
							return {
								objectId,
								name: ksV2.name,
								url: config.aggregatorUrl,
								keyType: ksV2.keyType,
								pk: new Uint8Array(ksV2.pk),
								serverType: 'Committee',
							};
						}
						default:
							throw new InvalidKeyServerError(`Unknown server type for ${objectId}`);
					}
				}
				case 1: {
					const ksV1 = KeyServerMoveV1.parse(versionedKeyServer.dynamicField.value.bcs);
					if (ksV1.keyType !== KeyType.BonehFranklinBLS12381) {
						throw new InvalidKeyServerError(
							`Server ${objectId} has invalid key type: ${ksV1.keyType}`,
						);
					}

					// V1 servers are always Independent and should not have aggregatorUrl
					if (configs.get(objectId)?.aggregatorUrl) {
						throw new InvalidClientOptionsError(
							`V1 server ${objectId} is always Independent and should not have aggregatorUrl in config`,
						);
					}

					return {
						objectId,
						name: ksV1.name,
						url: ksV1.url,
						keyType: ksV1.keyType,
						pk: new Uint8Array(ksV1.pk),
						serverType: 'Independent',
					};
				}
				default:
					throw new InvalidKeyServerVersionError(`Unsupported key server version: ${version}`);
			}
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
			...(apiKeyName && apiKey ? { [apiKeyName]: apiKey } : {}),
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
	encKey: Uint8Array<ArrayBuffer>;
	/** The ephemeral public key. */
	encKeyPk: Uint8Array<ArrayBuffer>;
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
}: FetchKeysOptions): Promise<{ fullId: string; key: Uint8Array<ArrayBuffer> }[]> {
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
			...(apiKeyName && apiKey ? { [apiKeyName]: apiKey } : {}),
		},
		body: JSON.stringify(body),
		signal: combinedSignal,
	});
	await SealAPIError.assertResponse(response, requestId);
	const resp = await response.json();
	verifyKeyServerVersion(response);

	return resp.decryption_keys.map(
		(dk: { id: Uint8Array<ArrayBuffer>; encrypted_key: [string, string] }) => ({
			fullId: toHex(dk.id),
			key: elgamalDecrypt(encKey, dk.encrypted_key.map(fromBase64) as [Uint8Array, Uint8Array]),
		}),
	);
}
