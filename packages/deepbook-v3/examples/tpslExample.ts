// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This example demonstrates how to use the Take Profit / Stop Loss (TPSL) functionality
 * in the DeepBook margin trading system.
 *
 * TPSL allows users to set conditional orders that automatically execute when
 * the price reaches a specified trigger level:
 * - Take Profit: Trigger when price goes above a threshold (sell to lock in profits)
 * - Stop Loss: Trigger when price goes below a threshold (sell to limit losses)
 */

import { execSync } from 'child_process';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

import { DeepBookClient, OrderType, SelfMatchingOptions } from '../src/index.js';

const SUI = process.env.SUI_BINARY ?? `sui`;

export const getActiveAddress = () => {
	return execSync(`${SUI} client active-address`, { encoding: 'utf8' }).trim();
};

export type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

(async () => {
	// ============================================================================
	// CONFIGURATION
	// ============================================================================
	const env = 'testnet';

	// Configure margin managers - update these with your actual margin manager addresses
	const marginManagers = {
		MARGIN_MANAGER_1: {
			address: '0x20f689b98e9afe22b5f4ec2e7e39a1b5fbbbb09e4f1f580a387dcc2015a9abda',
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

	// ============================================================================
	// SECTION 1: READ-ONLY FUNCTIONS
	// These functions query the state of conditional orders without modifying anything
	// ============================================================================

	console.log('\n=== SECTION 1: READ-ONLY FUNCTIONS ===\n');

	// 1.1 Get all conditional order IDs for a margin manager
	try {
		const conditionalOrderIds = await dbClient.getConditionalOrderIds('MARGIN_MANAGER_1');
		console.log('Conditional Order IDs:', conditionalOrderIds);
	} catch (error) {
		console.log('Error getting conditional order IDs:', error);
	}

	// 1.2 Get the lowest trigger price for trigger_above orders (take profit for shorts)
	// Returns MAX_U64 if there are no trigger_above orders
	try {
		const lowestTriggerAbove = await dbClient.getLowestTriggerAbovePrice('MARGIN_MANAGER_1');
		console.log('Lowest Trigger Above Price:', lowestTriggerAbove.toString());
	} catch (error) {
		console.log('Error getting lowest trigger above price:', error);
	}

	// 1.3 Get the highest trigger price for trigger_below orders (stop loss for longs)
	// Returns 0 if there are no trigger_below orders
	try {
		const highestTriggerBelow = await dbClient.getHighestTriggerBelowPrice('MARGIN_MANAGER_1');
		console.log('Highest Trigger Below Price:', highestTriggerBelow.toString());
	} catch (error) {
		console.log('Error getting highest trigger below price:', error);
	}

	// 1.4 Get manager state which includes TPSL trigger prices
	try {
		const managerState = await dbClient.getMarginManagerState('MARGIN_MANAGER_1');
		console.log('Manager State:', {
			managerId: managerState.managerId,
			riskRatio: managerState.riskRatio,
			currentPrice: managerState.currentPrice.toString(),
			lowestTriggerAbovePrice: managerState.lowestTriggerAbovePrice.toString(),
			highestTriggerBelowPrice: managerState.highestTriggerBelowPrice.toString(),
		});
	} catch (error) {
		console.log('Error getting manager state:', error);
	}

	// ============================================================================
	// SECTION 2: TRANSACTION FUNCTIONS
	// These functions create transactions that modify the state of conditional orders
	// ============================================================================

	console.log('\n=== SECTION 2: TRANSACTION FUNCTIONS ===\n');

	const tx = new Transaction();

	// Update Pyth price feeds (required for TPSL operations)
	await dbClient.getPriceInfoObject(tx, 'SUI');
	await dbClient.getPriceInfoObject(tx, 'DBUSDC');

	// ----------------------------------------------------------------------------
	// 2.1 Add a Stop Loss order (trigger when price drops BELOW threshold)
	// This is useful for limiting losses on a long position
	// ----------------------------------------------------------------------------
	console.log('Adding Stop Loss order (trigger below price)...');

	// Stop Loss with a limit order
	dbClient.marginTPSL.addConditionalOrder({
		marginManagerKey: 'MARGIN_MANAGER_1',
		conditionalOrderId: '1001', // Unique ID for this conditional order
		triggerBelowPrice: true, // Trigger when price goes BELOW trigger price
		triggerPrice: 3.5, // Trigger when price drops below 3.5
		pendingOrder: {
			// This is a limit order that will be placed when triggered
			clientOrderId: '2001',
			orderType: OrderType.IMMEDIATE_OR_CANCEL, // IOC - execute immediately or cancel
			selfMatchingOption: SelfMatchingOptions.SELF_MATCHING_ALLOWED,
			price: 3.4, // Sell at 3.4 or better
			quantity: 10, // Sell 10 units
			isBid: false, // This is a sell order
			payWithDeep: true,
			expireTimestamp: Date.now() + 7 * 24 * 60 * 60 * 1000, // Expires in 7 days
		},
	})(tx);

	// Stop Loss with a market order (simpler, but may have slippage)
	dbClient.marginTPSL.addConditionalOrder({
		marginManagerKey: 'MARGIN_MANAGER_1',
		conditionalOrderId: '1002',
		triggerBelowPrice: true,
		triggerPrice: 3.0, // Trigger when price drops below 3.0
		pendingOrder: {
			// This is a market order - no price specified
			clientOrderId: '2002',
			selfMatchingOption: SelfMatchingOptions.SELF_MATCHING_ALLOWED,
			quantity: 5,
			isBid: false, // Sell order
			payWithDeep: true,
		},
	})(tx);

	// ----------------------------------------------------------------------------
	// 2.2 Add a Take Profit order (trigger when price rises ABOVE threshold)
	// This is useful for locking in profits on a long position
	// ----------------------------------------------------------------------------
	console.log('Adding Take Profit order (trigger above price)...');

	// Take Profit with a limit order
	dbClient.marginTPSL.addConditionalOrder({
		marginManagerKey: 'MARGIN_MANAGER_1',
		conditionalOrderId: '1003',
		triggerBelowPrice: false, // Trigger when price goes ABOVE trigger price
		triggerPrice: 5.0, // Trigger when price rises above 5.0
		pendingOrder: {
			clientOrderId: '2003',
			orderType: OrderType.NO_RESTRICTION,
			selfMatchingOption: SelfMatchingOptions.SELF_MATCHING_ALLOWED,
			price: 4.9, // Sell at 4.9 or better
			quantity: 10,
			isBid: false, // Sell order to take profits
			payWithDeep: true,
			expireTimestamp: Date.now() + 30 * 24 * 60 * 60 * 1000, // Expires in 30 days
		},
	})(tx);

	// Take Profit with a market order
	dbClient.marginTPSL.addConditionalOrder({
		marginManagerKey: 'MARGIN_MANAGER_1',
		conditionalOrderId: '1004',
		triggerBelowPrice: false,
		triggerPrice: 6.0, // Trigger when price rises above 6.0
		pendingOrder: {
			clientOrderId: '2004',
			selfMatchingOption: SelfMatchingOptions.SELF_MATCHING_ALLOWED,
			quantity: 5,
			isBid: false,
			payWithDeep: true,
		},
	})(tx);

	// ----------------------------------------------------------------------------
	// 2.3 Cancel a specific conditional order
	// ----------------------------------------------------------------------------
	console.log('Canceling a specific conditional order...');

	dbClient.marginTPSL.cancelConditionalOrder('MARGIN_MANAGER_1', '1002')(tx);

	// ----------------------------------------------------------------------------
	// 2.4 Cancel all conditional orders for a margin manager
	// ----------------------------------------------------------------------------
	console.log('Canceling all conditional orders...');

	dbClient.marginTPSL.cancelAllConditionalOrders('MARGIN_MANAGER_1')(tx);

	// ----------------------------------------------------------------------------
	// 2.5 Execute conditional orders that have been triggered
	// This is a permissionless function - anyone can call it to execute
	// triggered orders and earn keeper rewards
	// ----------------------------------------------------------------------------
	console.log('Executing triggered conditional orders...');

	// Execute up to 10 triggered orders
	dbClient.marginTPSL.executeConditionalOrders('MARGIN_MANAGER_1', 10)(tx);

	// ============================================================================
	// SECTION 3: USING HELPER FUNCTIONS DIRECTLY (Advanced Usage)
	// These functions allow you to build conditional orders manually
	// ============================================================================

	console.log('\n=== SECTION 3: ADVANCED - USING HELPER FUNCTIONS ===\n');

	const tx2 = new Transaction();

	// Update Pyth price feeds
	await dbClient.getPriceInfoObject(tx2, 'SUI');
	await dbClient.getPriceInfoObject(tx2, 'DBUSDC');

	// 3.1 Create a condition manually
	const condition = dbClient.marginTPSL.newCondition(
		'SUI_DBUSDC', // Pool key for price calculation
		true, // triggerBelowPrice
		4.0, // triggerPrice
	)(tx2);

	// 3.2 Create a pending limit order manually
	const pendingLimitOrder = dbClient.marginTPSL.newPendingLimitOrder('SUI_DBUSDC', {
		clientOrderId: '3001',
		orderType: OrderType.IMMEDIATE_OR_CANCEL,
		selfMatchingOption: SelfMatchingOptions.SELF_MATCHING_ALLOWED,
		price: 3.9,
		quantity: 5,
		isBid: false,
		payWithDeep: true,
		expireTimestamp: Date.now() + 7 * 24 * 60 * 60 * 1000,
	})(tx2);

	// 3.3 Create a pending market order manually
	const pendingMarketOrder = dbClient.marginTPSL.newPendingMarketOrder('SUI_DBUSDC', {
		clientOrderId: '3002',
		selfMatchingOption: SelfMatchingOptions.SELF_MATCHING_ALLOWED,
		quantity: 2,
		isBid: true, // Buy order
		payWithDeep: true,
	})(tx2);

	console.log('Created condition and pending orders (for demonstration)');
	console.log('Condition result:', condition);
	console.log('Pending limit order result:', pendingLimitOrder);
	console.log('Pending market order result:', pendingMarketOrder);

	// ============================================================================
	// SIGN AND EXECUTE TRANSACTIONS
	// Sign and execute the transactions using your preferred method.
	// The Transaction objects `tx` and `tx2` are ready to be signed and executed.
	// ============================================================================

	console.log('\n=== TPSL Example Complete ===');
	console.log('Transaction objects `tx` and `tx2` are ready to be signed and executed.');
})();
