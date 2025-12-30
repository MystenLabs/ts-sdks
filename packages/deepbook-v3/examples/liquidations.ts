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
import { fromB64 } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';

import { DeepBookClient } from '../src/index.js';

// Configuration
const RISK_RATIO_THRESHOLD = 50; // Only liquidate managers with risk_ratio below this value
const BATCH_SIZE = 100; // Max managers per transaction

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
		const raw = fromB64(priv);
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
	const env = 'testnet';

	// Liquidation Admin Cap
	// const liquidationAdminCap = '0x1d24d891295b62f3a4d67be48a419478fe3cbc4c9c4dfba0c7037fa79f2cf161';

	// Example liquidation vault ID (replace with actual vault ID after creation)
	const liquidationVaultId = '0x4ca01c55a788a78e9e3375a1790241e1065f222f9fa60505784a6833ea01b5bc';

	const dbClient = new DeepBookClient({
		address: getActiveAddress(),
		env: env,
		client: new SuiClient({
			url: getFullnodeUrl(env),
		}),
	});

	const stateRes = await fetch(
		`https://deepbook-indexer.${env}.mystenlabs.com/margin_manager_states`,
	);
	const data = await stateRes.json();

	// === Liquidation Vault Admin Operations ===

	// 1. Create a new liquidation vault
	// const tx = new Transaction();
	// dbClient.marginLiquidations.createLiquidationVault(liquidationAdminCap)(tx);
	// const res = await signAndExecute(tx, env);
	// console.dir(res, { depth: null });

	// 2. Deposit SUI into the liquidation vault (for liquidating base debt)
	// const tx = new Transaction();
	// dbClient.marginLiquidations.deposit(liquidationVaultId, liquidationAdminCap, 'SUI', 10)(tx);
	// dbClient.marginLiquidations.deposit(liquidationVaultId, liquidationAdminCap, 'DEEP', 100)(tx);
	// const res = await signAndExecute(tx, env);
	// console.dir(res, { depth: null });

	// 3. Deposit DBUSDC into the liquidation vault (for liquidating quote debt)
	// const tx = new Transaction();
	// dbClient.marginLiquidations.deposit(liquidationVaultId, liquidationAdminCap, 'DBUSDC', 10000)(tx);
	// const res = await signAndExecute(tx, env);
	// console.dir(res, { depth: null });

	// 4. Withdraw SUI from the liquidation vault
	// const tx = new Transaction();
	// const withdrawnCoin = dbClient.marginLiquidations.withdraw(
	// 	liquidationVaultId,
	// 	liquidationAdminCap,
	// 	'SUI',
	// 	0.1,
	// )(tx);
	// tx.transferObjects([withdrawnCoin], getActiveAddress());
	// const res = await signAndExecute(tx, env);
	// console.dir(res, { depth: null });

	// === Liquidation Operations ===

	// Filter managers below threshold (data is sorted by risk_ratio ascending)
	const managersToLiquidate = [];
	for (const manager of data) {
		const riskRatio = parseFloat(manager.risk_ratio);
		if (riskRatio >= RISK_RATIO_THRESHOLD) {
			break;
		}
		managersToLiquidate.push(manager);
	}

	if (managersToLiquidate.length === 0) {
		console.log(`No managers with risk_ratio < ${RISK_RATIO_THRESHOLD} to liquidate`);
		return;
	}

	console.log(`Found ${managersToLiquidate.length} managers to liquidate`);

	// Process in batches
	for (let i = 0; i < managersToLiquidate.length; i += BATCH_SIZE) {
		const batch = managersToLiquidate.slice(i, i + BATCH_SIZE);
		const batchNum = Math.floor(i / BATCH_SIZE) + 1;
		const totalBatches = Math.ceil(managersToLiquidate.length / BATCH_SIZE);

		console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} managers)`);

		const tx = new Transaction();

		// Get price info objects for all supported assets
		await dbClient.getPriceInfoObject(tx, 'SUI');
		await dbClient.getPriceInfoObject(tx, 'DBUSDC');
		await dbClient.getPriceInfoObject(tx, 'DEEP');
		await dbClient.getPriceInfoObject(tx, 'DBTC');

		// Add all liquidation calls for this batch
		for (const manager of batch) {
			const poolKey = `${manager.base_asset_symbol}_${manager.quote_asset_symbol}`;
			const baseDebt = parseFloat(manager.base_debt);
			const quoteDebt = parseFloat(manager.quote_debt);

			console.log(
				`  Liquidating ${manager.margin_manager_id} (risk: ${manager.risk_ratio}, pool: ${poolKey})`,
			);

			if (quoteDebt > 0) {
				dbClient.marginLiquidations.liquidateQuote(
					liquidationVaultId,
					manager.margin_manager_id,
					poolKey,
				)(tx);
			} else if (baseDebt > 0) {
				dbClient.marginLiquidations.liquidateBase(
					liquidationVaultId,
					manager.margin_manager_id,
					poolKey,
				)(tx);
			}
		}

		const res = await signAndExecute(tx, env);
		console.dir(res, { depth: null });

		// Sleep 2 seconds before next batch (if there are more batches)
		if (i + BATCH_SIZE < managersToLiquidate.length) {
			console.log('Sleeping 2 seconds before next batch...');
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
	}
})();
