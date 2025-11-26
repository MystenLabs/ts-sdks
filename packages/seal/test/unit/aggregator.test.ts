// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { describe, it, expect } from 'vitest';

import { SealClient } from '../../src/client.js';
import { SessionKey } from '../../src/session-key.js';

/**
 * Committee Aggregator Integration Tests
 *
 * Requires a running aggregator server and committee key servers:
 *   cd /path/to/seal
 *   bash scripts/start-committee-servers.sh
 * Wait for all servers ready and run this test.
 * ✓ Key Server 0 is ready
 * ✓ Key Server 1 is ready
 * ✓ Key Server 2 is ready
 * ✓ Aggregator is ready
 */
describe('Committee Aggregator Tests', () => {
	it('encrypt and decrypt through aggregator', { timeout: 12000 }, async () => {
		// Committee key server configuration
		const COMMITTEE_KEY_SERVER_OBJ_ID =
			'0x0c9b2a1185f42bebdc16baf0a393ec5bd93bab8b0cb902b694198077b27c15da';
		const INDEPENDENT_SERVER_OBJ_ID =
			'0x71a3962c5d06a94d1ef5a9c0e7d63ad72cefb48acc93001eaa7ba13fab52786e';
		// also works with 0x81aeaa8c25d2c912e1dc23b4372305b7a602c4ec4cc3e510963bc635e500aa37
		const AGGREGATOR_URL = 'http://localhost:2027';
		const PACKAGE_ID = '0x58dce5d91278bceb65d44666ffa225ab397fc3ae9d8398c8c779c5530bd978c2'; // Testnet package with account_based policy

		const testKeypair = Ed25519Keypair.generate();
		const testAddress = testKeypair.getPublicKey().toSuiAddress();

		const testData = crypto.getRandomValues(new Uint8Array(100));
		const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

		// Create Seal client with aggregator URL
		const client = new SealClient({
			suiClient,
			serverConfigs: [
				{
					objectId: COMMITTEE_KEY_SERVER_OBJ_ID,
					weight: 1,
					aggregatorUrl: AGGREGATOR_URL,
				},
				{
					objectId: INDEPENDENT_SERVER_OBJ_ID,
					weight: 1,
				},
			],
			verifyKeyServers: false,
		});

		// Encrypt with policy and 2 servers (1 for committee, 1 for independent)
		const { encryptedObject: encryptedBytes } = await client.encrypt({
			threshold: 1,
			packageId: PACKAGE_ID,
			id: testAddress,
			data: testData,
		});

		// Create session key
		const sessionKey = await SessionKey.create({
			address: testAddress,
			packageId: PACKAGE_ID,
			ttlMin: 10,
			signer: testKeypair,
			suiClient,
		});

		// Build transaction
		const tx = new Transaction();
		const keyIdArg = tx.pure.vector('u8', fromHex(testAddress));
		tx.moveCall({
			target: `${PACKAGE_ID}::account_based::seal_approve`,
			arguments: [keyIdArg],
		});
		const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

		// Decrypt data through aggregator
		const decryptedData = await client.decrypt({
			data: encryptedBytes,
			sessionKey,
			txBytes,
		});

		// Verify decrypted data matches original
		expect(decryptedData).toEqual(testData);
	});
});
