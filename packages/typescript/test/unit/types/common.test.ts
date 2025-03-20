// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { normalizeStructTag, parseStructTag } from '../../../src/utils/sui-types.js';

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

	it('normalizes named package addresses', () => {
		const checks = [
			'@mvr/demo::foo::bar<inner.mvr.sui/demo::baz::qux,bool>',
			'@mvr/demo::foo::bar',
			'@mvr/demo::foo::bar<inner.mvr.sui/demo::baz::Qux,bool,inner@mvr/demo::foo::Nested<u64,bool>>',
		];

		for (const check of checks) expect(normalizeStructTag(parseStructTag(check))).toEqual(check);
	});
});
