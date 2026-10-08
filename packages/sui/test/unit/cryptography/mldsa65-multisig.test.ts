// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { bcs } from '../../../src/bcs/index.js';
import { parseSerializedSignature } from '../../../src/cryptography/index.js';
import { Ed25519Keypair } from '../../../src/keypairs/ed25519/index.js';
import { MLDSA65Keypair } from '../../../src/keypairs/mldsa65/index.js';
import {
	MultiSigPublicKey,
	MultiSigSigner,
	parsePartialSignatures,
} from '../../../src/multisig/index.js';
import { MAX_SIGNER_IN_MULTISIG } from '../../../src/multisig/publickey.js';
import { verifyPersonalMessageSignature } from '../../../src/verify/index.js';

const MESSAGE = new TextEncoder().encode('hello');

function hybridCommittee() {
	const ed25519 = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(1));
	const mldsa65 = MLDSA65Keypair.fromSecretKey(new Uint8Array(32).fill(2));
	const publicKey = MultiSigPublicKey.fromPublicKeys({
		threshold: 2,
		publicKeys: [
			{ publicKey: ed25519.getPublicKey(), weight: 1 },
			{ publicKey: mldsa65.getPublicKey(), weight: 1 },
		],
	});
	return { ed25519, mldsa65, publicKey };
}

describe('Multisig with ML-DSA-65 members', () => {
	it('combines and verifies partial signatures from both schemes', async () => {
		const { ed25519, mldsa65, publicKey } = hybridCommittee();

		const sig1 = (await ed25519.signPersonalMessage(MESSAGE)).signature;
		const sig2 = (await mldsa65.signPersonalMessage(MESSAGE)).signature;

		// Partial signatures go in committee order, like every other scheme.
		const multisig = publicKey.combinePartialSignatures([sig1, sig2]);
		expect(await publicKey.verifyPersonalMessage(MESSAGE, multisig)).toBe(true);

		const parsed = parseSerializedSignature(multisig);
		if (parsed.signatureScheme !== 'MultiSig') {
			throw new Error(`expected a MultiSig signature, got ${parsed.signatureScheme}`);
		}
		expect(parsePartialSignatures(parsed.multisig).map((p) => p.signatureScheme)).toEqual([
			'ED25519',
			'MLDSA65',
		]);
		const bytes = bcs.MultiSig.serialize(parsed.multisig, { maxSize: 65536 }).toBytes();
		expect(bcs.MultiSig.parse(bytes)).toEqual(parsed.multisig);

		// The multisig_pk inside the signature round-trips to the same address.
		expect(new MultiSigPublicKey(parsed.multisig.multisig_pk).toSuiAddress()).toEqual(
			publicKey.toSuiAddress(),
		);
		const recovered = await verifyPersonalMessageSignature(MESSAGE, multisig, {
			address: publicKey.toSuiAddress(),
		});
		expect(recovered.toSuiAddress()).toEqual(publicKey.toSuiAddress());

		// One signature does not reach the threshold, and the wrong message fails.
		expect(
			await publicKey.verifyPersonalMessage(MESSAGE, publicKey.combinePartialSignatures([sig2])),
		).toBe(false);
		expect(await publicKey.verifyPersonalMessage(new TextEncoder().encode('bye'), multisig)).toBe(
			false,
		);
	});

	it('signs through MultiSigSigner', async () => {
		const { ed25519, mldsa65, publicKey } = hybridCommittee();
		const signer = new MultiSigSigner(publicKey, [ed25519, mldsa65]);
		const { signature } = await signer.signPersonalMessage(MESSAGE);
		expect(await publicKey.verifyPersonalMessage(MESSAGE, signature)).toBe(true);
		expect(signer.toSuiAddress()).toEqual(publicKey.toSuiAddress());
	});

	it('handles a full committee of ML-DSA-65 members', async () => {
		const keypairs = Array.from({ length: MAX_SIGNER_IN_MULTISIG }, (_, i) =>
			MLDSA65Keypair.fromSecretKey(new Uint8Array(32).fill(i + 1)),
		);
		const publicKey = MultiSigPublicKey.fromPublicKeys({
			threshold: MAX_SIGNER_IN_MULTISIG,
			publicKeys: keypairs.map((keypair) => ({ publicKey: keypair.getPublicKey(), weight: 1 })),
		});
		expect(publicKey.toSuiAddress()).toMatch(/^0x[0-9a-f]{64}$/);

		const signatures = await Promise.all(
			keypairs.map(async (keypair) => (await keypair.signPersonalMessage(MESSAGE)).signature),
		);
		const multisig = publicKey.combinePartialSignatures(signatures);
		expect(await publicKey.verifyPersonalMessage(MESSAGE, multisig)).toBe(true);
	});
});
