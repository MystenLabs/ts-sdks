// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';

import { DeepBookClient } from '../src/index.js'; // Adjust path according to new structure

const SUI = process.env.SUI_BINARY ?? `sui`;

export const getActiveAddress = () => {
	return execSync(`${SUI} client active-address`, { encoding: 'utf8' }).trim();
};

export const getSigner = () => {
	if (process.env.PRIVATE_KEY) {
		console.log('Using supplied private key.');
		const { schema, secretKey } = decodeSuiPrivateKey(process.env.PRIVATE_KEY);

		if (schema === 'ED25519') return Ed25519Keypair.fromSecretKey(secretKey);
		if (schema === 'Secp256k1') return Secp256k1Keypair.fromSecretKey(secretKey);
		if (schema === 'Secp256r1') return Secp256r1Keypair.fromSecretKey(secretKey);

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

export const signAndExecute = async (txb: Transaction, network: Network) => {
	const client = getClient(network);
	const signer = getSigner();

	return client.signAndExecuteTransaction({
		transaction: txb,
		signer,
		options: {
			showEffects: true,
			showObjectChanges: true,
		},
	});
};
export const getClient = (network: Network) => {
	const url = process.env.RPC_URL || getFullnodeUrl(network);
	return new SuiClient({ url });
};

export type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

(async () => {
	// Update constant for env
	const env = 'testnet';
	const adminCapID = '0x29a62a5385c549dd8e9565312265d2bda0b8700c1560b3e34941671325daae77';

	// Initialize with balance managers if needed
	const balanceManagers = {
		MANAGER_1: {
			address: '0x9846e63a0574f469b04a3bcc42b6b879740cdf1264ba0aa7f2c2ac6a9cfd1380',
			tradeCap: '',
		},
	};

	const dbClient = new DeepBookClient({
		address: getActiveAddress(),
		env: env,
		client: new SuiClient({
			url: getFullnodeUrl(env),
		}),
		balanceManagers: balanceManagers,
		adminCap: adminCapID,
	});

	const tx = new Transaction();

	// dbClient.deepBookAdmin.enableVersion(2)(tx);

	// dbClient.deepBookAdmin.createPoolAdmin({
	// 	baseCoinKey: 'DEEP',
	// 	quoteCoinKey: 'SUI',
	// 	tickSize: 0.00001,
	// 	lotSize: 10,
	// 	minSize: 100,
	// 	whitelisted: true,
	// 	stablePool: false,
	// })(tx);

	// dbClient.deepBookAdmin.createPoolAdmin({
	// 	baseCoinKey: 'DEEP',
	// 	quoteCoinKey: 'DBUSDC',
	// 	tickSize: 0.00001,
	// 	lotSize: 10,
	// 	minSize: 100,
	// 	whitelisted: true,
	// 	stablePool: false,
	// })(tx);

	// dbClient.deepBookAdmin.createPoolAdmin({
	// 	baseCoinKey: 'SUI',
	// 	quoteCoinKey: 'DBUSDC',
	// 	tickSize: 0.001,
	// 	lotSize: 0.1,
	// 	minSize: 1,
	// 	whitelisted: false,
	// 	stablePool: false,
	// })(tx);

	// dbClient.deepBookAdmin.createPoolAdmin({
	// 	baseCoinKey: 'DBUSDT',
	// 	quoteCoinKey: 'DBUSDC',
	// 	tickSize: 0.00001,
	// 	lotSize: 0.1,
	// 	minSize: 1,
	// 	whitelisted: false,
	// 	stablePool: true,
	// })(tx);

	// dbClient.balanceManager.createAndShareBalanceManager()(tx);
	// dbClient.balanceManager.depositIntoManager('MANAGER_1', 'SUI', 10)(tx);
	// dbClient.balanceManager.depositIntoManager('MANAGER_1', 'DBUSDC', 100)(tx);
	// dbClient.balanceManager.depositIntoManager('MANAGER_1', 'DBUSDT', 100)(tx);
	// dbClient.balanceManager.depositIntoManager('MANAGER_1', 'DEEP', 900)(tx);

	// dbClient.deepBook.placeLimitOrder({
	// 	poolKey: 'DEEP_DBUSDC',
	// 	balanceManagerKey: 'MANAGER_1',
	// 	clientOrderId: '123456789',
	// 	price: 1.01,
	// 	quantity: 100,
	// 	isBid: false,
	// 	// orderType default: no restriction
	// 	// selfMatchingOption default: allow self matching
	// 	// payWithDeep default: true
	// })(tx);

	// dbClient.deepBook.addDeepPricePoint('SUI_DBUSDC', 'DEEP_DBUSDC')(tx);

	// dbClient.deepBook.placeLimitOrder({
	// 	poolKey: 'SUI_DBUSDC',
	// 	balanceManagerKey: 'MANAGER_1',
	// 	clientOrderId: '123456789',
	// 	price: 1,
	// 	quantity: 1,
	// 	isBid: true,
	// 	// orderType default: no restriction
	// 	// selfMatchingOption default: allow self matching
	// 	// payWithDeep default: true
	// })(tx);

	// const [base, quote, deep] = dbClient.deepBook.swapExactBaseForQuote({
	// 	poolKey: 'SUI_DBUSDC',
	// 	amount: 1,
	// 	minOut: 0,
	// 	deepAmount: 1,
	// })(tx);
	// tx.transferObjects([base, quote, deep], getActiveAddress());

	// dbClient.deepBook.placeLimitOrder({
	// 	poolKey: 'DBUSDT_DBUSDC',
	// 	balanceManagerKey: 'MANAGER_1',
	// 	clientOrderId: '123456789',
	// 	price: 1,
	// 	quantity: 10,
	// 	isBid: true,
	// 	payWithDeep: false,
	// })(tx);

	// const [base, quote, deep] = dbClient.deepBook.swapExactBaseForQuote({
	// 	poolKey: 'DBUSDT_DBUSDC',
	// 	amount: 10,
	// 	minOut: 0,
	// 	deepAmount: 0,
	// })(tx);
	// tx.transferObjects([base, quote, deep], getActiveAddress());

	// dbClient.deepBook.createPermissionlessPool({
	// 	baseCoinKey: 'JUWACOIN',
	// 	quoteCoinKey: 'DBUSDC',
	// 	tickSize: 0.00001,
	// 	lotSize: 0.1,
	// 	minSize: 1,
	// })(tx);

	// dbClient.deepBookAdmin.addStableCoin('DBUSDT')(tx);
	// dbClient.deepBookAdmin.addStableCoin('DBUSDC')(tx);
	// dbClient.deepBookAdmin.addStableCoin('JUWACOIN')(tx);

	// dbClient.deepBook.createPermissionlessPool({
	// 	baseCoinKey: 'JUWACOIN',
	// 	quoteCoinKey: 'DBUSDT',
	// 	tickSize: 0.00001,
	// 	lotSize: 0.1,
	// 	minSize: 1,
	// })(tx);

	dbClient.deepBookAdmin.removeStableCoin('JUWACOIN')(tx);

	let res = await signAndExecute(tx, env);

	console.dir(res, { depth: null });
})();
