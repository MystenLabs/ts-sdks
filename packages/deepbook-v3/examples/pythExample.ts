// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This example demonstrates how to use the getPriceInfoObjects function
 * to batch update Pyth price feeds for multiple coins efficiently.
 *
 * The batch method:
 * 1. Fetches all price info object ages in a single RPC call
 * 2. Filters to only stale feeds (older than 30 seconds)
 * 3. Fetches all stale price updates from Pyth in a single API call
 * 4. Adds all updates to the transaction
 *
 * This is much more efficient than calling getPriceInfoObject in a loop.
 *
 * Usage:
 *   npx tsx examples/pythExample.ts
 *
 * Or with a private key:
 *   PRIVATE_KEY=suiprivkey1... npx tsx examples/pythExample.ts
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { fromBase64 } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';

import { deepbook } from '../src/index.js';

const SUI = process.env.SUI_BINARY ?? `sui`;

const GRPC_URLS = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
} as const;

type Network = 'mainnet' | 'testnet';

const getActiveAddress = () => {
	return execSync(`${SUI} client active-address`, { encoding: 'utf8' }).trim();
};

const getActiveNetwork = (): Network => {
	const env = execSync(`${SUI} client active-env`, { encoding: 'utf8' }).trim();
	if (env !== 'mainnet' && env !== 'testnet') {
		throw new Error(`Unsupported network: ${env}. Only 'mainnet' and 'testnet' are supported.`);
	}
	return env;
};

const getSigner = () => {
	if (process.env.PRIVATE_KEY) {
		console.log('Using supplied private key.');
		const { scheme, secretKey } = decodeSuiPrivateKey(process.env.PRIVATE_KEY);

		if (scheme === 'ED25519') return Ed25519Keypair.fromSecretKey(secretKey);
		if (scheme === 'Secp256k1') return Secp256k1Keypair.fromSecretKey(secretKey);
		if (scheme === 'Secp256r1') return Secp256r1Keypair.fromSecretKey(secretKey);

		throw new Error('Keypair not supported.');
	}

	const sender = getActiveAddress();

	const keystore = JSON.parse(
		readFileSync(path.join(homedir(), '.sui', 'sui_config', 'sui.keystore'), 'utf8'),
	);

	for (const priv of keystore) {
		const raw = fromBase64(priv);
		if (raw[0] !== 0) {
			continue;
		}

		const pair = Ed25519Keypair.fromSecretKey(raw.slice(1));
		if (pair.getPublicKey().toSuiAddress() === sender) {
			return pair;
		}
	}

	throw new Error(`keypair not found for sender: ${sender}`);
};

(async () => {
	const network = getActiveNetwork();
	const signer = getSigner();
	const address = signer.getPublicKey().toSuiAddress();

	console.log(`Using address: ${address}`);
	console.log(`Network: ${network}\n`);

	const client = new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }).$extend(
		deepbook({ address }),
	);

	// Coins to update prices for
	const coinKeys = ['USDC', 'SUI', 'DEEP', 'WAL', 'SUIUSDE'];

	console.log(`Batch updating Pyth price feeds for: ${coinKeys.join(', ')}\n`);

	try {
		const tx = new Transaction();

		// Batch fetch and update all price feeds
		// Only stale feeds (older than 15 seconds) will be updated
		const priceInfoObjects = await client.deepbook.getPriceInfoObjects(tx, coinKeys);

		console.log('Price Info Objects:');
		for (const [coinKey, objectId] of Object.entries(priceInfoObjects)) {
			console.log(`  ${coinKey}: ${objectId}`);
		}

		// Check if any updates were added to the transaction
		const txData = tx.getData();
		const commandCount = txData.commands.length;

		if (commandCount === 0) {
			console.log('\nAll price feeds are fresh (less than 30 seconds old).');
			console.log('No transaction needed.');
		} else {
			console.log(`\n${commandCount} commands added to transaction for stale feeds.`);
			console.log('Signing and executing transaction...\n');

			const result = await client.signAndExecuteTransaction({
				transaction: tx,
				signer,
				include: {
					effects: true,
				},
			});

			if (result.$kind === 'Transaction') {
				console.log('Transaction successful!');
				console.log('Digest:', result.Transaction.digest);
			} else {
				console.log('Transaction failed!');
				console.log('Error:', result.FailedTransaction.status);
			}
		}
	} catch (error) {
		console.error('Error updating price feeds:', error);
	}
})();
