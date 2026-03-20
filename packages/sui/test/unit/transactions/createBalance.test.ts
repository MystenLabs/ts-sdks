// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';

import { Transaction } from '../../../src/transactions/Transaction.js';
import { createBalance, coinWithBalance } from '../../../src/transactions/index.js';
import { normalizeSuiAddress, normalizeStructTag } from '../../../src/utils/index.js';

const TEST_TYPE = normalizeStructTag('0x123::test::TOKEN');
const SENDER = normalizeSuiAddress('0x123');
const RECEIVER = normalizeSuiAddress('0x456');

describe('createBalance', () => {
	it('createBalance zero balance resolves to balance::zero', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.add(createBalance({ type: TEST_TYPE, balance: 0n }));
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

	it('coinWithBalance zero balance resolves to coin::zero', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([coinWithBalance({ type: TEST_TYPE, balance: 0n })], RECEIVER);

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

	it('createBalance address-balance-only resolves to balance::redeem_funds', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.add(createBalance({ type: TEST_TYPE, balance: 50n }));
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

	it('coinWithBalance address-balance-only resolves via Path 2 (coin intents always split)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([coinWithBalance({ type: TEST_TYPE, balance: 50n })], RECEIVER);

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
				  ],
				}
			`);
	});

	it('createBalance coins path: SplitCoins + into_balance + remainder handling', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.add(createBalance({ type: TEST_TYPE, balance: 50n }));
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
			            "Result": 3,
			          },
			          {
			            "Input": 3,
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

	it('coinWithBalance coins path: SplitCoins only, no into_balance or remainder', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([coinWithBalance({ type: TEST_TYPE, balance: 50n })], RECEIVER);

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

	it('gas type createBalance: no remainder handling (GasCoin must remain)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.add(createBalance({ type: '0x2::sui::SUI', balance: 50n }));
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

	it('mixed coinWithBalance + createBalance same type', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const coin = tx.add(coinWithBalance({ type: TEST_TYPE, balance: 30n }));
		const bal = tx.add(createBalance({ type: TEST_TYPE, balance: 20n }));
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
			            "Result": 4,
			          },
			          {
			            "Input": 5,
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

	it('createBalance mixed coins + address balance: coins sufficient, split + into_balance + remainder', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.add(createBalance({ type: TEST_TYPE, balance: 50n }));
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
			            "Result": 3,
			          },
			          {
			            "Input": 3,
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

	it('coinWithBalance mixed coins + address balance: coins sufficient, split only (no AB redeem)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([coinWithBalance({ type: TEST_TYPE, balance: 50n })], RECEIVER);

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

	it('createBalance with multiple coins: merge + split + into_balance + remainder', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.add(createBalance({ type: TEST_TYPE, balance: 80n }));
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
			            "Result": 4,
			          },
			          {
			            "Input": 4,
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

	it('mixed coinWithBalance + createBalance with coins + address balance', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const coin = tx.add(coinWithBalance({ type: TEST_TYPE, balance: 30n }));
		const bal = tx.add(createBalance({ type: TEST_TYPE, balance: 20n }));
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
			            "Result": 4,
			          },
			          {
			            "Input": 5,
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

	it('createBalance coins insufficient, AB top-up: redeem_funds + merge + split + into_balance + remainder', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.add(createBalance({ type: TEST_TYPE, balance: 80n }));
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
			            "Result": 5,
			          },
			          {
			            "Input": 4,
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

	it('gas type createBalance with coins path (useGasCoin splits from GasCoin)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		const bal = tx.add(createBalance({ type: '0x2::sui::SUI', balance: 50n }));
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

	it('coinWithBalance with AB=0 produces only coin-related inputs and commands', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([coinWithBalance({ type: TEST_TYPE, balance: 50n })], RECEIVER);

		const result = await resolvedData(
			tx,
			mockClient({ addressBalance: 0n, coinBalance: 100n, coins: [makeCoin('0xc01', '100')] }),
		);

		// No FundsWithdrawal inputs
		for (const input of result.inputs) {
			expect(input).not.toHaveProperty('FundsWithdrawal');
		}
		// No balance:: module calls
		for (const cmd of result.commands) {
			if ((cmd as any).MoveCall) {
				expect((cmd as any).MoveCall.module).not.toBe('balance');
			}
		}
	});

	it('coinWithBalance with multiple coins: merge + split, no AB top-up', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([coinWithBalance({ type: TEST_TYPE, balance: 80n })], RECEIVER);

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

	it('coinWithBalance with multiple coins + AB top-up: redeem_funds + merge + split', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects([coinWithBalance({ type: TEST_TYPE, balance: 100n })], RECEIVER);

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
			  ],
			}
		`);
	});

	it('three same-type intents: all three are processed (no skip on consecutive empty replacements)', async () => {
		const tx = new Transaction();
		tx.setSenderIfNotSet(SENDER);
		tx.transferObjects(
			[
				coinWithBalance({ type: TEST_TYPE, balance: 10n }),
				coinWithBalance({ type: TEST_TYPE, balance: 20n }),
				coinWithBalance({ type: TEST_TYPE, balance: 30n }),
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
				coinWithBalance({ type: TEST_TYPE, balance: 10n }),
				coinWithBalance({ type: TEST_TYPE, balance: 20n }),
				coinWithBalance({ balance: 5n }),
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
			          "Input": 1,
			        },
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
			          "GasCoin": true,
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
			              1,
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
			        "bytes": "BQAAAAAAAAA=",
			      },
			    },
			  ],
			}
		`);
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
			getBalance: async () => ({
				balance: {
					coinType: normalizeStructTag('0x2::sui::SUI'),
					balance: String(addressBalance + coinBalance),
					coinBalance: String(coinBalance),
					addressBalance: String(addressBalance),
				},
			}),
			listCoins: async () => ({
				objects: coins,
				hasNextPage: false,
				cursor: null,
			}),
		},
	} as any;
}

function makeCoin(objectId: string, balance: string) {
	return {
		objectId: normalizeSuiAddress(objectId),
		version: '1',
		digest: 'abc',
		balance,
		type: `0x2::coin::Coin<${TEST_TYPE}>`,
		owner: { $kind: 'AddressOwner' as const, AddressOwner: SENDER },
	};
}
