// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { deepbook } from '../src/client.js';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const GRPC_URLS = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
} as const;

(async () => {
	const network = 'testnet';

	// Configure margin managers with their addresses and pool keys
	const marginManagers = {
		TEST_MANAGER: {
			address: '0x3611a2d9db8b6f37d95e24925601a2e7330a481aa81aa2cfc771314468a467c1',
			poolKey: 'SUI_DBUSDC',
		},
	};

	const client = new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }).$extend(
		deepbook({
			address: '0x0',
			marginManagers: marginManagers,
		}),
	);

	console.log('=== Testing Margin Manager Functions ===\n');

	const marginManagerKey = 'TEST_MANAGER';
	const decimals = 9; // Use 9 decimals for precision

	try {
		console.log('Testing Margin Manager Key:', marginManagerKey);
		console.log('Margin Manager Address:', marginManagers[marginManagerKey].address);
		console.log('Pool Key:', marginManagers[marginManagerKey].poolKey);
		console.log('Decimals:', decimals);
		console.log('');

		// Test 1: Get owner
		console.log('1. Margin Manager Owner:');
		const owner = await client.deepbook.getMarginManagerOwner(marginManagerKey);
		console.log('Owner:', owner);
		console.log('');

		// Test 2: Get DeepBook Pool
		console.log('2. Margin Manager DeepBook Pool:');
		const deepbookPool = await client.deepbook.getMarginManagerDeepbookPool(marginManagerKey);
		console.log('DeepBook Pool ID:', deepbookPool);
		console.log('');

		// Test 3: Get Margin Pool ID
		console.log('3. Margin Manager Margin Pool ID:');
		const marginPoolId = await client.deepbook.getMarginManagerMarginPoolId(marginManagerKey);
		console.log('Margin Pool ID:', marginPoolId);
		console.log('');

		// Test 4: Get Borrowed Shares (both base and quote)
		console.log('4. Margin Manager Borrowed Shares:');
		const borrowedShares = await client.deepbook.getMarginManagerBorrowedShares(marginManagerKey);
		console.log('Base Shares:', borrowedShares.baseShares);
		console.log('Quote Shares:', borrowedShares.quoteShares);
		console.log('');

		// Test 5: Get Borrowed Base Shares
		console.log('5. Margin Manager Borrowed Base Shares:');
		const borrowedBaseShares =
			await client.deepbook.getMarginManagerBorrowedBaseShares(marginManagerKey);
		console.log('Borrowed Base Shares:', borrowedBaseShares);
		console.log('');

		// Test 6: Get Borrowed Quote Shares
		console.log('6. Margin Manager Borrowed Quote Shares:');
		const borrowedQuoteShares =
			await client.deepbook.getMarginManagerBorrowedQuoteShares(marginManagerKey);
		console.log('Borrowed Quote Shares:', borrowedQuoteShares);
		console.log('');

		// Test 7: Check if has base debt
		console.log('7. Margin Manager Has Base Debt:');
		const hasBaseDebt = await client.deepbook.getMarginManagerHasBaseDebt(marginManagerKey);
		console.log('Has Base Debt:', hasBaseDebt);
		console.log('');

		// Test 8: Get Balance Manager ID
		console.log('8. Margin Manager Balance Manager ID:');
		const balanceManagerId =
			await client.deepbook.getMarginManagerBalanceManagerId(marginManagerKey);
		console.log('Balance Manager ID:', balanceManagerId);
		console.log('');

		// Test 9: Get Assets (base and quote)
		console.log('9. Margin Manager Assets (with', decimals, 'decimals):');
		const assets = await client.deepbook.getMarginManagerAssets(marginManagerKey, decimals);
		console.log('Base Asset:', assets.baseAsset);
		console.log('Quote Asset:', assets.quoteAsset);
		console.log('');

		// Test 10: Get Debts (automatically determines base or quote based on hasBaseDebt)
		console.log('10. Margin Manager Debts (with', decimals, 'decimals):');
		const debts = await client.deepbook.getMarginManagerDebts(marginManagerKey, decimals);
		console.log('Base Debt:', debts.baseDebt);
		console.log('Quote Debt:', debts.quoteDebt);
		console.log('');

		console.log('=== All Margin Manager Tests Complete ===');
	} catch (error) {
		console.error('Error testing margin manager functions:', (error as Error).message);
		console.error('Stack trace:', (error as Error).stack);
	}
})();
