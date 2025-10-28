// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { DeepBookClient } from '../src/client.js';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

(async () => {
	const dbClient = new DeepBookClient({
		client: new SuiClient({
			url: getFullnodeUrl('testnet'),
		}),
		address: '0x0',
		env: 'testnet',
	});

	console.log('=== Testing DeepBook Client Functions ===\n');

	// Original read-only calls
	console.log('--- Original Functions ---');
	try {
		console.log('Manager Balance (SUI):', await dbClient.checkManagerBalance('MANAGER_1', 'SUI'));
		console.log(
			'Level 2 Range (SUI_DBUSDC):',
			await dbClient.getLevel2Range('SUI_DBUSDC', 0.1, 100, true),
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
		const marginPoolId = await dbClient.getMarginPoolId(coinKey);
		console.log(`Margin Pool ID (${coinKey}):`, marginPoolId);

		const isAllowed = await dbClient.isDeepbookPoolAllowed(coinKey, testDeepbookPoolId);
		console.log(`Deepbook Pool Allowed (${coinKey}):`, isAllowed);

		// Test supply/borrow statistics
		console.log('\n2. Supply/Borrow Statistics:');
		const totalSupply = await dbClient.getMarginPoolTotalSupply(coinKey);
		console.log(`Total Supply (${coinKey}):`, totalSupply);

		const supplyShares = await dbClient.getMarginPoolSupplyShares(coinKey);
		console.log(`Supply Shares (${coinKey}):`, supplyShares);

		const totalBorrow = await dbClient.getMarginPoolTotalBorrow(coinKey);
		console.log(`Total Borrow (${coinKey}):`, totalBorrow);

		const borrowShares = await dbClient.getMarginPoolBorrowShares(coinKey);
		console.log(`Borrow Shares (${coinKey}):`, borrowShares);

		// Test timestamps and configuration
		console.log('\n3. Timestamps and Configuration:');
		const lastUpdate = await dbClient.getMarginPoolLastUpdateTimestamp(coinKey);
		console.log(`Last Update Timestamp (${coinKey}):`, new Date(lastUpdate).toISOString());

		const supplyCap = await dbClient.getMarginPoolSupplyCap(coinKey);
		console.log(`Supply Cap (${coinKey}):`, supplyCap);

		const maxUtilization = await dbClient.getMarginPoolMaxUtilizationRate(coinKey);
		console.log(`Max Utilization Rate (${coinKey}):`, `${(maxUtilization * 100).toFixed(2)}%`);

		const protocolSpread = await dbClient.getMarginPoolProtocolSpread(coinKey);
		console.log(`Protocol Spread (${coinKey}):`, `${(protocolSpread * 100).toFixed(4)}%`);

		const minBorrow = await dbClient.getMarginPoolMinBorrow(coinKey);
		console.log(`Min Borrow (${coinKey}):`, minBorrow);

		const interestRate = await dbClient.getMarginPoolInterestRate(coinKey);
		console.log(`Interest Rate (${coinKey}):`, `${(interestRate * 100).toFixed(4)}%`);

		// Test user-specific functions (these might fail if supplier cap doesn't exist)
		console.log("\n4. User-Specific Functions (may fail if supplier cap doesn't exist):");
		try {
			const userSupplyShares = await dbClient.getUserSupplyShares(coinKey, testSupplierCapId);
			console.log(`User Supply Shares (${coinKey}):`, userSupplyShares);

			const userSupplyAmount = await dbClient.getUserSupplyAmount(coinKey, testSupplierCapId);
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
			const dbusdcMarginPoolId = await dbClient.getMarginPoolId(dbusdcCoinKey);
			console.log(`Margin Pool ID (${dbusdcCoinKey}):`, dbusdcMarginPoolId);

			const dbusdcIsAllowed = await dbClient.isDeepbookPoolAllowed(
				dbusdcCoinKey,
				testDeepbookPoolId,
			);
			console.log(`Deepbook Pool Allowed (${dbusdcCoinKey}):`, dbusdcIsAllowed);

			// Supply/Borrow Statistics
			const dbusdcTotalSupply = await dbClient.getMarginPoolTotalSupply(dbusdcCoinKey);
			console.log(`Total Supply (${dbusdcCoinKey}):`, dbusdcTotalSupply);

			const dbusdcSupplyShares = await dbClient.getMarginPoolSupplyShares(dbusdcCoinKey);
			console.log(`Supply Shares (${dbusdcCoinKey}):`, dbusdcSupplyShares);

			const dbusdcTotalBorrow = await dbClient.getMarginPoolTotalBorrow(dbusdcCoinKey);
			console.log(`Total Borrow (${dbusdcCoinKey}):`, dbusdcTotalBorrow);

			const dbusdcBorrowShares = await dbClient.getMarginPoolBorrowShares(dbusdcCoinKey);
			console.log(`Borrow Shares (${dbusdcCoinKey}):`, dbusdcBorrowShares);

			// Timestamps and Configuration
			const dbusdcLastUpdate = await dbClient.getMarginPoolLastUpdateTimestamp(dbusdcCoinKey);
			console.log(
				`Last Update Timestamp (${dbusdcCoinKey}):`,
				new Date(dbusdcLastUpdate).toISOString(),
			);

			const dbusdcSupplyCap = await dbClient.getMarginPoolSupplyCap(dbusdcCoinKey);
			console.log(`Supply Cap (${dbusdcCoinKey}):`, dbusdcSupplyCap);

			const dbusdcMaxUtilization = await dbClient.getMarginPoolMaxUtilizationRate(dbusdcCoinKey);
			console.log(
				`Max Utilization Rate (${dbusdcCoinKey}):`,
				`${(dbusdcMaxUtilization * 100).toFixed(2)}%`,
			);

			const dbusdcProtocolSpread = await dbClient.getMarginPoolProtocolSpread(dbusdcCoinKey);
			console.log(
				`Protocol Spread (${dbusdcCoinKey}):`,
				`${(dbusdcProtocolSpread * 100).toFixed(4)}%`,
			);

			const dbusdcMinBorrow = await dbClient.getMarginPoolMinBorrow(dbusdcCoinKey);
			console.log(`Min Borrow (${dbusdcCoinKey}):`, dbusdcMinBorrow);

			const dbusdcInterestRate = await dbClient.getMarginPoolInterestRate(dbusdcCoinKey);
			console.log(`Interest Rate (${dbusdcCoinKey}):`, `${(dbusdcInterestRate * 100).toFixed(4)}%`);

			// User-specific functions (may fail if supplier cap doesn't exist)
			try {
				const dbusdcUserSupplyShares = await dbClient.getUserSupplyShares(
					dbusdcCoinKey,
					testSupplierCapId,
				);
				console.log(`User Supply Shares (${dbusdcCoinKey}):`, dbusdcUserSupplyShares);

				const dbusdcUserSupplyAmount = await dbClient.getUserSupplyAmount(
					dbusdcCoinKey,
					testSupplierCapId,
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
