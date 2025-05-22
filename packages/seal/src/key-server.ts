// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { fromBase64, fromHex, toHex } from '@mysten/bcs';
import { bls12_381 } from '@noble/curves/bls12-381';

import { KeyServerMove, KeyServerMoveV1 } from './bcs.js';
import {
	InvalidGetObjectError,
	InvalidKeyServerVersionError,
	SealAPIError,
	UnsupportedFeatureError,
	UnsupportedNetworkError,
} from './error.js';
import { DST_POP } from './ibe.js';
import { PACKAGE_VERSION } from './version.js';
import type { SealCompatibleClient } from './types.js';
import type { G1Element } from './bls12381.js';
import { flatten, Version } from './utils.js';

const KEY_SERVER_VERSION = 1;

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

export const SERVER_VERSION_REQUIREMENT = new Version('0.2.0');

/**
 * Returns a static list of Seal key server object ids that the dapp can choose to use.
 * @param network - The network to use.
 * @returns The object id's of the key servers.
 */
export function getAllowlistedKeyServers(network: 'testnet' | 'mainnet'): string[] {
	if (network === 'testnet') {
		return [
			'0xb337dcbfe68d7ed5d6ea9cea278478aa2a147b1b450927fa19dafde92f1deebe',
			'0x6e115f0e883cf15164cd6fb315925876986c6481cd631766819e8f7ceb2fc197',
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
	// todo: do not fetch the same object ID if this is fetched before.
	return await Promise.all(
		objectIds.map(async (objectId) => {
			let res;
			try {
				res = await client.core.getObject({
					objectId,
				});
			} catch (e) {
				throw new InvalidGetObjectError(`KeyServer ${objectId} not found; ${(e as Error).message}`);
			}

			const ks = KeyServerMove.parse(res.object.content);
			console.log('ks', ks);
			if (ks.firstVersion === KEY_SERVER_VERSION) {
				throw new UnsupportedFeatureError(`KeyServer ${objectId} is not a valid KeyServerMoveV1`);
			}
			let resV1;
			try {
				resV1 = await client.core.getDynamicFields({
					parentId: objectId,
				});
			} catch (e) {
				throw new InvalidKeyServerVersionError(`KeyServer ${objectId} is not a valid KeyServerMoveV1`);
			}

			console.log(resV1.dynamicFields);
			let ks_v1;
			let objectIdV0 = resV1.dynamicFields.filter((df) => df.type.endsWith('KeyServerMoveV1'))[0].id;
			try {
				ks_v1 = KeyServerMoveV1.parse((await client.core.getObject({ objectId: objectIdV0 })).object.content);
			} catch (e) {
				throw new InvalidKeyServerVersionError(`KeyServer ${objectIdV0} is not a valid KeyServerMoveV1`);
			}
			if (ks_v1.keyType !== 0) {
				throw new UnsupportedFeatureError(`Unsupported key type ${ks_v1.keyType}`);
			}

			return {
				objectId,
				name: ks_v1.name,
				url: ks_v1.url,
				keyType: KeyServerType.BonehFranklinBLS12381,
				pk: new Uint8Array(ks_v1.pk),
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
