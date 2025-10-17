// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// Usage:
//   node test/profile.mjs [size_mb] [mode]
//
// Examples:
//   node test/profile.mjs                    # Profile encrypt+decrypt for 10MB
//   node test/profile.mjs 20                 # Profile encrypt+decrypt for 20MB
//   node test/profile.mjs 10 encrypt         # Profile only encryption for 10MB
//   node test/profile.mjs 10 decrypt         # Profile only decryption for 10MB
//   node test/profile.mjs 10 both            # Profile both for 10MB (default)

import { fromHex } from '@mysten/bcs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { SealClient, SessionKey } from '@mysten/seal';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const TESTNET_PACKAGE_ID = '0x8afa5d31dbaa0a8fb07082692940ca3d56b5e856c5126cb5a3693f0a4de63b82';
const WHITELIST_ID = '0x5809c296d41e0d6177e8cf956010c1d2387299892bb9122ca4ba4ffd165e05cb';

async function constructTxBytes(suiClient, packageId, innerId) {
	const tx = new Transaction();
	const keyIdArg = tx.pure.vector('u8', fromHex(innerId));
	const objectArg = tx.object(innerId);
	tx.moveCall({
		target: `${packageId}::allowlist::seal_approve`,
		arguments: [keyIdArg, objectArg],
	});
	return await tx.build({ client: suiClient, onlyTransactionKind: true });
}

async function main() {
	// Parse arguments
	const sizeMB = parseInt(process.argv[2]) || 10;
	const mode = (process.argv[3] || 'both').toLowerCase();

	// Validate arguments
	if (sizeMB <= 0 || sizeMB > 100) {
		console.error('❌ Error: File size must be between 1 and 100 MB');
		process.exit(1);
	}

	if (!['encrypt', 'decrypt', 'both'].includes(mode)) {
		console.error('❌ Error: Mode must be "encrypt", "decrypt", or "both"');
		process.exit(1);
	}

	// Setup
	const keypair = Ed25519Keypair.fromSecretKey(
		'suiprivkey1qqgzvw5zc2zmga0uyp4rzcgk42pzzw6387zqhahr82pp95yz0scscffh2d8',
	);
	const suiAddress = keypair.getPublicKey().toSuiAddress();
	const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

	const client = new SealClient({
		suiClient,
		serverConfigs: [
			{ objectId: '0x3cf2a38f061ede3239c1629cb80a9be0e0676b1c15d34c94d104d4ba9d99076f', weight: 1 },
			{ objectId: '0x81aeaa8c25d2c912e1dc23b4372305b7a602c4ec4cc3e510963bc635e500aa37', weight: 1 },
		],
		verifyKeyServers: false,
	});

	// Warm cache
	console.log('Warming cache...');
	await client.getKeyServers();
	await suiClient.core.getObject({ objectId: TESTNET_PACKAGE_ID });

	// Create session key if decrypt mode
	let sessionKey, txBytes;
	if (mode === 'decrypt' || mode === 'both') {
		console.log('Creating session key...');
		sessionKey = await SessionKey.create({
			address: suiAddress,
			packageId: TESTNET_PACKAGE_ID,
			ttlMin: 10,
			signer: keypair,
			suiClient,
		});
		txBytes = await constructTxBytes(suiClient, TESTNET_PACKAGE_ID, WHITELIST_ID);
	}

	const data = new Uint8Array(sizeMB * 1024 * 1024);
	const modeText = mode === 'both' ? 'encryption + decryption' : mode;
	console.log(`\n🔥 Profiling ${sizeMB}MB ${modeText}...\n`);

	// ENCRYPT
	if (mode === 'encrypt' || mode === 'both') {
		const startEncrypt = Date.now();
		const result = await client.encrypt({
			threshold: 2,
			packageId: TESTNET_PACKAGE_ID,
			id: WHITELIST_ID,
			data,
		});
		const encryptDuration = Date.now() - startEncrypt;
		console.log(`✅ ${sizeMB}MB encrypted in ${(encryptDuration / 1000).toFixed(2)}s`);

		// Store for decrypt mode
		if (mode === 'both') {
			// Use this result for decrypt
			const startDecrypt = Date.now();
			await client.decrypt({
				data: result.encryptedObject,
				sessionKey,
				txBytes,
			});
			const decryptDuration = Date.now() - startDecrypt;
			console.log(`✅ ${sizeMB}MB decrypted in ${(decryptDuration / 1000).toFixed(2)}s`);
		}
	}
	// DECRYPT ONLY
	else if (mode === 'decrypt') {
		// First encrypt to get data
		const result = await client.encrypt({
			threshold: 2,
			packageId: TESTNET_PACKAGE_ID,
			id: WHITELIST_ID,
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
		console.log(`✅ ${sizeMB}MB decrypted in ${(decryptDuration / 1000).toFixed(2)}s`);
	}

	console.log('\n✅ Profiling complete!');
}

main().catch(error => {
	console.error('Error:', error);
	process.exit(1);
});
