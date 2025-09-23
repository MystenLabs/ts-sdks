// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { TransactionAnalyzer } from '../../src/transaction-analyzer/analyzer';
import { MockSuiClient } from '../mocks/MockSuiClient';
import {
	DEFAULT_SENDER,
	TEST_COIN_1_ID,
	TEST_COIN_2_ID,
	TEST_PACKAGE_ID,
	DEFI_PACKAGE_ID,
	NFT_PACKAGE_ID,
} from '../mocks/mockData';

describe('TransactionAnalyzer - Functions Rule', () => {
	it('should analyze all Move functions in a single transaction', async () => {
		const client = new MockSuiClient();

		// Add additional Move functions to test various scenarios
		client.addMoveFunction({
			packageId: DEFI_PACKAGE_ID,
			moduleName: 'defi',
			name: 'swap',
			visibility: 'public',
			isEntry: true,
			parameters: [
				{
					body: {
						$kind: 'datatype',
						datatype: {
							typeName: '0x2::coin::Coin',
							typeParameters: [{ $kind: 'typeParameter', index: 0 }],
						},
					},
					reference: null,
				},
			],
			returns: [],
		});

		client.addMoveFunction({
			packageId: NFT_PACKAGE_ID,
			moduleName: 'nft',
			name: 'mint',
			visibility: 'public',
			isEntry: false,
			parameters: [
				{
					body: { $kind: 'address' },
					reference: null,
				},
				{
					body: { $kind: 'vector', vector: { $kind: 'u8' } },
					reference: null,
				},
			],
			returns: [
				{
					body: {
						$kind: 'datatype',
						datatype: {
							typeName: '0xdef::nft::NFT',
							typeParameters: [],
						},
					},
					reference: null,
				},
			],
		});

		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		const coin1 = tx.object(TEST_COIN_1_ID);
		const coin2 = tx.object(TEST_COIN_2_ID);

		// 1. Call existing default function
		tx.moveCall({
			target: `${TEST_PACKAGE_ID}::test::transfer`,
			arguments: [coin1],
		});

		// 2. Call batch transfer function
		const coinVec = tx.makeMoveVec({ elements: [coin1, coin2] });
		tx.moveCall({
			target: `${TEST_PACKAGE_ID}::test::batch_transfer`,
			arguments: [coinVec],
		});

		// 3. Call custom defi swap function
		tx.moveCall({
			target: `${DEFI_PACKAGE_ID}::defi::swap`,
			arguments: [coin2],
		});

		// 4. Call NFT mint function
		tx.moveCall({
			target: `${NFT_PACKAGE_ID}::nft::mint`,
			arguments: [tx.pure.address('0x123'), tx.pure.vector('u8', [1, 2, 3])],
		});

		// 5. Call non-existent function (should be filtered out)
		tx.moveCall({
			target: '0x1234567890abcdef::module::function',
			arguments: [],
		});

		const analyzer = TransactionAnalyzer.create(client, await tx.toJSON(), {});
		const { results, issues } = await analyzer.analyze();

		expect(issues).toHaveLength(0);

		// Should find 4 functions (3 from defaults + 2 custom - 1 non-existent)
		expect(results.moveFunctions).toHaveLength(4);
		expect(results.moveFunctions).toMatchInlineSnapshot(`
			[
			  {
			    "isEntry": true,
			    "moduleName": "test",
			    "name": "transfer",
			    "packageId": "0x0000000000000000000000000000000000000000000000000000000000000999",
			    "parameters": [
			      {
			        "body": {
			          "$kind": "datatype",
			          "datatype": {
			            "typeName": "0x999::nft::NFT",
			            "typeParameters": [],
			          },
			        },
			        "reference": null,
			      },
			      {
			        "body": {
			          "$kind": "u64",
			        },
			        "reference": null,
			      },
			      {
			        "body": {
			          "$kind": "address",
			        },
			        "reference": null,
			      },
			      {
			        "body": {
			          "$kind": "bool",
			        },
			        "reference": null,
			      },
			    ],
			    "returns": [],
			    "typeParameters": [],
			    "visibility": "public",
			  },
			  {
			    "isEntry": true,
			    "moduleName": "test",
			    "name": "batch_transfer",
			    "packageId": "0x0000000000000000000000000000000000000000000000000000000000000999",
			    "parameters": [
			      {
			        "body": {
			          "$kind": "vector",
			          "vector": {
			            "$kind": "datatype",
			            "datatype": {
			              "typeName": "0x2::coin::Coin",
			              "typeParameters": [
			                {
			                  "$kind": "typeParameter",
			                  "index": 0,
			                },
			              ],
			            },
			          },
			        },
			        "reference": null,
			      },
			    ],
			    "returns": [],
			    "typeParameters": [],
			    "visibility": "public",
			  },
			  {
			    "isEntry": true,
			    "moduleName": "defi",
			    "name": "swap",
			    "packageId": "0x0000000000000000000000000000000000000000000000000000000000000abc",
			    "parameters": [
			      {
			        "body": {
			          "$kind": "datatype",
			          "datatype": {
			            "typeName": "0x2::coin::Coin",
			            "typeParameters": [
			              {
			                "$kind": "typeParameter",
			                "index": 0,
			              },
			            ],
			          },
			        },
			        "reference": null,
			      },
			    ],
			    "returns": [],
			    "typeParameters": [],
			    "visibility": "public",
			  },
			  {
			    "isEntry": false,
			    "moduleName": "nft",
			    "name": "mint",
			    "packageId": "0x0000000000000000000000000000000000000000000000000000000000000def",
			    "parameters": [
			      {
			        "body": {
			          "$kind": "address",
			        },
			        "reference": null,
			      },
			      {
			        "body": {
			          "$kind": "vector",
			          "vector": {
			            "$kind": "u8",
			          },
			        },
			        "reference": null,
			      },
			    ],
			    "returns": [
			      {
			        "body": {
			          "$kind": "datatype",
			          "datatype": {
			            "typeName": "0xdef::nft::NFT",
			            "typeParameters": [],
			          },
			        },
			        "reference": null,
			      },
			    ],
			    "typeParameters": [],
			    "visibility": "public",
			  },
			]
		`);

		// Verify specific function details
		const transferFunc = results.moveFunctions.find((f) => f.name === 'transfer');
		expect(transferFunc?.isEntry).toBe(true);
		expect(transferFunc?.visibility).toBe('public');
		expect(transferFunc?.parameters).toHaveLength(4);

		const batchTransferFunc = results.moveFunctions.find((f) => f.name === 'batch_transfer');
		expect(batchTransferFunc?.parameters[0]?.body?.$kind).toBe('vector');

		const swapFunc = results.moveFunctions.find((f) => f.name === 'swap');
		expect(swapFunc?.packageId).toBe(
			'0x0000000000000000000000000000000000000000000000000000000000000abc',
		);

		const mintFunc = results.moveFunctions.find((f) => f.name === 'mint');
		expect(mintFunc?.isEntry).toBe(false);
		expect(mintFunc?.returns).toHaveLength(1);
		expect(mintFunc?.parameters).toHaveLength(2);
	});
});
