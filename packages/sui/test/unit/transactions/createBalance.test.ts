// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';

import { Transaction } from '../../../src/transactions/Transaction.js';
import { normalizeSuiAddress, normalizeStructTag } from '../../../src/utils/index.js';

const TEST_TYPE = normalizeStructTag('0x123::test::TOKEN');
const TEST_TYPE_2 = normalizeStructTag('0x789::other::COIN');
const SENDER = normalizeSuiAddress('0x123');
const RECEIVER = normalizeSuiAddress('0x456');

describe('tx.balance', () => {
	it('tx.balance zero balance resolves to balance::zero', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.balance({ type: TEST_TYPE, balance: 0n });
		tx.moveCall({
			target: '0x2::balance::destroy_zero',
			typeArguments: [TEST_TYPE],
			arguments: [bal],
		});

		expect(await resolvedData(tx, mockClient({ addressBalance: 0n, coinBalance: 0n })))
			.toMatchInlineSnapshot(`
				{
				  "commands": [
				    {
				      "MoveCall": {
				        "arguments": [],
				        "function": "zero",
				        "module": "balance",
				        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
				        "typeArguments": [
				          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
				        ],
				      },
				    },
				    {
				      "MoveCall": {
				        "arguments": [
				          {
				            "Result": 0,
				          },
				        ],
				        "function": "destroy_zero",
				        "module": "balance",
				        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
				        "typeArguments": [
				          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
				        ],
				      },
				    },
				  ],
				  "inputs": [],
				}
			`);
	});

	it('tx.coin zero balance resolves to coin::zero', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 0n })], RECEIVER);

		expect(await resolvedData(tx, mockClient({ addressBalance: 0n, coinBalance: 0n })))
			.toMatchInlineSnapshot(`
				{
				  "commands": [
				    {
				      "MoveCall": {
				        "arguments": [],
				        "function": "zero",
				        "module": "coin",
				        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
				        "typeArguments": [
				          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
				        ],
				      },
				    },
				    {
				      "TransferObjects": {
				        "address": {
				          "Input": 0,
				        },
				        "objects": [
				          {
				            "Result": 0,
				          },
				        ],
				      },
				    },
				  ],
				  "inputs": [
				    {
				      "Pure": {
				        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
				      },
				    },
				  ],
				}
			`);
	});

	it('tx.balance address-balance-only resolves to balance::redeem_funds', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.balance({ type: TEST_TYPE, balance: 50n });
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: [TEST_TYPE],
			arguments: [bal, tx.pure.address(RECEIVER)],
		});

		expect(await resolvedData(tx, mockClient({ addressBalance: 100n, coinBalance: 0n })))
			.toMatchInlineSnapshot(`
				{
				  "commands": [
				    {
				      "MoveCall": {
				        "arguments": [
				          {
				            "Input": 1,
				          },
				        ],
				        "function": "redeem_funds",
				        "module": "balance",
				        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
				        "typeArguments": [
				          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
				        ],
				      },
				    },
				    {
				      "MoveCall": {
				        "arguments": [
				          {
				            "NestedResult": [
				              0,
				              0,
				            ],
				          },
				          {
				            "Input": 0,
				          },
				        ],
				        "function": "send_funds",
				        "module": "balance",
				        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
				        "typeArguments": [
				          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
				        ],
				      },
				    },
				  ],
				  "inputs": [
				    {
				      "Pure": {
				        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
				      },
				    },
				    {
				      "FundsWithdrawal": {
				        "reservation": {
				          "$kind": "MaxAmountU64",
				          "MaxAmountU64": "50",
				        },
				        "typeArg": {
				          "$kind": "Balance",
				          "Balance": "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
				        },
				        "withdrawFrom": {
				          "$kind": "Sender",
				          "Sender": true,
				        },
				      },
				    },
				  ],
				}
			`);
	});

	it('tx.coin address-balance-only resolves via Path 2 (coin intents always split)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 50n })], RECEIVER);

		expect(await resolvedData(tx, mockClient({ addressBalance: 100n, coinBalance: 0n })))
			.toMatchInlineSnapshot(`
				{
				  "commands": [
				    {
				      "MoveCall": {
				        "arguments": [
				          {
				            "Input": 1,
				          },
				        ],
				        "function": "redeem_funds",
				        "module": "coin",
				        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
				        "typeArguments": [
				          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
				        ],
				      },
				    },
				    {
				      "SplitCoins": {
				        "amounts": [
				          {
				            "Input": 2,
				          },
				        ],
				        "coin": {
				          "Result": 0,
				        },
				      },
				    },
				    {
				      "TransferObjects": {
				        "address": {
				          "Input": 0,
				        },
				        "objects": [
				          {
				            "NestedResult": [
				              1,
				              0,
				            ],
				          },
				        ],
				      },
				    },
				    {
				      "MoveCall": {
				        "arguments": [
				          {
				            "Result": 0,
				          },
				          {
				            "Input": 3,
				          },
				        ],
				        "function": "send_funds",
				        "module": "coin",
				        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
				        "typeArguments": [
				          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
				        ],
				      },
				    },
				  ],
				  "inputs": [
				    {
				      "Pure": {
				        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
				      },
				    },
				    {
				      "FundsWithdrawal": {
				        "reservation": {
				          "$kind": "MaxAmountU64",
				          "MaxAmountU64": "50",
				        },
				        "typeArg": {
				          "$kind": "Balance",
				          "Balance": "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
				        },
				        "withdrawFrom": {
				          "$kind": "Sender",
				          "Sender": true,
				        },
				      },
				    },
				    {
				      "Pure": {
				        "bytes": "MgAAAAAAAAA=",
				      },
				    },
				    {
				      "Pure": {
				        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
				      },
				    },
				  ],
				}
			`);
	});

	it('tx.balance coins path: SplitCoins + into_balance + remainder handling', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.balance({ type: TEST_TYPE, balance: 50n });
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: [TEST_TYPE],
			arguments: [bal, tx.pure.address(RECEIVER)],
		});

		expect(
			await resolvedData(
				tx,
				mockClient({ addressBalance: 0n, coinBalance: 100n, coins: [makeCoin('0xc01', '100')] }),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 2,
			          },
			        ],
			        "coin": {
			          "Input": 1,
			        },
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              0,
			              0,
			            ],
			          },
			        ],
			        "function": "into_balance",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              1,
			              0,
			            ],
			          },
			          {
			            "Input": 0,
			          },
			        ],
			        "function": "send_funds",
			        "module": "balance",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 1,
			          },
			          {
			            "Input": 3,
			          },
			        ],
			        "function": "send_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "MgAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
			      },
			    },
			  ],
			}
		`);
	});

	it('tx.coin coins path: SplitCoins only, no into_balance or remainder', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 50n })], RECEIVER);

		expect(
			await resolvedData(
				tx,
				mockClient({ addressBalance: 0n, coinBalance: 100n, coins: [makeCoin('0xc01', '100')] }),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 2,
			          },
			        ],
			        "coin": {
			          "Input": 1,
			        },
			      },
			    },
			    {
			      "TransferObjects": {
			        "address": {
			          "Input": 0,
			        },
			        "objects": [
			          {
			            "NestedResult": [
			              0,
			              0,
			            ],
			          },
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "MgAAAAAAAAA=",
			      },
			    },
			  ],
			}
		`);
	});

	it('gas type tx.balance: no remainder handling (GasCoin must remain)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.balance({ type: '0x2::sui::SUI', balance: 50n });
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [bal, tx.pure.address(RECEIVER)],
		});

		expect(await resolvedData(tx, mockClient({ addressBalance: 100n, coinBalance: 0n })))
			.toMatchInlineSnapshot(`
				{
				  "commands": [
				    {
				      "MoveCall": {
				        "arguments": [
				          {
				            "Input": 1,
				          },
				        ],
				        "function": "redeem_funds",
				        "module": "balance",
				        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
				        "typeArguments": [
				          "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
				        ],
				      },
				    },
				    {
				      "MoveCall": {
				        "arguments": [
				          {
				            "NestedResult": [
				              0,
				              0,
				            ],
				          },
				          {
				            "Input": 0,
				          },
				        ],
				        "function": "send_funds",
				        "module": "balance",
				        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
				        "typeArguments": [
				          "0x2::sui::SUI",
				        ],
				      },
				    },
				  ],
				  "inputs": [
				    {
				      "Pure": {
				        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
				      },
				    },
				    {
				      "FundsWithdrawal": {
				        "reservation": {
				          "$kind": "MaxAmountU64",
				          "MaxAmountU64": "50",
				        },
				        "typeArg": {
				          "$kind": "Balance",
				          "Balance": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
				        },
				        "withdrawFrom": {
				          "$kind": "Sender",
				          "Sender": true,
				        },
				      },
				    },
				  ],
				}
			`);
	});

	it('mixed tx.coin + tx.balance same type', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const coin = tx.coin({ type: TEST_TYPE, balance: 30n });
		const bal = tx.balance({ type: TEST_TYPE, balance: 20n });
		tx.transferObjects([coin], RECEIVER);
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: [TEST_TYPE],
			arguments: [bal, tx.pure.address(RECEIVER)],
		});

		expect(
			await resolvedData(
				tx,
				mockClient({ addressBalance: 0n, coinBalance: 100n, coins: [makeCoin('0xc01', '100')] }),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 3,
			          },
			          {
			            "Input": 4,
			          },
			        ],
			        "coin": {
			          "Input": 2,
			        },
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              0,
			              1,
			            ],
			          },
			        ],
			        "function": "into_balance",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "TransferObjects": {
			        "address": {
			          "Input": 0,
			        },
			        "objects": [
			          {
			            "NestedResult": [
			              0,
			              0,
			            ],
			          },
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              1,
			              0,
			            ],
			          },
			          {
			            "Input": 1,
			          },
			        ],
			        "function": "send_funds",
			        "module": "balance",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 2,
			          },
			          {
			            "Input": 5,
			          },
			        ],
			        "function": "send_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "HgAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "FAAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
			      },
			    },
			  ],
			}
		`);
	});

	it('tx.balance mixed coins + address balance: coins sufficient, split + into_balance + remainder', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.balance({ type: TEST_TYPE, balance: 50n });
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: [TEST_TYPE],
			arguments: [bal, tx.pure.address(RECEIVER)],
		});

		expect(
			await resolvedData(
				tx,
				mockClient({
					addressBalance: 30n,
					coinBalance: 70n,
					coins: [makeCoin('0xc01', '70')],
				}),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 2,
			          },
			        ],
			        "coin": {
			          "Input": 1,
			        },
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              0,
			              0,
			            ],
			          },
			        ],
			        "function": "into_balance",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              1,
			              0,
			            ],
			          },
			          {
			            "Input": 0,
			          },
			        ],
			        "function": "send_funds",
			        "module": "balance",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 1,
			          },
			          {
			            "Input": 3,
			          },
			        ],
			        "function": "send_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "MgAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
			      },
			    },
			  ],
			}
		`);
	});

	it('tx.coin mixed coins + address balance: coins sufficient, split only (no AB redeem)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 50n })], RECEIVER);

		expect(
			await resolvedData(
				tx,
				mockClient({
					addressBalance: 30n,
					coinBalance: 70n,
					coins: [makeCoin('0xc01', '70')],
				}),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 2,
			          },
			        ],
			        "coin": {
			          "Input": 1,
			        },
			      },
			    },
			    {
			      "TransferObjects": {
			        "address": {
			          "Input": 0,
			        },
			        "objects": [
			          {
			            "NestedResult": [
			              0,
			              0,
			            ],
			          },
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "MgAAAAAAAAA=",
			      },
			    },
			  ],
			}
		`);
	});

	it('tx.balance with multiple coins: merge + split + into_balance + remainder', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.balance({ type: TEST_TYPE, balance: 80n });
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: [TEST_TYPE],
			arguments: [bal, tx.pure.address(RECEIVER)],
		});

		expect(
			await resolvedData(
				tx,
				mockClient({
					addressBalance: 20n,
					coinBalance: 80n,
					coins: [makeCoin('0xc01', '50'), makeCoin('0xc02', '30')],
				}),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "MergeCoins": {
			        "destination": {
			          "Input": 1,
			        },
			        "sources": [
			          {
			            "Input": 2,
			          },
			        ],
			      },
			    },
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 3,
			          },
			        ],
			        "coin": {
			          "Input": 1,
			        },
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              1,
			              0,
			            ],
			          },
			        ],
			        "function": "into_balance",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              2,
			              0,
			            ],
			          },
			          {
			            "Input": 0,
			          },
			        ],
			        "function": "send_funds",
			        "module": "balance",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 1,
			          },
			          {
			            "Input": 4,
			          },
			        ],
			        "function": "send_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c02",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "UAAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
			      },
			    },
			  ],
			}
		`);
	});

	it('mixed tx.coin + tx.balance with coins + address balance', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const coin = tx.coin({ type: TEST_TYPE, balance: 30n });
		const bal = tx.balance({ type: TEST_TYPE, balance: 20n });
		tx.transferObjects([coin], RECEIVER);
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: [TEST_TYPE],
			arguments: [bal, tx.pure.address(RECEIVER)],
		});

		expect(
			await resolvedData(
				tx,
				mockClient({
					addressBalance: 10n,
					coinBalance: 90n,
					coins: [makeCoin('0xc01', '90')],
				}),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 3,
			          },
			          {
			            "Input": 4,
			          },
			        ],
			        "coin": {
			          "Input": 2,
			        },
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              0,
			              1,
			            ],
			          },
			        ],
			        "function": "into_balance",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "TransferObjects": {
			        "address": {
			          "Input": 0,
			        },
			        "objects": [
			          {
			            "NestedResult": [
			              0,
			              0,
			            ],
			          },
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              1,
			              0,
			            ],
			          },
			          {
			            "Input": 1,
			          },
			        ],
			        "function": "send_funds",
			        "module": "balance",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 2,
			          },
			          {
			            "Input": 5,
			          },
			        ],
			        "function": "send_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "HgAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "FAAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
			      },
			    },
			  ],
			}
		`);
	});

	it('tx.balance coins insufficient, AB top-up: redeem_funds + merge + split + into_balance + remainder', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.balance({ type: TEST_TYPE, balance: 80n });
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: [TEST_TYPE],
			arguments: [bal, tx.pure.address(RECEIVER)],
		});

		expect(
			await resolvedData(
				tx,
				mockClient({
					addressBalance: 40n,
					coinBalance: 50n,
					coins: [makeCoin('0xc01', '50')],
				}),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 2,
			          },
			        ],
			        "function": "redeem_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MergeCoins": {
			        "destination": {
			          "Input": 1,
			        },
			        "sources": [
			          {
			            "Result": 0,
			          },
			        ],
			      },
			    },
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 3,
			          },
			        ],
			        "coin": {
			          "Input": 1,
			        },
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              2,
			              0,
			            ],
			          },
			        ],
			        "function": "into_balance",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              3,
			              0,
			            ],
			          },
			          {
			            "Input": 0,
			          },
			        ],
			        "function": "send_funds",
			        "module": "balance",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 1,
			          },
			          {
			            "Input": 4,
			          },
			        ],
			        "function": "send_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "FundsWithdrawal": {
			        "reservation": {
			          "$kind": "MaxAmountU64",
			          "MaxAmountU64": "30",
			        },
			        "typeArg": {
			          "$kind": "Balance",
			          "Balance": "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        },
			        "withdrawFrom": {
			          "$kind": "Sender",
			          "Sender": true,
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "UAAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
			      },
			    },
			  ],
			}
		`);
	});

	it('gas type tx.balance with coins path (useGasCoin splits from GasCoin)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.balance({ type: '0x2::sui::SUI', balance: 50n });
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: ['0x2::sui::SUI'],
			arguments: [bal, tx.pure.address(RECEIVER)],
		});

		expect(
			await resolvedData(
				tx,
				mockClient({
					addressBalance: 10n,
					coinBalance: 90n,
					coins: [makeCoin('0xc01', '90')],
				}),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 1,
			          },
			        ],
			        "coin": {
			          "GasCoin": true,
			        },
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              0,
			              0,
			            ],
			          },
			        ],
			        "function": "into_balance",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "NestedResult": [
			              1,
			              0,
			            ],
			          },
			          {
			            "Input": 0,
			          },
			        ],
			        "function": "send_funds",
			        "module": "balance",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x2::sui::SUI",
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "MgAAAAAAAAA=",
			      },
			    },
			  ],
			}
		`);
	});

	it('tx.coin with AB=0 produces only coin-related commands (no send_funds)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 50n })], RECEIVER);

		const result = await resolvedData(
			tx,
			mockClient({ addressBalance: 0n, coinBalance: 100n, coins: [makeCoin('0xc01', '100')] }),
		);

		// No FundsWithdrawal inputs (no AB withdrawal needed)
		for (const input of result.inputs) {
			expect(input).not.toHaveProperty('FundsWithdrawal');
		}
		// Coin-only: no balance module calls, remainder stays as owned coin
		const sendFundsCmd = result.commands.find(
			(cmd: any) => cmd.MoveCall?.function === 'send_funds',
		);
		expect(sendFundsCmd).toBeUndefined();
	});

	it('tx.coin with multiple coins: merge + split, no AB top-up', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 80n })], RECEIVER);

		expect(
			await resolvedData(
				tx,
				mockClient({
					addressBalance: 20n,
					coinBalance: 80n,
					coins: [makeCoin('0xc01', '50'), makeCoin('0xc02', '30')],
				}),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "MergeCoins": {
			        "destination": {
			          "Input": 1,
			        },
			        "sources": [
			          {
			            "Input": 2,
			          },
			        ],
			      },
			    },
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 3,
			          },
			        ],
			        "coin": {
			          "Input": 1,
			        },
			      },
			    },
			    {
			      "TransferObjects": {
			        "address": {
			          "Input": 0,
			        },
			        "objects": [
			          {
			            "NestedResult": [
			              1,
			              0,
			            ],
			          },
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 1,
			          },
			        ],
			        "function": "destroy_zero",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c02",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "UAAAAAAAAAA=",
			      },
			    },
			  ],
			}
		`);
	});

	it('tx.coin with multiple coins + AB top-up: redeem_funds + merge + split', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 100n })], RECEIVER);

		expect(
			await resolvedData(
				tx,
				mockClient({
					addressBalance: 30n,
					coinBalance: 80n,
					coins: [makeCoin('0xc01', '50'), makeCoin('0xc02', '30')],
				}),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 3,
			          },
			        ],
			        "function": "redeem_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MergeCoins": {
			        "destination": {
			          "Input": 1,
			        },
			        "sources": [
			          {
			            "Input": 2,
			          },
			          {
			            "Result": 0,
			          },
			        ],
			      },
			    },
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 4,
			          },
			        ],
			        "coin": {
			          "Input": 1,
			        },
			      },
			    },
			    {
			      "TransferObjects": {
			        "address": {
			          "Input": 0,
			        },
			        "objects": [
			          {
			            "NestedResult": [
			              2,
			              0,
			            ],
			          },
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 1,
			          },
			          {
			            "Input": 5,
			          },
			        ],
			        "function": "send_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c02",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "FundsWithdrawal": {
			        "reservation": {
			          "$kind": "MaxAmountU64",
			          "MaxAmountU64": "20",
			        },
			        "typeArg": {
			          "$kind": "Balance",
			          "Balance": "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        },
			        "withdrawFrom": {
			          "$kind": "Sender",
			          "Sender": true,
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "ZAAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
			      },
			    },
			  ],
			}
		`);
	});

	it('three same-type intents: all three are processed (no skip on consecutive empty replacements)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects(
			[
				tx.coin({ type: TEST_TYPE, balance: 10n }),
				tx.coin({ type: TEST_TYPE, balance: 20n }),
				tx.coin({ type: TEST_TYPE, balance: 30n }),
			],
			RECEIVER,
		);

		expect(
			await resolvedData(
				tx,
				mockClient({ addressBalance: 0n, coinBalance: 100n, coins: [makeCoin('0xc01', '100')] }),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 2,
			          },
			          {
			            "Input": 3,
			          },
			          {
			            "Input": 4,
			          },
			        ],
			        "coin": {
			          "Input": 1,
			        },
			      },
			    },
			    {
			      "TransferObjects": {
			        "address": {
			          "Input": 0,
			        },
			        "objects": [
			          {
			            "NestedResult": [
			              0,
			              0,
			            ],
			          },
			          {
			            "NestedResult": [
			              0,
			              1,
			            ],
			          },
			          {
			            "NestedResult": [
			              0,
			              2,
			            ],
			          },
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "digest": "abc",
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000c01",
			          "version": "1",
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "CgAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "FAAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "HgAAAAAAAAA=",
			      },
			    },
			  ],
			}
		`);
	});

	it('interleaved types: subsequent empty replacement does not skip next type', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects(
			[
				tx.coin({ type: TEST_TYPE, balance: 10n }),
				tx.coin({ type: TEST_TYPE, balance: 20n }),
				tx.coin({ balance: 5n }),
			],
			RECEIVER,
		);

		expect(
			await resolvedData(
				tx,
				mockClient({ addressBalance: 100n, coinBalance: 100n, coins: [makeCoin('0xc01', '100')] }),
			),
		).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 1,
			          },
			        ],
			        "function": "redeem_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 2,
			          },
			          {
			            "Input": 3,
			          },
			        ],
			        "coin": {
			          "Result": 0,
			        },
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Input": 4,
			          },
			        ],
			        "function": "redeem_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			        ],
			      },
			    },
			    {
			      "SplitCoins": {
			        "amounts": [
			          {
			            "Input": 5,
			          },
			        ],
			        "coin": {
			          "Result": 2,
			        },
			      },
			    },
			    {
			      "TransferObjects": {
			        "address": {
			          "Input": 0,
			        },
			        "objects": [
			          {
			            "NestedResult": [
			              1,
			              0,
			            ],
			          },
			          {
			            "NestedResult": [
			              1,
			              1,
			            ],
			          },
			          {
			            "NestedResult": [
			              3,
			              0,
			            ],
			          },
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Result": 0,
			          },
			          {
			            "Input": 6,
			          },
			        ],
			        "function": "send_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        ],
			      },
			    },
			    {
			      "MoveCall": {
			        "arguments": [
			          {
			            "Result": 2,
			          },
			          {
			            "Input": 7,
			          },
			        ],
			        "function": "send_funds",
			        "module": "coin",
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "typeArguments": [
			          "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			        ],
			      },
			    },
			  ],
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFY=",
			      },
			    },
			    {
			      "FundsWithdrawal": {
			        "reservation": {
			          "$kind": "MaxAmountU64",
			          "MaxAmountU64": "30",
			        },
			        "typeArg": {
			          "$kind": "Balance",
			          "Balance": "0x0000000000000000000000000000000000000000000000000000000000000123::test::TOKEN",
			        },
			        "withdrawFrom": {
			          "$kind": "Sender",
			          "Sender": true,
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "CgAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "FAAAAAAAAAA=",
			      },
			    },
			    {
			      "FundsWithdrawal": {
			        "reservation": {
			          "$kind": "MaxAmountU64",
			          "MaxAmountU64": "5",
			        },
			        "typeArg": {
			          "$kind": "Balance",
			          "Balance": "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
			        },
			        "withdrawFrom": {
			          "$kind": "Sender",
			          "Sender": true,
			        },
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "BQAAAAAAAAA=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
			      },
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASM=",
			      },
			    },
			  ],
			}
		`);
	});

	it('tx.coin with AB sufficient prefers AB over coins (Path 2 AB-only)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 50n })], RECEIVER);

		const result = await resolvedData(
			tx,
			mockClient({
				addressBalance: 200n,
				coinBalance: 100n,
				coins: [makeCoin('0xc01', '100')],
			}),
		);

		// Should use coin::redeem_funds from AB, not the coin object
		expect(result.commands[0].MoveCall?.function).toBe('redeem_funds');
		expect(result.commands[0].MoveCall?.module).toBe('coin');
		// No coin object inputs — only FundsWithdrawal and pure inputs
		const objectInputs = result.inputs.filter((i: any) => i.Object);
		expect(objectInputs).toHaveLength(0);
		// FundsWithdrawal for the full totalRequired amount
		const withdrawals = result.inputs.filter((i: any) => i.FundsWithdrawal);
		expect(withdrawals).toHaveLength(1);
		expect(withdrawals[0].FundsWithdrawal.reservation.MaxAmountU64).toBe('50');
	});

	it('mixed tx.coin + tx.balance with AB sufficient sources entirely from AB', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const coin = tx.coin({ type: TEST_TYPE, balance: 30n });
		const bal = tx.balance({ type: TEST_TYPE, balance: 20n });
		tx.transferObjects([coin], RECEIVER);
		tx.moveCall({
			target: '0x2::balance::send_funds',
			typeArguments: [TEST_TYPE],
			arguments: [bal, tx.pure.address(RECEIVER)],
		});

		const result = await resolvedData(
			tx,
			mockClient({
				addressBalance: 200n,
				coinBalance: 100n,
				coins: [makeCoin('0xc01', '100')],
			}),
		);

		// Should use coin::redeem_funds from AB for the full amount
		expect(result.commands[0].MoveCall?.function).toBe('redeem_funds');
		expect(result.commands[0].MoveCall?.module).toBe('coin');
		// No coin object inputs
		const objectInputs = result.inputs.filter((i: any) => i.Object);
		expect(objectInputs).toHaveLength(0);
		// FundsWithdrawal for the full totalRequired (30+20=50)
		const withdrawals = result.inputs.filter((i: any) => i.FundsWithdrawal);
		expect(withdrawals).toHaveLength(1);
		expect(withdrawals[0].FundsWithdrawal.reservation.MaxAmountU64).toBe('50');
	});

	it('gas type tx.coin with AB sufficient prefers AB over GasCoin', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ balance: 50n })], RECEIVER);

		const result = await resolvedData(tx, mockClient({ addressBalance: 200n, coinBalance: 0n }));

		// Should use coin::redeem_funds from AB, not GasCoin
		expect(result.commands[0].MoveCall?.function).toBe('redeem_funds');
		expect(result.commands[0].MoveCall?.module).toBe('coin');
		// No GasCoin in any SplitCoins
		const splitCmds = result.commands.filter((c: any) => c.SplitCoins);
		for (const cmd of splitCmds) {
			expect(cmd.SplitCoins.coin).not.toEqual({ GasCoin: true });
		}
		// FundsWithdrawal for the full amount
		const withdrawals = result.inputs.filter((i: any) => i.FundsWithdrawal);
		expect(withdrawals).toHaveLength(1);
		expect(withdrawals[0].FundsWithdrawal.reservation.MaxAmountU64).toBe('50');
	});

	it('gas type tx.coin with AB insufficient falls back to GasCoin', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ balance: 50n })], RECEIVER);

		const result = await resolvedData(tx, mockClient({ addressBalance: 10n, coinBalance: 90n }));

		// Should use GasCoin since AB is insufficient
		const splitCmd = result.commands.find((c: any) => c.SplitCoins);
		expect(splitCmd.SplitCoins.coin).toEqual({ GasCoin: true });
		// No FundsWithdrawal
		const withdrawals = result.inputs.filter((i: any) => i.FundsWithdrawal);
		expect(withdrawals).toHaveLength(0);
	});

	it('tx.coin with useGasCoin: false treats SUI as regular coin type', async () => {
		const SUI_TYPE = normalizeStructTag('0x2::sui::SUI');
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ type: SUI_TYPE, balance: 50n, useGasCoin: false })], RECEIVER);

		const result = await resolvedData(
			tx,
			mockClient({
				addressBalance: 0n,
				coinBalance: 100n,
				coins: [makeCoin('0xa1', '100', SUI_TYPE)],
			}),
		);

		// Should NOT use GasCoin — should split from the SUI coin object
		const splitCmd = result.commands[0];
		expect(splitCmd.SplitCoins).toBeDefined();
		expect(splitCmd.SplitCoins.coin).not.toEqual({ GasCoin: true });
		// Should reference the coin input, not GasCoin
		expect(splitCmd.SplitCoins.coin).toEqual({ Input: expect.any(Number) });
	});

	it('Path 1 — multiple tx.balance intents same type, AB sufficient, separate redeem_funds', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal1 = tx.balance({ type: TEST_TYPE, balance: 30n });
		const bal2 = tx.balance({ type: TEST_TYPE, balance: 20n });
		tx.moveCall({
			target: '0x2::balance::destroy_zero',
			typeArguments: [TEST_TYPE],
			arguments: [bal1],
		});
		tx.moveCall({
			target: '0x2::balance::destroy_zero',
			typeArguments: [TEST_TYPE],
			arguments: [bal2],
		});

		const result = await resolvedData(tx, mockClient({ addressBalance: 100n, coinBalance: 0n }));

		// Path 1: each balance intent gets its own redeem_funds call
		expect(result.commands[0].MoveCall?.function).toBe('redeem_funds');
		expect(result.commands[1].MoveCall?.function).toBe('redeem_funds');
		// Original user commands follow
		expect(result.commands[2].MoveCall?.function).toBe('destroy_zero');
		expect(result.commands[3].MoveCall?.function).toBe('destroy_zero');

		// Two FundsWithdrawal inputs — one for 30, one for 20
		const withdrawals = result.inputs.filter(
			(i: any) => i.FundsWithdrawal?.reservation?.MaxAmountU64,
		);
		expect(withdrawals).toHaveLength(2);
		expect(withdrawals.map((w: any) => w.FundsWithdrawal.reservation.MaxAmountU64).sort()).toEqual([
			'20',
			'30',
		]);
	});

	describe('BuildTransactionOptions overrides', () => {
		it('options.coins bypasses listCoins call', async () => {
			const tx = new Transaction();
			tx.setSenderIfNotSet(SENDER);
			tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 50n })], RECEIVER);

			// listCoins throws — verifies it is not called when coins override is provided
			const client = {
				core: {
					getBalance: async () => ({
						balance: {
							coinType: TEST_TYPE,
							balance: '100',
							coinBalance: '100',
							addressBalance: '0',
						},
					}),
					listCoins: async () => {
						throw new Error('listCoins should not be called when coins option is provided');
					},
				},
			} as any;

			const resolved = JSON.parse(
				await tx.toJSON({
					supportedIntents: [],
					client,
					coins: { [TEST_TYPE]: [makeCoin('0xc01', '100')] },
				}),
			);

			expect(resolved.commands[0]).toHaveProperty('SplitCoins');
			expect(
				resolved.inputs.some(
					(i: any) => i.Object?.ImmOrOwnedObject?.objectId === normalizeSuiAddress('0xc01'),
				),
			).toBe(true);
		});

		it('options.balances bypasses getBalance call', async () => {
			const tx = new Transaction();
			tx.setSenderIfNotSet(SENDER);
			tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 50n })], RECEIVER);

			// getBalance throws — verifies it is not called when balances override is provided
			const client = {
				core: {
					getBalance: async () => {
						throw new Error('getBalance should not be called when balances option is provided');
					},
					listCoins: async () => ({
						objects: [makeCoin('0xc01', '100')],
						hasNextPage: false,
						cursor: null,
					}),
				},
			} as any;

			const resolved = JSON.parse(
				await tx.toJSON({
					supportedIntents: [],
					client,
					balances: {
						[TEST_TYPE]: {
							coinType: TEST_TYPE,
							balance: '100',
							coinBalance: '100',
							addressBalance: '0',
						},
					},
				}),
			);

			expect(resolved.commands[0]).toHaveProperty('SplitCoins');
		});

		it('options.coins and options.balances together bypass all RPC calls', async () => {
			const tx = new Transaction();
			tx.setSenderIfNotSet(SENDER);
			tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 50n })], RECEIVER);

			const offlineClient = {
				core: {
					getBalance: async () => {
						throw new Error('unexpected getBalance call');
					},
					listCoins: async () => {
						throw new Error('unexpected listCoins call');
					},
				},
			} as any;

			const resolved = JSON.parse(
				await tx.toJSON({
					supportedIntents: [],
					client: offlineClient,
					coins: { [TEST_TYPE]: [makeCoin('0xc01', '100')] },
					balances: {
						[TEST_TYPE]: {
							coinType: TEST_TYPE,
							balance: '100',
							coinBalance: '100',
							addressBalance: '0',
						},
					},
				}),
			);

			expect(resolved.commands[0]).toHaveProperty('SplitCoins');
		});

		it('options.coins applies per type — other types still query the client', async () => {
			const tx = new Transaction();
			tx.setSenderIfNotSet(SENDER);
			tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 10n })], RECEIVER);
			tx.transferObjects([tx.coin({ type: TEST_TYPE_2, balance: 5n })], RECEIVER);

			const listCoinsCallTypes: string[] = [];
			const client = {
				core: {
					getBalance: async ({ coinType }: { coinType?: string } = {}) => ({
						balance: {
							coinType: normalizeStructTag(coinType ?? TEST_TYPE_2),
							balance: '100',
							coinBalance: '100',
							addressBalance: '0',
						},
					}),
					listCoins: async ({ coinType }: { coinType?: string } = {}) => {
						listCoinsCallTypes.push(coinType ?? '');
						return {
							objects: [makeCoin('0xc02', '100', TEST_TYPE_2)],
							hasNextPage: false,
							cursor: null,
						};
					},
				},
			} as any;

			await tx.toJSON({
				supportedIntents: [],
				client,
				coins: { [TEST_TYPE]: [makeCoin('0xc01', '100')] },
				balances: {
					[TEST_TYPE]: {
						coinType: TEST_TYPE,
						balance: '100',
						coinBalance: '100',
						addressBalance: '0',
					},
				},
			});

			expect(listCoinsCallTypes).not.toContain(TEST_TYPE);
			expect(listCoinsCallTypes).toContain(TEST_TYPE_2);
		});

		it('options.balances with sufficient AB triggers Path 1 for balance intents', async () => {
			const tx = new Transaction();
			tx.setSenderIfNotSet(SENDER);
			const bal = tx.balance({ type: TEST_TYPE, balance: 20n });
			tx.moveCall({
				target: '0x2::balance::destroy_zero',
				typeArguments: [TEST_TYPE],
				arguments: [bal],
			});

			const offlineClient = {
				core: {
					getBalance: async () => {
						throw new Error('unexpected getBalance call');
					},
					listCoins: async () => {
						throw new Error('unexpected listCoins call');
					},
				},
			} as any;

			const resolved = JSON.parse(
				await tx.toJSON({
					supportedIntents: [],
					client: offlineClient,
					coins: { [TEST_TYPE]: [] },
					balances: {
						[TEST_TYPE]: {
							coinType: TEST_TYPE,
							balance: '100',
							coinBalance: '0',
							addressBalance: '100',
						},
					},
				}),
			);

			// Path 1: direct balance::redeem_funds, no SplitCoins
			expect(resolved.commands[0]).toEqual({
				MoveCall: {
					package: normalizeSuiAddress('0x2'),
					module: 'balance',
					function: 'redeem_funds',
					typeArguments: [TEST_TYPE],
					arguments: [{ Input: expect.any(Number) }],
				},
			});
			expect(resolved.commands.find((c: any) => c.SplitCoins)).toBeUndefined();
		});
	});

	it('errors when mixing gas and useGasCoin:false SUI intents', async () => {
		const SUI_TYPE = normalizeStructTag('0x2::sui::SUI');
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ balance: 60n })], RECEIVER);
		tx.transferObjects([tx.coin({ type: SUI_TYPE, balance: 60n, useGasCoin: false })], RECEIVER);

		await expect(
			resolvedData(tx, mockClient({ addressBalance: 100n, coinBalance: 0n })),
		).rejects.toThrow('Cannot mix SUI CoinWithBalance intents');
	});

	it('two different custom types in same transaction resolve independently', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([tx.coin({ type: TEST_TYPE, balance: 10n })], RECEIVER);
		tx.transferObjects([tx.coin({ type: TEST_TYPE_2, balance: 5n })], RECEIVER);

		const coin1 = makeCoin('0xc1', '50');
		const coin2 = makeCoin('0xc2', '50', TEST_TYPE_2);

		const result = await resolvedData(
			tx,
			mockClient({
				addressBalance: 0n,
				coinBalance: 50n,
				coins: [coin1, coin2],
			}),
		);

		// Each type should have its own SplitCoins command
		const splitCmds = result.commands.filter((c: any) => c.SplitCoins);
		expect(splitCmds).toHaveLength(2);

		// Both transfer commands should follow
		const transferCmds = result.commands.filter((c: any) => c.TransferObjects);
		expect(transferCmds).toHaveLength(2);
	});
});

async function resolvedData(tx: Transaction, client: any) {
	const resolved = JSON.parse(await tx.toJSON({ supportedIntents: [], client }));
	return { commands: resolved.commands, inputs: resolved.inputs };
}

function mockClient({
	addressBalance,
	coinBalance,
	coins = [],
}: {
	addressBalance: bigint;
	coinBalance: bigint;
	coins?: ReturnType<typeof makeCoin>[];
}) {
	return {
		core: {
			getBalance: async ({ coinType }: { coinType?: string } = {}) => ({
				balance: {
					coinType: normalizeStructTag(coinType ?? '0x2::sui::SUI'),
					balance: String(addressBalance + coinBalance),
					coinBalance: String(coinBalance),
					addressBalance: String(addressBalance),
				},
			}),
			listCoins: async ({ coinType }: { coinType?: string } = {}) => ({
				objects: coins.filter(
					(c) => !coinType || c.type === `0x2::coin::Coin<${normalizeStructTag(coinType)}>`,
				),
				hasNextPage: false,
				cursor: null,
			}),
		},
	} as any;
}

function makeCoin(objectId: string, balance: string, coinType: string = TEST_TYPE) {
	return {
		objectId: normalizeSuiAddress(objectId),
		version: '1',
		digest: 'abc',
		balance,
		type: `0x2::coin::Coin<${coinType}>`,
		owner: { $kind: 'AddressOwner' as const, AddressOwner: SENDER },
	};
}
