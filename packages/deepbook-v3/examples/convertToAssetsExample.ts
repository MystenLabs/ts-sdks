// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This example demonstrates how to:
 * 1. Get aToken balances for an address
 * 2. Dry run convert_to_assets to see how much underlying asset you'd get
 *
 * The pattern for dry running Move functions:
 * 1. Create a Transaction and add a moveCall
 * 2. Use simulateTransaction with { commandResults: true }
 * 3. Parse the return value from BCS bytes
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const GRPC_URLS = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
} as const;

type Network = 'mainnet' | 'testnet';

// Abyss Vault package ID (mainnet)
const ABYSS_VAULT_PACKAGE_ID = '0x90a75f641859f4d77a4349d67e518e1dd9ecb4fac079e220fa46b7a7f164e0a5';
const ABYSS_VAULT_MODULE = 'abyss_vault';

// Asset types (mainnet)
const ASSET_TYPES = {
	SUI: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
	USDC: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
	DEEP: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
	WAL: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
} as const;

// AToken types (mainnet) - pattern: AToken<AssetType>
const ATOKEN_TYPES = {
	aSUI: `${ABYSS_VAULT_PACKAGE_ID}::${ABYSS_VAULT_MODULE}::AToken<${ASSET_TYPES.SUI}>`,
	aUSDC: `${ABYSS_VAULT_PACKAGE_ID}::${ABYSS_VAULT_MODULE}::AToken<${ASSET_TYPES.USDC}>`,
	aDEEP: `${ABYSS_VAULT_PACKAGE_ID}::${ABYSS_VAULT_MODULE}::AToken<${ASSET_TYPES.DEEP}>`,
	aWAL: `${ABYSS_VAULT_PACKAGE_ID}::${ABYSS_VAULT_MODULE}::AToken<${ASSET_TYPES.WAL}>`,
} as const;

// Decimals for each asset
const DECIMALS = {
	SUI: 9,
	USDC: 6,
	DEEP: 6,
	WAL: 9,
} as const;

// Vault object IDs (mainnet)
const VAULT_IDS = {
	SUI: '0x670c12c8ea3981be65b8b11915c2ba1832b4ebde160b03cd7790021920a8ce68',
	USDC: '0x86cd17116a5c1bc95c25296a901eb5ea91531cb8ba59d01f64ee2018a14d6fa5',
	DEEP: '0xec54bde40cf2261e0c5d9c545f51c67a9ae5a8add9969c7e4cdfe1d15d4ad92e',
	WAL: '0x09b367346a0fc3709e32495e8d522093746ddd294806beff7e841c9414281456',
} as const;

// MarginPool object IDs (mainnet)
const MARGIN_POOL_IDS = {
	SUI: '0x53041c6f86c4782aabbfc1d4fe234a6d37160310c7ee740c915f0a01b7127344',
	USDC: '0xba473d9ae278f10af75c50a8fa341e9c6a1c087dc91a3f23e8048baf67d0754f',
	DEEP: '0x1d723c5cd113296868b55208f2ab5a905184950dd59c48eb7345607d6b5e6af7',
	WAL: '0x38decd3dbb62bd4723144349bf57bc403b393aee86a51596846a824a1e0c2c01',
} as const;

type AssetKey = keyof typeof ASSET_TYPES;

/**
 * Dry run convert_to_assets and return the u64 result.
 *
 * public fun convert_to_assets<Asset, AToken>(
 *     vault: &Vault<Asset, AToken>,
 *     margin_pool: &MarginPool<Asset>,
 *     atoken_amount: u64,
 *     clock: &Clock,
 * ): u64
 */
async function getConvertToAssets(
	client: SuiGrpcClient,
	vaultId: string,
	marginPoolId: string,
	atokenAmount: bigint,
	assetType: string,
	aTokenType: string,
): Promise<bigint> {
	const tx = new Transaction();

	tx.moveCall({
		target: `${ABYSS_VAULT_PACKAGE_ID}::${ABYSS_VAULT_MODULE}::convert_to_assets`,
		typeArguments: [assetType, aTokenType],
		arguments: [
			tx.object(vaultId),
			tx.object(marginPoolId),
			tx.pure.u64(atokenAmount),
			tx.object.clock(),
		],
	});

	const res = await client.simulateTransaction({
		transaction: tx,
		include: { commandResults: true },
	});

	const bytes = res.commandResults![0].returnValues[0].bcs;
	const assetAmount = bcs.U64.parse(bytes);

	return BigInt(assetAmount);
}

/**
 * Get aToken balance and convert to underlying asset amount
 */
async function getATokenBalanceAndConvert(
	client: SuiGrpcClient,
	owner: string,
	asset: AssetKey,
): Promise<{ aTokenBalance: bigint; assetAmount: bigint; decimals: number }> {
	const aTokenType = ATOKEN_TYPES[`a${asset}` as keyof typeof ATOKEN_TYPES];

	// Get aToken balance
	const balance = await client.getBalance({
		owner,
		coinType: aTokenType,
	});

	const aTokenBalance = BigInt(balance.balance.balance);

	if (aTokenBalance === 0n) {
		return { aTokenBalance: 0n, assetAmount: 0n, decimals: DECIMALS[asset] };
	}

	// Convert to underlying asset amount
	const assetAmount = await getConvertToAssets(
		client,
		VAULT_IDS[asset],
		MARGIN_POOL_IDS[asset],
		aTokenBalance,
		ASSET_TYPES[asset],
		aTokenType,
	);

	return { aTokenBalance, assetAmount, decimals: DECIMALS[asset] };
}

function formatAmount(amount: bigint, decimals: number): string {
	const divisor = BigInt(10 ** decimals);
	const whole = amount / divisor;
	const fraction = amount % divisor;
	const fractionStr = fraction.toString().padStart(decimals, '0');
	return `${whole}.${fractionStr}`;
}

(async () => {
	const network: Network = 'mainnet';
	const client = new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });

	// Address to check aToken balances for
	const owner = '0x7820a145d3d95e4e30308479b6b8e7c7fc89c65f2d526f2b2efe2d18aee928ae';

	console.log(`Network: ${network}`);
	console.log(`Owner: ${owner}\n`);
	console.log('Fetching aToken balances and converting to underlying assets...\n');

	const assets: AssetKey[] = ['SUI', 'USDC', 'DEEP', 'WAL'];

	for (const asset of assets) {
		try {
			const { aTokenBalance, assetAmount, decimals } = await getATokenBalanceAndConvert(
				client,
				owner,
				asset,
			);

			if (aTokenBalance === 0n) {
				console.log(`a${asset}: No balance`);
			} else {
				console.log(`a${asset}:`);
				console.log(`  aToken balance: ${formatAmount(aTokenBalance, decimals)} a${asset}`);
				console.log(`  Asset value:    ${formatAmount(assetAmount, decimals)} ${asset}`);
			}
		} catch (error) {
			console.error(`a${asset}: Error -`, error);
		}
	}
})();
