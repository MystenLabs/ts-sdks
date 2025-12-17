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
	const liquidationAdminCap = '0xc245aa1bb6c6ae346d9566246403cf53b597147bdd51f20ecf8e947c42b15fa0';

	// Example liquidation vault ID (replace with actual vault ID after creation)
	const liquidationVaultId = '0xffe82b00de73b5815d35f2ee432f42f1420425286b95c9b395cd51109f56b148';

	// Example margin managers to potentially liquidate
	const marginManagers = {
		MARGIN_MANAGER_1: {
			address: '0x70a5f28a2400fca515adce1262da0b45ba8f3d1e48f1f2a9568aa29642b5c104',
			poolKey: 'SUI_DBUSDC',
		},
	};

	const dbClient = new DeepBookClient({
		address: getActiveAddress(),
		env: env,
		client: new SuiClient({
			url: getFullnodeUrl(env),
		}),
		marginManagers,
	});

	const tx = new Transaction();

	const res = await fetch('https://deepbook-indexer.testnet.mystenlabs.com/margin_manager_states');
	const data = await res.json();
	console.log(data);

	// === Liquidation Vault Admin Operations ===

	// 1. Create a new liquidation vault
	// dbClient.marginLiquidations.createLiquidationVault(liquidationAdminCap)(tx);

	// 2. Deposit SUI into the liquidation vault (for liquidating base debt)
	dbClient.marginLiquidations.deposit(liquidationVaultId, liquidationAdminCap, 'SUI', 10)(tx);
	dbClient.marginLiquidations.deposit(liquidationVaultId, liquidationAdminCap, 'DEEP', 100)(tx);

	// 3. Deposit DBUSDC into the liquidation vault (for liquidating quote debt)
	// dbClient.marginLiquidations.deposit(liquidationVaultId, liquidationAdminCap, 'DBUSDC', 10000)(tx);

	// 4. Withdraw SUI from the liquidation vault
	// const withdrawnCoin = dbClient.marginLiquidations.withdraw(
	// 	liquidationVaultId,
	// 	liquidationAdminCap,
	// 	'SUI',
	// 	0.1,
	// )(tx);
	// tx.transferObjects([withdrawnCoin], getActiveAddress());

	// === Liquidation Operations ===

	// 5. Liquidate a margin manager with base debt
	// Note: Requires Pyth price updates before liquidation
	// await dbClient.getPriceInfoObject(tx, 'SUI');
	// await dbClient.getPriceInfoObject(tx, 'DBUSDC');
	// await dbClient.getPriceInfoObject(tx, 'DEEP');
	// await dbClient.getPriceInfoObject(tx, 'DBTC');
	// dbClient.marginLiquidations.liquidateBase(
	// 	liquidationVaultId,
	// 	marginManagers.MARGIN_MANAGER_1.address,
	// 	'SUI_DBUSDC',
	// 	9, // repay 10 SUI
	// )(tx);

	// 6. Liquidate a margin manager with quote debt
	// await dbClient.getPriceInfoObject(tx, 'SUI');
	// await dbClient.getPriceInfoObject(tx, 'DBUSDC');
	// dbClient.marginLiquidations.liquidateQuote(
	// 	liquidationVaultId,
	// 	marginManagers.MARGIN_MANAGER_1.address,
	// 	'SUI_DBUSDC',
	// 	100, // repay 100 DBUSDC
	// )(tx);

	// === Read-Only Operations ===

	// 7. Check vault balance for a specific coin type
	// dbClient.marginLiquidations.balance(liquidationVaultId, 'SUI')(tx);
	// dbClient.marginLiquidations.balance(liquidationVaultId, 'DBUSDC')(tx);

	// Execute transaction
	// const res = await signAndExecute(tx, env);
	// console.dir(res, { depth: null });
})();
