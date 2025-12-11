// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { deepbook } from '../src/client.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const GRPC_URLS = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
} as const;

(async () => {
	const env = 'testnet';
	const client = new SuiGrpcClient({ network: env, baseUrl: GRPC_URLS[env] }).$extend(
		deepbook({
			address: '0x0',
			env: env,
		}),
	);

	console.log('=== Testing DeepBook Client Functions ===\n');

	// Original read-only calls
	console.log('--- Original Functions ---');
	try {
		console.log(
			'Manager Balance (SUI):',
			await client.deepbook.checkManagerBalance('MANAGER_1', 'SUI'),
		);
		console.log(
			'Level 2 Range (SUI_DBUSDC):',
			await client.deepbook.getLevel2Range('SUI_DBUSDC', 0.1, 100, true),
		);
	} catch (error) {
		console.log('Error with original functions:', (error as Error).message);
	}

	console.log('\n--- Testing New Margin Pool Functions ---');

	// Test margin pool functions for SUI
	const coinKey = 'SUI';
	const testSupplierCapId = '0x2e0d4a8deabf642108f4492134f72b7e14e327adbaf57db83f9ba5e7ed2a0fc4'; // Example supplier cap ID
	const testDeepbookPoolId = '0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5'; // Example deepbook pool ID

	try {
		// Test basic margin pool info
		console.log('\n1. Basic Margin Pool Information:');
		const marginPoolId = await client.deepbook.getMarginPoolId(coinKey);
		console.log(`Margin Pool ID (${coinKey}):`, marginPoolId);

		const isAllowed = await client.deepbook.isDeepbookPoolAllowed(coinKey, testDeepbookPoolId);
		console.log(`Deepbook Pool Allowed (${coinKey}):`, isAllowed);

		// Test supply/borrow statistics
		console.log('\n2. Supply/Borrow Statistics:');
		const totalSupply = await client.deepbook.getMarginPoolTotalSupply(coinKey, 6);
		console.log(`Total Supply (${coinKey}):`, totalSupply);

		const supplyShares = await client.deepbook.getMarginPoolSupplyShares(coinKey, 6);
		console.log(`Supply Shares (${coinKey}):`, supplyShares);

		const totalBorrow = await client.deepbook.getMarginPoolTotalBorrow(coinKey, 6);
		console.log(`Total Borrow (${coinKey}):`, totalBorrow);

		const borrowShares = await client.deepbook.getMarginPoolBorrowShares(coinKey, 6);
		console.log(`Borrow Shares (${coinKey}):`, borrowShares);

		// Test timestamps and configuration
		console.log('\n3. Timestamps and Configuration:');
		const lastUpdate = await client.deepbook.getMarginPoolLastUpdateTimestamp(coinKey);
		console.log(`Last Update Timestamp (${coinKey}):`, new Date(lastUpdate).toISOString());

		const supplyCap = await client.deepbook.getMarginPoolSupplyCap(coinKey, 6);
		console.log(`Supply Cap (${coinKey}):`, supplyCap);

		const maxUtilization = await client.deepbook.getMarginPoolMaxUtilizationRate(coinKey);
		console.log(`Max Utilization Rate (${coinKey}):`, `${(maxUtilization * 100).toFixed(2)}%`);

		const protocolSpread = await client.deepbook.getMarginPoolProtocolSpread(coinKey);
		console.log(`Protocol Spread (${coinKey}):`, `${(protocolSpread * 100).toFixed(4)}%`);

		const minBorrow = await client.deepbook.getMarginPoolMinBorrow(coinKey, 6);
		console.log(`Min Borrow (${coinKey}):`, minBorrow);

		const interestRate = await client.deepbook.getMarginPoolInterestRate(coinKey);
		console.log(`Interest Rate (${coinKey}):`, `${(interestRate * 100).toFixed(4)}%`);

		// Test user-specific functions (these might fail if supplier cap doesn't exist)
		console.log("\n4. User-Specific Functions (may fail if supplier cap doesn't exist):");
		try {
			const userSupplyShares = await client.deepbook.getUserSupplyShares(
				coinKey,
				testSupplierCapId,
				6,
			);
			console.log(`User Supply Shares (${coinKey}):`, userSupplyShares);

			const userSupplyAmount = await client.deepbook.getUserSupplyAmount(
				coinKey,
				testSupplierCapId,
				6,
			);
			console.log(`User Supply Amount (${coinKey}):`, userSupplyAmount);
		} catch (userError) {
			console.log(
				"User-specific functions failed (expected if supplier cap doesn't exist):",
				(userError as Error).message,
			);
		}

		// Test with DBUSDC as well
		console.log('\n5. Testing with DBUSDC:');
		const dbusdcCoinKey = 'DBUSDC';
		try {
			// Basic information
			const dbusdcMarginPoolId = await client.deepbook.getMarginPoolId(dbusdcCoinKey);
			console.log(`Margin Pool ID (${dbusdcCoinKey}):`, dbusdcMarginPoolId);

			const dbusdcIsAllowed = await client.deepbook.isDeepbookPoolAllowed(
				dbusdcCoinKey,
				testDeepbookPoolId,
			);
			console.log(`Deepbook Pool Allowed (${dbusdcCoinKey}):`, dbusdcIsAllowed);

			// Supply/Borrow Statistics
			const dbusdcTotalSupply = await client.deepbook.getMarginPoolTotalSupply(dbusdcCoinKey, 6);
			console.log(`Total Supply (${dbusdcCoinKey}):`, dbusdcTotalSupply);

			const dbusdcSupplyShares = await client.deepbook.getMarginPoolSupplyShares(dbusdcCoinKey, 6);
			console.log(`Supply Shares (${dbusdcCoinKey}):`, dbusdcSupplyShares);

			const dbusdcTotalBorrow = await client.deepbook.getMarginPoolTotalBorrow(dbusdcCoinKey, 6);
			console.log(`Total Borrow (${dbusdcCoinKey}):`, dbusdcTotalBorrow);

			const dbusdcBorrowShares = await client.deepbook.getMarginPoolBorrowShares(dbusdcCoinKey, 6);
			console.log(`Borrow Shares (${dbusdcCoinKey}):`, dbusdcBorrowShares);

			// Timestamps and Configuration
			const dbusdcLastUpdate =
				await client.deepbook.getMarginPoolLastUpdateTimestamp(dbusdcCoinKey);
			console.log(
				`Last Update Timestamp (${dbusdcCoinKey}):`,
				new Date(dbusdcLastUpdate).toISOString(),
			);

			const dbusdcSupplyCap = await client.deepbook.getMarginPoolSupplyCap(dbusdcCoinKey, 6);
			console.log(`Supply Cap (${dbusdcCoinKey}):`, dbusdcSupplyCap);

			const dbusdcMaxUtilization =
				await client.deepbook.getMarginPoolMaxUtilizationRate(dbusdcCoinKey);
			console.log(
				`Max Utilization Rate (${dbusdcCoinKey}):`,
				`${(dbusdcMaxUtilization * 100).toFixed(2)}%`,
			);

			const dbusdcProtocolSpread = await client.deepbook.getMarginPoolProtocolSpread(dbusdcCoinKey);
			console.log(
				`Protocol Spread (${dbusdcCoinKey}):`,
				`${(dbusdcProtocolSpread * 100).toFixed(4)}%`,
			);

			const dbusdcMinBorrow = await client.deepbook.getMarginPoolMinBorrow(dbusdcCoinKey, 6);
			console.log(`Min Borrow (${dbusdcCoinKey}):`, dbusdcMinBorrow);

			const dbusdcInterestRate = await client.deepbook.getMarginPoolInterestRate(dbusdcCoinKey);
			console.log(`Interest Rate (${dbusdcCoinKey}):`, `${(dbusdcInterestRate * 100).toFixed(4)}%`);

			// User-specific functions (may fail if supplier cap doesn't exist)
			try {
				const dbusdcUserSupplyShares = await client.deepbook.getUserSupplyShares(
					dbusdcCoinKey,
					testSupplierCapId,
					6,
				);
				console.log(`User Supply Shares (${dbusdcCoinKey}):`, dbusdcUserSupplyShares);

				const dbusdcUserSupplyAmount = await client.deepbook.getUserSupplyAmount(
					dbusdcCoinKey,
					testSupplierCapId,
					6,
				);
				console.log(`User Supply Amount (${dbusdcCoinKey}):`, dbusdcUserSupplyAmount);
			} catch (userError) {
				console.log(
					`DBUSDC user-specific functions failed (expected if supplier cap doesn't exist):`,
					(userError as Error).message,
				);
			}
		} catch (dbusdcError) {
			console.log(`DBUSDC margin pool functions failed:`, (dbusdcError as Error).message);
		}
	} catch (error) {
		console.error('Error testing margin pool functions:', (error as Error).message);
		console.error('Stack trace:', (error as Error).stack);
	}
})();
