// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { analyze } from '../../src/transaction-analyzer/analyzer';
import { coins, gasCoins } from '../../src/transaction-analyzer/rules/coins';
import { MockSuiClient } from '../mocks/MockSuiClient';
import {
	DEFAULT_SENDER,
	createAddressOwner,
	TEST_COIN_1_ID,
	TEST_COIN_2_ID,
	TEST_NFT_ID,
} from '../mocks/mockData';

describe('TransactionAnalyzer - Coins Rule', () => {
	it('should analyze all coin-related functionality in a single transaction', async () => {
		const client = new MockSuiClient();

		// Add additional coins to exercise various features
		client.addCoin({
			objectId: '0xabc123',
			coinType: '0xa0b::usdc::USDC',
			balance: 500000000n,
			owner: createAddressOwner(DEFAULT_SENDER),
		});

		client.addCoin({
			objectId: '0xdef456',
			coinType: '0x2::sui::SUI',
			balance: 100000000n,
			owner: { $kind: 'ObjectOwner', ObjectOwner: '0x00parent' },
		});

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// 1. Use SUI coins in various commands
		const suiCoin1 = tx.object(TEST_COIN_1_ID);
		const suiCoin2 = tx.object(TEST_COIN_2_ID);

		// 2. Use USDC coin
		const usdcCoin = tx.object('0xabc123');

		// 3. Use coin with different owner (ObjectOwner)
		const parentOwnedCoin = tx.object('0xdef456');

		// 5. Split/merge operations
		tx.splitCoins(suiCoin1, [100, 200]);
		tx.mergeCoins(suiCoin1, [suiCoin2]);

		// 6. Use gas coin (should appear in gasCoins, not coins)
		tx.splitCoins(tx.gas, [50]);

		// 7. Create vector of coins (nested structure)
		const coinVec = tx.makeMoveVec({
			elements: [suiCoin1, usdcCoin],
		});

		// 8. Use coins in multiple ways (deduplication test)
		tx.moveCall({
			target: '0x999::test::transfer',
			arguments: [suiCoin1, parentOwnedCoin],
		});

		tx.moveCall({
			target: '0x999::test::batch_transfer',
			arguments: [coinVec, suiCoin1], // suiCoin1 used again
		});

		// 9. Include a non-coin object to verify filtering
		const nft = tx.object(TEST_NFT_ID);
		tx.moveCall({
			target: '0x999::test::transfer_nft',
			arguments: [nft],
		});

		const results = await analyze(
			{ coins, gasCoins },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Should detect all coin objects but not the NFT
		expect(Object.keys(results.coins.result)).toHaveLength(4);
		expect(results.coins.result).toMatchInlineSnapshot(`
			{
			  "0x0000000000000000000000000000000000000000000000000000000000a5c000": {
			    "balance": 5000000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000a5c000",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    "previousTransaction": null,
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			    "version": "100",
			  },
			  "0x0000000000000000000000000000000000000000000000000000000000a5c001": {
			    "balance": 2500000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000a5c001",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    "previousTransaction": null,
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			    "version": "101",
			  },
			  "0x0000000000000000000000000000000000000000000000000000000000abc123": {
			    "balance": 500000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC",
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000abc123",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    "previousTransaction": null,
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000a0b::usdc::USDC>",
			    "version": "100",
			  },
			  "0x0000000000000000000000000000000000000000000000000000000000def456": {
			    "balance": 100000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000def456",
			    "owner": {
			      "$kind": "ObjectOwner",
			      "ObjectOwner": "0x00parent",
			    },
			    "ownerAddress": "0x00parent",
			    "previousTransaction": null,
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			    "version": "100",
			  },
			}
		`);

		expect(results.gasCoins.result).toMatchInlineSnapshot(`
			[
			  {
			    "balance": 5000000000n,
			    "coinType": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000a5c000",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    "previousTransaction": null,
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			    "version": "100",
			  },
			]
		`);
	});
});
