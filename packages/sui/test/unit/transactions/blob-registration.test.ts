// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { Transaction } from '../../../src/transactions/Transaction.js';
import { coinWithBalance, TransactionArgument } from '../../../src/transactions/index.js';
import type { TransactionObjectArgument } from '../../../src/transactions/Transaction.js';

describe('Blob registration transaction building', () => {
	it('should build a transaction with storage creation and blob registration', async () => {
		const transaction = new Transaction();
		transaction.setSenderIfNotSet('0x123');
		const owner = '0x123';
		const writeCost = 1000n;

		// Helper function similar to withWal in Walrus client
		function withWal<T extends TransactionObjectArgument | void>(
			amount: bigint,
			fn: (coin: TransactionObjectArgument, tx: Transaction) => Promise<T>,
		): (tx: Transaction) => Promise<T> {
			return async (tx: Transaction) => {
				const coin = tx.add(
					coinWithBalance({
						balance: amount,
						type: '0x2::wal::WAL',
					}),
				);

				const result = await fn(coin, tx);

				return result;
			};
		}

		function createStorage() {
			return async (tx: Transaction) => {
				const storageCost: bigint = await new Promise((resolve) => setTimeout(() => resolve(123n)));
				const systemContract = await Promise.resolve({
					reserve_space: (options: { arguments: TransactionArgument[] }) => (tx: Transaction) => {
						return tx.moveCall({
							target: '0x1::storage::reserve_space',
							arguments: options.arguments,
						});
					},
				});

				return tx.add(
					withWal(storageCost, async (coin, tx) => {
						return tx.add(
							systemContract.reserve_space({
								arguments: [tx.pure.u64(123), tx.pure.u64(123), tx.pure.u64(3), coin],
							}),
						);
					}),
				);
			};
		}

		function registerBlob() {
			return async (tx: Transaction) => {
				const systemContract = await Promise.resolve({
					register_blob: (options: { arguments: TransactionArgument[] }) => (tx: Transaction) => {
						return tx.moveCall({
							target: '0x1::blob::register',
							arguments: options.arguments,
						});
					},
				});

				return tx.add(
					withWal(writeCost, async (writeCoin, tx) => {
						return tx.add(
							systemContract.register_blob({
								arguments: [createStorage(), writeCoin],
							}),
						);
					}),
				);
			};
		}

		transaction.transferObjects([registerBlob()], owner);

		await transaction.prepareForSerialization({
			supportedIntents: ['CoinWithBalance'],
		});

		expect(await transaction.getData()).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "$Intent": {
			        "data": {
			          "balance": 1000n,
			          "type": "0x0000000000000000000000000000000000000000000000000000000000000002::wal::WAL",
			        },
			        "inputs": {},
			        "name": "CoinWithBalance",
			      },
			      "$kind": "$Intent",
			    },
			    {
			      "$Intent": {
			        "data": {
			          "balance": 123n,
			          "type": "0x0000000000000000000000000000000000000000000000000000000000000002::wal::WAL",
			        },
			        "inputs": {},
			        "name": "CoinWithBalance",
			      },
			      "$kind": "$Intent",
			    },
			    {
			      "$kind": "MoveCall",
			      "MoveCall": {
			        "arguments": [
			          {
			            "$kind": "Input",
			            "Input": 0,
			            "type": "pure",
			          },
			          {
			            "$kind": "Input",
			            "Input": 1,
			            "type": "pure",
			          },
			          {
			            "$kind": "Input",
			            "Input": 2,
			            "type": "pure",
			          },
			          {
			            "$kind": "Result",
			            "Result": 1,
			          },
			        ],
			        "function": "reserve_space",
			        "module": "storage",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "typeArguments": [],
			      },
			    },
			    {
			      "$kind": "MoveCall",
			      "MoveCall": {
			        "arguments": [
			          {
			            "$kind": "Result",
			            "Result": 2,
			          },
			          {
			            "$kind": "Result",
			            "Result": 0,
			          },
			        ],
			        "function": "register",
			        "module": "blob",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000001",
			        "typeArguments": [],
			      },
			    },
			    {
			      "$kind": "TransferObjects",
			      "TransferObjects": {
			        "address": {
			          "$kind": "Input",
			          "Input": 3,
			          "type": "pure",
			        },
			        "objects": [
			          {
			            "$kind": "Result",
			            "Result": 3,
			          },
			        ],
			      },
			    },
			  ],
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "owner": null,
			    "payment": null,
			    "price": null,
			  },
			  "inputs": [
			    {
			      "$kind": "Pure",
			      "Pure": {
			        "bytes": "ewAAAAAAAAA=",
			      },
			    },
			    {
			      "$kind": "Pure",
			      "Pure": {
			        "bytes": "ewAAAAAAAAA=",
			      },
			    },
			    {
			      "$kind": "Pure",
			      "Pure": {
			        "bytes": "AwAAAAAAAAA=",
			      },
			    },
			    {
			      "$kind": "Pure",
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
			      },
			    },
			  ],
			  "sender": "0x0000000000000000000000000000000000000000000000000000000000000123",
			  "version": 2,
			}
		`);
	});
});
