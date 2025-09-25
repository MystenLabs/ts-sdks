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
	retrieveKeyServers,
	verifyKeyServer,
	fetchKeysForAllIds,
} from './key-server.js';
import type { DerivedKey, KeyServer } from './key-server.js';
import type {
	DecryptOptions,
	EncryptOptions,
	FetchKeysOptions,
	GetDerivedKeysOptions,
	KeyCacheKey,
	KeyServerConfig,
	SealClientExtensionOptions,
	SealClientOptions,
	SealCompatibleClient,
} from './types.js';
import { createFullId, count } from './utils.js';

export class SealClient {
	#suiClient: SealCompatibleClient;
	#configs: Map<string, KeyServerConfig>;
	#keyServers: Promise<Map<string, KeyServer>> | null = null;
	#verifyKeyServers: boolean;
	// A caching map for: fullId:object_id -> partial key.
	#cachedKeys = new Map<KeyCacheKey, G1Element>();
	#cachedPublicKeys = new Map<string, G2Element>();
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

	static asClientExtension(options: SealClientExtensionOptions) {
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
	}: EncryptOptions) {
		const packageObj = await this.#suiClient.core.getObject({ objectId: packageId });
		if (String(packageObj.object.version) !== '1') {
			throw new InvalidPackageError(`Package ${packageId} is not the first version`);
		}

		return encrypt({
			keyServers: await this.#getWeightedKeyServers(),
			kemType,
			threshold,
			packageId,
			id,
			encryptionInput: this.#createEncryptionInput(
				demType,
				data as Uint8Array<ArrayBuffer>,
				aad as Uint8Array<ArrayBuffer>,
			),
		});
	}

	#createEncryptionInput(
		type: DemType,
		data: Uint8Array<ArrayBuffer>,
		aad: Uint8Array<ArrayBuffer>,
	): EncryptionInput {
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
	 * If checkShareConsistency is true, the decrypted shares are checked for consistency, meaning that
	 * any combination of at least threshold shares should either succesfully combine to the plaintext or fail.
	 * This is useful in case the encryptor is not trusted and the decryptor wants to ensure all decryptors
	 * receive the same output (e.g., for onchain encrypted voting).
	 *
	 * @param data - The encrypted bytes to decrypt.
	 * @param sessionKey - The session key to use.
	 * @param txBytes - The transaction bytes to use (that calls seal_approve* functions).
	 * @param checkShareConsistency - If true, the shares are checked for consistency.
	 * @param checkLEEncoding - If true, the encryption is also checked using an LE encoded nonce.
	 * @returns - The decrypted plaintext corresponding to ciphertext.
	 */
	async decrypt({
		data,
		sessionKey,
		txBytes,
		checkShareConsistency,
		checkLEEncoding,
	}: DecryptOptions) {
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

		if (checkShareConsistency) {
			const publicKeys = await this.getPublicKeys(
				encryptedObject.services.map(([objectId, _]) => objectId),
			);
			return decrypt({
				encryptedObject,
				keys: this.#cachedKeys,
				publicKeys,
				checkLEEncoding: false, // We intentionally do not support other encodings here
			});
		}
		return decrypt({ encryptedObject, keys: this.#cachedKeys, checkLEEncoding });
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
	 * Get the public keys for the given services.
	 * If all public keys are not in the cache, they are retrieved.
	 *
	 * @param services - The services to get the public keys for.
	 * @returns The public keys for the given services in the same order as the given services.
	 */
	async getPublicKeys(services: string[]): Promise<G2Element[]> {
		const keyServers = await this.getKeyServers();

		// Collect the key servers not already in store or cache.
		const missingKeyServers = services.filter(
			(objectId) => !keyServers.has(objectId) && !this.#cachedPublicKeys.has(objectId),
		);

		// If there are missing key servers, retrieve them and update the cache.
		if (missingKeyServers.length > 0) {
			(
				await retrieveKeyServers({
					objectIds: missingKeyServers,
					client: this.#suiClient,
				})
			).forEach((keyServer) =>
				this.#cachedPublicKeys.set(keyServer.objectId, G2Element.fromBytes(keyServer.pk)),
			);
		}

		return services.map((objectId) => {
			const keyServer = keyServers.get(objectId);
			if (keyServer) {
				return G2Element.fromBytes(keyServer.pk);
			}
			return this.#cachedPublicKeys.get(objectId)!;
		});
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
	async fetchKeys({ ids, txBytes, sessionKey, threshold }: FetchKeysOptions) {
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

		const certificate = await sessionKey.getCertificate();
		const signedRequest = await sessionKey.createRequestParams(txBytes);

		const controller = new AbortController();
		const errors: Error[] = [];

		const keyFetches = remainingKeyServers.map(async (objectId) => {
			const server = keyServers.get(objectId)!;
			try {
				const config = this.#configs.get(objectId);
				const allKeys = await fetchKeysForAllIds({
					url: server.url,
					requestSignature: signedRequest.requestSignature,
					transactionBytes: txBytes,
					encKey: signedRequest.encKey,
					encKeyPk: signedRequest.encKeyPk,
					encVerificationKey: signedRequest.encVerificationKey,
					certificate,
					timeout: this.#timeout,
					apiKeyName: config?.apiKeyName,
					apiKey: config?.apiKey,
					signal: controller.signal,
				});
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
	}: GetDerivedKeysOptions): Promise<Map<string, DerivedKey>> {
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
