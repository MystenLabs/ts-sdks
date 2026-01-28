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
	const client = new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }).$extend(
		deepbook({
			address: '0x0',
		}),
	);

	console.log('=== Testing Margin Registry Functions ===\n');

	const poolKey = 'SUI_DBUSDC'; // Test pool key
	const testOwner = '0x0000000000000000000000000000000000000000000000000000000000000000'; // Test owner address

	try {
		// Test 1: Check if pool is enabled for margin trading
		console.log('1. Pool Enabled for Margin Trading:');
		const isEnabled = await client.deepbook.isPoolEnabledForMargin(poolKey);
		console.log(`Pool ${poolKey} enabled:`, isEnabled);
		console.log('');

		// Test 2: Get margin manager IDs for an owner
		console.log('2. Margin Manager IDs for Owner:');
		const marginManagerIds = await client.deepbook.getMarginManagerIdsForOwner(testOwner);
		console.log('Margin Manager IDs:', marginManagerIds);
		console.log('Count:', marginManagerIds.length);
		console.log('');

		// Test 3: Get base margin pool ID
		console.log('3. Base Margin Pool ID:');
		const baseMarginPoolId = await client.deepbook.getBaseMarginPoolId(poolKey);
		console.log('Base Margin Pool ID:', baseMarginPoolId);
		console.log('');

		// Test 4: Get quote margin pool ID
		console.log('4. Quote Margin Pool ID:');
		const quoteMarginPoolId = await client.deepbook.getQuoteMarginPoolId(poolKey);
		console.log('Quote Margin Pool ID:', quoteMarginPoolId);
		console.log('');

		// Test 5: Get minimum withdraw risk ratio
		console.log('5. Minimum Withdraw Risk Ratio:');
		const minWithdrawRatio = await client.deepbook.getMinWithdrawRiskRatio(poolKey);
		console.log('Min Withdraw Risk Ratio:', minWithdrawRatio);
		console.log('As Percentage:', `${(minWithdrawRatio * 100).toFixed(2)}%`);
		console.log('');

		// Test 6: Get minimum borrow risk ratio
		console.log('6. Minimum Borrow Risk Ratio:');
		const minBorrowRatio = await client.deepbook.getMinBorrowRiskRatio(poolKey);
		console.log('Min Borrow Risk Ratio:', minBorrowRatio);
		console.log('As Percentage:', `${(minBorrowRatio * 100).toFixed(2)}%`);
		console.log('');

		// Test 7: Get liquidation risk ratio
		console.log('7. Liquidation Risk Ratio:');
		const liquidationRatio = await client.deepbook.getLiquidationRiskRatio(poolKey);
		console.log('Liquidation Risk Ratio:', liquidationRatio);
		console.log('As Percentage:', `${(liquidationRatio * 100).toFixed(2)}%`);
		console.log('');

		// Test 8: Get target liquidation risk ratio
		console.log('8. Target Liquidation Risk Ratio:');
		const targetLiquidationRatio = await client.deepbook.getTargetLiquidationRiskRatio(poolKey);
		console.log('Target Liquidation Risk Ratio:', targetLiquidationRatio);
		console.log('As Percentage:', `${(targetLiquidationRatio * 100).toFixed(2)}%`);
		console.log('');

		// Test 9: Get user liquidation reward
		console.log('9. User Liquidation Reward:');
		const userReward = await client.deepbook.getUserLiquidationReward(poolKey);
		console.log('User Liquidation Reward:', userReward);
		console.log('As Percentage:', `${(userReward * 100).toFixed(4)}%`);
		console.log('');

		// Test 10: Get pool liquidation reward
		console.log('10. Pool Liquidation Reward:');
		const poolReward = await client.deepbook.getPoolLiquidationReward(poolKey);
		console.log('Pool Liquidation Reward:', poolReward);
		console.log('As Percentage:', `${(poolReward * 100).toFixed(4)}%`);
		console.log('');

		// Test 11: Get allowed maintainers
		console.log('11. Allowed Maintainers:');
		const maintainers = await client.deepbook.getAllowedMaintainers();
		console.log('Allowed Maintainer Cap IDs:', maintainers);
		console.log('Count:', maintainers.length);
		console.log('');

		// Test 12: Get allowed pause caps
		console.log('12. Allowed Pause Caps:');
		const pauseCaps = await client.deepbook.getAllowedPauseCaps();
		console.log('Allowed Pause Cap IDs:', pauseCaps);
		console.log('Count:', pauseCaps.length);
		console.log('');

		// Summary of risk ratios
		console.log('=== Risk Ratio Summary ===');
		console.log('Pool:', poolKey);
		console.log(`Min Withdraw:        ${(minWithdrawRatio * 100).toFixed(2)}%`);
		console.log(`Min Borrow:          ${(minBorrowRatio * 100).toFixed(2)}%`);
		console.log(`Liquidation:         ${(liquidationRatio * 100).toFixed(2)}%`);
		console.log(`Target Liquidation:  ${(targetLiquidationRatio * 100).toFixed(2)}%`);
		console.log(`User Reward:         ${(userReward * 100).toFixed(4)}%`);
		console.log(`Pool Reward:         ${(poolReward * 100).toFixed(4)}%`);
		console.log('');

		console.log('=== All Margin Registry Tests Complete ===');
	} catch (error) {
		console.error('Error testing margin registry functions:', (error as Error).message);
		console.error('Stack trace:', (error as Error).stack);
	}
})();
