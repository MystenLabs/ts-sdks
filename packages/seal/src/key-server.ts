// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { fromBase64, fromHex } from '@mysten/bcs';
import { bls12_381 } from '@noble/curves/bls12-381';

import { KeyServerMove } from './bcs.js';
import {
	InvalidGetObjectError,
	SealAPIError,
	UnsupportedFeatureError,
	UnsupportedNetworkError,
} from './error.js';
import { DST_POP } from './ibe.js';
import { PACKAGE_VERSION } from './version.js';
import type { SealCompatibleClient } from './types.js';

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

/**
 * Returns a static list of Seal key server object ids that the dapp can choose to use.
 * @param network - The network to use.
 * @returns The object id's of the key servers.
 */
export function getAllowlistedKeyServers(network: 'testnet' | 'mainnet'): string[] {
	if (network === 'testnet') {
		return [
			'0xb35a7228d8cf224ad1e828c0217c95a5153bafc2906d6f9c178197dce26fbcf8',
			'0x2d6cde8a9d9a65bde3b0a346566945a63b4bfb70e9a06c41bdb70807e2502b06',
		];
	} else {
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
	const uniqueIds = Array.from(new Set(objectIds));
	const fetchedServers: Record<string, KeyServer> = {};

	// Only fetch key server information for each unique objectId.
	await Promise.all(
		uniqueIds.map(async (objectId) => {
			let res;
			try {
				res = await client.core.getObject({
					objectId,
				});
			} catch (e) {
				throw new InvalidGetObjectError(`KeyServer ${objectId} not found; ${(e as Error).message}`);
			}

			const ks = KeyServerMove.parse(res.object.content);
			if (ks.keyType !== 0) {
				throw new UnsupportedFeatureError(`Unsupported key type ${ks.keyType}`);
			}

			fetchedServers[objectId] = {
				objectId,
				name: ks.name,
				url: ks.url,
				keyType: KeyServerType.BonehFranklinBLS12381,
				pk: new Uint8Array(ks.pk),
			};
		}),
	);

	return objectIds.map((objectId) => {
		if (!fetchedServers[objectId]) {
			console.error(`KeyServer ${objectId} not found in fetched servers`);
			throw new InvalidGetObjectError(`KeyServer ${objectId} not found`);
		}

		return fetchedServers[objectId];
	});
}

/**
 * Given a KeyServer, fetch the proof of possession (PoP) from the URL and verify it
 * against the pubkey. This should be used only rarely when the dapp uses a dynamic
 * set of key servers.
 *
 * @param server - The KeyServer to verify.
 * @returns - True if the key server is valid, false otherwise.
 */
export async function verifyKeyServer(server: KeyServer, timeout: number): Promise<boolean> {
	const requestId = crypto.randomUUID();
	const response = await fetch(server.url! + '/v1/service', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'Request-Id': requestId,
			'Client-Sdk-Type': 'typescript',
			'Client-Sdk-Version': PACKAGE_VERSION,
		},
		signal: AbortSignal.timeout(timeout),
	});

	await SealAPIError.assertResponse(response, requestId);
	const serviceResponse = await response.json();

	if (serviceResponse.service_id !== server.objectId) {
		return false;
	}
	const fullMsg = new Uint8Array([...DST_POP, ...server.pk, ...fromHex(server.objectId)]);
	return bls12_381.verifyShortSignature(fromBase64(serviceResponse.pop), fullMsg, server.pk);
}
