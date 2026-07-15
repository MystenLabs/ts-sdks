// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { extractMvrTypes, MvrClient } from '../../../src/client/mvr.js';
import { ClientCache } from '../../../src/client/cache.js';

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
		expect([...extractMvrTypes('vector<@mvr/demo::baz::Qux>')]).toEqual(['@mvr/demo::baz::Qux']);
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

describe('MvrClient cancellation', () => {
	function createClient(fetchImpl: typeof fetch) {
		vi.stubGlobal('fetch', fetchImpl);
		return new MvrClient({
			cache: new ClientCache(),
			url: 'https://mvr.example',
		});
	}

	it('rejects resolveType with an already-aborted signal before fetching', async () => {
		const fetchImpl = vi.fn();
		const mvr = createClient(fetchImpl as unknown as typeof fetch);

		await expect(
			mvr.resolveType({ type: '@mvr/demo::foo::Bar', signal: AbortSignal.abort() }),
		).rejects.toThrow();
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('rejects resolveType when the signal aborts mid-flight', async () => {
		const controller = new AbortController();
		const fetchImpl = vi.fn(
			() =>
				// Never resolves — simulates an in-flight request.
				new Promise<Response>(() => {}),
		);
		const mvr = createClient(fetchImpl as unknown as typeof fetch);

		const promise = mvr.resolveType({
			type: '@mvr/demo::foo::Bar',
			signal: controller.signal,
		});

		controller.abort(new Error('cancelled'));

		await expect(promise).rejects.toThrow('cancelled');
	});

	it('returns non-MVR types without touching the network even when aborted mid-way', async () => {
		const fetchImpl = vi.fn();
		const mvr = createClient(fetchImpl as unknown as typeof fetch);

		await expect(mvr.resolveType({ type: '0x2::sui::SUI' })).resolves.toEqual({
			type: '0x2::sui::SUI',
		});
		expect(fetchImpl).not.toHaveBeenCalled();
	});
});
