// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { EncryptedObject } from './bcs.js';
import { G1Element, G2Element } from './bls12381.js';
import { decrypt } from './decrypt.js';
import type { EncryptionInput } from './dem.js';
import { AesGcm256, Hmac256Ctr } from './dem.js';
import { DemType, encrypt, KemType } from './encrypt.js';
import {
	InconsistentKeyServersError,
	InvalidClientOptionsError,
	InvalidKeyServerError,
	InvalidPackageError,
	InvalidThresholdError,
	toMajorityError,
	TooManyFailedFetchKeyRequestsError,
} from './error.js';
import { BonehFranklinBLS12381Services } from './ibe.js';
import {
	BonehFranklinBLS12381DerivedKey,
	KeyServerType,
	retrieveKeyServers,
	verifyKeyServer,
} from './key-server.js';
import type { DerivedKey, KeyServer } from './key-server.js';
import { fetchKeysForAllIds } from './keys.js';
import type { SessionKey } from './session-key.js';
import type { KeyCacheKey, SealCompatibleClient } from './types.js';
import { createFullId, count } from './utils.js';

/**
 * Configuration options for initializing a SealClient
 * @property serverConfigs: Array of key server configs consisting of objectId, weight, optional API key name and API key.
 * @property verifyKeyServers: Whether to verify the key servers' authenticity.
 * 	 Should be false if servers are pre-verified (e.g., getAllowlistedKeyServers).
 * 	 Defaults to true.
 * @property timeout: Timeout in milliseconds for network requests. Defaults to 10 seconds.
 */
export interface SealClientExtensionOptions {
	serverConfigs: KeyServerConfig[];
	verifyKeyServers?: boolean;
	timeout?: number;
}

export interface KeyServerConfig {
	objectId: string;
	weight: number;
	apiKeyName?: string;
	apiKey?: string;
}

export interface SealClientOptions extends SealClientExtensionOptions {
	suiClient: SealCompatibleClient;
}

export class SealClient {
	#suiClient: SealCompatibleClient;
	#configs: Map<string, KeyServerConfig>;
	#keyServers: Promise<Map<string, KeyServer>> | null = null;
	#verifyKeyServers: boolean;
	// A caching map for: fullId:object_id -> partial key.
	#cachedKeys = new Map<KeyCacheKey, G1Element>();
	#timeout: number;
	#totalWeight: number;

	constructor(options: SealClientOptions) {
		this.#suiClient = options.suiClient;

		if (
			new Set(options.serverConfigs.map((s) => s.objectId)).size !== options.serverConfigs.length
		) {
			throw new InvalidClientOptionsError('Duplicate object IDs');
		}

		if (
			options.serverConfigs.some((s) => (s.apiKeyName && !s.apiKey) || (!s.apiKeyName && s.apiKey))
		) {
			throw new InvalidClientOptionsError(
				'Both apiKeyName and apiKey must be provided or not provided for all key servers',
			);
		}

		this.#configs = new Map(options.serverConfigs.map((server) => [server.objectId, server]));
		this.#totalWeight = options.serverConfigs
			.map((server) => server.weight)
			.reduce((sum, term) => sum + term, 0);

		this.#verifyKeyServers = options.verifyKeyServers ?? true;
		this.#timeout = options.timeout ?? 10_000;
	}

	static experimental_asClientExtension(options: SealClientExtensionOptions) {
		return {
			name: 'seal' as const,
			register: (client: SealCompatibleClient) => {
				return new SealClient({
					suiClient: client,
					...options,
				});
			},
		};
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
		const packageObj = await this.#suiClient.core.getObject({ objectId: packageId });
		if (packageObj.object.version !== '1') {
			throw new InvalidPackageError(`Package ${packageId} is not the first version`);
		}

		return encrypt({
			keyServers: await this.#getWeightedKeyServers(),
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
	 * the encrypted object's key servers or if the threshold cannot be met.
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

		return decrypt({ encryptedObject, keys: this.#cachedKeys });
	}

	#weight(objectId: string) {
		return this.#configs.get(objectId)?.weight ?? 0;
	}

	#validateEncryptionServices(services: string[], threshold: number) {
		// Check that the client's key servers are a subset of the encrypted object's key servers.
		if (
			services.some((objectId) => {
				const countInClient = this.#weight(objectId);
				return countInClient > 0 && countInClient !== count(services, objectId);
			})
		) {
			throw new InconsistentKeyServersError(
				`Client's key servers must be a subset of the encrypted object's key servers`,
			);
		}
		// Check that the threshold can be met with the client's key servers.
		if (threshold > this.#totalWeight) {
			throw new InvalidThresholdError(
				`Invalid threshold ${threshold} for ${this.#totalWeight} servers`,
			);
		}
	}

	async getKeyServers(): Promise<Map<string, KeyServer>> {
		if (!this.#keyServers) {
			this.#keyServers = this.#loadKeyServers().catch((error) => {
				this.#keyServers = null;
				throw error;
			});
		}
		return this.#keyServers;
	}

	/**
	 * Returns a list of key servers with multiplicity according to their weights.
	 * The list is used for encryption.
	 */
	async #getWeightedKeyServers() {
		const keyServers = await this.getKeyServers();
		const keyServersWithMultiplicity = [];
		for (const [objectId, config] of this.#configs) {
			const keyServer = keyServers.get(objectId)!;
			for (let i = 0; i < config.weight; i++) {
				keyServersWithMultiplicity.push(keyServer);
			}
		}
		return keyServersWithMultiplicity;
	}

	async #loadKeyServers(): Promise<Map<string, KeyServer>> {
		const keyServers = await retrieveKeyServers({
			objectIds: [...this.#configs].map(([objectId]) => objectId),
			client: this.#suiClient,
		});

		if (keyServers.length === 0) {
			throw new InvalidKeyServerError('No key servers found');
		}

		if (this.#verifyKeyServers) {
			await Promise.all(
				keyServers.map(async (server) => {
					const config = this.#configs.get(server.objectId);
					if (!(await verifyKeyServer(server, this.#timeout, config?.apiKeyName, config?.apiKey))) {
						throw new InvalidKeyServerError(`Key server ${server.objectId} is not valid`);
					}
				}),
			);
		}
		return new Map(keyServers.map((server) => [server.objectId, server]));
	}

	/**
	 * Fetch keys from the key servers and update the cache.
	 *
	 * It is recommended to call this function once for all ids of all encrypted objects if
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
		if (threshold > this.#totalWeight || threshold < 1) {
			throw new InvalidThresholdError(
				`Invalid threshold ${threshold} servers with weights ${this.#configs}`,
			);
		}
		const keyServers = await this.getKeyServers();
		const fullIds = ids.map((id) => createFullId(sessionKey.getPackageId(), id));

		// Count a server as completed if it has keys for all fullIds.
		// Duplicated key server ids will be counted towards the threshold.
		let completedWeight = 0;
		const remainingKeyServers = [];
		let remainingKeyServersWeight = 0;
		for (const objectId of keyServers.keys()) {
			if (fullIds.every((fullId) => this.#cachedKeys.has(`${fullId}:${objectId}`))) {
				completedWeight += this.#weight(objectId);
			} else {
				remainingKeyServers.push(objectId);
				remainingKeyServersWeight += this.#weight(objectId);
			}
		}

		// Return early if we have enough keys from cache.
		if (completedWeight >= threshold) {
			return;
		}

		// Check server validities.
		for (const objectId of remainingKeyServers) {
			const server = keyServers.get(objectId)!;
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

		const keyFetches = remainingKeyServers.map(async (objectId) => {
			const server = keyServers.get(objectId)!;
			try {
				const config = this.#configs.get(objectId);
				const allKeys = await fetchKeysForAllIds(
					server.url,
					signedRequest.requestSignature,
					txBytes,
					signedRequest.decryptionKey,
					cert,
					this.#timeout,
					config?.apiKeyName,
					config?.apiKey,
					controller.signal,
				);
				// Check validity of the keys and add them to the cache.
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
				}

				// Check if all the receivedIds are consistent with the requested fullIds.
				// If so, consider the key server got all keys and mark as completed.
				if (fullIds.every((fullId) => this.#cachedKeys.has(`${fullId}:${server.objectId}`))) {
					completedWeight += this.#weight(objectId);

					// Return early if the completed servers is more than the threshold.
					if (completedWeight >= threshold) {
						controller.abort();
					}
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					errors.push(error as Error);
				}
			} finally {
				// If there are too many errors that the threshold is not attainable, return early with error.
				remainingKeyServersWeight -= this.#weight(objectId);
				if (remainingKeyServersWeight < threshold - completedWeight) {
					controller.abort(new TooManyFailedFetchKeyRequestsError());
				}
			}
		});

		await Promise.allSettled(keyFetches);

		if (completedWeight < threshold) {
			throw toMajorityError(errors);
		}
	}

	/**
	 * Get derived keys from the given services.
	 *
	 * @param id - The id of the encrypted object.
	 * @param txBytes - The transaction bytes to use (that calls seal_approve* functions).
	 * @param sessionKey - The session key to use.
	 * @param threshold - The threshold.
	 * @returns - Derived keys for the given services that are in the cache as a "service object ID" -> derived key map. If the call is succesful, exactly threshold keys will be returned.
	 */
	async getDerivedKeys({
		kemType = KemType.BonehFranklinBLS12381DemCCA,
		id,
		txBytes,
		sessionKey,
		threshold,
	}: {
		kemType?: KemType;
		id: string;
		txBytes: Uint8Array;
		sessionKey: SessionKey;
		threshold: number;
	}): Promise<Map<string, DerivedKey>> {
		switch (kemType) {
			case KemType.BonehFranklinBLS12381DemCCA:
				const keyServers = await this.getKeyServers();
				if (threshold > this.#totalWeight) {
					throw new InvalidThresholdError(
						`Invalid threshold ${threshold} for ${this.#totalWeight} servers`,
					);
				}
				await this.fetchKeys({
					ids: [id],
					txBytes,
					sessionKey,
					threshold,
				});

				// After calling fetchKeys, we can be sure that there are at least `threshold` of the required keys in the cache.
				// It is also checked there that the KeyServerType is BonehFranklinBLS12381 for all services.

				const fullId = createFullId(sessionKey.getPackageId(), id);

				const derivedKeys = new Map();
				let weight = 0;
				for (const objectId of keyServers.keys()) {
					// The code below assumes that the KeyServerType is BonehFranklinBLS12381.
					const cachedKey = this.#cachedKeys.get(`${fullId}:${objectId}`);
					if (cachedKey) {
						derivedKeys.set(objectId, new BonehFranklinBLS12381DerivedKey(cachedKey));
						weight += this.#weight(objectId);
						if (weight >= threshold) {
							// We have enough keys, so we can stop.
							break;
						}
					}
				}
				return derivedKeys;
		}
	}
}
