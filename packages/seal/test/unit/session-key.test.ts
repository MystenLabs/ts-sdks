// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { SessionKey } from '../../src/session-key';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { InvalidPersonalMessageSignatureError } from '../../src/error';

describe('Session key tests', () => {
	const TESTNET_PACKAGE_ID = '0x9709d4ee371488c2bc09f508e98e881bd1d5335e0805d7e6a99edd54a7027954';
	it('import and export session key', async () => {
		const kp = Ed25519Keypair.generate();
		const sessionKey = new SessionKey({
			address: kp.getPublicKey().toSuiAddress(),
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 1,
		});
		const sig = await kp.signPersonalMessage(sessionKey.getPersonalMessage());
		await sessionKey.setPersonalMessageSignature(sig.signature);

		const exportedSessionKey = sessionKey.export();
		const restoredSessionKey = await SessionKey.import(exportedSessionKey);

		expect(restoredSessionKey.getAddress()).toBe(kp.getPublicKey().toSuiAddress());
		expect(restoredSessionKey.getPackageId()).toBe(TESTNET_PACKAGE_ID);
		expect(restoredSessionKey.export().sessionKey).toBe(sessionKey.export().sessionKey);
		expect(restoredSessionKey.getPersonalMessage()).toEqual(sessionKey.getPersonalMessage());

		await expect(
			SessionKey.import({
				address: kp.getPublicKey().toSuiAddress(),
				packageId: TESTNET_PACKAGE_ID,
				ttlMin: 1,
				sessionKey: sessionKey.export().sessionKey,
				creationTimeMs: sessionKey.export().creationTimeMs,
				personalMessageSignature: 'invalid',
			}),
		).rejects.toThrowError(InvalidPersonalMessageSignatureError);
	});
});
