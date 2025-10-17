// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex } from '@mysten/bcs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { SealClient, SessionKey } from '@mysten/seal';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const TESTNET_PACKAGE_ID = '0x58dce5d91278bceb65d44666ffa225ab397fc3ae9d8398c8c779c5530bd978c2';

async function constructTxBytes(suiClient, packageId, suiAddress) {
	const tx = new Transaction();
	const keyIdArg = tx.pure.vector('u8', fromHex(suiAddress));
	tx.moveCall({
		target: `${packageId}::account_based::seal_approve`,
		arguments: [keyIdArg],
	});
	return await tx.build({ client: suiClient, onlyTransactionKind: true });
}

async function main() {
	// Parse arguments
	const sizeMB = parseInt(process.argv[2]) || 10;
	const mode = (process.argv[3]).toLowerCase();

	// Validate arguments
	if (sizeMB <= 0 || sizeMB > 100) {
		console.error('Error: File size must be between 1 and 100 MB');
		process.exit(1);
	}

	if (!['encrypt', 'decrypt'].includes(mode)) {
		console.error('Error: Mode must be "encrypt" or "decrypt"');
		process.exit(1);
	}

	// Setup
	const keypair = Ed25519Keypair.generate();
	const suiAddress = keypair.getPublicKey().toSuiAddress();
	const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

	const client = new SealClient({
		suiClient,
		serverConfigs: [
			{ objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', weight: 1 },
			{ objectId: '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', weight: 1 },
		],
		verifyKeyServers: false,
	});

	// Warm cache
	console.log('Warming cache...');
	await client.getKeyServers();
	await suiClient.core.getObject({ objectId: TESTNET_PACKAGE_ID });

	// Create session key if decrypt mode
	let sessionKey, txBytes;
	if (mode === 'decrypt') {
		console.log('Creating session key...');
		sessionKey = await SessionKey.create({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
			suiClient,
		});
		txBytes = await constructTxBytes(suiClient, TESTNET_PACKAGE_ID, suiAddress);
	}

	const data = new Uint8Array(sizeMB * 1024 * 1024);
	console.log(`\n Profiling ${sizeMB}MB ${mode}...\n`);

	// ENCRYPT
	if (mode === 'encrypt') {
		const startEncrypt = Date.now();
		const result = await client.encrypt({
			threshold: 2,
			packageId: TESTNET_PACKAGE_ID,
			id: suiAddress,
			data,
		});
		const encryptDuration = Date.now() - startEncrypt;
		console.log(` ${sizeMB}MB encrypted in ${(encryptDuration / 1000).toFixed(2)}s`);
	}
	// DECRYPT ONLY
	else if (mode === 'decrypt') {
		// First encrypt to get data
		const result = await client.encrypt({
			threshold: 2,
			packageId: TESTNET_PACKAGE_ID,
			id: suiAddress,
			data,
		});

		// Then profile decrypt
		const startDecrypt = Date.now();
		await client.decrypt({
			data: result.encryptedObject,
			sessionKey,
			txBytes,
		});
		const decryptDuration = Date.now() - startDecrypt;
		console.log(` ${sizeMB}MB decrypted in ${(decryptDuration / 1000).toFixed(2)}s`);
	} else {
		console.log('Enter mode encrypt or decrypt');
	}

	console.log('\n Profiling complete!');
}

main().catch(error => {
	console.error('Error:', error);
	process.exit(1);
});
