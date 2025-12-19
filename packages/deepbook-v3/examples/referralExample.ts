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
import type { Transaction } from '@mysten/sui/transactions';

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
	// Update constant for env
	const env = 'testnet';
	const adminCap = '0x29a62a5385c549dd8e9565312265d2bda0b8700c1560b3e34941671325daae77';
	const marginAdminCap = '0x42a2e769541d272e624c54fff72b878fb0be670776c2b34ef07be5308480650e';
	const marginMaintainerCap = '0xc4bc2b7a2b1f317b8a664294c5cc8501520289c3a6e9b9cc04eef668415b59bf';

	// Initialize with balance managers if needed
	const balanceManagers = {
		BALANCE_MANAGER_1: {
			address: '0x81fd9e1eb2a86643fc84c1e90b908f8a1d30896613c1afede985c041d1e34224',
			tradeCap: '0x46d0afbc50a3af2ee36359ed0624dddf9b7d08807ce96c2d8e65a4c38e3a7e5f',
		},
	};
	const marginManagers = {
		MARGIN_MANAGER_1: {
			address: '0x70a5f28a2400fca515adce1262da0b45ba8f3d1e48f1f2a9568aa29642b5c104',
			poolKey: 'SUI_DBUSDC',
		},
	};

	const suiDbusdcDeepbookReferral =
		'0x35db71e6431935bde42803fdad7f69d4688bc92abb5e1522bbb8aa3db33c5169';
	const deepSuiDeepbookReferral =
		'0x1f6fbf3ecaa948df7b448c932f9f72a604477be63de199d37cee8a9a863c31eb';

	const dbClient = new DeepBookClient({
		address: getActiveAddress(),
		env: env,
		client: new SuiClient({
			url: getFullnodeUrl(env),
		}),
		adminCap,
		marginAdminCap,
		balanceManagers,
		marginManagers,
		marginMaintainerCap,
	});

	// const tx = new Transaction();

	// --- DeepBook Pool Referral Functions ---

	// // 1. Mint a new referral for a pool (multiplier determines fee share)
	// dbClient.deepBook.mintReferral('SUI_DBUSDC', 1)(tx);
	// dbClient.deepBook.mintReferral('DEEP_SUI', 0.5)(tx);

	// // 2. Update the multiplier for an existing referral
	// dbClient.deepBook.updatePoolReferralMultiplier(
	// 	'SUI_DBUSDC',
	// 	suiDbusdcDeepbookReferral,
	// 	0.75,
	// )(tx);

	// // 3. Claim referral rewards (returns base, quote, and deep coins)
	// const { baseRewards, quoteRewards, deepRewards } = dbClient.deepBook.claimPoolReferralRewards(
	// 	'SUI_DBUSDC',
	// 	suiDbusdcDeepbookReferral,
	// )(tx);
	// tx.transferObjects([baseRewards, quoteRewards, deepRewards], getActiveAddress());

	// --- Balance Manager Referral Functions ---

	// // 4. Set a referral for a balance manager (requires tradeCap)
	// dbClient.balanceManager.setBalanceManagerReferral(
	// 	'BALANCE_MANAGER_1',
	// 	suiDbusdcDeepbookReferral,
	// 	tx.object(balanceManagers.BALANCE_MANAGER_1.tradeCap),
	// )(tx);

	// // 5. Unset a referral for a balance manager (requires poolKey and tradeCap)
	// dbClient.balanceManager.unsetBalanceManagerReferral(
	// 	'BALANCE_MANAGER_1',
	// 	'SUI_DBUSDC',
	// 	tx.object(balanceManagers.BALANCE_MANAGER_1.tradeCap),
	// )(tx);

	// --- Margin Manager Referral Functions ---

	// // 6. Set a referral for a margin manager (DeepBookPoolReferral)
	// dbClient.marginManager.setMarginManagerReferral(
	// 	'MARGIN_MANAGER_1',
	// 	suiDbusdcDeepbookReferral,
	// )(tx);

	// // 7. Unset a referral for a margin manager
	// dbClient.marginManager.unsetMarginManagerReferral(
	// 	'MARGIN_MANAGER_1',
	// 	'SUI_DBUSDC',
	// )(tx);

	// // 8. Mint a supply referral for a margin pool
	// dbClient.marginPool.mintSupplyReferral('SUI')(tx);

	// // 9. Withdraw referral fees from a margin pool (requires SupplyReferral object)
	// const suiSupplyReferral = '0xaed597fe1a05b9838b198a3dfa2cdd191b6fa7b319f4c3fc676c7b7348cec194';
	// const referralFees = dbClient.marginPool.withdrawReferralFees('SUI', suiSupplyReferral)(tx);
	// tx.transferObjects([referralFees], getActiveAddress());

	// const res = await signAndExecute(tx, env);
	// console.dir(res, { depth: null });

	// ==========================================
	// Read-only Functions
	// ==========================================

	// --- DeepBook Pool Referral Read-only Functions ---

	// 1. Get referral balances for each pool
	console.log('\n--- DeepBook Pool Referral: getPoolReferralBalances ---');
	const suiDbusdcReferralBalances = await dbClient.getPoolReferralBalances(
		'SUI_DBUSDC',
		suiDbusdcDeepbookReferral,
	);
	console.log('SUI_DBUSDC Referral Balances:', suiDbusdcReferralBalances);

	const deepSuiReferralBalances = await dbClient.getPoolReferralBalances(
		'DEEP_SUI',
		deepSuiDeepbookReferral,
	);
	console.log('DEEP_SUI Referral Balances:', deepSuiReferralBalances);

	// 2. Get multiplier for referrals
	console.log('\n--- DeepBook Pool Referral: poolReferralMultiplier ---');
	console.log(
		'SUI_DBUSDC Multiplier:',
		await dbClient.poolReferralMultiplier('SUI_DBUSDC', suiDbusdcDeepbookReferral),
	);
	console.log(
		'DEEP_SUI Multiplier:',
		await dbClient.poolReferralMultiplier('DEEP_SUI', deepSuiDeepbookReferral),
	);

	// --- Balance Manager Referral Read-only Functions ---

	// 3. Get owner of the referrals
	console.log('\n--- Balance Manager Referral: balanceManagerReferralOwner ---');
	const suiDbusdcReferralOwner =
		await dbClient.balanceManagerReferralOwner(suiDbusdcDeepbookReferral);
	console.log('SUI_DBUSDC Referral Owner:', suiDbusdcReferralOwner);

	const deepSuiReferralOwner = await dbClient.balanceManagerReferralOwner(deepSuiDeepbookReferral);
	console.log('DEEP_SUI Referral Owner:', deepSuiReferralOwner);

	// 4. Get pool ID from referral
	console.log('\n--- Balance Manager Referral: balanceManagerReferralPoolId ---');
	console.log(
		'SUI_DBUSDC Pool ID:',
		await dbClient.balanceManagerReferralPoolId(suiDbusdcDeepbookReferral),
	);
	console.log(
		'DEEP_SUI Pool ID:',
		await dbClient.balanceManagerReferralPoolId(deepSuiDeepbookReferral),
	);

	// 5. Get the referral ID set on the balance manager
	console.log('\n--- Balance Manager Referral: getBalanceManagerReferralId ---');
	const suiDbusdcReferralId = await dbClient.getBalanceManagerReferralId(
		'BALANCE_MANAGER_1',
		'SUI_DBUSDC',
	);
	console.log('SUI_DBUSDC Referral ID on BALANCE_MANAGER_1:', suiDbusdcReferralId);

	const deepSuiReferralId = await dbClient.getBalanceManagerReferralId(
		'BALANCE_MANAGER_1',
		'DEEP_SUI',
	);
	console.log('DEEP_SUI Referral ID on BALANCE_MANAGER_1:', deepSuiReferralId);
})();
