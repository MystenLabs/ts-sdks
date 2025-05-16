// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, fromHex, toBase64 } from '@mysten/bcs';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
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
import { KeyServerType } from '../../src/key-server';
import { RequestFormat, SessionKey } from '../../src/session-key';
import { decrypt } from '../../src/decrypt';
import { KeyCacheKey } from '../../src/types';
import { G1Element } from '../../src/bls12381';
import { createFullId } from '../../src/utils';
import { DST } from '../../src/ibe';

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
	suiClient: SuiClient,
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
	let suiClient: SuiClient;
	let TESTNET_PACKAGE_ID: string;
	let objectIds: [string, number][];
	beforeAll(async () => {
		keypair = Ed25519Keypair.fromSecretKey(
			'suiprivkey1qqgzvw5zc2zmga0uyp4rzcgk42pzzw6387zqhahr82pp95yz0scscffh2d8',
		);
		suiAddress = keypair.getPublicKey().toSuiAddress();
		suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
		TESTNET_PACKAGE_ID = '0x9709d4ee371488c2bc09f508e98e881bd1d5335e0805d7e6a99edd54a7027954';
		// Object ids pointing to ci key servers' urls
		objectIds = [
			['0x5ff11892a21430921fa7b1e3e0eb63d6d25dff2e0c8eeb6b5a79b37c974e355e', 1],
			['0xe015d62f26a7877de22e6d3c763e97c1aa9a8d064cd79a1bf8fc6b435f7a50b4', 1],
		];
	});

	it('whitelist example encrypt and decrypt scenarios', { timeout: 12000 }, async () => {
		// Both whitelists contain address 0xb743cafeb5da4914cef0cf0a32400c9adfedc5cdb64209f9e740e56d23065100
		const whitelistId = '0xaae704d2280f2c3d24fc08972bb31f2ef1f1c968784935434c3296be5bfd9d5b';
		const whitelistId2 = '0xe40f50789c00e9948ae782fc8c510b6cbe79cfde362bcab29675f1fe9c57fb46';
		const data = new Uint8Array([1, 2, 3]);
		const data2 = new Uint8Array([4, 5, 6]);

		const client = new SealClient({
			suiClient,
			serverObjectIds: objectIds,
			verifyKeyServers: false,
		});

		const { encryptedObject: encryptedBytes } = await client.encrypt({
			threshold: objectIds.length,
			packageId: TESTNET_PACKAGE_ID,
			id: whitelistId,
			data,
		});

		const txBytes = await constructTxBytes(TESTNET_PACKAGE_ID, 'whitelist', suiClient, [
			whitelistId,
		]);

		const sessionKey = new SessionKey({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
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
		const txBytes2 = await constructTxBytes(TESTNET_PACKAGE_ID, 'whitelist', suiClient, [
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
	});

	it('test getDerivedKeys', { timeout: 12000 }, async () => {
		// Both whitelists contain address 0xb743cafeb5da4914cef0cf0a32400c9adfedc5cdb64209f9e740e56d23065100
		const whitelistId = '0xaae704d2280f2c3d24fc08972bb31f2ef1f1c968784935434c3296be5bfd9d5b';
		const data = new Uint8Array([1, 2, 3]);

		const client = new SealClient({
			suiClient,
			serverObjectIds: objectIds,
			verifyKeyServers: false,
		});

		const txBytes = await constructTxBytes(TESTNET_PACKAGE_ID, 'whitelist', suiClient, [
			whitelistId,
		]);

		const sessionKey = new SessionKey({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
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
		const fullId = createFullId(DST, TESTNET_PACKAGE_ID, whitelistId);
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
		const whitelistId = '0xaae704d2280f2c3d24fc08972bb31f2ef1f1c968784935434c3296be5bfd9d5b';
		const data = new Uint8Array([1, 2, 3]);

		const client = suiClient.$extend(
			SealClient.experimental_asClientExtension({
				serverObjectIds: objectIds,
				verifyKeyServers: false,
			}),
		);

		const { encryptedObject: encryptedBytes } = await client.seal.encrypt({
			threshold: objectIds.length,
			packageId: TESTNET_PACKAGE_ID,
			id: whitelistId,
			data,
		});

		const txBytes = await constructTxBytes(TESTNET_PACKAGE_ID, 'whitelist', suiClient, [
			whitelistId,
		]);

		const sessionKey = new SessionKey({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
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
		const whitelistId = '0xaae704d2280f2c3d24fc08972bb31f2ef1f1c968784935434c3296be5bfd9d5b';
		const data = new Uint8Array([1, 2, 3]);

		objectIds = [
			['0x5ff11892a21430921fa7b1e3e0eb63d6d25dff2e0c8eeb6b5a79b37c974e355e', 2],
			['0xe015d62f26a7877de22e6d3c763e97c1aa9a8d064cd79a1bf8fc6b435f7a50b4', 1],
		];

		// encrypt using 2 out of 3
		const clientAllServers = new SealClient({
			suiClient,
			serverObjectIds: objectIds,
			verifyKeyServers: false,
		});

		const { encryptedObject: encryptedBytes } = await clientAllServers.encrypt({
			threshold: 2,
			packageId: TESTNET_PACKAGE_ID,
			id: whitelistId,
			data,
		});

		const txBytes = await constructTxBytes(TESTNET_PACKAGE_ID, 'whitelist', suiClient, [
			whitelistId,
		]);

		const sessionKey = new SessionKey({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
		});

		// client with only 2 servers should suffice
		const client2Servers = new SealClient({
			suiClient,
			serverObjectIds: objectIds.slice(0, 2),
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
			serverObjectIds: objectIds.slice(2),
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
			['0x5ff11892a21430921fa7b1e3e0eb63d6d25dff2e0c8eeb6b5a79b37c974e355e', 1],
			['0xe015d62f26a7877de22e6d3c763e97c1aa9a8d064cd79a1bf8fc6b435f7a50b4', 1],
		];
		const clientDifferentWeight = new SealClient({
			suiClient,
			serverObjectIds: objectIds,
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
		const whitelistId = '0xaae704d2280f2c3d24fc08972bb31f2ef1f1c968784935434c3296be5bfd9d5b';
		const client = new SealClient({
			suiClient,
			serverObjectIds: objectIds,
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
		const sessionKey = new SessionKey({
			address: wrongSuiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
		});
		const sig = await keypair.signPersonalMessage(sessionKey.getPersonalMessage());
		await expect(sessionKey.setPersonalMessageSignature(sig.signature)).rejects.toThrow(
			InvalidPersonalMessageSignatureError,
		);

		// Wrong txBytes fails to verify.
		const sessionKey2 = new SessionKey({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
		});

		const wrongTxBytes = await constructTxBytes(TESTNET_PACKAGE_ID, 'whitelist', suiClient, [
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
			serverObjectIds: objectIds,
			verifyKeyServers: false,
		});

		const sessionKey3 = new SessionKey({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
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
		const sessionKey = new SessionKey({
			address: kp.getPublicKey().toSuiAddress(),
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
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
			['0x5ff11892a21430921fa7b1e3e0eb63d6d25dff2e0c8eeb6b5a79b37c974e355e', 3],
			['0xe015d62f26a7877de22e6d3c763e97c1aa9a8d064cd79a1bf8fc6b435f7a50b4', 2],
		];
		const client = new SealClient({
			suiClient,
			serverObjectIds: objectIds,
			verifyKeyServers: false,
		});
		vi.spyOn(client as any, 'getKeyServers').mockResolvedValue(MOCK_KEY_SERVERS);

		// Mock fetch responses
		globalFetch
			.mockRejectedValueOnce(new NoAccessError())
			.mockRejectedValueOnce(new NoAccessError())
			.mockRejectedValueOnce(new GeneralError('Other error'))
			.mockRejectedValueOnce(new Error('Other error'))
			.mockRejectedValueOnce(new Error('Other error'));

		const sessionKey = new SessionKey({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
		});

		const whitelistId = '0xaae704d2280f2c3d24fc08972bb31f2ef1f1c968784935434c3296be5bfd9d5b';
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
