// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { utilsContent } from '../src/generate-utils.js';

const GENERATED_DIR = join(import.meta.dirname, 'generated');

let normalizeMoveArguments: (
	args: unknown[] | object,
	argTypes: readonly (string | null)[],
	parameterNames?: string[],
) => any;

beforeAll(async () => {
	await mkdir(join(GENERATED_DIR, 'utils'), { recursive: true });
	await writeFile(join(GENERATED_DIR, 'utils', 'index.ts'), utilsContent);
	const modPath = join(GENERATED_DIR, 'utils', 'index.js');
	const mod = await import(modPath);
	normalizeMoveArguments = mod.normalizeMoveArguments;
});

afterAll(async () => {
	await rm(GENERATED_DIR, { recursive: true, force: true });
});

const CLOCK_TYPE_ARG = '0x2::clock::Clock';

describe('normalizeMoveArguments', () => {
	it('should handle resolved sui objects for `object` args', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: '0x0::test:test',
			arguments: normalizeMoveArguments(
				{ arbitraryValue: 42 }, // args
				['u32', CLOCK_TYPE_ARG], // arg types
				['arbitraryValue'], // parameters' names
			),
		});

		expect(await tx.toJSON()).toMatchInlineSnapshot(`"{
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
}"`);
	});

	it('should handle resolved sui objects for `object` args with extra trailing args', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: '0x0::test:test',
			arguments: normalizeMoveArguments(
				{ arbitraryValue: 42, anotherArbitraryValue: 999 }, // args
				['u32', CLOCK_TYPE_ARG, 'u32'], // arg types
				['arbitraryValue', 'anotherArbitraryValue'], // parameters' names
			),
		});

		expect(await tx.toJSON()).toMatchInlineSnapshot(`"{
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
}"`);
	});

	it('should handle resolved sui objects for `Array` args', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: '0x0::test:test',
			arguments: normalizeMoveArguments(
				[42], // args
				['u32', CLOCK_TYPE_ARG], // arg types
				['arbitraryValue'], // parameters' names
			),
		});

		expect(await tx.toJSON()).toMatchInlineSnapshot(`"{
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
}"`);
	});

	it('should handle resolved sui objects for `Array` args with extra trailing args', async () => {
		const tx = new Transaction();

		tx.moveCall({
			target: '0x0::test:test',
			arguments: normalizeMoveArguments(
				[42, 999], // args
				['u32', CLOCK_TYPE_ARG, 'u32'], // arg types
				['arbitraryValue', 'anotherArbitraryValue'], // parameters' names
			),
		});

		expect(await tx.toJSON()).toMatchInlineSnapshot(`"{
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
}"`);
	});

	it('should allow null for Option types', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: '0x0::test:test',
			arguments: normalizeMoveArguments(
				{ optionalValue: null }, // args
				['0x1::option::Option<u32>'], // arg types
				['optionalValue'], // parameters' names
			),
		});

		expect(await tx.toJSON()).toMatchInlineSnapshot(`"{
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
        "bytes": "AA=="
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
          }
        ]
      }
    }
  ]
}"`);
	});
});
