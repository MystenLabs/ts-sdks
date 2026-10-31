// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import {
	parseCheckpointNumber,
	resolveCheckpointRange,
	resolveEventFilter,
	resolvePagination,
	resolveTransactionFilter,
} from '../../../src/client/query-filters.js';
import type { SuiClientTypes } from '../../../src/client/types.js';
import {
	toGraphQLCheckpointBounds,
	toGraphQLEventFilter,
	toGraphQLTransactionFilter,
} from '../../../src/graphql/filters.js';
import { toGrpcEventFilter, toGrpcTransactionFilter } from '../../../src/grpc/filters.js';

describe('filter resolution abort signals', () => {
	it('forwards the abort signal to MVR resolution', async () => {
		const signals: (AbortSignal | undefined)[] = [];
		const recordingMvr: SuiClientTypes.MvrMethods = {
			resolvePackage: async ({ package: pkg, signal }) => {
				signals.push(signal);
				return { package: pkg };
			},
			resolveType: async ({ type, signal }) => {
				signals.push(signal);
				return { type };
			},
			resolve: async () => ({ packages: {}, types: {} }),
		};

		const { signal } = new AbortController();
		await resolveTransactionFilter(recordingMvr, { function: '0x2::coin::transfer' }, signal);
		await resolveEventFilter(recordingMvr, { emitModule: '0x2::coin' }, signal);
		await resolveEventFilter(recordingMvr, { eventType: '0x2::coin::CoinCreated' }, signal);

		expect(signals).toEqual([signal, signal, signal]);
	});
});

const mvr: SuiClientTypes.MvrMethods = {
	resolvePackage: async ({ package: pkg }) => ({
		package: pkg === '@mysten/demo' ? '0x123' : pkg,
	}),
	resolveType: async ({ type }) => ({ type: type.replaceAll('@mysten/demo', '0x123') }),
	resolve: async () => ({ packages: {}, types: {} }),
};

const ADDR_1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
const ADDR_2 = '0x0000000000000000000000000000000000000000000000000000000000000002';
const ADDR_3 = '0x0000000000000000000000000000000000000000000000000000000000000003';

describe('resolvePagination', () => {
	it('defaults to ascending without bounds', () => {
		expect(resolvePagination({})).toEqual({
			descending: false,
			after: undefined,
			before: undefined,
			limit: 50,
		});
		expect(resolvePagination({ order: 'descending' })).toEqual({
			descending: true,
			after: undefined,
			before: undefined,
			limit: 50,
		});
	});

	it('applies a shared default page size', () => {
		expect(resolvePagination({}).limit).toBe(50);
		expect(resolvePagination({ limit: 7 }).limit).toBe(7);
	});

	it('infers descending order only when `before` is the sole bound', () => {
		expect(resolvePagination({ after: 'A' }).descending).toBe(false);
		expect(resolvePagination({ before: 'B' })).toEqual({
			descending: true,
			after: undefined,
			before: 'B',
			limit: 50,
		});
		expect(resolvePagination({ after: 'A', before: 'B' })).toEqual({
			descending: false,
			after: 'A',
			before: 'B',
			limit: 50,
		});
	});

	it('accepts bounds with either explicit order', () => {
		expect(resolvePagination({ after: 'A', order: 'descending' })).toMatchObject({
			descending: true,
			after: 'A',
		});
		expect(resolvePagination({ before: 'B', order: 'ascending' })).toMatchObject({
			descending: false,
			before: 'B',
		});
		expect(resolvePagination({ after: 'A', before: 'B', order: 'descending' })).toMatchObject({
			descending: true,
			after: 'A',
			before: 'B',
		});
	});

	it('treats null bounds as absent', () => {
		expect(resolvePagination({ after: null, before: null })).toEqual({
			descending: false,
			after: undefined,
			before: undefined,
			limit: 50,
		});
	});
});

describe('parseCheckpointNumber', () => {
	it('accepts strings, numbers, and bigints', () => {
		expect(parseCheckpointNumber('5', 'checkpoint')).toBe(5n);
		expect(parseCheckpointNumber(0, 'checkpoint')).toBe(0n);
		expect(parseCheckpointNumber(7n, 'checkpoint')).toBe(7n);
		expect(parseCheckpointNumber(Number.MAX_SAFE_INTEGER, 'checkpoint')).toBe(
			BigInt(Number.MAX_SAFE_INTEGER),
		);
		expect(parseCheckpointNumber(`${Number.MAX_SAFE_INTEGER}`, 'checkpoint')).toBe(
			BigInt(Number.MAX_SAFE_INTEGER),
		);
	});

	it('rejects negative, fractional, and oversized values using the given label', () => {
		for (const value of [-1, '-1', -1n, 1.5, '1.5', '', 'abc', 2 ** 53, 2n ** 53n, `${2 ** 53}`]) {
			expect(() => parseCheckpointNumber(value, 'checkpoint')).toThrowError(
				`Invalid checkpoint "${value}": expected a non-negative integer`,
			);
		}
	});
});

describe('resolveCheckpointRange', () => {
	it('returns an empty range when no bounds are given', () => {
		expect(resolveCheckpointRange({})).toEqual({ start: undefined, end: undefined });
	});

	it('accepts strings, numbers, and bigints', () => {
		expect(resolveCheckpointRange({ startCheckpoint: '5', endCheckpoint: 10 })).toEqual({
			start: 5n,
			end: 10n,
		});
		expect(resolveCheckpointRange({ startCheckpoint: 0n })).toEqual({
			start: 0n,
			end: undefined,
		});
		expect(resolveCheckpointRange({ endCheckpoint: Number.MAX_SAFE_INTEGER })).toEqual({
			start: undefined,
			end: BigInt(Number.MAX_SAFE_INTEGER),
		});
	});

	it('rejects negative, fractional, and oversized bounds', () => {
		for (const value of [-1, '-1', -1n, 1.5, '1.5', '', 'abc', 2 ** 53, 2n ** 53n, `${2 ** 53}`]) {
			expect(() => resolveCheckpointRange({ startCheckpoint: value })).toThrowError(
				`Invalid startCheckpoint "${value}": expected a non-negative integer`,
			);
			expect(() => resolveCheckpointRange({ endCheckpoint: value })).toThrowError(
				`Invalid endCheckpoint "${value}": expected a non-negative integer`,
			);
		}
	});

	it('rejects ranges that end before they start', () => {
		expect(() => resolveCheckpointRange({ startCheckpoint: 5, endCheckpoint: 4 })).toThrowError(
			'`endCheckpoint` must be greater than or equal to `startCheckpoint`',
		);
		expect(resolveCheckpointRange({ startCheckpoint: 5, endCheckpoint: 5 })).toEqual({
			start: 5n,
			end: 5n,
		});
	});
});

describe('resolveTransactionFilter', () => {
	it('matches everything with an empty filter', async () => {
		expect(await resolveTransactionFilter(mvr, {})).toEqual({});
	});

	it('normalizes addresses', async () => {
		expect(await resolveTransactionFilter(mvr, { sender: '0x2' })).toEqual({ sender: ADDR_2 });
		expect(await resolveTransactionFilter(mvr, { affectedAddress: '0x1' })).toEqual({
			affectedAddress: ADDR_1,
		});
		expect(await resolveTransactionFilter(mvr, { affectedObject: '0x3' })).toEqual({
			affectedObject: ADDR_3,
		});
	});

	it('parses function paths at each specificity level', async () => {
		expect(await resolveTransactionFilter(mvr, { function: '0x2' })).toEqual({ function: ADDR_2 });
		expect(await resolveTransactionFilter(mvr, { function: '0x2::coin' })).toEqual({
			function: `${ADDR_2}::coin`,
		});
		expect(await resolveTransactionFilter(mvr, { function: '0x2::coin::transfer' })).toEqual({
			function: `${ADDR_2}::coin::transfer`,
		});
	});

	it('resolves MVR names in function paths', async () => {
		expect(await resolveTransactionFilter(mvr, { function: '@mysten/demo::foo::bar' })).toEqual({
			function: '0x0000000000000000000000000000000000000000000000000000000000000123::foo::bar',
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

	it('combines sender with any other predicate', async () => {
		expect(await resolveTransactionFilter(mvr, { sender: '0x1', function: '0x2::coin' })).toEqual({
			sender: ADDR_1,
			function: `${ADDR_2}::coin`,
		});
		expect(await resolveTransactionFilter(mvr, { sender: '0x1', affectedAddress: '0x2' })).toEqual({
			sender: ADDR_1,
			affectedAddress: ADDR_2,
		});
		expect(await resolveTransactionFilter(mvr, { sender: '0x1', affectedObject: '0x3' })).toEqual({
			sender: ADDR_1,
			affectedObject: ADDR_3,
		});
	});

	it('rejects more than one of affectedAddress, affectedObject, function', async () => {
		await expect(
			resolveTransactionFilter(mvr, { function: '0x2', affectedObject: '0x3' } as never),
		).rejects.toThrowError(
			'A transaction filter may specify at most one of affectedAddress, affectedObject, function (got affectedObject, function)',
		);
		await expect(
			resolveTransactionFilter(mvr, { affectedAddress: '0x1', affectedObject: '0x3' } as never),
		).rejects.toThrowError('at most one of affectedAddress, affectedObject, function');
	});
});

describe('resolveEventFilter', () => {
	it('matches everything with an empty filter', async () => {
		expect(await resolveEventFilter(mvr, {})).toEqual({});
	});

	it('normalizes sender addresses', async () => {
		expect(await resolveEventFilter(mvr, { sender: '0x2' })).toEqual({ sender: ADDR_2 });
	});

	it('parses emitModule filters', async () => {
		expect(await resolveEventFilter(mvr, { emitModule: '0x2::coin' })).toEqual({
			emitModule: `${ADDR_2}::coin`,
		});
		expect(await resolveEventFilter(mvr, { emitModule: '0x2' })).toEqual({ emitModule: ADDR_2 });
		expect(await resolveEventFilter(mvr, { emitModule: '@mysten/demo' })).toEqual({
			emitModule: '0x0000000000000000000000000000000000000000000000000000000000000123',
		});
	});

	it('rejects malformed emitModule filters', async () => {
		for (const emitModule of ['0x2::a::b', '0x2::', '', '::coin']) {
			await expect(resolveEventFilter(mvr, { emitModule })).rejects.toThrowError(
				`Invalid emitModule filter "${emitModule}": expected "package" or "package::module"`,
			);
		}
	});

	it('parses package- and module-level eventType filters', async () => {
		expect(await resolveEventFilter(mvr, { eventType: '0x2' })).toEqual({ eventType: ADDR_2 });
		expect(await resolveEventFilter(mvr, { eventType: '0x2::coin' })).toEqual({
			eventType: `${ADDR_2}::coin`,
		});
		expect(await resolveEventFilter(mvr, { eventType: '@mysten/demo' })).toEqual({
			eventType: '0x0000000000000000000000000000000000000000000000000000000000000123',
		});
	});

	it('parses fully qualified eventType filters', async () => {
		expect(await resolveEventFilter(mvr, { eventType: '0x2::coin::CoinCreated' })).toEqual({
			eventType: '0x2::coin::CoinCreated',
		});
		expect(
			await resolveEventFilter(mvr, { eventType: '0x2::coin::CoinCreated<0x2::sui::SUI>' }),
		).toEqual({ eventType: '0x2::coin::CoinCreated<0x2::sui::SUI>' });
	});

	it('resolves MVR names in eventType filters', async () => {
		expect(await resolveEventFilter(mvr, { eventType: '@mysten/demo::foo::Bar' })).toEqual({
			eventType: '0x123::foo::Bar',
		});
	});

	it('rejects eventType filters with empty segments', async () => {
		for (const eventType of ['', '0x2::', '0x2::coin::', '::coin']) {
			await expect(resolveEventFilter(mvr, { eventType })).rejects.toThrowError(
				`Invalid eventType filter "${eventType}"`,
			);
		}
	});

	it('combines sender with emitModule or eventType', async () => {
		expect(await resolveEventFilter(mvr, { sender: '0x1', eventType: '0x2::coin' })).toEqual({
			sender: ADDR_1,
			eventType: `${ADDR_2}::coin`,
		});
		expect(await resolveEventFilter(mvr, { sender: '0x1', emitModule: '0x2' })).toEqual({
			sender: ADDR_1,
			emitModule: ADDR_2,
		});
	});

	it('rejects combining emitModule with eventType', async () => {
		await expect(
			resolveEventFilter(mvr, { emitModule: '0x2', eventType: '0x2' } as never),
		).rejects.toThrowError(
			'An event filter may specify at most one of emitModule, eventType (got emitModule, eventType)',
		);
	});
});

describe('gRPC filter conversion', () => {
	it('returns no filter when nothing is specified', () => {
		expect(toGrpcTransactionFilter(undefined)).toBeUndefined();
		expect(toGrpcTransactionFilter({})).toBeUndefined();
		expect(toGrpcEventFilter(undefined)).toBeUndefined();
		expect(toGrpcEventFilter({})).toBeUndefined();
	});

	it('converts each transaction predicate into a literal of a single ANDed term', async () => {
		expect(
			toGrpcTransactionFilter(
				await resolveTransactionFilter(mvr, { sender: '0x1', function: '0x2::coin::transfer' }),
			),
		).toEqual({
			terms: [
				{
					literals: [
						{ negated: false, predicate: { oneofKind: 'sender', sender: { address: ADDR_1 } } },
						{
							negated: false,
							predicate: {
								oneofKind: 'moveCall',
								moveCall: { function: `${ADDR_2}::coin::transfer` },
							},
						},
					],
				},
			],
		});

		expect(
			toGrpcTransactionFilter(await resolveTransactionFilter(mvr, { affectedObject: '0x3' }))
				?.terms[0].literals,
		).toEqual([
			{
				negated: false,
				predicate: { oneofKind: 'affectedObject', affectedObject: { objectId: ADDR_3 } },
			},
		]);
	});

	it('passes affectedAddress through as one literal ANDed with the rest', async () => {
		const affected = {
			negated: false,
			predicate: { oneofKind: 'affectedAddress', affectedAddress: { address: ADDR_1 } },
		};
		const sentBy = (address: string) => ({
			negated: false,
			predicate: { oneofKind: 'sender', sender: { address } },
		});

		expect(
			toGrpcTransactionFilter(await resolveTransactionFilter(mvr, { affectedAddress: '0x1' })),
		).toEqual({ terms: [{ literals: [affected] }] });

		expect(
			toGrpcTransactionFilter(
				await resolveTransactionFilter(mvr, { sender: '0x2', affectedAddress: '0x1' }),
			),
		).toEqual({ terms: [{ literals: [sentBy(ADDR_2), affected] }] });
	});

	it('converts function filters at each specificity', async () => {
		for (const [input, expected] of [
			['0x2', ADDR_2],
			['0x2::coin', `${ADDR_2}::coin`],
			['0x2::coin::transfer', `${ADDR_2}::coin::transfer`],
		]) {
			expect(
				toGrpcTransactionFilter(await resolveTransactionFilter(mvr, { function: input }))?.terms[0]
					.literals[0].predicate,
			).toEqual({ oneofKind: 'moveCall', moveCall: { function: expected } });
		}
	});

	it('converts event filters for each predicate', async () => {
		expect(
			toGrpcEventFilter(await resolveEventFilter(mvr, { sender: '0x1', emitModule: '0x2::coin' }))
				?.terms,
		).toEqual([
			{
				literals: [
					{ negated: false, predicate: { oneofKind: 'sender', sender: { address: ADDR_1 } } },
					{
						negated: false,
						predicate: { oneofKind: 'emitModule', emitModule: { module: `${ADDR_2}::coin` } },
					},
				],
			},
		]);

		expect(
			toGrpcEventFilter(await resolveEventFilter(mvr, { eventType: '0x2' }))?.terms[0].literals[0]
				.predicate,
		).toEqual({ oneofKind: 'eventType', eventType: { eventType: ADDR_2 } });

		expect(
			toGrpcEventFilter(await resolveEventFilter(mvr, { eventType: '0x2::coin::CoinCreated' }))
				?.terms[0].literals[0].predicate,
		).toEqual({ oneofKind: 'eventType', eventType: { eventType: '0x2::coin::CoinCreated' } });
	});
});

describe('GraphQL filter conversion', () => {
	it('converts inclusive-start, exclusive-end ranges into exclusive checkpoint bounds', () => {
		expect(toGraphQLCheckpointBounds({})).toEqual({
			afterCheckpoint: undefined,
			beforeCheckpoint: undefined,
		});
		expect(toGraphQLCheckpointBounds({ start: 5n, end: 10n })).toEqual({
			afterCheckpoint: 4,
			beforeCheckpoint: 10,
		});
		// There is no checkpoint before 0, so an inclusive start of 0 is unbounded
		expect(toGraphQLCheckpointBounds({ start: 0n })).toEqual({
			afterCheckpoint: undefined,
			beforeCheckpoint: undefined,
		});
		expect(toGraphQLCheckpointBounds({ end: 0n })).toEqual({
			afterCheckpoint: undefined,
			beforeCheckpoint: 0,
		});
	});

	it('maps transaction predicates and bounds onto one filter', () => {
		expect(
			toGraphQLTransactionFilter({ sender: ADDR_1, affectedObject: ADDR_3 }, { start: 1n }),
		).toEqual({
			sentAddress: ADDR_1,
			affectedAddress: undefined,
			affectedObject: ADDR_3,
			function: undefined,
			afterCheckpoint: 0,
			beforeCheckpoint: undefined,
		});
		expect(toGraphQLTransactionFilter({ affectedAddress: ADDR_2, function: ADDR_2 }, {})).toEqual({
			sentAddress: undefined,
			affectedAddress: ADDR_2,
			affectedObject: undefined,
			function: ADDR_2,
			afterCheckpoint: undefined,
			beforeCheckpoint: undefined,
		});
	});

	it('maps event predicates and bounds onto one filter', () => {
		expect(toGraphQLEventFilter({ sender: ADDR_1, eventType: ADDR_2 }, { end: 7n })).toEqual({
			sender: ADDR_1,
			module: undefined,
			type: ADDR_2,
			afterCheckpoint: undefined,
			beforeCheckpoint: 7,
		});
		expect(toGraphQLEventFilter(undefined, {})).toEqual({
			sender: undefined,
			module: undefined,
			type: undefined,
			afterCheckpoint: undefined,
			beforeCheckpoint: undefined,
		});
	});
});
