// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
	isValidMoveIdentifier,
	isValidStructTag,
	normalizeStructTag,
	parseStructTag,
} from '../../../src/utils/sui-types.js';

describe('parseStructTag', () => {
	it('parses struct tags correctly', () => {
		expect(parseStructTag('0x2::foo::bar')).toMatchInlineSnapshot(`
      {
        "address": "0x0000000000000000000000000000000000000000000000000000000000000002",
        "module": "foo",
        "name": "bar",
        "typeParams": [],
      }
    `);

		expect(
			parseStructTag('0x2::foo::bar<0x3::baz::qux<0x4::nested::result, 0x4::nested::other>, bool>'),
		).toMatchInlineSnapshot(`
      {
        "address": "0x0000000000000000000000000000000000000000000000000000000000000002",
        "module": "foo",
        "name": "bar",
        "typeParams": [
          {
            "address": "0x0000000000000000000000000000000000000000000000000000000000000003",
            "module": "baz",
            "name": "qux",
            "typeParams": [
              {
                "address": "0x0000000000000000000000000000000000000000000000000000000000000004",
                "module": "nested",
                "name": "result",
                "typeParams": [],
              },
              {
                "address": "0x0000000000000000000000000000000000000000000000000000000000000004",
                "module": "nested",
                "name": "other",
                "typeParams": [],
              },
            ],
          },
          "bool",
        ],
      }
    `);
	});

	it('parses struct tags with vector type parameters', () => {
		expect(parseStructTag('0x2::foo::Bar<vector<u8>>')).toMatchInlineSnapshot(`
      {
        "address": "0x0000000000000000000000000000000000000000000000000000000000000002",
        "module": "foo",
        "name": "Bar",
        "typeParams": [
          "vector<u8>",
        ],
      }
    `);

		expect(parseStructTag('0x2::foo::Bar<vector<0x2::sui::SUI>>')).toMatchInlineSnapshot(`
      {
        "address": "0x0000000000000000000000000000000000000000000000000000000000000002",
        "module": "foo",
        "name": "Bar",
        "typeParams": [
          "vector<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>",
        ],
      }
    `);

		expect(parseStructTag('0x2::foo::Bar<vector<0x3::baz::Qux<bool>>>')).toMatchInlineSnapshot(`
      {
        "address": "0x0000000000000000000000000000000000000000000000000000000000000002",
        "module": "foo",
        "name": "Bar",
        "typeParams": [
          "vector<0x0000000000000000000000000000000000000000000000000000000000000003::baz::Qux<bool>>",
        ],
      }
    `);

		expect(parseStructTag('0x2::foo::Bar<vector<vector<u64>>>')).toMatchInlineSnapshot(`
      {
        "address": "0x0000000000000000000000000000000000000000000000000000000000000002",
        "module": "foo",
        "name": "Bar",
        "typeParams": [
          "vector<vector<u64>>",
        ],
      }
    `);

		expect(parseStructTag('0x2::foo::Bar<vector<vector<0x2::sui::SUI>>>')).toMatchInlineSnapshot(`
      {
        "address": "0x0000000000000000000000000000000000000000000000000000000000000002",
        "module": "foo",
        "name": "Bar",
        "typeParams": [
          "vector<vector<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>>",
        ],
      }
    `);
	});

	it('rejects malformed vector type parameters', () => {
		expect(() => parseStructTag('0x2::foo::Bar<vector<>>')).toThrow('Invalid type tag');
		expect(() => parseStructTag('0x2::foo::Bar<vector<u8>')).toThrow('Invalid type tag');
	});

	it('rejects struct tags with empty components', () => {
		expect(() => parseStructTag('::foo::Bar')).toThrow('Invalid struct tag');
		expect(() => parseStructTag('0x2::::Bar')).toThrow('Invalid struct tag');
		expect(() => parseStructTag('0x2::foo::')).toThrow('Invalid struct tag');
	});

	it('rejects struct tags with trailing content after type parameters', () => {
		expect(() => parseStructTag('0x2::coin::Coin<u8>GARBAGE')).toThrow('Invalid struct tag');
		expect(() => parseStructTag('0x2::foo::Bar<bool> ')).toThrow('Invalid struct tag');
		expect(() => parseStructTag('0x2::foo::Bar<u64>xyz')).toThrow('Invalid struct tag');
	});

	it('parses named struct tags correctly', () => {
		expect(parseStructTag('@mvr/demo::foo::bar')).toMatchInlineSnapshot(`
      {
        "address": "@mvr/demo",
        "module": "foo",
        "name": "bar",
        "typeParams": [],
      }
    `);

		expect(parseStructTag('@mvr/demo::foo::bar<inner.mvr.sui/demo::baz::qux, bool>'))
			.toMatchInlineSnapshot(`
      {
        "address": "@mvr/demo",
        "module": "foo",
        "name": "bar",
        "typeParams": [
          {
            "address": "inner.mvr.sui/demo",
            "module": "baz",
            "name": "qux",
            "typeParams": [],
          },
          "bool",
        ],
      }
    `);
	});
});

describe('normalizeStructTag', () => {
	it('normalizes package addresses', () => {
		expect(normalizeStructTag('0x2::kiosk::Item')).toEqual(
			'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::Item',
		);

		expect(normalizeStructTag('0x2::foo::bar<0x3::another::package>')).toEqual(
			'0x0000000000000000000000000000000000000000000000000000000000000002::foo::bar<0x0000000000000000000000000000000000000000000000000000000000000003::another::package>',
		);
	});

	it('normalizes struct tags with vector type parameters', () => {
		expect(normalizeStructTag('0x2::foo::Bar<vector<u8>>')).toEqual(
			'0x0000000000000000000000000000000000000000000000000000000000000002::foo::Bar<vector<u8>>',
		);

		expect(normalizeStructTag('0x2::foo::Bar<vector<0x2::sui::SUI>>')).toEqual(
			'0x0000000000000000000000000000000000000000000000000000000000000002::foo::Bar<vector<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>>',
		);
	});

	it('normalizes named package addresses', () => {
		const checks = [
			'@mvr/demo::foo::bar<inner.mvr.sui/demo::baz::qux,bool>',
			'@mvr/demo::foo::bar',
			'@mvr/demo::foo::bar<inner.mvr.sui/demo::baz::Qux,bool,inner@mvr/demo::foo::Nested<u64,bool>>',
		];

		for (const check of checks) expect(normalizeStructTag(parseStructTag(check))).toEqual(check);
	});
});

describe('isValidMoveIdentifier', () => {
	it('accepts valid identifiers', () => {
		expect(isValidMoveIdentifier('foo')).toBe(true);
		expect(isValidMoveIdentifier('Foo')).toBe(true);
		expect(isValidMoveIdentifier('foo_bar')).toBe(true);
		expect(isValidMoveIdentifier('FooBar')).toBe(true);
		expect(isValidMoveIdentifier('foo123')).toBe(true);
		expect(isValidMoveIdentifier('a')).toBe(true);
		expect(isValidMoveIdentifier('SUI')).toBe(true);
		expect(isValidMoveIdentifier('CoinMetadata')).toBe(true);
	});

	it('rejects invalid identifiers', () => {
		expect(isValidMoveIdentifier('')).toBe(false);
		expect(isValidMoveIdentifier('_')).toBe(false);
		expect(isValidMoveIdentifier('_foo')).toBe(false);
		expect(isValidMoveIdentifier('_1')).toBe(false);
		expect(isValidMoveIdentifier('__')).toBe(false);
		expect(isValidMoveIdentifier('123')).toBe(false);
		expect(isValidMoveIdentifier('1foo')).toBe(false);
		expect(isValidMoveIdentifier('foo-bar')).toBe(false);
		expect(isValidMoveIdentifier('foo.bar')).toBe(false);
		expect(isValidMoveIdentifier('foo bar')).toBe(false);
		expect(isValidMoveIdentifier('foo::bar')).toBe(false);
		expect(isValidMoveIdentifier('foo<bar>')).toBe(false);
	});
});

describe('isValidStructTag', () => {
	it('accepts valid struct tags with hex addresses', () => {
		expect(isValidStructTag('0x2::sui::SUI')).toBe(true);
		expect(isValidStructTag('0x2::coin::Coin')).toBe(true);
		expect(isValidStructTag('0x2::coin::Coin<0x2::sui::SUI>')).toBe(true);
		expect(
			isValidStructTag(
				'0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin',
			),
		).toBe(true);
	});

	it('accepts valid struct tags with type parameters', () => {
		expect(isValidStructTag('0x2::coin::Coin<bool>')).toBe(true);
		expect(isValidStructTag('0x2::coin::Coin<u64>')).toBe(true);
		expect(isValidStructTag('0x2::coin::Coin<address>')).toBe(true);
		expect(isValidStructTag('0x2::table::Table<u64, 0x2::coin::Coin<0x2::sui::SUI>>')).toBe(true);
		expect(isValidStructTag('0x2::foo::Bar<vector<u8>>')).toBe(true);
		expect(isValidStructTag('0x2::foo::Bar<vector<vector<u64>>>')).toBe(true);
	});

	it('accepts valid struct tags with MVR named packages', () => {
		expect(isValidStructTag('@mvr/demo::foo::Bar')).toBe(true);
		expect(isValidStructTag('org.sui/app::module::Type')).toBe(true);
		expect(isValidStructTag('@mvr/demo::foo::Bar<bool>')).toBe(true);
	});

	it('rejects invalid struct tags', () => {
		expect(isValidStructTag('')).toBe(false);
		expect(isValidStructTag('bool')).toBe(false);
		expect(isValidStructTag('u64')).toBe(false);
		expect(isValidStructTag('vector<u8>')).toBe(false);
		expect(isValidStructTag('0x2::123invalid::Foo')).toBe(false);
		expect(isValidStructTag('0x2::foo::123invalid')).toBe(false);
		expect(isValidStructTag('0x2::foo-bar::Baz')).toBe(false);
		expect(isValidStructTag('0x2::_::Foo')).toBe(false);
		expect(isValidStructTag('notanaddress::foo::Bar')).toBe(false);
		expect(isValidStructTag('0x2::foo')).toBe(false);
		expect(isValidStructTag('0x2')).toBe(false);
	});

	it('rejects struct tags with invalid type parameters', () => {
		expect(isValidStructTag('0x2::coin::Coin<notavalidtype>')).toBe(false);
		expect(isValidStructTag('0x2::coin::Coin<vector<notavalidtype>>')).toBe(false);
	});
});
