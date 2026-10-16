// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import type { Bound } from '../../../../src/client/stream/adapter.js';
import {
	boundaryPosition,
	frontierPosition,
	itemPosition,
	type GraphQLPosition,
} from '../../../../src/graphql/stream/position.js';
import { resolveScanWindow, type ScanWindow } from '../../../../src/graphql/stream/scan.js';

const indexed = { first: 5n, tip: 20n };
const item = (checkpoint: number) => ({
	position: itemPosition(`c${checkpoint}`, BigInt(checkpoint), 'id'),
});
const frontier = (tip: number) => ({ position: frontierPosition('f', BigInt(tip)) });
const boundary = (checkpoint: number) => ({ position: boundaryPosition(BigInt(checkpoint)) });
const at = (checkpoint: number) => ({ checkpoint: BigInt(checkpoint) });

type Row = [
	string,
	{ start?: Bound<GraphQLPosition>; end?: Bound<GraphQLPosition>; descending?: boolean },
	ScanWindow,
	boolean?,
];

describe('resolveScanWindow', () => {
	it.each<Row>([
		[
			'ascending checkpoint start, open end: up to the tip',
			{ start: at(8) },
			{ lower: 8n, upper: 21n },
		],
		[
			'ascending checkpoint end: exclusive, with a target',
			{ start: at(8), end: at(12) },
			{ lower: 8n, upper: 12n, target: 11n },
		],
		[
			'an end past the tip is clipped but keeps its target',
			{ start: at(8), end: at(30) },
			{ lower: 8n, upper: 21n, target: 29n },
		],
		[
			'an item start keeps the rest of its checkpoint',
			{ start: item(8) },
			{ lower: 8n, upper: 21n, after: 'c8' },
		],
		[
			'a checkpoint item start excludes its checkpoint',
			{ start: item(8) },
			{ lower: 9n, upper: 21n, after: 'c8' },
			true,
		],
		[
			'a frontier start pages by cursor only',
			{ start: frontier(15) },
			{ lower: 0n, upper: 21n, after: 'f' },
		],
		[
			'an item end bounds by cursor; the target is its checkpoint',
			{ start: at(8), end: item(12) },
			{ lower: 8n, upper: 21n, before: 'c12', target: 12n },
		],
		[
			'descending checkpoint start and end: inclusive start, exclusive end',
			{ start: at(12), end: at(8), descending: true },
			{ lower: 9n, upper: 13n },
		],
		[
			'a descending read to genesis stops at the oldest retained checkpoint',
			{ start: at(10), descending: true },
			{ lower: 5n, upper: 11n, pruned: true },
		],
		[
			'descending item end bounds by cursor from its checkpoint',
			{ start: at(12), end: item(8), descending: true },
			{ lower: 8n, upper: 13n, after: 'c8' },
		],
	])('%s', (_name, { start, end, descending }, window, onePerCheckpoint = false) => {
		const order = descending ? 'descending' : 'ascending';
		expect(resolveScanWindow({ start, end, order }, indexed, onePerCheckpoint)).toEqual(window);
	});

	// Every position kind in every role and direction. Items and frontiers bound by their cursor;
	// boundaries (with or without a pre-release cursor) bound by their checkpoint alone, like a
	// checkpoint: as a low side they exclude everything through it, as a high side they include it.
	const kinds = {
		item: { position: itemPosition('i', 12n, 'id') },
		boundary: boundary(12),
		'pre-release boundary': { position: { ...boundaryPosition(12n), cursor: 'b' } },
		frontier: { position: frontierPosition('f', 12n) },
	};
	type Kind = keyof typeof kinds;
	it.each<[Kind, 'start' | 'end', 'ascending' | 'descending', ScanWindow]>([
		['item', 'start', 'ascending', { lower: 12n, upper: 21n, after: 'i' }],
		['boundary', 'start', 'ascending', { lower: 13n, upper: 21n }],
		['pre-release boundary', 'start', 'ascending', { lower: 13n, upper: 21n }],
		['frontier', 'start', 'ascending', { lower: 0n, upper: 21n, after: 'f' }],
		['item', 'end', 'ascending', { lower: 8n, upper: 21n, before: 'i', target: 12n }],
		['boundary', 'end', 'ascending', { lower: 8n, upper: 13n, target: 12n }],
		['pre-release boundary', 'end', 'ascending', { lower: 8n, upper: 13n, target: 12n }],
		['frontier', 'end', 'ascending', { lower: 8n, upper: 21n, before: 'f', target: 12n }],
		['item', 'start', 'descending', { lower: 5n, upper: 21n, before: 'i' }],
		['boundary', 'start', 'descending', { lower: 5n, upper: 13n }],
		['pre-release boundary', 'start', 'descending', { lower: 5n, upper: 13n }],
		['frontier', 'start', 'descending', { lower: 5n, upper: 21n, before: 'f' }],
		['item', 'end', 'descending', { lower: 12n, upper: 17n, after: 'i' }],
		['boundary', 'end', 'descending', { lower: 13n, upper: 17n }],
		['pre-release boundary', 'end', 'descending', { lower: 13n, upper: 17n }],
		['frontier', 'end', 'descending', { lower: 0n, upper: 17n, after: 'f' }],
	])('a %s as %s, %s', (kind, role, order, window) => {
		// The other bound is a plain checkpoint: from 8 up, or from 16 down to after 4.
		const other = order === 'ascending' ? at(8) : role === 'start' ? at(4) : at(16);
		const bounds =
			role === 'start'
				? { start: kinds[kind], end: order === 'ascending' ? undefined : other }
				: { start: other, end: kinds[kind] };
		expect(resolveScanWindow({ ...bounds, order }, indexed, false)).toEqual(window);
	});

	it.each<[Kind, 'start' | 'end', ScanWindow]>([
		['item', 'start', { lower: 13n, upper: 21n, after: 'i' }],
		['boundary', 'start', { lower: 13n, upper: 21n }],
		['item', 'end', { lower: 8n, upper: 21n, before: 'i', target: 12n }],
		['boundary', 'end', { lower: 8n, upper: 13n, target: 12n }],
	])('a checkpoint stream %s as an ascending %s', (kind, role, window) => {
		const bounds = role === 'start' ? { start: kinds[kind] } : { start: at(8), end: kinds[kind] };
		expect(resolveScanWindow({ ...bounds, order: 'ascending' }, indexed, true)).toEqual(window);
	});

	it.each<
		[string, { start?: Bound<GraphQLPosition>; end?: Bound<GraphQLPosition>; descending?: boolean }]
	>([
		['an ascending start below the oldest checkpoint', { start: at(4) }],
		['an item start below the oldest checkpoint', { start: item(4) }],
		['a boundary start below the oldest checkpoint', { start: boundary(3) }],
	])('rejects %s as HistoryUnavailable', (_name, { start, end, descending }) => {
		const order = descending ? 'descending' : 'ascending';
		expect(() => resolveScanWindow({ start, end, order }, indexed, false)).toThrow(
			expect.objectContaining({ code: 'HistoryUnavailable' }),
		);
	});

	it('does not check pruning for a frontier, whose checkpoint is unknown', () => {
		expect(() =>
			resolveScanWindow({ start: frontier(3), order: 'ascending' }, indexed, false),
		).not.toThrow();
	});

	it('rejects checkpoint bounds past UInt53 but allows the exclusive end after it', () => {
		const max = BigInt(Number.MAX_SAFE_INTEGER);
		const window = { lower: 8n, upper: 21n, target: max };
		const order = 'ascending';
		expect(
			resolveScanWindow({ start: at(8), end: { checkpoint: max + 1n }, order }, indexed, false),
		).toEqual(window);
		expect(() =>
			resolveScanWindow({ start: at(8), end: { checkpoint: max + 2n }, order }, indexed, false),
		).toThrow(expect.objectContaining({ code: 'InvalidOptions' }));
	});
});
