// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { normalizeMoveArguments } from './generated/utils';
import { Transaction } from '@mysten/sui/transactions';

const CLOCK_TYPE_ARG =
	'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock';

describe('normalizeMoveArguments', () => {
	it('should handle resolved sui objects for `object` args', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: '0x0::test:test',
			arguments: normalizeMoveArguments(
				{ arbitraryValue: 42 }, // args
				['u32', CLOCK_TYPE_ARG], // arg types
				['arbitraryValue', 'clock'], // parameters' names
			),
		});

		expect(await tx.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "KgAAAA=="
			      }
			    },
			    {
			      "Object": {
			        "SharedObject": {
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
			          "initialSharedVersion": 1,
			          "mutable": false
			        }
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000000",
			        "module": "test:test",
			        "function": "",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          },
			          {
			            "Input": 1
			          }
			        ]
			      }
			    }
			  ]
			}"
		`);
	});

	it('should handle resolved sui objects for `Array` args', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: '0x0::test:test',
			arguments: normalizeMoveArguments(
				[42], // args
				['u32', CLOCK_TYPE_ARG], // arg types
				['arbitraryValue', 'clock'], // parameters' names
			),
		});

		expect(await tx.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "KgAAAA=="
			      }
			    },
			    {
			      "Object": {
			        "SharedObject": {
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
			          "initialSharedVersion": 1,
			          "mutable": false
			        }
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000000",
			        "module": "test:test",
			        "function": "",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          },
			          {
			            "Input": 1
			          }
			        ]
			      }
			    }
			  ]
			}"
		`);
	});

	it('should handle resolved sui objects for `Array` args with extra trailing args', async () => {
		const tx = new Transaction();

		tx.moveCall({
			target: '0x0::test:test',
			arguments: normalizeMoveArguments(
				[42, 999], // args
				['u32', CLOCK_TYPE_ARG, 'u32'], // arg types
				['arbitraryValue', 'clock', 'anotherArbitraryValue'], // parameters' names
			),
		});

		expect(await tx.toJSON()).toMatchInlineSnapshot(`
			"{
			  "version": 2,
			  "sender": null,
			  "expiration": null,
			  "gasData": {
			    "budget": null,
			    "price": null,
			    "owner": null,
			    "payment": null
			  },
			  "inputs": [
			    {
			      "Pure": {
			        "bytes": "KgAAAA=="
			      }
			    },
			    {
			      "Object": {
			        "SharedObject": {
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
			          "initialSharedVersion": 1,
			          "mutable": false
			        }
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "5wMAAA=="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000000",
			        "module": "test:test",
			        "function": "",
			        "typeArguments": [],
			        "arguments": [
			          {
			            "Input": 0
			          },
			          {
			            "Input": 1
			          },
			          {
			            "Input": 2
			          }
			        ]
			      }
			    }
			  ]
			}"
		`);
	});
});
