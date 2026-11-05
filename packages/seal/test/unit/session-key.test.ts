// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { InvalidPersonalMessageSignatureError } from '../../src/error.js';
import { SessionKey } from '../../src/session-key.js';
import type { SealCompatibleClient } from '../../src/types.js';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';

describe('Session key tests', () => {
	const TESTNET_PACKAGE_ID = '0x9709d4ee371488c2bc09f508e98e881bd1d5335e0805d7e6a99edd54a7027954';
	it('import and export session key', async () => {
		const kp = Ed25519Keypair.generate();
		const suiClient = new SuiGrpcClient({
			network: 'testnet',
			baseUrl: 'https://fullnode.testnet.sui.io:443',
		});
		const sessionKey = await SessionKey.create({
			address: kp.getPublicKey().toSuiAddress(),
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 1,
			suiClient,
		});
		const sig = await kp.signPersonalMessage(sessionKey.getPersonalMessage());
		await sessionKey.setPersonalMessageSignature(sig.signature);

		const exportedSessionKey = sessionKey.export();
		const restoredSessionKey = SessionKey.import(exportedSessionKey, suiClient);

		expect(restoredSessionKey.getAddress()).toBe(kp.getPublicKey().toSuiAddress());
		expect(restoredSessionKey.getPackageId()).toBe(TESTNET_PACKAGE_ID);
		expect(restoredSessionKey.export().sessionKey).toBe(sessionKey.export().sessionKey);
		expect(restoredSessionKey.getPersonalMessage()).toEqual(sessionKey.getPersonalMessage());

		// A signer may differ from the canonical address when it is an address alias.
		const kp2 = Ed25519Keypair.generate();
		const restoredWithAliasSigner = SessionKey.import(
			{
				address: kp.getPublicKey().toSuiAddress(),
				packageId: TESTNET_PACKAGE_ID,
				ttlMin: 1,
				sessionKey: sessionKey.export().sessionKey,
				creationTimeMs: sessionKey.export().creationTimeMs,
				personalMessageSignature: sig.signature,
			},
			suiClient,
			kp2,
		);
		expect(restoredWithAliasSigner.getAddress()).toBe(kp.getPublicKey().toSuiAddress());

		const sessionWithAliasSigner = await SessionKey.create({
			address: kp.getPublicKey().toSuiAddress(),
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 1,
			signer: kp2,
			suiClient,
		});
		const certificate = await sessionWithAliasSigner.getCertificate();
		expect(certificate.user).toBe(kp.getPublicKey().toSuiAddress());
		const certificateSigner = await verifyPersonalMessageSignature(
			sessionWithAliasSigner.getPersonalMessage(),
			certificate.signature,
			{ offline: true },
		);
		expect(certificateSigner.toSuiAddress()).toBe(kp2.getPublicKey().toSuiAddress());
	});

	describe('setPersonalMessageSignature', () => {
		const address = Ed25519Keypair.generate().toSuiAddress();

		function sessionKey(verifySignature: (options: unknown) => Promise<unknown>) {
			const client = { core: { verifySignature } } as unknown as SealCompatibleClient;
			return SessionKey.import(
				{
					address,
					packageId: TESTNET_PACKAGE_ID,
					ttlMin: 1,
					sessionKey: Ed25519Keypair.generate().getSecretKey(),
					creationTimeMs: Date.now(),
				},
				client,
			);
		}

		it('rejects a signature from another address', async () => {
			// Stands in for the node: no address aliases, so the signer must be `address` itself.
			const verifySignature = vi.fn(
				async (options: { personalMessage: Uint8Array; signature: string; address: string }) => ({
					valid: await verifyPersonalMessageSignature(options.personalMessage, options.signature, {
						offline: true,
						address: options.address,
					}).then(
						() => true,
						() => false,
					),
				}),
			);
			const key = sessionKey(verifySignature as never);
			const other = Ed25519Keypair.generate();
			const { signature } = await other.signPersonalMessage(key.getPersonalMessage());

			await expect(key.setPersonalMessageSignature(signature)).rejects.toBeInstanceOf(
				InvalidPersonalMessageSignatureError,
			);
			expect(verifySignature).toHaveBeenCalledWith(expect.objectContaining({ address }));
		});

		it('propagates a node error instead of reporting an invalid signature', async () => {
			const key = sessionKey(() => Promise.reject(new Error('node unavailable')));
			const { signature } = await Ed25519Keypair.generate().signPersonalMessage(
				key.getPersonalMessage(),
			);

			const error = await key.setPersonalMessageSignature(signature).catch((e: unknown) => e);
			expect(error).toBeInstanceOf(Error);
			expect(error).not.toBeInstanceOf(InvalidPersonalMessageSignatureError);
			expect((error as Error).message).toBe('node unavailable');
		});
	});
});
