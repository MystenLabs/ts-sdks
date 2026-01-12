// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { SuiGrpcClient } from '@mysten/sui/grpc';

import { deepbook } from '../src/index.js'; // Adjust import source accordingly

const GRPC_URLS = {
	mainnet: 'https://fullnode.mainnet.sui.io:443',
	testnet: 'https://fullnode.testnet.sui.io:443',
} as const;

/// Example to get [price, quantity] for a balance manager
/// Bids sorted in descending order and asks sorted in ascending order
(async () => {
	const network = 'mainnet';

	const balanceManagers = {
		MANAGER_1: {
			address: '0x344c2734b1d211bd15212bfb7847c66a3b18803f3f5ab00f5ff6f87b6fe6d27d',
			tradeCap: '',
		},
	};

	const client = new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] }).$extend(
		deepbook({
			address: '0x0',
			balanceManagers: balanceManagers,
		}),
	);

	const pools = ['SUI_USDC', 'DEEP_SUI', 'DEEP_USDC', 'WUSDT_USDC', 'WUSDC_USDC', 'BETH_USDC']; // Update pools as needed
	const manager = 'MANAGER_1'; // Update the manager accordingly
	console.log('Manager:', manager);
	for (const pool of pools) {
		const orders = await client.deepbook.accountOpenOrders(pool, manager);
		const bidOrdersMap = new Map<number, number>();
		const askOrdersMap = new Map<number, number>();

		for (const orderId of orders) {
			const order = await client.deepbook.getOrderNormalized(pool, orderId);
			if (!order) {
				continue;
			}
			let remainingQuantity = 0;
			if (order) {
				remainingQuantity = Number(order.quantity) - Number(order.filled_quantity);
			}

			const orderMap = order.isBid ? bidOrdersMap : askOrdersMap;
			const orderPrice = Number(order.normalized_price);
			const existingQuantity = orderMap.get(orderPrice) || 0;
			orderMap.set(orderPrice, existingQuantity + remainingQuantity);
		}

		const sortedBidOrders = Array.from(bidOrdersMap.entries()).sort((a, b) => b[0] - a[0]);
		const sortedAskOrders = Array.from(askOrdersMap.entries()).sort((a, b) => a[0] - b[0]);

		console.log(`${pool} bid orders:`, sortedBidOrders);
		console.log(`${pool} ask orders:`, sortedAskOrders);
	}
})();
