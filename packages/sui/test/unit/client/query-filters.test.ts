// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
	resolveEventFilter,
	resolvePagination,
	resolveTransactionFilter,
} from '../../../src/client/query-filters.js';
import type { SuiClientTypes } from '../../../src/client/types.js';
import { toGrpcEventFilter, toGrpcTransactionFilter } from '../../../src/grpc/filters.js';

const mvr: SuiClientTypes.MvrMethods = {
	resolvePackage: async ({ package: pkg }) => ({
		package: pkg === '@mysten/demo' ? '0x123' : pkg,
	}),
	resolveType: async ({ type }) => ({ type: type.replaceAll('@mysten/demo', '0x123') }),
	resolve: async () => ({ packages: {}, types: {} }),
};

describe('resolvePagination', () => {
	it('defaults to ascending without bounds', () => {
		expect(resolvePagination({})).toEqual({
			descending: false,
			after: undefined,
			before: undefined,
		});
		expect(resolvePagination({ order: 'descending' })).toEqual({
			descending: true,
			after: undefined,
			before: undefined,
		});
	});

	it('infers direction from the provided bound', () => {
		expect(resolvePagination({ after: 'A' })).toEqual({
			descending: false,
			after: 'A',
			before: undefined,
		});
		expect(resolvePagination({ before: 'B' })).toEqual({
			descending: true,
			after: undefined,
			before: 'B',
		});
	});

	it('accepts bounds with a matching explicit order', () => {
		expect(resolvePagination({ after: 'A', order: 'ascending' }).after).toBe('A');
		expect(resolvePagination({ before: 'B', order: 'descending' }).before).toBe('B');
	});

	it('rejects conflicting bounds and orders', () => {
		expect(() => resolvePagination({ after: 'A', before: 'B' })).toThrowError(
			'Only one of `after` or `before` may be provided',
		);
		expect(() => resolvePagination({ after: 'A', order: 'descending' })).toThrowError(
			'`after` can not be combined with descending queries',
		);
		expect(() => resolvePagination({ before: 'B', order: 'ascending' })).toThrowError(
			'`before` can not be combined with ascending queries',
		);
	});
});

describe('resolveTransactionFilter', () => {
	it('normalizes sender addresses', async () => {
		expect(await resolveTransactionFilter(mvr, { sender: '0x2' })).toEqual({
			$kind: 'sender',
			sender: '0x0000000000000000000000000000000000000000000000000000000000000002',
		});
	});

	it('parses function paths at each specificity level', async () => {
		const pkg = '0x0000000000000000000000000000000000000000000000000000000000000002';

		expect(await resolveTransactionFilter(mvr, { function: '0x2' })).toEqual({
			$kind: 'function',
			package: pkg,
			module: undefined,
			function: undefined,
		});
		expect(await resolveTransactionFilter(mvr, { function: '0x2::coin' })).toEqual({
			$kind: 'function',
			package: pkg,
			module: 'coin',
			function: undefined,
		});
		expect(await resolveTransactionFilter(mvr, { function: '0x2::coin::transfer' })).toEqual({
			$kind: 'function',
			package: pkg,
			module: 'coin',
			function: 'transfer',
		});
	});

	it('resolves MVR names in function paths', async () => {
		expect(await resolveTransactionFilter(mvr, { function: '@mysten/demo::foo::bar' })).toEqual({
			$kind: 'function',
			package: '0x0000000000000000000000000000000000000000000000000000000000000123',
			module: 'foo',
			function: 'bar',
		});
	});

	it('throws for invalid function paths', async () => {
		await expect(resolveTransactionFilter(mvr, { function: '0x2::a::b::c' })).rejects.toThrowError(
			'Invalid function filter',
		);
		await expect(resolveTransactionFilter(mvr, { function: '0x2::' })).rejects.toThrowError(
			'Invalid function filter',
		);
	});

	it('throws unless exactly one predicate is specified', async () => {
		await expect(
			resolveTransactionFilter(mvr, {} as SuiClientTypes.TransactionFilter),
		).rejects.toThrowError('exactly one of sender, function');
		await expect(
			resolveTransactionFilter(mvr, {
				sender: '0x1',
				function: '0x2::coin',
			} as never),
		).rejects.toThrowError('exactly one of sender, function');
	});
});

describe('resolveEventFilter', () => {
	it('normalizes sender addresses', async () => {
		expect(await resolveEventFilter(mvr, { sender: '0x2' })).toEqual({
			$kind: 'sender',
			sender: '0x0000000000000000000000000000000000000000000000000000000000000002',
		});
	});

	it('parses emitModule filters', async () => {
		expect(await resolveEventFilter(mvr, { emitModule: '0x2::coin' })).toEqual({
			$kind: 'emitModule',
			package: '0x0000000000000000000000000000000000000000000000000000000000000002',
			module: 'coin',
		});
	});

	it('requires emitModule to name a module', async () => {
		await expect(resolveEventFilter(mvr, { emitModule: '0x2' })).rejects.toThrowError(
			'Invalid emitModule filter',
		);
		await expect(resolveEventFilter(mvr, { emitModule: '0x2::a::b' })).rejects.toThrowError(
			'Invalid emitModule filter',
		);
	});

	it('parses module-level eventType filters', async () => {
		expect(await resolveEventFilter(mvr, { eventType: '0x2::coin' })).toEqual({
			$kind: 'eventTypeModule',
			package: '0x0000000000000000000000000000000000000000000000000000000000000002',
			module: 'coin',
		});
	});

	it('parses fully qualified eventType filters', async () => {
		expect(await resolveEventFilter(mvr, { eventType: '0x2::coin::CoinCreated' })).toEqual({
			$kind: 'eventType',
			eventType: '0x2::coin::CoinCreated',
		});
	});

	it('resolves MVR names in eventType filters', async () => {
		expect(await resolveEventFilter(mvr, { eventType: '@mysten/demo::foo::Bar' })).toEqual({
			$kind: 'eventType',
			eventType: '0x123::foo::Bar',
		});
	});

	it('requires eventType to be at least module-qualified', async () => {
		await expect(resolveEventFilter(mvr, { eventType: '0x2' })).rejects.toThrowError(
			'Invalid eventType filter',
		);
	});

	it('throws unless exactly one predicate is specified', async () => {
		await expect(resolveEventFilter(mvr, {} as SuiClientTypes.EventFilter)).rejects.toThrowError(
			'exactly one of sender, emitModule, eventType',
		);
	});
});

describe('gRPC filter conversion', () => {
	it('converts sender filters', async () => {
		expect(toGrpcTransactionFilter(await resolveTransactionFilter(mvr, { sender: '0x1' }))).toEqual(
			{
				terms: [
					{
						literals: [
							{
								negated: false,
								predicate: {
									oneofKind: 'sender',
									sender: {
										address: '0x0000000000000000000000000000000000000000000000000000000000000001',
									},
								},
							},
						],
					},
				],
			},
		);
	});

	it('converts function filters at each specificity', async () => {
		const pkg = '0x0000000000000000000000000000000000000000000000000000000000000002';

		for (const [input, expected] of [
			['0x2', pkg],
			['0x2::coin', `${pkg}::coin`],
			['0x2::coin::transfer', `${pkg}::coin::transfer`],
		]) {
			expect(
				toGrpcTransactionFilter(await resolveTransactionFilter(mvr, { function: input })).terms[0]
					.literals[0].predicate,
			).toEqual({ oneofKind: 'moveCall', moveCall: { function: expected } });
		}
	});

	it('converts event filters for each predicate', async () => {
		const pkg = '0x0000000000000000000000000000000000000000000000000000000000000002';

		expect(
			toGrpcEventFilter(await resolveEventFilter(mvr, { emitModule: '0x2::coin' })).terms[0]
				.literals[0].predicate,
		).toEqual({ oneofKind: 'emitModule', emitModule: { module: `${pkg}::coin` } });

		expect(
			toGrpcEventFilter(await resolveEventFilter(mvr, { eventType: '0x2::coin' })).terms[0]
				.literals[0].predicate,
		).toEqual({ oneofKind: 'eventType', eventType: { eventType: `${pkg}::coin` } });

		expect(
			toGrpcEventFilter(await resolveEventFilter(mvr, { eventType: '0x2::coin::CoinCreated' }))
				.terms[0].literals[0].predicate,
		).toEqual({ oneofKind: 'eventType', eventType: { eventType: '0x2::coin::CoinCreated' } });
	});
});
