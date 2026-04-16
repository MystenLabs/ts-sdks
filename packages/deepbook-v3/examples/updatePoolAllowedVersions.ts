// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Calls `pool::update_pool_allowed_versions` on the CETUS/USDC pool
 * (0x5de09d05...4e51) on mainnet.
 *
 * The CETUS coin and the CETUS/USDC pool are not in the default mainnet maps,
 * so we register them via the `coins` / `pools` options on the deepbook()
 * extension before calling the builder.
 *
 * Usage:
 *   npx tsx examples/updatePoolAllowedVersions.ts
 *
 * Or with a private key:
 *   PRIVATE_KEY=suiprivkey1... npx tsx examples/updatePoolAllowedVersions.ts
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

import { deepbook, mainnetCoins, mainnetPools } from '../src/index.js';

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
	if (network !== 'mainnet') {
		throw new Error(`This example targets mainnet only (active network: ${network}).`);
	}

	const signer = getSigner();
	const address = signer.getPublicKey().toSuiAddress();

	console.log(`Using address: ${address}`);
	console.log(`Network: ${network}\n`);

	const client = new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }).$extend(
		deepbook({
			address,
			coins: {
				...mainnetCoins,
				CETUS: {
					address: '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b',
					type: '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
					scalar: 1_000_000_000, // CETUS has 9 decimals
				},
			},
			pools: {
				...mainnetPools,
				CETUS_USDC: {
					address: '0x5de09d05cb953b0087a39c1fd8403a2ec0084b6a4d5f3379eb5e3587489a4e51',
					baseCoin: 'CETUS',
					quoteCoin: 'USDC', // already present in mainnetCoins
				},
			},
		}),
	);

	try {
		const tx = new Transaction();
		tx.add(client.deepbook.deepBook.updatePoolAllowedVersions('CETUS_USDC'));

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
	} catch (error) {
		console.error('Error:', error);
	}
})();
