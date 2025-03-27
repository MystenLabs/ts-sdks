// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SuiClient } from '@mysten/sui/client';

import { EncryptedObject } from './bcs.js';
import { G1Element, G2Element } from './bls12381.js';
import { decrypt } from './decrypt.js';
import type { EncryptionInput } from './dem.js';
import { AesGcm256, Hmac256Ctr } from './dem.js';
import { DemType, encrypt, KemType } from './encrypt.js';
import {
	InconsistentKeyServersError,
	InvalidKeyServerError,
	InvalidThresholdError,
	toMajorityError,
} from './error.js';
import { BonehFranklinBLS12381Services, DST } from './ibe.js';
import { KeyServerType, retrieveKeyServers, verifyKeyServer } from './key-server.js';
import type { KeyServer } from './key-server.js';
import { fetchKeysForAllIds } from './keys.js';
import type { SessionKey } from './session-key.js';
import type { KeyCacheKey } from './types.js';
import { createFullId } from './utils.js';

/**
 * Configuration options for initializing a SealClient
 * @property serverObjectIds: Array of object IDs for the key servers to use.
 * @property verifyKeyServers: Whether to verify the key servers' authenticity.
 * 	 Should be false if servers are pre-verified (e.g., getAllowlistedKeyServers).
 * 	 Defaults to true.
 * @property timeout: Timeout in milliseconds for network requests. Defaults to 10 seconds.
 */
export interface SealClientOptions {
	suiClient: SuiClient;
	serverObjectIds: string[];
	verifyKeyServers?: boolean;
	timeout?: number;
}

export class SealClient {
	#suiClient: SuiClient;
	#serverObjectIds: string[];
	#verifyKeyServers: boolean;
	#keyServers: Promise<KeyServer[]> | null = null;
	// A caching map for: fullId:object_id -> partial key.
	#cachedKeys = new Map<KeyCacheKey, G1Element>();
	#timeout: number;

	constructor(options: SealClientOptions) {
		this.#suiClient = options.suiClient;
		this.#serverObjectIds = options.serverObjectIds;
		this.#verifyKeyServers = options.verifyKeyServers ?? true;
		this.#timeout = options.timeout ?? 10_000;
	}

	/**
	 * Return an encrypted message under the identity.
	 *
	 * @param kemType - The type of KEM to use.
	 * @param demType - The type of DEM to use.
	 * @param threshold - The threshold for the TSS encryption.
	 * @param packageId - the packageId namespace.
	 * @param id - the identity to use.
	 * @param data - the data to encrypt.
	 * @param aad - optional additional authenticated data.
	 * @returns The bcs bytes of the encrypted object containing all metadata and the 256-bit symmetric key that was used to encrypt the object.
	 * 	Since the symmetric key can be used to decrypt, it should not be shared but can be used e.g. for backup.
	 */
	async encrypt({
		kemType = KemType.BonehFranklinBLS12381DemCCA,
		demType = DemType.AesGcm256,
		threshold,
		packageId,
		id,
		data,
		aad = new Uint8Array(),
	}: {
		kemType?: KemType;
		demType?: DemType;
		threshold: number;
		packageId: string;
		id: string;
		data: Uint8Array;
		aad?: Uint8Array;
	}) {
		// TODO: Verify that packageId is first version of its package (else throw error).
		return encrypt({
			keyServers: await this.getKeyServers(),
			kemType,
			threshold,
			packageId,
			id,
			encryptionInput: this.#createEncryptionInput(demType, data, aad),
		});
	}

	#createEncryptionInput(type: DemType, data: Uint8Array, aad: Uint8Array): EncryptionInput {
		switch (type) {
			case DemType.AesGcm256:
				return new AesGcm256(data, aad);
			case DemType.Hmac256Ctr:
				return new Hmac256Ctr(data, aad);
		}
	}

	/**
	 * Decrypt the given encrypted bytes using cached keys.
	 * Calls fetchKeys in case one or more of the required keys is not cached yet.
	 * The function throws an error if the client's key servers are not a subset of
	 * the encrypted object's key servers (including the same weights) or if the
	 * threshold cannot be met.
	 *
	 * @param data - The encrypted bytes to decrypt.
	 * @param sessionKey - The session key to use.
	 * @param txBytes - The transaction bytes to use (that calls seal_approve* functions).
	 * @returns - The decrypted plaintext corresponding to ciphertext.
	 */
	async decrypt({
		data,
		sessionKey,
		txBytes,
	}: {
		data: Uint8Array;
		sessionKey: SessionKey;
		txBytes: Uint8Array;
	}) {
		const encryptedObject = EncryptedObject.parse(data);

		this.#validateEncryptionServices(
			encryptedObject.services.map((s) => s[0]),
			encryptedObject.threshold,
		);

		await this.fetchKeys({
			ids: [encryptedObject.id],
			txBytes,
			sessionKey,
			threshold: encryptedObject.threshold,
		});

		const publicKeys = (await this.getKeyServers()).map((server) => G2Element.fromBytes(server.pk));

		return decrypt({ encryptedObject, keys: this.#cachedKeys, publicKeys });
	}

	#validateEncryptionServices(services: string[], threshold: number) {
		// Check that the client's key servers are a subset of the encrypted object's key servers.
		const serverObjectIdsMap = new Map<string, number>();
		for (const objectId of this.#serverObjectIds) {
			serverObjectIdsMap.set(objectId, (serverObjectIdsMap.get(objectId) ?? 0) + 1);
		}
		const servicesMap = new Map<string, number>();
		for (const service of services) {
			servicesMap.set(service, (servicesMap.get(service) ?? 0) + 1);
		}
		for (const [objectId, count] of serverObjectIdsMap) {
			if (servicesMap.get(objectId) !== count) {
				throw new InconsistentKeyServersError(
					`Client's key servers must be a subset of the encrypted object's key servers`,
				);
			}
		}
		// Check that the threshold can be met with the client's key servers.
		if (threshold > this.#serverObjectIds.length) {
			throw new InvalidThresholdError(
				`Invalid threshold ${threshold} for ${this.#serverObjectIds.length} servers`,
			);
		}
	}

	async getKeyServers() {
		if (!this.#keyServers) {
			this.#keyServers = this.#loadKeyServers().catch((error) => {
				this.#keyServers = null;
				throw error;
			});
		}

		return this.#keyServers;
	}

	async #loadKeyServers(): Promise<KeyServer[]> {
		const keyServers = await retrieveKeyServers({
			objectIds: this.#serverObjectIds,
			client: this.#suiClient,
		});

		if (keyServers.length === 0) {
			throw new InvalidKeyServerError('No key servers found');
		}

		if (this.#verifyKeyServers) {
			await Promise.all(
				keyServers.map(async (server) => {
					if (!(await verifyKeyServer(server, this.#timeout))) {
						throw new InvalidKeyServerError(`Key server ${server.objectId} is not valid`);
					}
				}),
			);
		}

		return keyServers;
	}

	/**
	 * Fetch keys from the key servers and update the cache.
	 *
	 * It is recommended to call this function once for all ids of all encrypted obejcts if
	 * there are multiple, then call decrypt for each object. This avoids calling fetchKey
	 * individually for each decrypt.
	 *
	 * @param ids - The ids of the encrypted objects.
	 * @param txBytes - The transaction bytes to use (that calls seal_approve* functions).
	 * @param sessionKey - The session key to use.
	 * @param threshold - The threshold for the TSS encryptions. The function returns when a threshold of key servers had returned keys for all ids.
	 */
	async fetchKeys({
		ids,
		txBytes,
		sessionKey,
		threshold,
	}: {
		ids: string[];
		txBytes: Uint8Array;
		sessionKey: SessionKey;
		threshold: number;
	}) {
		const keyServers = await this.getKeyServers();
		if (threshold > keyServers.length || threshold < 1 || keyServers.length < 1) {
			throw new InvalidThresholdError(
				`Invalid threshold ${threshold} for ${keyServers.length} servers`,
			);
		}

		let completedServerCount = 0;
		const remainingKeyServers = new Set<KeyServer>();
		const fullIds = ids.map((id) => createFullId(DST, sessionKey.getPackageId(), id));

		// Count a server as completed if it has keys for all fullIds.
		// Duplicated key server ids will be counted towards the threshold.
		for (const server of keyServers) {
			let hasAllKeys = true;
			for (const fullId of fullIds) {
				if (!this.#cachedKeys.has(`${fullId}:${server.objectId}`)) {
					hasAllKeys = false;
					remainingKeyServers.add(server);
					break;
				}
			}
			if (hasAllKeys) {
				completedServerCount++;
			}
		}

		// Return early if we have enough keys from cache.
		if (completedServerCount >= threshold) {
			return;
		}

		// Check server validities.
		for (const server of remainingKeyServers) {
			if (server.keyType !== KeyServerType.BonehFranklinBLS12381) {
				throw new InvalidKeyServerError(
					`Server ${server.objectId} has invalid key type: ${server.keyType}`,
				);
			}
		}

		const cert = await sessionKey.getCertificate();
		const signedRequest = await sessionKey.createRequestParams(txBytes);

		const controller = new AbortController();
		const errors: Error[] = [];

		const keyFetches = [...remainingKeyServers].map(async (server) => {
			try {
				const allKeys = await fetchKeysForAllIds(
					server.url,
					signedRequest.requestSignature,
					txBytes,
					signedRequest.decryptionKey,
					cert,
					this.#timeout,
					controller.signal,
				);
				// Check validity of the keys and add them to the cache.
				let receivedIds = new Set<string>();
				for (const { fullId, key } of allKeys) {
					const keyElement = G1Element.fromBytes(key);
					if (
						!BonehFranklinBLS12381Services.verifyUserSecretKey(
							keyElement,
							fullId,
							G2Element.fromBytes(server.pk),
						)
					) {
						console.warn('Received invalid key from key server ' + server.objectId);
						continue;
					}
					this.#cachedKeys.set(`${fullId}:${server.objectId}`, keyElement);
					receivedIds.add(fullId);
				}

				// Check if all the receivedIds are consistent with the requested fullIds.
				// If so, consider the key server got all keys and mark as completed.
				const expectedIds = new Set(fullIds);
				const hasAllKeys =
					receivedIds.size === expectedIds.size &&
					[...receivedIds].every((id) => expectedIds.has(id));

				// Return early if the completed servers is more than threshold.
				if (hasAllKeys) {
					completedServerCount++;
					if (completedServerCount >= threshold) {
						controller.abort();
					}
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					errors.push(error as Error);
				}
				// If there are too many errors that the threshold is not attainable, return early with error.
				if (remainingKeyServers.size - errors.length < threshold - completedServerCount) {
					controller.abort(error);
				}
			}
		});

		await Promise.allSettled(keyFetches);

		if (completedServerCount < threshold) {
			throw toMajorityError(errors);
		}
	}
}
