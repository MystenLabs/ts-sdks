// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SuiStreamError } from '../../../../src/client/stream/index.js';
import type { Coverage } from '../../../../src/client/stream/index.js';
import {
	baselineBefore,
	comparePositions,
	CoverageTracker,
	grpcPositionSchema,
	locatePosition,
	positionCoverage,
	validatePosition,
	type GrpcPosition,
} from '../../../../src/grpc/stream/position.js';

const bytes = (label: string) => new TextEncoder().encode(label);
const unknown: Coverage = { $kind: 'Unknown' };
const through = (checkpoint: bigint): Coverage => ({ $kind: 'Through', checkpoint });

function position(overrides: Partial<GrpcPosition> = {}): GrpcPosition {
	return {
		cursor: { $kind: 'Native', bytes: bytes('cursor') },
		checkpoint: null,
		coverage: unknown,
		checkpointBoundary: null,
		transactionIndex: null,
		eventIndex: null,
		...overrides,
	};
}
const item = (checkpoint: bigint, transactionIndex = 0n, eventIndex: number | null = null) =>
	position({
		cursor: {
			$kind: 'Native',
			bytes: bytes(`item/${checkpoint}/${transactionIndex}/${eventIndex}`),
		},
		checkpoint,
		transactionIndex,
		eventIndex,
	});
const boundary = (before: bigint) =>
	position({
		cursor: { $kind: 'Native', bytes: bytes(`end/${before}`) },
		checkpointBoundary: before,
	});
const afterCheckpoint = (checkpoint: bigint): GrpcPosition =>
	position({ cursor: { $kind: 'Checkpoint', checkpoint }, coverage: through(checkpoint) });
const genesis = position({ cursor: { $kind: 'Genesis' }, coverage: { $kind: 'None' } });

describe('gRPC stream positions', () => {
	it.each([
		['items by checkpoint', item(1n), item(2n), -1],
		['items by transaction index', item(2n, 1n), item(2n, 0n), 1],
		['events by event index', item(2n, 0n, 0), item(2n, 0n, 1), -1],
		['items with mismatched indexes', item(2n, 0n, 0), item(2n, 0n, null), undefined],
		['equal cursors', afterCheckpoint(4n), afterCheckpoint(4n), 0],
		['genesis before everything', genesis, item(0n), -1],
		['a boundary before an item of its checkpoint', boundary(3n), item(3n), -1],
		['an item before a later boundary', item(3n), boundary(4n), -1],
		['a checkpoint cursor and a boundary', afterCheckpoint(3n), boundary(4n), 0],
		['unlocated progress cursors', position(), item(3n), undefined],
	] as const)('compares %s', (_, a, b, expected) => {
		expect(comparePositions(a, b)).toBe(expected);
		expect(comparePositions(b, a)).toBe(expected === undefined ? undefined : -expected || 0);
	});

	it.each([
		['reported coverage', position({ coverage: through(7n) }), 'events', through(7n)],
		['genesis', genesis, 'events', { $kind: 'None' }],
		['a checkpoint cursor', afterCheckpoint(5n), 'checkpoints', through(5n)],
		['an event item', item(5n), 'events', through(4n)],
		['an item at genesis', item(0n), 'events', { $kind: 'None' }],
		['a checkpoint item', item(5n), 'checkpoints', through(5n)],
		['an unlocated progress cursor', position(), 'events', unknown],
	] as const)('derives coverage from %s', (_, value, family, expected) => {
		expect(positionCoverage(value, family)).toEqual(expected);
	});

	it.each([
		['an item', item(5n), { checkpoint: 5n, boundary: false }],
		['a terminal boundary', boundary(6n), { checkpoint: 6n, boundary: true }],
		['a checkpoint cursor', afterCheckpoint(5n), { checkpoint: 6n, boundary: true }],
		['genesis', genesis, { checkpoint: 0n, boundary: true }],
		['progress', position(), { checkpoint: null, boundary: false }],
	] as const)('locates %s', (_, value, expected) => {
		expect(locatePosition(value)).toEqual(expected);
	});

	it('baselines a fresh follow just before the first live checkpoint', () => {
		expect(baselineBefore(item(9n))).toEqual(afterCheckpoint(8n));
		expect(baselineBefore(item(0n))).toEqual(genesis);
	});

	it('round-trips every cursor kind and nothing-covered coverage through BCS', () => {
		for (const value of [item(3n, 2n, 1), boundary(1n << 64n), afterCheckpoint(4n), genesis]) {
			const encoded = grpcPositionSchema.serialize(value).toBytes();
			expect(grpcPositionSchema.parse(encoded)).toEqual(value);
		}
	});

	it.each([
		['an empty native cursor', position({ cursor: { $kind: 'Native', bytes: new Uint8Array() } })],
		['genesis with an item', { ...genesis, checkpoint: 0n }],
		['genesis with coverage', { ...genesis, coverage: through(0n) }],
		['a checkpoint cursor with indexes', { ...afterCheckpoint(2n), transactionIndex: 1n }],
		['a checkpoint cursor with other coverage', { ...afterCheckpoint(2n), coverage: through(1n) }],
		['an item at a boundary', { ...item(2n), checkpointBoundary: 2n }],
		['indexes without a checkpoint', position({ transactionIndex: 1n })],
		['an event index without a transaction index', position({ checkpoint: 1n, eventIndex: 0 })],
	])('rejects token positions with %s', (_, value) => {
		expect(() => validatePosition(value)).toThrow(SuiStreamError);
	});

	it('accepts arbitrary opaque cursor bytes', () => {
		expect(() =>
			validatePosition(position({ cursor: { $kind: 'Native', bytes: new Uint8Array([255, 0]) } })),
		).not.toThrow();
	});
});

describe('CoverageTracker', () => {
	it('carries reported coverage to frames that omit it, across pages', () => {
		const tracker = new CoverageTracker('ascending', 'events', through(0n));
		tracker.apply(position({ coverage: through(1n) }));
		// A later page that starts inside checkpoint 2 omits its watermark checkpoint.
		expect(tracker.apply({ ...item(2n), coverage: unknown }).coverage).toEqual(through(1n));
	});

	it('gives progress the floor implied by the start and by delivered items', () => {
		const tracker = new CoverageTracker('ascending', 'events', through(99n));
		expect(tracker.apply(item(100n)).coverage).toEqual(through(99n));
		expect(tracker.apply(position()).coverage).toEqual(through(99n));

		const fromGenesis = new CoverageTracker('ascending', 'events', { $kind: 'None' });
		expect(fromGenesis.apply(item(0n)).coverage).toEqual({ $kind: 'None' });
		expect(fromGenesis.apply(position()).coverage).toEqual({ $kind: 'None' });
	});

	it('returns new positions instead of changing the frame position', () => {
		const raw = position();
		new CoverageTracker('ascending', 'events', through(3n)).apply(raw);
		expect(raw.coverage).toEqual(unknown);
	});

	it.each([
		['ascending', [5n, 4n]],
		['descending', [4n, 5n]],
	] as const)('rejects a %s watermark that regresses', (order, [first, second]) => {
		const tracker = new CoverageTracker(order, 'events', unknown);
		tracker.apply(position({ coverage: through(first) }));
		expect(() => tracker.apply(position({ coverage: through(second) }))).toThrow('regressed');
	});

	it('records no coverage for descending positions', () => {
		const tracker = new CoverageTracker('descending', 'events', through(9n));
		expect(tracker.apply(position({ coverage: through(5n) })).coverage).toEqual(unknown);
	});
});
