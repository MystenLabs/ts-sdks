// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from '@mysten/bcs';
import { describe, expect, it } from 'vitest';

import { Inputs, Transaction } from '../../../src/transactions/index.js';

describe('V1 JSON serialization', () => {
	const validity = {
		minEpoch: '42',
		maxEpoch: '43',
		minTimestamp: null,
		maxTimestamp: null,
		chain: toBase58(new Uint8Array(32).fill(7)),
		nonce: 0xc0ffee,
		allowedProposers: { epoch: '42', proposers: [0, 2, 5] },
	};

	it('preserves Validity through both v1 and v2 JSON', async () => {
		const tx = new Transaction();
		tx.setExpiration({ Validity: validity });

		expect(JSON.parse(tx.serialize()).expiration).toEqual({ Validity: validity });
		expect(Transaction.from(tx.serialize()).getData().expiration).toEqual(tx.getData().expiration);

		const restored = Transaction.from(await tx.toJSON());
		expect(restored.getData().expiration).toEqual(tx.getData().expiration);
	});

	it('preserves ValidDuring through v1 JSON', () => {
		const tx = new Transaction();
		const { allowedProposers, ...validDuring } = validity;
		tx.setExpiration({ ValidDuring: validDuring });

		expect(JSON.parse(tx.serialize()).expiration).toEqual({ ValidDuring: validDuring });
		expect(Transaction.from(tx.serialize()).getData().expiration).toEqual(tx.getData().expiration);
	});

	it('refuses to silently drop an expiration it does not understand', () => {
		const json = JSON.parse(new Transaction().serialize());
		json.expiration = { SomeFutureVariant: { maxEpoch: '43' } };

		expect(() => Transaction.from(JSON.stringify(json))).toThrow(/Unknown transaction expiration/);
	});

	it.each([{ Epoch: 42 }, { None: true }, null])(
		'round-trips the legacy v1 expiration %j unchanged',
		(expiration) => {
			const tx = new Transaction();
			if (expiration) tx.setExpiration(expiration as never);

			expect(JSON.parse(tx.serialize()).expiration).toEqual(expiration ?? null);
		},
	);

	it('can serialize and deserialize transactions', async () => {
		const tx = new Transaction();

		tx.moveCall({
			target: '0x2::foo::bar',
			arguments: [
				tx.object('0x123'),
				tx.object(
					Inputs.ReceivingRef({
						objectId: '1',
						version: '123',
						digest: toBase58(new Uint8Array(32).fill(0x1)),
					}),
				),
				tx.object(
					Inputs.SharedObjectRef({
						objectId: '2',
						mutable: true,
						initialSharedVersion: '123',
					}),
				),
				tx.object(
					Inputs.ObjectRef({
						objectId: '3',
						version: '123',
						digest: toBase58(new Uint8Array(32).fill(0x1)),
					}),
				),
				tx.pure.address('0x2'),
			],
		});

		const jsonv2 = await tx.toJSON();
		const jsonv1 = JSON.parse(tx.serialize());

		expect(jsonv1).toMatchInlineSnapshot(`
			{
			  "expiration": null,
			  "gasConfig": {},
			  "inputs": [
			    {
			      "index": 0,
			      "kind": "Input",
			      "type": "object",
			      "value": "0x0000000000000000000000000000000000000000000000000000000000000123",
			    },
			    {
			      "index": 1,
			      "kind": "Input",
			      "type": "object",
			      "value": {
			        "Object": {
			          "Receiving": {
			            "digest": "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
			            "objectId": "0x0000000000000000000000000000000000000000000000000000000000000001",
			            "version": "123",
			          },
			        },
			      },
			    },
			    {
			      "index": 2,
			      "kind": "Input",
			      "type": "object",
			      "value": {
			        "Object": {
			          "Shared": {
			            "initialSharedVersion": "123",
			            "mutable": true,
			            "objectId": "0x0000000000000000000000000000000000000000000000000000000000000002",
			          },
			        },
			      },
			    },
			    {
			      "index": 3,
			      "kind": "Input",
			      "type": "object",
			      "value": {
			        "Object": {
			          "ImmOrOwned": {
			            "digest": "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
			            "objectId": "0x0000000000000000000000000000000000000000000000000000000000000003",
			            "version": "123",
			          },
			        },
			      },
			    },
			    {
			      "index": 4,
			      "kind": "Input",
			      "type": "pure",
			      "value": {
			        "Pure": [
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          0,
			          2,
			        ],
			      },
			    },
			  ],
			  "transactions": [
			    {
			      "arguments": [
			        {
			          "index": 0,
			          "kind": "Input",
			          "type": "object",
			          "value": "0x0000000000000000000000000000000000000000000000000000000000000123",
			        },
			        {
			          "index": 1,
			          "kind": "Input",
			          "type": "object",
			          "value": {
			            "Object": {
			              "Receiving": {
			                "digest": "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
			                "objectId": "0x0000000000000000000000000000000000000000000000000000000000000001",
			                "version": "123",
			              },
			            },
			          },
			        },
			        {
			          "index": 2,
			          "kind": "Input",
			          "type": "object",
			          "value": {
			            "Object": {
			              "Shared": {
			                "initialSharedVersion": "123",
			                "mutable": true,
			                "objectId": "0x0000000000000000000000000000000000000000000000000000000000000002",
			              },
			            },
			          },
			        },
			        {
			          "index": 3,
			          "kind": "Input",
			          "type": "object",
			          "value": {
			            "Object": {
			              "ImmOrOwned": {
			                "digest": "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi",
			                "objectId": "0x0000000000000000000000000000000000000000000000000000000000000003",
			                "version": "123",
			              },
			            },
			          },
			        },
			        {
			          "index": 4,
			          "kind": "Input",
			          "type": "pure",
			          "value": {
			            "Pure": [
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              0,
			              2,
			            ],
			          },
			        },
			      ],
			      "kind": "MoveCall",
			      "target": "0x0000000000000000000000000000000000000000000000000000000000000002::foo::bar",
			      "typeArguments": [],
			    },
			  ],
			  "version": 1,
			}
		`);

		const tx2 = Transaction.from(JSON.stringify(jsonv1));

		expect(await tx2.toJSON()).toEqual(jsonv2);

		expect(jsonv2).toMatchInlineSnapshot(`
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
			      "UnresolvedObject": {
			        "objectId": "0x0000000000000000000000000000000000000000000000000000000000000123"
			      }
			    },
			    {
			      "Object": {
			        "Receiving": {
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000001",
			          "version": "123",
			          "digest": "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi"
			        }
			      }
			    },
			    {
			      "Object": {
			        "SharedObject": {
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000002",
			          "initialSharedVersion": "123",
			          "mutable": true
			        }
			      }
			    },
			    {
			      "Object": {
			        "ImmOrOwnedObject": {
			          "objectId": "0x0000000000000000000000000000000000000000000000000000000000000003",
			          "version": "123",
			          "digest": "4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi"
			        }
			      }
			    },
			    {
			      "Pure": {
			        "bytes": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI="
			      }
			    }
			  ],
			  "commands": [
			    {
			      "MoveCall": {
			        "package": "0x0000000000000000000000000000000000000000000000000000000000000002",
			        "module": "foo",
			        "function": "bar",
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
			          },
			          {
			            "Input": 3
			          },
			          {
			            "Input": 4
			          }
			        ]
			      }
			    }
			  ]
			}"
		`);
	});
});
