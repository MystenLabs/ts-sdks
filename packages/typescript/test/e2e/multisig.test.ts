// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { tmpdir } from 'os';
import path from 'path';
import { fromBase64 } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { decodeSuiPrivateKey } from '../../src/cryptography';
import { Ed25519Keypair } from '../../src/keypairs/ed25519';
import { MultiSigPublicKey } from '../../src/multisig/publickey';
import { Transaction } from '../../src/transactions';
import { getZkLoginSignature } from '../../src/zklogin';
import {
	parseSerializedZkLoginSignature,
	toZkLoginPublicIdentifier,
} from '../../src/zklogin/publickey';
import { DEFAULT_RECIPIENT, execSuiTools, setup, setupWithFundedAddress } from './utils/setup';

describe('MultiSig with zklogin signature', () => {
	it('Execute tx with multisig with 1 sig and 1 zkLogin sig combined', async () => {
		// Get current epoch to generate a valid zkLogin signature with appropriate max epoch
		const tempToolbox = await setup();
		const epoch = await tempToolbox.client.getLatestSuiSystemState();
		const currentEpoch = Number(epoch.epoch);
		const maxEpoch = currentEpoch + 10;

		// Generate a zkLogin signature dynamically using sui keytool
		// This creates a fresh signature with a valid max epoch
		const pmResult = await execSuiTools([
			'sui',
			'keytool',
			'zk-login-insecure-sign-personal-message',
			'--data',
			'hello',
			'--max-epoch',
			maxEpoch.toString(),
		]);

		const pmOutput = pmResult.stdout;
		const pmSigMatch = pmOutput.match(/│\s*sig\s*│\s*(.+?)\s*│/);

		if (!pmSigMatch) {
			throw new Error('Failed to generate zkLogin signature: could not parse output');
		}

		// Parse the generated zkLogin signature to get the public key and proof details
		const tempSig = pmSigMatch[1].trim();
		const parsedZkLogin = parseSerializedZkLoginSignature(tempSig);
		// Create ZkLoginPublicIdentifier from the parsed data
		const pkZklogin = toZkLoginPublicIdentifier(
			parsedZkLogin.zkLogin.addressSeed,
			parsedZkLogin.zkLogin.iss,
			{ legacyAddress: false },
		);

		// set up default single keypair.
		const kp = Ed25519Keypair.fromSecretKey(
			new Uint8Array([
				126, 57, 195, 235, 248, 196, 105, 68, 115, 164, 8, 221, 100, 250, 137, 160, 245, 43, 220,
				168, 250, 73, 119, 95, 19, 242, 100, 105, 81, 114, 86, 105,
			]),
		);
		const pkSingle = kp.getPublicKey();

		// construct multisig address with the dynamically generated zkLogin public key
		const multiSigPublicKey = MultiSigPublicKey.fromPublicKeys({
			threshold: 1,
			publicKeys: [
				{ publicKey: pkSingle, weight: 1 },
				{ publicKey: pkZklogin, weight: 1 },
			],
		});
		const multisigAddr = multiSigPublicKey.toSuiAddress();
		const configPath = path.join(tmpdir(), 'client.yaml');
		const toolbox = await setupWithFundedAddress(kp, multisigAddr, configPath);

		// construct a transfer from the multisig address.
		const tx = new Transaction();
		tx.setSenderIfNotSet(multisigAddr);
		const coin = tx.splitCoins(tx.gas, [1]);
		tx.transferObjects([coin], DEFAULT_RECIPIENT);
		const client = toolbox.client;
		const bytes = await tx.build({ client: toolbox.client });

		// sign with the single keypair.
		const singleSig = (await kp.signTransaction(bytes)).signature;

		// Get the ephemeral keypair that was used to generate the zkLogin signature
		// This is the default ephemeral keypair used by the sui keytool
		const parsed = decodeSuiPrivateKey(
			'suiprivkey1qzdlfxn2qa2lj5uprl8pyhexs02sg2wrhdy7qaq50cqgnffw4c2477kg9h3',
		);
		const ephemeralKeypair = Ed25519Keypair.fromSecretKey(parsed.secretKey);

		// Sign the transaction with the ephemeral keypair
		const ephemeralSig = (await ephemeralKeypair.signTransaction(bytes)).signature;

		// Create zkLogin signature using the dynamically generated proof with the correct maxEpoch
		const zkLoginSig = getZkLoginSignature({
			inputs: parsedZkLogin.zkLogin.inputs,
			maxEpoch: maxEpoch.toString(),
			userSignature: fromBase64(ephemeralSig),
		});

		// combine to multisig and execute the transaction.
		const signature = multiSigPublicKey.combinePartialSignatures([singleSig, zkLoginSig]);
		const result = await client.executeTransactionBlock({
			transactionBlock: bytes,
			signature,
			options: { showEffects: true },
		});
		await client.waitForTransaction({ digest: result.digest });

		// check the execution result and digest.
		const localDigest = await tx.getDigest({ client });
		expect(localDigest).toEqual(result.digest);
		expect(result.effects?.status.status).toEqual('success');
	});
});
