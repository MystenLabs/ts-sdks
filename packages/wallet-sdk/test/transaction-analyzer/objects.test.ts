// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { TransactionAnalyzer } from '../../src/transaction-analyzer/analyzer';
import { MockSuiClient } from '../mocks/MockSuiClient';
import {
	DEFAULT_SENDER,
	TEST_COIN_1_ID,
	TEST_SHARED_OBJECT_ID,
	TEST_NFT_ID,
	TEST_PARENT_OWNED_COIN_ID,
	TEST_CONSENSUS_COIN_ID,
} from '../mocks/mockData';

describe('TransactionAnalyzer - Objects Rule', () => {
	it('should analyze all object types in a single transaction', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// Use existing default mock objects which cover all ownership patterns:

		// 1. Use owned objects (address owner)
		const ownedCoin = tx.object(TEST_COIN_1_ID); // 0xa5c000 - AddressOwner

		// 2. Use object with ObjectOwner
		const parentOwnedCoin = tx.object(TEST_PARENT_OWNED_COIN_ID); // ObjectOwner: '0xparent'

		// 3. Use shared object
		const sharedObject = tx.sharedObjectRef({
			objectId: TEST_SHARED_OBJECT_ID, // 0xbeef - shared pool
			mutable: true,
			initialSharedVersion: '1',
		});

		// 4. Use receiving object (NFT owned by different user)
		const receivingObject = tx.receivingRef({
			objectId: TEST_NFT_ID, // 0xdead - owned by 0xbabe
			digest: 'E7YX7zmxdAVVzrGkcoss2ziUHKMa7qBChPbqg5nGQyYo',
			version: '2',
		});

		// 5. Use coin with ConsensusAddressOwner
		const consensusCoin = tx.object(TEST_CONSENSUS_COIN_ID);

		// 6. Use gas coin (should also be tracked)
		tx.splitCoins(tx.gas, [100]);

		// Use all objects in various commands
		tx.moveCall({
			target: '0x999::test::complex_transfer',
			arguments: [ownedCoin, parentOwnedCoin, sharedObject, consensusCoin, receivingObject],
		});

		const analyzer = TransactionAnalyzer.create(client, await tx.toJSON(), {});
		const { results, issues } = await analyzer.analyze();

		expect(issues).toMatchInlineSnapshot(`[]`);

		// Should detect all object IDs (including gas payment)
		expect(results.objectIds).toHaveLength(5);
		expect(results.objectIds).toMatchInlineSnapshot(`
			[
			  "0x0000000000000000000000000000000000000000000000000000000000a5c000",
			  "0x0000000000000000000000000000000000000000000000000000000000a5c004",
			  "0x000000000000000000000000000000000000000000000000000000000000beef",
			  "0x000000000000000000000000000000000000000000000000000000000000dead",
			  "0x0000000000000000000000000000000000000000000000000000000000a5c005",
			]
		`);

		// Should have all objects with ownership info
		expect(results.objects).toHaveLength(5);
		expect(results.objects).toMatchInlineSnapshot(`
			[
			  {
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000a5c000",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			    "version": "100",
			  },
			  {
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000a5c004",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			    "version": "104",
			  },
			  {
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x000000000000000000000000000000000000000000000000000000000000beef",
			    "owner": {
			      "$kind": "Shared",
			      "Shared": {
			        "initialSharedVersion": "1",
			      },
			    },
			    "ownerAddress": null,
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000999::pool::Pool",
			    "version": "1",
			  },
			  {
			    "content": Promise {},
			    "digest": "E7YX7zmxdAVVzrGkcoss2ziUHKMa7qBChPbqg5nGQyYo",
			    "id": "0x000000000000000000000000000000000000000000000000000000000000dead",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0xbabe",
			    },
			    "ownerAddress": "0xbabe",
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000999::nft::NFT",
			    "version": "2",
			  },
			  {
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000a5c005",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			    "version": "105",
			  },
			]
		`);

		// Should filter owned objects (exclude shared and immutable)
		expect(results.ownedObjects).toHaveLength(4);
		expect(results.ownedObjects).toMatchInlineSnapshot(`
			[
			  {
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000a5c000",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			    "version": "100",
			  },
			  {
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000a5c004",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			    "version": "104",
			  },
			  {
			    "content": Promise {},
			    "digest": "E7YX7zmxdAVVzrGkcoss2ziUHKMa7qBChPbqg5nGQyYo",
			    "id": "0x000000000000000000000000000000000000000000000000000000000000dead",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0xbabe",
			    },
			    "ownerAddress": "0xbabe",
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000999::nft::NFT",
			    "version": "2",
			  },
			  {
			    "content": Promise {},
			    "digest": "11111111111111111111111111111111",
			    "id": "0x0000000000000000000000000000000000000000000000000000000000a5c005",
			    "owner": {
			      "$kind": "AddressOwner",
			      "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			    "version": "105",
			  },
			]
		`);

		// Should create objects by ID map
		expect(results.objectsById.size).toBe(5);
		expect(
			results.objectsById.has('0x0000000000000000000000000000000000000000000000000000000000a5c000'),
		).toBe(true);
		expect(
			results.objectsById.has('0x0000000000000000000000000000000000000000000000000000000000a5c004'),
		).toBe(true);
		expect(
			results.objectsById.has('0x000000000000000000000000000000000000000000000000000000000000beef'),
		).toBe(true);

		// Verify specific object details
		const ownedObject = results.objectsById.get(
			'0x0000000000000000000000000000000000000000000000000000000000a5c000',
		);
		expect(ownedObject?.ownerAddress).toBe(DEFAULT_SENDER);

		const sharedObjectResult = results.objectsById.get(
			'0x000000000000000000000000000000000000000000000000000000000000beef',
		);
		expect(sharedObjectResult?.ownerAddress).toBe(null);

		const nftObjectResult = results.objectsById.get(
			'0x000000000000000000000000000000000000000000000000000000000000dead',
		);
		expect(nftObjectResult?.ownerAddress).toBe('0xbabe');
	});
});
