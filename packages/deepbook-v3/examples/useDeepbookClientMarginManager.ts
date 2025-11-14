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

	console.log('=== Testing Margin Manager Functions ===\n');

	// Test margin manager ID
	const marginManagerId = '0x3611a2d9db8b6f37d95e24925601a2e7330a481aa81aa2cfc771314468a467c1';
	const poolKey = 'SUI_DBUSDC'; // Required for type inference
	const decimals = 9; // Use 9 decimals for precision

	try {
		console.log('Testing Margin Manager ID:', marginManagerId);
		console.log('Pool Key:', poolKey);
		console.log('Decimals:', decimals);
		console.log('');

		// Test 1: Get owner
		console.log('1. Margin Manager Owner:');
		const owner = await dbClient.getMarginManagerOwner(poolKey, marginManagerId);
		console.log('Owner:', owner);
		console.log('');

		// Test 2: Get DeepBook Pool
		console.log('2. Margin Manager DeepBook Pool:');
		const deepbookPool = await dbClient.getMarginManagerDeepbookPool(poolKey, marginManagerId);
		console.log('DeepBook Pool ID:', deepbookPool);
		console.log('');

		// Test 3: Get Margin Pool ID
		console.log('3. Margin Manager Margin Pool ID:');
		const marginPoolId = await dbClient.getMarginManagerMarginPoolId(poolKey, marginManagerId);
		console.log('Margin Pool ID:', marginPoolId);
		console.log('');

		// Test 4: Get Borrowed Shares (both base and quote)
		console.log('4. Margin Manager Borrowed Shares:');
		const borrowedShares = await dbClient.getMarginManagerBorrowedShares(poolKey, marginManagerId);
		console.log('Base Shares:', borrowedShares.baseShares);
		console.log('Quote Shares:', borrowedShares.quoteShares);
		console.log('');

		// Test 5: Get Borrowed Base Shares
		console.log('5. Margin Manager Borrowed Base Shares:');
		const borrowedBaseShares = await dbClient.getMarginManagerBorrowedBaseShares(
			poolKey,
			marginManagerId,
		);
		console.log('Borrowed Base Shares:', borrowedBaseShares);
		console.log('');

		// Test 6: Get Borrowed Quote Shares
		console.log('6. Margin Manager Borrowed Quote Shares:');
		const borrowedQuoteShares = await dbClient.getMarginManagerBorrowedQuoteShares(
			poolKey,
			marginManagerId,
		);
		console.log('Borrowed Quote Shares:', borrowedQuoteShares);
		console.log('');

		// Test 7: Check if has base debt
		console.log('7. Margin Manager Has Base Debt:');
		const hasBaseDebt = await dbClient.getMarginManagerHasBaseDebt(poolKey, marginManagerId);
		console.log('Has Base Debt:', hasBaseDebt);
		console.log('');

		// Test 8: Get Balance Manager ID
		console.log('8. Margin Manager Balance Manager ID:');
		const balanceManagerId = await dbClient.getMarginManagerBalanceManagerId(
			poolKey,
			marginManagerId,
		);
		console.log('Balance Manager ID:', balanceManagerId);
		console.log('');

		// Test 9: Get Assets (base and quote)
		console.log('9. Margin Manager Assets (with', decimals, 'decimals):');
		const assets = await dbClient.getMarginManagerAssets(poolKey, marginManagerId, decimals);
		console.log('Base Asset:', assets.baseAsset);
		console.log('Quote Asset:', assets.quoteAsset);
		console.log('');

		// Test 10: Get Debts (automatically determines base or quote based on hasBaseDebt)
		console.log('10. Margin Manager Debts (with', decimals, 'decimals):');
		const debts = await dbClient.getMarginManagerDebts(poolKey, marginManagerId, decimals);
		console.log('Base Debt:', debts.baseDebt);
		console.log('Quote Debt:', debts.quoteDebt);
		console.log('');

		console.log('=== All Margin Manager Tests Complete ===');
	} catch (error) {
		console.error('Error testing margin manager functions:', (error as Error).message);
		console.error('Stack trace:', (error as Error).stack);
	}
})();
