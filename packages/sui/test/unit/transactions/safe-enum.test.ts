// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { literal, object, parse, string } from 'valibot';
import { describe, expect, it } from 'vitest';

import { safeEnum } from '../../../src/transactions/data/internal.js';

describe('safeEnum', () => {
	const schema = safeEnum({
		First: literal(true),
		Second: object({ value: string() }),
	});

	it.each([{ Future: true }, { $kind: 'Future', Future: true }])(
		'reports unsupported variants with the expected values',
		(value) => {
			expect(() => parse(schema, value)).toThrow(
				'Unsupported enum variant "Future". Expected one of: "First", "Second".',
			);
		},
	);

	it.each([
		[{ First: true }, { First: true, $kind: 'First' }],
		[
			{ $kind: 'First', First: true },
			{ First: true, $kind: 'First' },
		],
	] as const)('normalizes supported variants', (value, expected) => {
		expect(parse(schema, value)).toEqual(expected);
	});

	it('preserves validation errors for supported variants', () => {
		expect(() => parse(schema, { Second: { value: 42 } })).toThrow(
			'Invalid type: Expected string but received 42',
		);
	});
});
