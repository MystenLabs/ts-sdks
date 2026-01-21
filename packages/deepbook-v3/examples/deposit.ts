// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This example demonstrates how to create a margin manager, deposit funds into it,
 * and share it - all in a single transaction.
 *
 * The key challenge: deposit commands require the margin manager's object ID,
 * which isn't available until after sharing. The solution is to use
 * `depositDuringInitialization` which accepts a TransactionArgument instead.
 */

import { DeepBookClient } from '../src/client.js';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

async function main() {
	// Initialize the client
	const keypair = Ed25519Keypair.generate(); // Replace with your keypair
	const address = keypair.getPublicKey().toSuiAddress();

	const suiClient = new SuiClient({
		url: getFullnodeUrl('testnet'),
	});

	const dbClient = new DeepBookClient({
		client: suiClient,
		address,
		env: 'testnet',
	});

	console.log('=== Margin Manager Initialization with Deposit ===\n');
	console.log('Address:', address);

	// Define the pool to use
	const poolKey = 'SUI_DBUSDC';

	// Create a transaction
	const tx = new Transaction();

	// Step 1: Create a new margin manager with initializer
	// This returns both the manager and an initializer object needed for sharing
	const { manager, initializer } = tx.add(
		dbClient.marginManager.newMarginManagerWithInitializer(poolKey),
	);

	console.log('Step 1: Created margin manager with initializer');

	// Step 2: Deposit funds into the manager BEFORE sharing
	// This is possible because we use the TransactionArgument (manager) directly
	// instead of looking up by managerKey (which requires the object to be shared first)

	// Deposit base coin (e.g., SUI)
	const baseDepositAmount = 1.0; // 1 SUI
	tx.add(
		dbClient.marginManager.depositDuringInitialization(
			manager,
			poolKey,
			'base', // coinType: 'base', 'quote', 'deep', or a coin key
			baseDepositAmount,
		),
	);
	console.log(`Step 2a: Added deposit of ${baseDepositAmount} base coin`);

	// Deposit quote coin (e.g., DBUSDC)
	const quoteDepositAmount = 100.0; // 100 DBUSDC
	tx.add(
		dbClient.marginManager.depositDuringInitialization(
			manager,
			poolKey,
			'quote', // coinType
			quoteDepositAmount,
		),
	);
	console.log(`Step 2b: Added deposit of ${quoteDepositAmount} quote coin`);

	// Optionally deposit DEEP tokens
	const deepDepositAmount = 10.0; // 10 DEEP
	tx.add(
		dbClient.marginManager.depositDuringInitialization(
			manager,
			poolKey,
			'deep', // coinType
			deepDepositAmount,
		),
	);
	console.log(`Step 2c: Added deposit of ${deepDepositAmount} DEEP`);

	// Step 3: Share the margin manager
	// After this, the manager becomes a shared object with an ID that can be used
	tx.add(dbClient.marginManager.shareMarginManager(poolKey, manager, initializer));
	console.log('Step 3: Added share margin manager command');

	console.log('\n=== Transaction Built Successfully ===');
	console.log('The transaction will:');
	console.log('  1. Create a new margin manager');
	console.log(`  2. Deposit ${baseDepositAmount} base coin`);
	console.log(`  3. Deposit ${quoteDepositAmount} quote coin`);
	console.log(`  4. Deposit ${deepDepositAmount} DEEP`);
	console.log('  5. Share the margin manager');

	// To execute the transaction (uncomment when ready):
	// const result = await suiClient.signAndExecuteTransaction({
	//     transaction: tx,
	//     signer: keypair,
	//     options: {
	//         showEffects: true,
	//         showObjectChanges: true,
	//     },
	// });
	// console.log('\nTransaction result:', result);

	// After execution, you can find the new margin manager's object ID in the
	// transaction effects under "created" objects.
}

main().catch(console.error);
