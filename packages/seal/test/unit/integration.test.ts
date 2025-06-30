// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, fromHex, toBase64 } from '@mysten/bcs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { SealClient } from '../../src';
import { EncryptedObject } from '../../src/bcs';
import {
	ExpiredSessionKeyError,
	GeneralError,
	InconsistentKeyServersError,
	InvalidPersonalMessageSignatureError,
	InvalidPTBError,
	InvalidThresholdError,
	NoAccessError,
	toMajorityError,
} from '../../src/error';
import { getAllowlistedKeyServers, KeyServerType } from '../../src/key-server';
import { RequestFormat, SessionKey } from '../../src/session-key';
import { decrypt } from '../../src/decrypt';
import { KeyCacheKey, SealCompatibleClient } from '../../src/types';
import { G1Element } from '../../src/bls12381';
import { createFullId } from '../../src/utils';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

/**
 * Helper function
 * @param packageId
 * @param moduleName
 * @param suiClient
 * @param innerId
 * @returns
 */
async function constructTxBytes(
	packageId: string,
	moduleName: string,
	suiClient: SealCompatibleClient,
	innerIds: string[],
): Promise<Uint8Array> {
	const tx = new Transaction();
	for (const innerId of innerIds) {
		const keyIdArg = tx.pure.vector('u8', fromHex(innerId));
		const objectArg = tx.object(innerId);
		tx.moveCall({
			target: `${packageId}::${moduleName}::seal_approve`,
			arguments: [keyIdArg, objectArg],
		});
	}
	return await tx.build({ client: suiClient, onlyTransactionKind: true });
}

const pk = fromBase64(
	'oEC1VIuwQo+6FZiVwHCAy/3HbvAbuIyiztXIWwd4LgmXCh9WhOKg3T0+Mb62y9fqAsSaN5SybG09n/3JnkmEzJgdDXLpM8KvMwkha/cBHp6Cx7aCdogvGLoOp/RadyHb',
);
const MOCK_KEY_SERVERS = new Map([
	[
		'server1',
		{
			name: 'server1',
			objectId: 'server1',
			url: 'url1',
			keyType: KeyServerType.BonehFranklinBLS12381,
			pk,
		},
	],
	[
		'server2',
		{
			name: 'server2',
			objectId: 'server2',
			url: 'url2',
			keyType: KeyServerType.BonehFranklinBLS12381,
			pk,
		},
	],
	[
		'server3',
		{
			name: 'server3',
			objectId: 'server3',
			url: 'url3',
			keyType: KeyServerType.BonehFranklinBLS12381,
			pk,
		},
	],
	[
		'server4',
		{
			name: 'server4',
			objectId: 'server4',
			url: 'url4',
			keyType: KeyServerType.BonehFranklinBLS12381,
			pk,
		},
	],
	[
		'server5',
		{
			name: 'server5',
			objectId: 'server5',
			url: 'url5',
			keyType: KeyServerType.BonehFranklinBLS12381,
			pk,
		},
	],
]);
describe('Integration test', () => {
	let keypair: Ed25519Keypair;
	let suiAddress: string;
	let suiClient: SealCompatibleClient;
	let TESTNET_PACKAGE_ID: string;
	let serverObjectId: string;
	let serverObjectId2: string;
	let objectIds: { objectId: string; weight: number; apiKeyName?: string; apiKey?: string }[];
	let whitelistId: string;
	beforeAll(async () => {
		keypair = Ed25519Keypair.fromSecretKey(
			'suiprivkey1qqgzvw5zc2zmga0uyp4rzcgk42pzzw6387zqhahr82pp95yz0scscffh2d8',
		);
		suiAddress = keypair.getPublicKey().toSuiAddress();
		suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
		TESTNET_PACKAGE_ID = '0x8afa5d31dbaa0a8fb07082692940ca3d56b5e856c5126cb5a3693f0a4de63b82';
		// Object ids pointing to ci key servers' urls
		serverObjectId = '0x2304dd255b13eaf5cb471bd5188df946a64f1715ee2b7b02fecf306bd12ceebc';
		serverObjectId2 = '0x81aeaa8c25d2c912e1dc23b4372305b7a602c4ec4cc3e510963bc635e500aa37';
		objectIds = [
			{
				objectId: serverObjectId,
				weight: 1,
			},
			{
				objectId: serverObjectId2,
				weight: 1,
			},
		];
		whitelistId = '0x5809c296d41e0d6177e8cf956010c1d2387299892bb9122ca4ba4ffd165e05cb';
	});

	// Helper function to run the scenario with different server configs
	async function runScenario(
		objectIds: { objectId: string; weight: number; apiKeyName?: string; apiKey?: string }[],
	) {
		// Both whitelists contain address 0xb743cafeb5da4914cef0cf0a32400c9adfedc5cdb64209f9e740e56d23065100
		const whitelistId2 = '0xf770c0cdd00388c31ecfb815dd9cb41d6dcbebb1a6f766c02027c3bdcfdb2a21';
		const data = new Uint8Array([1, 2, 3]);
		const data2 = new Uint8Array([4, 5, 6]);

		const client = new SealClient({
			suiClient,
			serverConfigs: objectIds,
			verifyKeyServers: true,
		});

		const { encryptedObject: encryptedBytes } = await client.encrypt({
			threshold: objectIds.length,
			packageId: TESTNET_PACKAGE_ID,
			id: whitelistId,
			data,
		});

		const txBytes = await constructTxBytes(TESTNET_PACKAGE_ID, 'allowlist', suiClient, [
			whitelistId,
		]);

		const sessionKey = await SessionKey.create({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
			suiClient,
		});

		// decrypt the object encrypted to whitelist 1.
		const decryptedBytes = await client.decrypt({
			data: encryptedBytes,
			sessionKey,
			txBytes,
		});

		expect(decryptedBytes).toEqual(data);

		// encrypt a different object to whitelist 2.
		const { encryptedObject: encryptedBytes2 } = await client.encrypt({
			threshold: objectIds.length,
			packageId: TESTNET_PACKAGE_ID,
			id: whitelistId2,
			data: data2,
		});

		// construct a ptb that contains two seal_approve
		// for whitelist 1 and 2.
		const txBytes2 = await constructTxBytes(TESTNET_PACKAGE_ID, 'allowlist', suiClient, [
			whitelistId,
			whitelistId2,
		]);

		const encryptedObject2 = EncryptedObject.parse(encryptedBytes2);
		// fetch keys for both ids.
		await client.fetchKeys({
			ids: [whitelistId, whitelistId2],
			txBytes: txBytes2,
			sessionKey,
			threshold: encryptedObject2.threshold,
		});

		// decrypt should hit the cached key and no need to fetch again
		const decryptedBytes2 = await client.decrypt({
			data: encryptedBytes2,
			sessionKey,
			txBytes: txBytes2,
		});

		expect(decryptedBytes2).toEqual(data2);
	}

	it(
		'[testnet servers] whitelist example encrypt and decrypt scenarios',
		{ timeout: 12000 },
		async () => {
			const testnetObjectIds = getAllowlistedKeyServers('testnet').map((server) => ({
				objectId: server,
				weight: 1,
			}));
			await runScenario(testnetObjectIds);
		},
	);

	it(
		'[ci servers] whitelist example encrypt and decrypt scenarios',
		{ timeout: 12000 },
		async () => {
			await runScenario(objectIds);
		},
	);

	it('test getDerivedKeys', { timeout: 12000 }, async () => {
		// Both whitelists contain address 0xb743cafeb5da4914cef0cf0a32400c9adfedc5cdb64209f9e740e56d23065100
		const whitelistId = '0x5809c296d41e0d6177e8cf956010c1d2387299892bb9122ca4ba4ffd165e05cb';
		const data = new Uint8Array([1, 2, 3]);

		const client = new SealClient({
			suiClient,
			serverConfigs: objectIds,
			verifyKeyServers: false,
		});

		const txBytes = await constructTxBytes(TESTNET_PACKAGE_ID, 'allowlist', suiClient, [
			whitelistId,
		]);

		const sessionKey = await SessionKey.create({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
			suiClient,
		});

		const derivedKeys = await client.getDerivedKeys({
			id: whitelistId,
			txBytes,
			sessionKey,
			threshold: 2,
		});

		expect(derivedKeys).toHaveLength(2);

		const { encryptedObject: encryptedBytes } = await client.encrypt({
			threshold: 2,
			packageId: TESTNET_PACKAGE_ID,
			id: whitelistId,
			data,
		});
		const encryptedObject = EncryptedObject.parse(encryptedBytes);

		// Map to the format used for the key cache
		const fullId = createFullId(TESTNET_PACKAGE_ID, whitelistId);
		const keys = new Map<KeyCacheKey, G1Element>();
		derivedKeys.forEach((value, s) => {
			keys.set(`${fullId}:${s}`, G1Element.fromBytes(fromHex(value.toString())));
		});
		const decryptedData = await decrypt({
			encryptedObject,
			keys,
		});
		expect(decryptedData).toEqual(data);
	});

	it('test getDerivedKeys with MVR name', { timeout: 12000 }, async () => {
		// Both whitelists contain address 0xb743cafeb5da4914cef0cf0a32400c9adfedc5cdb64209f9e740e56d23065100
		const packageId = '0xc5ce2742cac46421b62028557f1d7aea8a4c50f651379a79afdf12cd88628807';
		const whitelistId = '0x61543d5b7692c36161fecb0e7bece1a4622b8514d5d17e6f216ac04f5423dccc';
		const data = new Uint8Array([1, 2, 3]);
		const mvrName = '@pkg/seal-demo-1234';

		const client = new SealClient({
			suiClient,
			serverConfigs: objectIds,
			verifyKeyServers: false,
		});

		const txBytes = await constructTxBytes(packageId, 'allowlist', suiClient, [whitelistId]);

		const sessionKey = new SessionKey({
			address: suiAddress,
			packageId,
			ttlMin: 10,
			signer: keypair,
			suiClient,
			mvrName,
		});

		const derivedKeys = await client.getDerivedKeys({
			id: whitelistId,
			txBytes,
			sessionKey,
			threshold: 2,
		});

		expect(derivedKeys).toHaveLength(2);

		const { encryptedObject: encryptedBytes } = await client.encrypt({
			threshold: 2,
			packageId,
			id: whitelistId,
			data,
		});
		const encryptedObject = EncryptedObject.parse(encryptedBytes);

		// Map to the format used for the key cache
		const fullId = createFullId(packageId, whitelistId);
		const keys = new Map<KeyCacheKey, G1Element>();
		derivedKeys.forEach((value, s) => {
			keys.set(`${fullId}:${s}`, G1Element.fromBytes(fromHex(value.toString())));
		});
		const decryptedData = await decrypt({
			encryptedObject,
			keys,
		});
		expect(decryptedData).toEqual(data);
	});

	it('client extension', { timeout: 12000 }, async () => {
		const whitelistId = '0x5809c296d41e0d6177e8cf956010c1d2387299892bb9122ca4ba4ffd165e05cb';
		const data = new Uint8Array([1, 2, 3]);

		const client = suiClient.$extend(
			SealClient.experimental_asClientExtension({
				serverConfigs: objectIds,
				verifyKeyServers: false,
			}),
		);

		const { encryptedObject: encryptedBytes } = await client.seal.encrypt({
			threshold: objectIds.length,
			packageId: TESTNET_PACKAGE_ID,
			id: whitelistId,
			data,
		});

		const txBytes = await constructTxBytes(TESTNET_PACKAGE_ID, 'allowlist', suiClient, [
			whitelistId,
		]);

		const sessionKey = await SessionKey.create({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
			suiClient,
		});
		// decrypt the object encrypted to whitelist 1.
		const decryptedBytes = await client.seal.decrypt({
			data: encryptedBytes,
			sessionKey,
			txBytes,
		});

		expect(decryptedBytes).toEqual(data);
	});

	it('test different validateEncryptionServices errors', async () => {
		const whitelistId = '0x5809c296d41e0d6177e8cf956010c1d2387299892bb9122ca4ba4ffd165e05cb';
		const data = new Uint8Array([1, 2, 3]);

		objectIds = [
			{
				objectId: '0x2304dd255b13eaf5cb471bd5188df946a64f1715ee2b7b02fecf306bd12ceebc',
				weight: 2,
			},
			{
				objectId: '0x81aeaa8c25d2c912e1dc23b4372305b7a602c4ec4cc3e510963bc635e500aa37',
				weight: 1,
			},
		];

		// encrypt using 2 out of 3
		const clientAllServers = new SealClient({
			suiClient,
			serverConfigs: objectIds,
			verifyKeyServers: false,
		});

		const { encryptedObject: encryptedBytes } = await clientAllServers.encrypt({
			threshold: 2,
			packageId: TESTNET_PACKAGE_ID,
			id: whitelistId,
			data,
		});

		const txBytes = await constructTxBytes(TESTNET_PACKAGE_ID, 'allowlist', suiClient, [
			whitelistId,
		]);

		const sessionKey = await SessionKey.create({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
			suiClient,
		});

		// client with only 2 servers should suffice
		const client2Servers = new SealClient({
			suiClient,
			serverConfigs: objectIds.slice(0, 2),
			verifyKeyServers: false,
		});

		const decryptedBytes = await client2Servers.decrypt({
			data: encryptedBytes,
			sessionKey,
			txBytes,
		});

		expect(decryptedBytes).toEqual(data);

		// client with only 1 server should fail
		const client1Server = new SealClient({
			suiClient,
			serverConfigs: objectIds.slice(2),
			verifyKeyServers: false,
		});

		await expect(
			client1Server.decrypt({
				data: encryptedBytes,
				sessionKey,
				txBytes,
			}),
		).rejects.toThrow(InvalidThresholdError);

		// client with different weights should fail even though the threshold could be achieved
		objectIds = [
			{
				objectId: '0x2304dd255b13eaf5cb471bd5188df946a64f1715ee2b7b02fecf306bd12ceebc',
				weight: 1,
			},
			{
				objectId: '0x81aeaa8c25d2c912e1dc23b4372305b7a602c4ec4cc3e510963bc635e500aa37',
				weight: 1,
			},
		];
		const clientDifferentWeight = new SealClient({
			suiClient,
			serverConfigs: objectIds,
			verifyKeyServers: false,
		});

		await expect(
			clientDifferentWeight.decrypt({
				data: encryptedBytes,
				sessionKey,
				txBytes,
			}),
		).rejects.toThrow(InconsistentKeyServersError);
	});

	it('test fetchKeys throws SealAPIError', async () => {
		// Setup encrypted object.
		const whitelistId = '0x5809c296d41e0d6177e8cf956010c1d2387299892bb9122ca4ba4ffd165e05cb';
		const client = new SealClient({
			suiClient,
			serverConfigs: objectIds,
		});
		const data = new Uint8Array([1, 2, 3]);

		const { encryptedObject: encryptedBytes } = await client.encrypt({
			threshold: objectIds.length,
			packageId: TESTNET_PACKAGE_ID,
			id: whitelistId,
			data,
		});

		const encryptedObject = EncryptedObject.parse(encryptedBytes);

		// Session key with mismatched sui address and personal msg signature fails.
		const wrongSuiAddress = Ed25519Keypair.generate().getPublicKey().toSuiAddress();
		const sessionKey = await SessionKey.create({
			address: wrongSuiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			suiClient,
		});
		const sig = await keypair.signPersonalMessage(sessionKey.getPersonalMessage());
		await expect(sessionKey.setPersonalMessageSignature(sig.signature)).rejects.toThrow(
			InvalidPersonalMessageSignatureError,
		);

		// Wrong txBytes fails to verify.
		const sessionKey2 = await SessionKey.create({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
			suiClient,
		});

		const wrongTxBytes = await constructTxBytes(TESTNET_PACKAGE_ID, 'allowlist', suiClient, [
			'0xd9da0a7307c753e4ee4e358261bd0848f1e98e358b175e1f05ef16ae744f2e29',
		]);
		await expect(
			client.fetchKeys({
				ids: [encryptedObject.id],
				txBytes: wrongTxBytes,
				sessionKey: sessionKey2,
				threshold: encryptedObject.threshold,
			}),
		).rejects.toThrow(NoAccessError);

		// construct a non move call ptb, gets invalid PTB error.
		const tx = new Transaction();
		const objectArg = tx.object(whitelistId);
		tx.transferObjects([objectArg], suiAddress);
		const txBytes3 = await tx.build({ client: suiClient, onlyTransactionKind: true });

		const client2 = new SealClient({
			suiClient,
			serverConfigs: objectIds,
			verifyKeyServers: false,
		});

		const sessionKey3 = await SessionKey.create({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
			suiClient,
		});
		await expect(
			client2.fetchKeys({
				ids: [whitelistId],
				txBytes: txBytes3,
				sessionKey: sessionKey3,
				threshold: 2,
			}),
		).rejects.toThrowError(
			expect.objectContaining({
				message: expect.stringContaining('Invalid PTB: Invalid first command'),
			}),
		);
	});

	it('test session key verify personal message signature', async () => {
		const kp = Ed25519Keypair.generate();
		const sessionKey = await SessionKey.create({
			address: kp.getPublicKey().toSuiAddress(),
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			suiClient,
		});
		// Wrong signature set throws error.
		const sig = await kp.signPersonalMessage(new TextEncoder().encode('hello'));
		await expect(sessionKey.setPersonalMessageSignature(sig.signature)).rejects.toThrow(
			InvalidPersonalMessageSignatureError,
		);

		// Correct signature sets without error.
		const sig2 = await kp.signPersonalMessage(sessionKey.getPersonalMessage());
		await sessionKey.setPersonalMessageSignature(sig2.signature);
	});

	it('test majority error with 3 out of 5 key servers', async () => {
		const globalFetch = vi.fn();
		global.fetch = globalFetch;
		objectIds = [
			{
				objectId: '0x2304dd255b13eaf5cb471bd5188df946a64f1715ee2b7b02fecf306bd12ceebc',
				weight: 3,
			},
			{
				objectId: '0x81aeaa8c25d2c912e1dc23b4372305b7a602c4ec4cc3e510963bc635e500aa37',
				weight: 2,
			},
		];
		const client = new SealClient({
			suiClient,
			serverConfigs: objectIds,
			verifyKeyServers: false,
		});
		vi.spyOn(client as any, 'getKeyServers').mockResolvedValue(MOCK_KEY_SERVERS);

		// Mock package version check
		vi.spyOn(suiClient.core, 'getObject').mockResolvedValue({
			object: {
				version: '1',
			},
		} as any);

		// Mock fetch responses
		globalFetch
			.mockRejectedValueOnce(new NoAccessError())
			.mockRejectedValueOnce(new NoAccessError())
			.mockRejectedValueOnce(new GeneralError('Other error'))
			.mockRejectedValueOnce(new Error('Other error'))
			.mockRejectedValueOnce(new Error('Other error'));

		const sessionKey = await SessionKey.create({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
			suiClient,
		});

		const whitelistId = '0x5809c296d41e0d6177e8cf956010c1d2387299892bb9122ca4ba4ffd165e05cb';
		await expect(
			client.fetchKeys({
				ids: [whitelistId],
				txBytes: new Uint8Array(),
				sessionKey,
				threshold: 3,
			}),
		).rejects.toThrow(NoAccessError);
		await new Promise((resolve) => setTimeout(resolve, 200));

		expect(globalFetch).toHaveBeenCalledTimes(5);
		vi.clearAllMocks();
		globalFetch.mockReset();
	});

	it('request format consistency', async () => {
		const ptb = fromBase64(
			'AwAgc6azwz4tYzg95cZ4bLrKIx/3ifTIU69tVMuIPYeArcAAISDe5uvO0j2U0BiVWEGtjdvQnUC72Sq201YSNqRReUMvBQEB3ubrztI9lNAYlVhBrY3b0J1Au9kqttNWEjakUXlDLwUDAAAAAAAAAAABALHxZ0ncLwzAjQNFRWiOb7wXhst+Zg+aiJfb/iAC64pLCXdoaXRlbGlzdAxzZWFsX2FwcHJvdmUAAwEAAAEBAAECAA==',
		);
		const egPk = fromBase64('kYnVekxioRVbLVBBuxK0AkRI5cOqrpsfYF9+MM7U/5mes7Ihn/FPv0alcf2r/W5v');
		const egVk = fromBase64(
			'meFzamsJjgsVK0aOOoEZvFgMyRG+bHLHQ3PkTA+FwdiXxivxFpnR0g7nYBo6g8nLCgIHwb+N4UY9A4Vt4yFuRdZIUveHqwqH4n4yGdCOj3nmOAGxQGC7cBR6sQ+0znbm',
		);
		const requestFormat = RequestFormat.serialize({
			ptb,
			encKey: egPk,
			encVerificationKey: egVk,
		}).toBytes();
		expect(toBase64(requestFormat)).toEqual(
			'tQEDACBzprPDPi1jOD3lxnhsusojH/eJ9MhTr21Uy4g9h4CtwAAhIN7m687SPZTQGJVYQa2N29CdQLvZKrbTVhI2pFF5Qy8FAQHe5uvO0j2U0BiVWEGtjdvQnUC72Sq201YSNqRReUMvBQMAAAAAAAAAAAEAsfFnSdwvDMCNA0VFaI5vvBeGy35mD5qIl9v+IALriksJd2hpdGVsaXN0DHNlYWxfYXBwcm92ZQADAQAAAQEAAQIAMJGJ1XpMYqEVWy1QQbsStAJESOXDqq6bH2BffjDO1P+ZnrOyIZ/xT79GpXH9q/1ub2CZ4XNqawmOCxUrRo46gRm8WAzJEb5scsdDc+RMD4XB2JfGK/EWmdHSDudgGjqDycsKAgfBv43hRj0DhW3jIW5F1khS94erCofifjIZ0I6PeeY4AbFAYLtwFHqxD7TOduY=',
		);
	});
	it('to majority error', async () => {
		const errors = [
			new NoAccessError(),
			new NoAccessError(),
			new InvalidPTBError(),
			new NoAccessError(),
			new ExpiredSessionKeyError(),
		];
		const majorityError = toMajorityError(errors);
		expect(majorityError).toBeInstanceOf(NoAccessError);
	});
});
