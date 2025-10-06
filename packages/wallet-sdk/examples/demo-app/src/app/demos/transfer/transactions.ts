// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { operationType } from '@mysten/wallet-sdk';
import type { SuiClient } from '@mysten/sui/client';

interface TransferTransactionParams {
	senderAddress: string;
	recipient: string;
	coinType: string;
	objectIds?: string[];
}

interface TransferAmountParams extends TransferTransactionParams {
	amount: number;
	coinMetadata?: {
		decimals?: number;
	} | null;
}

/**
 * Creates a transaction to transfer all SUI using tx.gas
 */
export function createTransferAllSuiTransaction({
	senderAddress,
	recipient,
	objectIds = [],
}: TransferTransactionParams): Transaction {
	const tx = new Transaction();

	// Add auto-approval intent for rule set selection
	tx.add(operationType('basic-transfers'));

	tx.setSenderIfNotSet(senderAddress);

	// Transfer all available gas for SUI
	tx.transferObjects([tx.gas], recipient);

	// Transfer additional objects if provided
	if (objectIds.length > 0) {
		const objects = objectIds.map((id) => tx.object(id));
		tx.transferObjects(objects, recipient);
	}

	return tx;
}

/**
 * Creates a transaction to transfer a specific amount of SUI
 */
export function createTransferSuiAmountTransaction({
	senderAddress,
	recipient,
	amount,
	objectIds = [],
}: TransferAmountParams): Transaction {
	const tx = new Transaction();

	// Add auto-approval intent for rule set selection
	tx.add(operationType('basic-transfers'));

	tx.setSenderIfNotSet(senderAddress);

	// SUI transfer with splitCoins from gas
	const amountInMist = amount * 1_000_000_000; // Convert SUI to MIST
	const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
	tx.transferObjects([coin], recipient);

	// Transfer additional objects if provided
	if (objectIds.length > 0) {
		const objects = objectIds.map((id) => tx.object(id));
		tx.transferObjects(objects, recipient);
	}

	return tx;
}

/**
 * Creates a transaction to transfer all coins of a specific type (non-SUI)
 */
export async function createTransferAllCoinsTransaction(
	params: TransferTransactionParams,
	suiClient: SuiClient,
): Promise<Transaction> {
	const { senderAddress, recipient, coinType, objectIds = [] } = params;
	const tx = new Transaction();

	// Add auto-approval intent for rule set selection
	tx.add(operationType('basic-transfers'));

	tx.setSenderIfNotSet(senderAddress);

	// Get all coins of this type
	const coins = await suiClient.getCoins({
		owner: senderAddress,
		coinType,
	});

	if (coins.data.length === 0) {
		throw new Error('No coins of this type found');
	}

	// Transfer all coin objects
	const coinObjects = coins.data.map((coin) => coin.coinObjectId);
	tx.transferObjects(
		coinObjects.map((id) => tx.object(id)),
		recipient,
	);

	// Transfer additional objects if provided
	if (objectIds.length > 0) {
		const objects = objectIds.map((id) => tx.object(id));
		tx.transferObjects(objects, recipient);
	}

	return tx;
}

/**
 * Creates a transaction to transfer a specific amount of non-SUI coins
 */
export async function createTransferCoinAmountTransaction(
	params: TransferAmountParams,
	suiClient: SuiClient,
): Promise<Transaction> {
	const { senderAddress, recipient, coinType, amount, coinMetadata, objectIds = [] } = params;
	const tx = new Transaction();

	// Add auto-approval intent for rule set selection
	tx.add(operationType('basic-transfers'));

	tx.setSenderIfNotSet(senderAddress);

	const decimals = coinMetadata?.decimals ?? 6;
	const transferAmount = BigInt(amount * Math.pow(10, decimals));

	// Get coins of this type
	const coins = await suiClient.getCoins({
		owner: senderAddress,
		coinType,
	});

	if (coins.data.length === 0) {
		throw new Error('No coins of this type found');
	}

	// Use the first coin and split if needed
	const primaryCoin = tx.object(coins.data[0].coinObjectId);

	if (transferAmount < BigInt(coins.data[0].balance)) {
		// Split the coin
		const [splitCoin] = tx.splitCoins(primaryCoin, [transferAmount]);
		tx.transferObjects([splitCoin], recipient);
	} else if (transferAmount === BigInt(coins.data[0].balance)) {
		// Transfer the whole coin
		tx.transferObjects([primaryCoin], recipient);
	} else {
		// Need to merge multiple coins first
		const allCoinObjects = coins.data.map((coin) => tx.object(coin.coinObjectId));
		if (allCoinObjects.length > 1) {
			tx.mergeCoins(allCoinObjects[0], allCoinObjects.slice(1));
		}
		const [splitCoin] = tx.splitCoins(allCoinObjects[0], [transferAmount]);
		tx.transferObjects([splitCoin], recipient);
	}

	// Transfer additional objects if provided
	if (objectIds.length > 0) {
		const objects = objectIds.map((id) => tx.object(id));
		tx.transferObjects(objects, recipient);
	}

	return tx;
}

/**
 * Creates a transaction to transfer objects only (no coins)
 */
export function createTransferObjectsTransaction({
	senderAddress,
	recipient,
	objectIds,
}: {
	senderAddress: string;
	recipient: string;
	objectIds: string[];
}): Transaction {
	const tx = new Transaction();

	// Add auto-approval intent for rule set selection
	tx.add(operationType('basic-transfers'));

	tx.setSenderIfNotSet(senderAddress);

	// Transfer all selected objects
	const objects = objectIds.map((id) => tx.object(id));
	tx.transferObjects(objects, recipient);

	return tx;
}
