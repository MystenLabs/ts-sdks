// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { analyze } from '../../src/transaction-analyzer/analyzer';
import { inputs } from '../../src/transaction-analyzer/rules/inputs';
import { bcs } from '@mysten/sui/bcs';
import { MockSuiClient } from '../mocks/MockSuiClient';
import {
	DEFAULT_SENDER,
	TEST_COIN_1_ID,
	TEST_SHARED_OBJECT_ID,
	TEST_NFT_ID,
} from '../mocks/mockData';

describe('TransactionAnalyzer - Inputs Rule', () => {
	it('should analyze all input types in a single transaction', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// 1. Pure inputs - various types
		const u64Value = tx.pure.u64(1000n);
		const addressValue = tx.pure.address('0x456');
		const boolValue = tx.pure.bool(true);
		const stringValue = tx.pure.string('hello world');

		// 2. Complex pure inputs
		const vectorValue = tx.pure.vector('u64', [100n, 200n, 300n]);
		const optionValue = tx.pure(bcs.option(bcs.Address).serialize(normalizeSuiAddress('0x123')));

		// 3. Object inputs - different types
		const ownedObject = tx.object(TEST_COIN_1_ID); // Uses UnresolvedObject resolution
		const sharedObject = tx.sharedObjectRef({
			objectId: TEST_SHARED_OBJECT_ID,
			mutable: true,
			initialSharedVersion: '1',
		});
		const receivingObject = tx.receivingRef({
			objectId: TEST_NFT_ID,
			digest: 'E7YX7zmxdAVVzrGkcoss2ziUHKMa7qBChPbqg5nGQyYo',
			version: '2',
		});

		// 4. Gas coin usage (creates implicit pure input)
		tx.splitCoins(tx.gas, [50]);

		// 5. Use all inputs in various commands to ensure they're analyzed
		tx.moveCall({
			target: '0x999::test::complex_call',
			arguments: [
				ownedObject,
				u64Value,
				addressValue,
				boolValue,
				stringValue,
				vectorValue,
				optionValue,
				sharedObject,
				receivingObject,
			],
		});

		const results = await analyze(
			{ inputs },
			{
				client,
				transactionJson: await tx.toJSON(),
			},
		);

		// Should have 10 inputs: 6 pure values + 1 pure for gas split + 3 objects
		expect(results.inputs.result).toHaveLength(10);
		expect(results.inputs.result).toMatchInlineSnapshot(`
			[
			  {
			    "$kind": "Pure",
			    "accessLevel": "transfer",
			    "bytes": "6AMAAAAAAAA=",
			    "index": 0,
			  },
			  {
			    "$kind": "Pure",
			    "accessLevel": "transfer",
			    "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			    "index": 1,
			  },
			  {
			    "$kind": "Pure",
			    "accessLevel": "transfer",
			    "bytes": "AQ==",
			    "index": 2,
			  },
			  {
			    "$kind": "Pure",
			    "accessLevel": "transfer",
			    "bytes": "C2hlbGxvIHdvcmxk",
			    "index": 3,
			  },
			  {
			    "$kind": "Pure",
			    "accessLevel": "transfer",
			    "bytes": "A2QAAAAAAAAAyAAAAAAAAAAsAQAAAAAAAA==",
			    "index": 4,
			  },
			  {
			    "$kind": "Pure",
			    "accessLevel": "transfer",
			    "bytes": "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEj",
			    "index": 5,
			  },
			  {
			    "$kind": "Object",
			    "accessLevel": "read",
			    "index": 6,
			    "object": {
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
			  },
			  {
			    "$kind": "Object",
			    "accessLevel": "read",
			    "index": 7,
			    "object": {
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
			      "previousTransaction": null,
			      "type": "0x0000000000000000000000000000000000000000000000000000000000000999::pool::Pool",
			      "version": "1",
			    },
			  },
			  {
			    "$kind": "Object",
			    "accessLevel": "read",
			    "index": 8,
			    "object": {
			      "content": Promise {},
			      "digest": "E7YX7zmxdAVVzrGkcoss2ziUHKMa7qBChPbqg5nGQyYo",
			      "id": "0x000000000000000000000000000000000000000000000000000000000000dead",
			      "owner": {
			        "$kind": "AddressOwner",
			        "AddressOwner": "0xbabe",
			      },
			      "ownerAddress": "0xbabe",
			      "previousTransaction": null,
			      "type": "0x0000000000000000000000000000000000000000000000000000000000000999::nft::NFT",
			      "version": "2",
			    },
			  },
			  {
			    "$kind": "Pure",
			    "accessLevel": "transfer",
			    "bytes": "MgAAAAAAAAA=",
			    "index": 9,
			  },
			]
		`);

		// Verify some specific input values
		const u64Input = results.inputs.result?.[0];
		if (u64Input?.$kind === 'Pure') {
			expect(BigInt(bcs.u64().fromBase64(u64Input.bytes))).toBe(1000n);
		}

		const addressInput = results.inputs.result?.[1];
		if (addressInput?.$kind === 'Pure') {
			expect(bcs.Address.fromBase64(addressInput.bytes)).toBe(normalizeSuiAddress('0x456'));
		}

		const boolInput = results.inputs.result?.[2];
		if (boolInput?.$kind === 'Pure') {
			expect(bcs.bool().fromBase64(boolInput.bytes)).toBe(true);
		}

		const stringInput = results.inputs.result?.[3];
		if (stringInput?.$kind === 'Pure') {
			expect(bcs.string().fromBase64(stringInput.bytes)).toBe('hello world');
		}

		const vectorInput = results.inputs.result?.[4];
		if (vectorInput?.$kind === 'Pure') {
			const decoded = bcs.vector(bcs.u64()).fromBase64(vectorInput.bytes);
			expect(decoded.map((v) => BigInt(v))).toEqual([100n, 200n, 300n]);
		}

		// Object inputs
		const ownedObjectInput = results.inputs.result?.[6];
		if (ownedObjectInput?.$kind === 'Object') {
			expect(ownedObjectInput.object.id).toBe(normalizeSuiAddress(TEST_COIN_1_ID));
			expect(ownedObjectInput.object.owner.$kind).toBe('AddressOwner');
		}

		const sharedObjectInput = results.inputs.result?.[7];
		if (sharedObjectInput?.$kind === 'Object') {
			expect(sharedObjectInput.object.id).toBe(normalizeSuiAddress(TEST_SHARED_OBJECT_ID));
			expect(sharedObjectInput.object.owner.$kind).toBe('Shared');
		}

		const receivingObjectInput = results.inputs.result?.[8];
		if (receivingObjectInput?.$kind === 'Object') {
			expect(receivingObjectInput.object.id).toBe(normalizeSuiAddress(TEST_NFT_ID));
			expect(receivingObjectInput.object.type).toBe(
				'0x0000000000000000000000000000000000000000000000000000000000000999::nft::NFT',
			);
		}

		// Gas split amount
		const gasAmountInput = results.inputs.result?.[9];
		if (gasAmountInput?.$kind === 'Pure') {
			expect(BigInt(bcs.u64().fromBase64(gasAmountInput.bytes))).toBe(50n);
		}
	});
});
