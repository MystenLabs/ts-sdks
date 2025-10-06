// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';
import { operationType } from '@mysten/wallet-sdk';
import * as demoNftContract from '../../contracts/demo_nft/demo_nft.js';

/**
 * Creates a transaction to mint a new NFT
 */
export function createMintNFTTransaction(params: {
	name: string;
	description: string;
	imageUrl: string;
	senderAddress: string;
}): Transaction {
	const tx = new Transaction();

	// Add auto-approval intent for rule set selection
	tx.add(operationType('nft-operations', 'Mint NFT'));

	// Set sender
	tx.setSenderIfNotSet(params.senderAddress);

	// Use the generated type-safe mint function
	tx.add(
		demoNftContract.mint({
			arguments: {
				name: params.name,
				description: params.description,
				imageUrl: params.imageUrl,
			},
		}),
	);

	return tx;
}
