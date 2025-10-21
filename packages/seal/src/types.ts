// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithExtensions, Experimental_CoreClient } from '@mysten/sui/experimental';
import type { DemType, KemType } from './encrypt.js';
import type { SessionKey } from './session-key.js';

export type KeyCacheKey = `${string}:${string}`;
export type SealCompatibleClient = ClientWithExtensions<{
	core: Experimental_CoreClient;
}>;

export interface SealOptions<Name = 'seal'> {
	/** Array of key server configs consisting of objectId, weight, optional API key name and API key */
	serverConfigs: KeyServerConfig[];
	/** Whether to verify the key servers' authenticity. */
	verifyKeyServers?: boolean;
	/** Timeout in milliseconds for network requests. */
	timeout?: number;
	// Name of the seal extension, defaults to 'seal'
	name?: Name;
}

export interface KeyServerConfig {
	objectId: string;
	weight: number;
	apiKeyName?: string;
	apiKey?: string;
}

/** Configuration options for initializing a SealClient*/
export interface SealClientOptions {
	suiClient: SealCompatibleClient;
	/** Array of key server configs consisting of objectId, weight, optional API key name and API key */
	serverConfigs: KeyServerConfig[];
	/** Whether to verify the key servers' authenticity. */
	verifyKeyServers?: boolean;
	/** Timeout in milliseconds for network requests. */
	timeout?: number;
}

export interface EncryptOptions {
	/** The type of KEM to use. */
	kemType?: KemType;
	/** The type of DEM to use. */
	demType?: DemType;
	/** The threshold for the TSS encryption. */
	threshold: number;
	/** The packageId namespace. */
	packageId: string;
	/** The identity to use. */
	id: string;
	/** The data to encrypt. */
	data: Uint8Array;
	/** Optional additional authenticated data. */
	aad?: Uint8Array;
}

export interface DecryptOptions {
	/** The encrypted bytes to decrypt. */
	data: Uint8Array;
	/** The session key to use. */
	sessionKey: SessionKey;
	/** The transaction bytes to use (that calls seal_approve* functions). */
	txBytes: Uint8Array;
	/** Whether to check share consistency. */
	checkShareConsistency?: boolean;
	/** Whether to check also using an LE encoded nonce. */
	checkLEEncoding?: boolean;
}

export interface FetchKeysOptions {
	/** The ids of the encrypted objects. */
	ids: string[];
	/** The transaction bytes to use (that calls seal_approve* functions). */
	txBytes: Uint8Array;
	/** The session key to use. */
	sessionKey: SessionKey;
	/** The threshold. */
	threshold: number;
}

export interface GetDerivedKeysOptions {
	kemType?: KemType;
	/** The id of the encrypted object. */
	id: string;
	/** The transaction bytes to use (that calls seal_approve* functions). */
	txBytes: Uint8Array;
	/** The session key to use. */
	sessionKey: SessionKey;
	/** The threshold. */
	threshold: number;
}
