// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import type { Coverage } from '../../../../src/client/stream/adapter.js';
import { SuiStreamError } from '../../../../src/client/stream/errors.js';
import {
	assertAdvancing,
	boundaryPosition,
	comparePositions,
	CoverageTracker,
	indexedThrough,
	itemPosition,
	positionCoverage,
	positionSchema,
	progressPosition,
	reachesEnd,
	validatePosition,
} from '../../../../src/client/stream/position.js';

// Cursors are fake bytes: nothing reads them.
const cursor = (label: string) => new TextEncoder().encode(label);
const unknown: Coverage = { $kind: 'Unknown' };
const through = (checkpoint: bigint): Coverage => ({ $kind: 'Through', checkpoint });

const item = (checkpoint: bigint, transactionIndex = 0n, eventIndex: number | null = null) =>
	itemPosition(checkpoint, { cursor: cursor(`i${checkpoint}`), transactionIndex, eventIndex });
const unordered = (checkpoint: bigint, id: string) =>
	itemPosition(checkpoint, { cursor: cursor(id), itemId: id });
const progress = (coverage: Coverage = unknown) => progressPosition(cursor('p'), { coverage });
const genesis = boundaryPosition(0n);

describe('stream positions', () => {
	it.each([
		['items by checkpoint', item(1n), item(2n), -1],
		['items by transaction index', item(2n, 1n), item(2n, 0n), 1],
		['events by event index', item(2n, 0n, 0), item(2n, 0n, 1), -1],
		['items with mismatched indexes', item(2n, 0n, 0), item(2n, 0n, null), undefined],
		[
			'one item seen through two cursors',
			item(2n, 1n),
			{ ...item(2n, 1n), cursor: cursor('x') },
			0,
		],
		['items with the same id', unordered(3n, 'a'), unordered(3n, 'a'), 0],
		['items of one checkpoint without places', unordered(3n, 'a'), unordered(3n, 'b'), undefined],
		['genesis before everything', genesis, item(0n), -1],
		['a boundary before an item of its checkpoint', boundaryPosition(3n), item(3n), -1],
		['an item before a later boundary', item(3n), boundaryPosition(4n), -1],
		[
			'boundaries with and without a cursor',
			boundaryPosition(4n, { cursor: cursor('e') }),
			boundaryPosition(4n),
			0,
		],
		['progress, whatever its cursor', progress(), progress(), undefined],
		['progress and an item', progress(), item(3n), undefined],
	] as const)('compares %s', (_, a, b, expected) => {
		expect(comparePositions(a, b)).toBe(expected);
		expect(comparePositions(b, a)).toBe(expected === undefined ? undefined : -expected || 0);
	});

	it.each([
		['reported coverage', progress(through(7n)), 'events', through(7n)],
		['genesis', genesis, 'events', { $kind: 'None' }],
		['a boundary', boundaryPosition(6n), 'checkpoints', through(5n)],
		['an event item', item(5n), 'events', through(4n)],
		['an item at genesis', item(0n), 'events', { $kind: 'None' }],
		['a checkpoint item', item(5n), 'checkpoints', through(5n)],
		['progress', progress(), 'events', unknown],
	] as const)('derives coverage from %s', (_, value, family, expected) => {
		expect(positionCoverage(value, family)).toEqual(expected);
	});

	it.each([
		['an item', item(5n), 5n],
		['a boundary', boundaryPosition(6n), 5n],
		['progress', progressPosition(cursor('p'), { indexedCheckpoint: 9n }), 9n],
	] as const)('finds the checkpoint a server must index to resume from %s', (_, value, indexed) => {
		expect(indexedThrough(value)).toBe(indexed);
	});

	it('round-trips every kind through BCS', () => {
		for (const value of [
			item(3n, 2n, 1),
			unordered(3n, 'digest:0'),
			boundaryPosition(1n << 64n, { cursor: cursor('end') }),
			genesis,
			progressPosition(cursor('p'), { coverage: through(4n), indexedCheckpoint: 5n }),
		]) {
			expect(positionSchema.parse(positionSchema.serialize(value).toBytes())).toEqual(value);
		}
	});

	it.each([
		['an empty cursor', progressPosition(new Uint8Array())],
		['progress without a cursor', { ...progress(), cursor: null }],
		['progress with a checkpoint', { ...progress(), checkpoint: 1n }],
		['a boundary with item coordinates', boundaryPosition(2n, { transactionIndex: 1n })],
		['a boundary covering its own checkpoint', boundaryPosition(2n, { coverage: through(2n) })],
		['an item covering a later checkpoint', itemPosition(2n, { coverage: through(3n) })],
		['an event index without a transaction index', itemPosition(1n, { eventIndex: 0 })],
		['an indexed checkpoint on an item', itemPosition(1n, { indexedCheckpoint: 1n })],
	])('rejects %s', (_, value) => {
		expect(() => validatePosition(value)).toThrow(SuiStreamError);
	});

	it('accepts arbitrary cursor bytes', () => {
		expect(() => validatePosition(progressPosition(new Uint8Array([255, 0])))).not.toThrow();
	});

	it.each([
		['the end item through another cursor', { ...item(2n, 1n), cursor: cursor('x') }, true, true],
		['an item before the end', item(2n, 0n), false, true],
		['an item after the end', item(3n), true, false],
		['an unordered item of the end checkpoint', unordered(2n, 'b'), false, false],
		['progress', progress(), false, false],
	] as const)('decides whether %s reaches an end', (_, value, ascending, descending) => {
		expect(reachesEnd(value, item(2n, 1n), 'ascending')).toBe(ascending);
		expect(reachesEnd(value, item(2n, 1n), 'descending')).toBe(descending);
	});

	it('rejects positions that move backwards within one call', () => {
		expect(() => assertAdvancing(item(3n), item(2n), 'ascending')).toThrow('regressed');
		expect(() => assertAdvancing(item(2n), item(3n), 'descending')).toThrow('regressed');
		expect(() => assertAdvancing(item(3n), progress(), 'ascending')).not.toThrow();
	});
});

describe('CoverageTracker', () => {
	it('carries reported coverage to frames that omit it, across pages', () => {
		const tracker = new CoverageTracker('ascending', 'events', through(0n));
		tracker.apply(progress(through(1n)));
		// A later page that starts inside checkpoint 2 omits its watermark checkpoint.
		expect(tracker.apply(item(2n)).coverage).toEqual(through(1n));
	});

	it('gives progress the floor implied by the start and by delivered items', () => {
		const tracker = new CoverageTracker('ascending', 'events', through(99n));
		expect(tracker.apply(item(100n)).coverage).toEqual(through(99n));
		expect(tracker.apply(progress()).coverage).toEqual(through(99n));

		const fromGenesis = new CoverageTracker('ascending', 'events', { $kind: 'None' });
		expect(fromGenesis.apply(item(0n)).coverage).toEqual({ $kind: 'None' });
		expect(fromGenesis.apply(progress()).coverage).toEqual({ $kind: 'None' });
	});

	it('returns new positions instead of changing the frame position', () => {
		const raw = progress();
		new CoverageTracker('ascending', 'events', through(3n)).apply(raw);
		expect(raw.coverage).toEqual(unknown);
	});

	it.each([
		['ascending', [5n, 4n]],
		['descending', [4n, 5n]],
	] as const)('rejects a %s watermark that regresses', (order, [first, second]) => {
		const tracker = new CoverageTracker(order, 'events', unknown);
		tracker.apply(progress(through(first)));
		expect(() => tracker.apply(progress(through(second)))).toThrow('regressed');
	});

	it('records no coverage for descending positions', () => {
		const tracker = new CoverageTracker('descending', 'events', through(9n));
		expect(tracker.apply(progress(through(5n))).coverage).toEqual(unknown);
	});
});
