// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { parseStructTag } from '@mysten/sui/utils';
import { operationType } from '@mysten/wallet-sdk';
import { TESTNET_WALRUS_PACKAGE_CONFIG } from '@mysten/walrus';
import type { SuiClient } from '@mysten/sui/client';

interface SwapSuiForWalParams {
	senderAddress: string;
	swapAmount: number; // Amount in SUI
}

/**
 * Creates a transaction to swap SUI for WAL tokens
 */
export async function createSwapSuiForWalTransaction(
	params: SwapSuiForWalParams,
	suiClient: SuiClient,
): Promise<Transaction> {
	const { senderAddress, swapAmount } = params;

	const swapAmountMist = BigInt(swapAmount * 1_000_000_000);

	const tx = new Transaction();

	// Add auto-approval intent for rule set selection
	tx.add(operationType('walrus-operations', 'Swap SUI for WAL'));

	tx.setSenderIfNotSet(senderAddress);

	// Get the exchange object to find the package ID
	const exchange = await suiClient.getObject({
		id: TESTNET_WALRUS_PACKAGE_CONFIG.exchangeIds[2],
		options: { showType: true },
	});

	const exchangePackageId = parseStructTag(exchange.data?.type!).address;

	// Exchange SUI for WAL
	const wal = tx.moveCall({
		package: exchangePackageId,
		module: 'wal_exchange',
		function: 'exchange_all_for_wal',
		arguments: [
			tx.object(TESTNET_WALRUS_PACKAGE_CONFIG.exchangeIds[2]),
			coinWithBalance({ balance: swapAmountMist }),
		],
	});

	tx.transferObjects([wal], senderAddress);

	return tx;
}
