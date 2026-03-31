// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { extractMvrTypes } from '../../../src/client/mvr.js';

describe('extractMvrTypes', () => {
	it('extracts MVR types from struct tags', () => {
		expect([...extractMvrTypes('@mvr/demo::foo::Bar')]).toEqual(['@mvr/demo::foo::Bar']);
	});

	it('extracts MVR types from struct tag type parameters', () => {
		expect([...extractMvrTypes('0x2::foo::Bar<@mvr/demo::baz::Qux>')]).toEqual([
			'@mvr/demo::baz::Qux',
		]);
	});

	it('extracts MVR types from vector type parameters', () => {
		expect([...extractMvrTypes('0x2::foo::Bar<vector<@mvr/demo::baz::Qux>>')]).toEqual([
			'@mvr/demo::baz::Qux',
		]);
	});

	it('extracts MVR types from nested vector type parameters', () => {
		expect([...extractMvrTypes('0x2::foo::Bar<vector<vector<@mvr/demo::baz::Qux>>>')]).toEqual([
			'@mvr/demo::baz::Qux',
		]);
	});

	it('extracts MVR types from vectors with parameterized inner types', () => {
		expect([
			...extractMvrTypes('0x2::foo::Bar<vector<@mvr/demo::coin::Token<0x2::sui::SUI>>>'),
		]).toEqual(['@mvr/demo::coin::Token']);
	});

	it('extracts MVR types from top-level vector', () => {
		expect([...extractMvrTypes('vector<@mvr/demo::baz::Qux>')]).toEqual([
			'@mvr/demo::baz::Qux',
		]);
	});

	it('extracts MVR types from types with mixed MVR and primitive params', () => {
		expect([...extractMvrTypes('0x2::foo::Bar<@mvr/demo::baz::Qux,u8>')]).toEqual([
			'@mvr/demo::baz::Qux',
		]);
	});

	it('returns empty set for types without MVR names', () => {
		expect([...extractMvrTypes('0x2::foo::Bar<vector<0x2::sui::SUI>>')]).toEqual([]);
	});

	it('returns empty set for primitive type parameters', () => {
		expect([...extractMvrTypes('0x2::foo::Bar<u8>')]).toEqual([]);
	});
});
