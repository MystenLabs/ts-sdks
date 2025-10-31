// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { analyze } from '../../src/transaction-analyzer/analyzer';
import { commands } from '../../src/transaction-analyzer/rules/commands';
import { MockSuiClient } from '../mocks/MockSuiClient';
import { DEFAULT_SENDER, TEST_COIN_1_ID, TEST_COIN_2_ID } from '../mocks/mockData';

describe('TransactionAnalyzer - Commands Rule', () => {
	it('should analyze all types of commands in a single transaction', async () => {
		const client = new MockSuiClient();
		const tx = new Transaction();
		tx.setSender(DEFAULT_SENDER);

		// 1. MakeMoveVec command
		const coin1 = tx.object(TEST_COIN_1_ID);
		const coin2 = tx.object(TEST_COIN_2_ID);
		const coinVec = tx.makeMoveVec({ elements: [coin1, coin2] });

		// 2. SplitCoins command (with gas coin)
		const splitResult = tx.splitCoins(tx.gas, [100]);

		// 3. MergeCoins command
		tx.mergeCoins(coin1, [coin2]);

		// 4. TransferObjects command (using split result)
		tx.transferObjects([splitResult], tx.pure.address('0x456'));

		// 5. MoveCall command (using vector and pure args)
		tx.moveCall({
			target: '0x999::test::batch_transfer',
			arguments: [coinVec],
		});

		const results = await analyze(
			{ commands },
			{
				client,
				transaction: await tx.toJSON(),
			},
		);

		expect(results.commands.result).toMatchInlineSnapshot(`
			[
			  {
			    "$kind": "MakeMoveVec",
			    "command": {
			      "elements": [
			        {
			          "$kind": "Input",
			          "Input": 0,
			        },
			        {
			          "$kind": "Input",
			          "Input": 1,
			        },
			      ],
			      "type": null,
			    },
			    "elements": [
			      {
			        "$kind": "Object",
			        "accessLevel": "transfer",
			        "index": 0,
			        "object": {
			          "content": Promise {},
			          "digest": "11111111111111111111111111111111",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000a5c000",
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
			        "accessLevel": "transfer",
			        "index": 1,
			        "object": {
			          "content": Promise {},
			          "digest": "11111111111111111111111111111111",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000a5c001",
			          "owner": {
			            "$kind": "AddressOwner",
			            "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			          },
			          "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			          "previousTransaction": null,
			          "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			          "version": "101",
			        },
			      },
			    ],
			    "index": 0,
			  },
			  {
			    "$kind": "SplitCoins",
			    "amounts": [
			      {
			        "$kind": "Pure",
			        "accessLevel": "transfer",
			        "bytes": "ZAAAAAAAAAA=",
			        "index": 2,
			      },
			    ],
			    "coin": {
			      "$kind": "GasCoin",
			      "accessLevel": "mutate",
			    },
			    "command": {
			      "amounts": [
			        {
			          "$kind": "Input",
			          "Input": 2,
			        },
			      ],
			      "coin": {
			        "$kind": "GasCoin",
			        "GasCoin": true,
			      },
			    },
			    "index": 1,
			  },
			  {
			    "$kind": "MergeCoins",
			    "command": {
			      "destination": {
			        "$kind": "Input",
			        "Input": 0,
			      },
			      "sources": [
			        {
			          "$kind": "Input",
			          "Input": 1,
			        },
			      ],
			    },
			    "destination": {
			      "$kind": "Object",
			      "accessLevel": "mutate",
			      "index": 0,
			      "object": {
			        "content": Promise {},
			        "digest": "11111111111111111111111111111111",
			        "objectId": "0x0000000000000000000000000000000000000000000000000000000000a5c000",
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
			    "index": 2,
			    "sources": [
			      {
			        "$kind": "Object",
			        "accessLevel": "transfer",
			        "index": 1,
			        "object": {
			          "content": Promise {},
			          "digest": "11111111111111111111111111111111",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000a5c001",
			          "owner": {
			            "$kind": "AddressOwner",
			            "AddressOwner": "0x0000000000000000000000000000000000000000000000000000000000000123",
			          },
			          "ownerAddress": "0x0000000000000000000000000000000000000000000000000000000000000123",
			          "previousTransaction": null,
			          "type": "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
			          "version": "101",
			        },
			      },
			    ],
			  },
			  {
			    "$kind": "TransferObjects",
			    "address": {
			      "$kind": "Pure",
			      "accessLevel": "transfer",
			      "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      "index": 3,
			    },
			    "command": {
			      "address": {
			        "$kind": "Input",
			        "Input": 3,
			      },
			      "objects": [
			        {
			          "$kind": "Result",
			          "Result": 1,
			        },
			      ],
			    },
			    "index": 3,
			    "objects": [
			      {
			        "$kind": "Result",
			        "accessLevel": "transfer",
			        "index": [
			          1,
			          0,
			        ],
			      },
			    ],
			  },
			  {
			    "$kind": "MoveCall",
			    "arguments": [
			      {
			        "$kind": "Result",
			        "accessLevel": "mutate",
			        "index": [
			          0,
			          0,
			        ],
			      },
			    ],
			    "command": {
			      "arguments": [
			        {
			          "$kind": "Result",
			          "Result": 0,
			        },
			      ],
			      "function": "batch_transfer",
			      "module": "test",
			      "package": "0x0000000000000000000000000000000000000000000000000000000000000999",
			      "typeArguments": [],
			    },
			    "function": {
			      "isEntry": false,
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
			          "reference": "mutable",
			        },
			      ],
			      "returns": [],
			      "typeParameters": [],
			      "visibility": "public",
			    },
			    "index": 4,
			  },
			]
		`);
	});
});
