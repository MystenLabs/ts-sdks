// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { getUtilsContent } from '../src/generate-utils.js';

const GENERATED_DIR = join(import.meta.dirname, 'generated');

let normalizeMoveArguments: (
	args: unknown[] | object,
	argTypes: readonly (string | null)[],
	parameterNames?: string[],
) => any;
let applyConfigArguments: (
	args: unknown[] | object,
	config: object | undefined,
	callSite: {
		package: string;
		module: string;
		function: string;
		parameters: {
			index: number;
			key: string;
			name?: string;
			parameterName?: string;
			typeArguments?: string[];
		}[];
	},
) => unknown[] | object;

beforeAll(async () => {
	await mkdir(join(GENERATED_DIR, 'utils'), { recursive: true });
	await writeFile(join(GENERATED_DIR, 'utils', 'index.ts'), getUtilsContent());
	const modPath = join(GENERATED_DIR, 'utils', 'index.js');
	const mod = await import(modPath);
	normalizeMoveArguments = mod.normalizeMoveArguments;
	applyConfigArguments = mod.applyConfigArguments;
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

	it('throws the configured error class when errorClass option is provided', () => {
		const out = getUtilsContent({ name: 'MyError', source: '../../my-error.js' });
		// Source is JSON.stringified (double-quoted) to escape special chars safely.
		expect(out).toContain(`import { MyError } from "../../my-error.js";`);
		expect(out).toContain('throw new MyError(');
		expect(out).not.toMatch(/throw new Error\(/);
		expect(out).toContain('if (obj instanceof Error)');
	});

	it('escapes the import source so quotes/backslashes cannot break out', () => {
		const out = getUtilsContent({ name: 'MyError', source: `weird"path\\file.js` });
		expect(out).toContain(`import { MyError } from "weird\\"path\\\\file.js";`);
	});

	it("treats errorClass.name === 'Error' as no-op (no import emitted)", () => {
		const out = getUtilsContent({ name: 'Error', source: 'irrelevant' });
		expect(out).not.toContain(`from "irrelevant"`);
		expect(out).toContain('throw new Error(');
	});

	it('defaults to throwing built-in Error when errorClass is not provided', () => {
		const out = getUtilsContent();
		expect(out).toContain('throw new Error(');
		// Sentinel placeholders must not leak through.
		expect(out).not.toContain('__ERROR_CLASS__');
		expect(out).not.toContain('__ERROR_IMPORT__');
		// File starts with the bcs import (no leading custom-error import).
		expect(out.trimStart().startsWith('import {')).toBe(true);
	});

	it('emits GetOptions / GetManyOptions as type aliases (not interfaces)', () => {
		const out = getUtilsContent();
		expect(out).toContain(
			"export type GetOptions<Include extends Omit<SuiClientTypes.ObjectInclude, 'content'> = {}> =",
		);
		expect(out).toContain(
			"export type GetManyOptions<Include extends Omit<SuiClientTypes.ObjectInclude, 'content'> = {}> =",
		);
	});

	it('actually throws the configured class at runtime', async () => {
		const dir = join(import.meta.dirname, 'generated-error-class');
		await mkdir(join(dir, 'utils'), { recursive: true });
		await writeFile(join(dir, 'my-error.ts'), `export class MyError extends Error {}\n`);
		// Source is relative to the generated utils file, not to the config.
		await writeFile(
			join(dir, 'utils', 'index.ts'),
			getUtilsContent({ name: 'MyError', source: '../my-error.js' }),
		);
		try {
			const utils = await import(join(dir, 'utils', 'index.js'));
			const myError = await import(join(dir, 'my-error.js'));
			expect(() => utils.normalizeMoveArguments({}, ['u32'], ['x'])).toThrow(myError.MyError);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('accepts raw object-id strings for `key` object types', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: '0x0::test::test',
			arguments: normalizeMoveArguments({ counter: '0x123' }, [null], ['counter']),
		});

		const json = JSON.parse(await tx.toJSON());
		expect(json.inputs).toEqual([
			{
				UnresolvedObject: {
					objectId: '0x0000000000000000000000000000000000000000000000000000000000000123',
				},
			},
		]);
	});
});

describe('well-known AccumulatorRoot injection', () => {
	it('injects the accumulator root object without consuming arguments', async () => {
		const tx = new Transaction();
		tx.moveCall({
			target: '0x0::test::test',
			arguments: normalizeMoveArguments(
				{ arbitraryValue: 42 },
				['u32', '0x2::accumulator::AccumulatorRoot'],
				['arbitraryValue'],
			),
		});

		const json = JSON.parse(await tx.toJSON());
		expect(json.inputs).toEqual([
			{ Pure: { bytes: 'KgAAAA==' } },
			{
				UnresolvedObject: {
					objectId: '0x0000000000000000000000000000000000000000000000000000000000000acc',
				},
			},
		]);
	});
});

describe('applyConfigArguments', () => {
	const CALL_SITE = { package: '0x0', module: 'test', function: 'test' };

	it('fills missing named arguments with plain config values and leaves explicit ones untouched', () => {
		const result = applyConfigArguments(
			{ amount: 42n },
			{ pool: '0x123' },
			{ ...CALL_SITE, parameters: [{ index: 0, key: 'pool', name: 'pool' }] },
		);

		expect(result).toEqual({ amount: 42n, pool: '0x123' });
	});

	it('does not invoke resolvers for explicitly passed arguments', () => {
		const result = applyConfigArguments(
			{ pool: '0xabc', amount: 42n },
			{
				pool: () => {
					throw new Error('should not be called');
				},
			},
			{ ...CALL_SITE, parameters: [{ index: 0, key: 'pool', name: 'pool' }] },
		);

		expect(result).toEqual({ pool: '0xabc', amount: 42n });
	});

	it('invokes resolvers with call-site context, normalizing hex struct tags', () => {
		const contexts: unknown[] = [];
		const result = applyConfigArguments(
			{},
			{
				pool: (ctx: unknown) => {
					contexts.push(ctx);
					return '0x456';
				},
			},
			{
				package: '0xee',
				module: 'pools',
				function: 'swap',
				parameters: [
					{
						index: 1,
						key: 'pool',
						name: 'basePool',
						parameterName: 'base_pool',
						typeArguments: ['0x2::sui::SUI', '@mvr/name::a::B', 'u64'],
					},
				],
			},
		);

		expect((result as Record<string, unknown>).basePool).toBe('0x456');
		expect(contexts).toEqual([
			{
				typeArguments: [
					'0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
					'@mvr/name::a::B',
					'u64',
				],
				packageAddress: '0xee',
				moduleName: 'pools',
				functionName: 'swap',
				parameterName: 'base_pool',
				parameterIndex: 1,
			},
		]);
	});

	it('throws a descriptive error for missing config values', () => {
		expect(() =>
			applyConfigArguments({}, undefined, {
				...CALL_SITE,
				parameters: [{ index: 0, key: 'pool', name: 'pool' }],
			}),
		).toThrowError(
			'Missing config value for "pool": pass it explicitly in arguments, or include it in the config object',
		);
	});

	it('throws a descriptive error when a resolver returns undefined', () => {
		expect(() =>
			applyConfigArguments(
				{},
				{ pool: () => undefined as never },
				{
					...CALL_SITE,
					parameters: [{ index: 0, key: 'pool', name: 'pool', typeArguments: ['0x2::sui::SUI'] }],
				},
			),
		).toThrowError(
			'Config resolver for "pool" returned undefined (test::test, typeArguments: [0x2::sui::SUI])',
		);
	});

	it('fills undefined and trailing omitted positions in array arguments', () => {
		expect(
			applyConfigArguments(
				[undefined, 42n],
				{ pool: '0x123' },
				{
					...CALL_SITE,
					parameters: [{ index: 0, key: 'pool' }],
				},
			),
		).toEqual(['0x123', 42n]);

		expect(
			applyConfigArguments(
				[42n],
				{ pool: '0x123' },
				{
					...CALL_SITE,
					parameters: [{ index: 1, key: 'pool' }],
				},
			),
		).toEqual([42n, '0x123']);
	});

	it('rejects array arguments with holes at non-matched positions', () => {
		// Filling a trailing matched position must not mask an omitted required middle argument.
		expect(() =>
			applyConfigArguments(
				['0xaa'],
				{ pool: '0x123' },
				{
					...CALL_SITE,
					parameters: [{ index: 2, key: 'pool' }],
				},
			),
		).toThrowError('Missing argument at position 1');
	});

	it('does not treat inherited object properties as explicitly passed arguments', () => {
		// `constructor` is a valid Move identifier; the inherited Object.prototype.constructor
		// must not be mistaken for an explicit argument.
		const result = applyConfigArguments(
			{ amount: 1n },
			{ ctor: '0x123' },
			{
				...CALL_SITE,
				parameters: [{ index: 0, key: 'ctor', name: 'constructor' }],
			},
		);

		expect((result as Record<string, unknown>)['constructor']).toBe('0x123');
	});
});

describe('well-known and config-matched parameters combined', () => {
	it('aligns config-filled positions with well-known injection at runtime', async () => {
		// Mimics a generated body for `fn(registry: &Registry, clock: &Clock, amount: u64)`:
		// clock is elided from arguments, so the config-matched registry is index 0 and amount is
		// index 1 while argumentsTypes still includes the clock tag between them.
		const tx = new Transaction();
		tx.moveCall({
			target: '0x0::test::test',
			arguments: normalizeMoveArguments(
				applyConfigArguments(
					{ amount: 42 },
					{ registry: '0x123' },
					{
						package: '0x0',
						module: 'test',
						function: 'test',
						parameters: [{ index: 0, key: 'registry', name: 'registry' }],
					},
				),
				[null, '0x2::clock::Clock', 'u32'],
				['registry', 'amount'],
			),
		});

		const json = JSON.parse(await tx.toJSON());
		expect(json.inputs).toEqual([
			{
				UnresolvedObject: {
					objectId: '0x0000000000000000000000000000000000000000000000000000000000000123',
				},
			},
			{
				Object: {
					SharedObject: {
						objectId: '0x0000000000000000000000000000000000000000000000000000000000000006',
						initialSharedVersion: 1,
						mutable: false,
					},
				},
			},
			{ Pure: { bytes: 'KgAAAA==' } },
		]);
	});
});
