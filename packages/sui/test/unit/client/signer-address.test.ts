// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { signerAddressFromSignature } from '../../../src/client/signer-address.js';
import { Ed25519Keypair } from '../../../src/keypairs/ed25519/index.js';
import { MLDSA65Keypair } from '../../../src/keypairs/mldsa65/index.js';
import { Secp256k1Keypair } from '../../../src/keypairs/secp256k1/index.js';
import { Secp256r1Keypair } from '../../../src/keypairs/secp256r1/index.js';
import { MultiSigPublicKey } from '../../../src/multisig/index.js';
import {
	parseSerializedZkLoginSignature,
	ZkLoginPublicIdentifier,
} from '../../../src/zklogin/publickey.js';
import { createMockPasskeyKeypair } from '../cryptography/test-utils.js';

const message = new TextEncoder().encode('hello');

// A well-formed zkLogin signature.
const zkLoginSig =
	'BQNNMTczMTgwODkxMjU5NTI0MjE3MzYzNDIyNjM3MTc5MzI3MTk0Mzc3MTc4NDQyODI0MTAxODc5NTc5ODQ3NTE5Mzk5NDI4OTgyNTEyNTBNMTEzNzM5NjY2NDU0NjkxMjI1ODIwNzQwODIyOTU5ODUzODgyNTg4NDA2ODE2MTgyNjg1OTM5NzY2OTczMjU4OTIyODA5MTU2ODEyMDcBMQMCTDU5Mzk4NzExNDczNDg4MzQ5OTczNjE3MjAxMjIyMzg5ODAxNzcxNTIzMDMyNzQzMTEwNDcyNDk5MDU5NDIzODQ5MTU3Njg2OTA4OTVMNDUzMzU2ODI3MTEzNDc4NTI3ODczMTIzNDU3MDM2MTQ4MjY1MTk5Njc0MDc5MTg4ODI4NTg2NDk2Njg4NDAzMjcxNzA0OTgxMTcwOAJNMTA1NjQzODcyODUwNzE1NTU0Njk3NTM5OTA2NjE0MTA4NDAxMTg2MzU5MjU0NjY1OTcwMzcwMTgwNTg3NzAwNDEzNDc1MTg0NjEzNjhNMTI1OTczMjM1NDcyNzc1NzkxNDQ2OTg0OTYzNzIyNDI2MTUzNjgwODU4MDEzMTMzNDMxNTU3MzU1MTEzMzAwMDM4ODQ3Njc5NTc4NTQCATEBMANNMTU3OTE1ODk0NzI1NTY4MjYyNjMyMzE2NDQ3Mjg4NzMzMzc2MjkwMTUyNjk5ODQ2OTk0MDQwNzM2MjM2MDMzNTI1Mzc2Nzg4MTMxNzFMNDU0Nzg2NjQ5OTI0ODg4MTQ0OTY3NjE2MTE1ODAyNDc0ODA2MDQ4NTM3MzI1MDAyOTQyMzkwNDExMzAxNzQyMjUzOTAzNzE2MjUyNwExMXdpYVhOeklqb2lhSFIwY0hNNkx5OXBaQzUwZDJsMFkyZ3VkSFl2YjJGMWRHZ3lJaXcCMmV5SmhiR2NpT2lKU1V6STFOaUlzSW5SNWNDSTZJa3BYVkNJc0ltdHBaQ0k2SWpFaWZRTTIwNzk0Nzg4NTU5NjIwNjY5NTk2MjA2NDU3MDIyOTY2MTc2OTg2Njg4NzI3ODc2MTI4MjIzNjI4MTEzOTE2MzgwOTI3NTAyNzM3OTExCgAAAAAAAABhABHpkQ5JvxqbqCKtqh9M0U5c3o3l62B6ALVOxMq6nsc0y3JlY8Gf1ZoPA976dom6y3JGBUTsry6axfqHcVrtRAy5xu4WMO8+cRFEpkjbBruyKE9ydM++5T/87lA8waSSAA==';

describe('signerAddressFromSignature', () => {
	it('matches the public key address for every scheme', async () => {
		const keypairs = [
			new Ed25519Keypair(),
			new Secp256k1Keypair(),
			new Secp256r1Keypair(),
			MLDSA65Keypair.generate(),
			await createMockPasskeyKeypair(),
		];
		for (const keypair of keypairs) {
			const { signature } = await keypair.signPersonalMessage(message);
			expect(signerAddressFromSignature(signature)).toBe(keypair.toSuiAddress());
		}

		const zkLogin = new ZkLoginPublicIdentifier(
			parseSerializedZkLoginSignature(zkLoginSig).publicKey,
		);
		expect(signerAddressFromSignature(zkLoginSig)).toBe(zkLogin.toSuiAddress());

		const [a, b] = keypairs;
		const multisig = MultiSigPublicKey.fromPublicKeys({
			threshold: 300,
			publicKeys: [
				{ publicKey: a.getPublicKey(), weight: 200 },
				{ publicKey: b.getPublicKey(), weight: 100 },
				{ publicKey: zkLogin, weight: 100 },
			],
		});
		const signature = multisig.combinePartialSignatures([
			(await a.signPersonalMessage(message)).signature,
			(await b.signPersonalMessage(message)).signature,
		]);
		expect(signerAddressFromSignature(signature)).toBe(multisig.toSuiAddress());
	});
});
