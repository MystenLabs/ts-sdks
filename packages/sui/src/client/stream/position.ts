// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';

import type { Coverage, StreamFamily } from './adapter.js';
import { SuiStreamError } from './errors.js';

/**
 * Stream positions, shared by every transport. This module holds all ordering, coverage and
 * validation of positions; adapters only build positions from responses and turn them back into
 * request cursors.
 *
 * Cursors are opaque. They are never parsed or compared: a cursor only goes back to the server as
 * `after` or `before`. Everything the core knows about a position comes from coordinates the
 * server reports next to it.
 *
 * Kinds:
 * - `Item`: a delivered item, in `checkpoint`. Its place within the checkpoint is
 *   `transactionIndex`/`eventIndex` where reported, else only `itemId` identifies it.
 * - `Boundary`: just before `checkpoint`, with nothing of it delivered. Genesis is the boundary
 *   before checkpoint 0. Without a cursor, it resumes by checkpoint.
 * - `Progress`: a cursor reported without a checkpoint, such as an empty page's end or a
 *   subscription's progress. Its coordinates are unknown.
 *
 * Ordering (`comparePositions`) uses coordinates only. Positions without them, or two items of one
 * checkpoint without reported places, are unordered; within one stream a later commit supersedes
 * an earlier one, so unordered positions are committed in arrival order.
 *
 * Coverage (`positionCoverage`) is ascending: what the server reported at the position, else what
 * its kind implies. A checkpoint item covers its checkpoint, a transaction or event item only the
 * ones before it, a boundary the ones before it, and progress nothing known.
 *
 * Roles: a start position is exclusive (resume after it); an end position is exclusive too (stop
 * before it); the committed position is the resume point of every reconnect and token.
 */
export interface StreamPosition {
	kind: 'Item' | 'Boundary' | 'Progress';
	/** The server's cursor. Null where the stream resumes by checkpoint instead. */
	cursor: Uint8Array | null;
	/** Null only for `Progress`. */
	checkpoint: bigint | null;
	/** An item's place within its checkpoint, where the server reports it. */
	transactionIndex: bigint | null;
	eventIndex: number | null;
	/** Identifies an item whose place within its checkpoint is not reported. */
	itemId: string | null;
	/** Ascending coverage the server reported here; `Unknown` when it reported none. */
	coverage: Coverage;
	/** The indexed tip when a `Progress` cursor was read; a server behind it cannot resume it. */
	indexedCheckpoint: bigint | null;
}

const CoverageBcs = bcs.option(bcs.enum('StreamCoverage', { None: null, Through: bcs.u64() }));

const PositionBcs = bcs.struct('StreamPosition', {
	kind: bcs.enum('StreamPositionKind', { Item: null, Boundary: null, Progress: null }),
	cursor: bcs.option(bcs.byteVector()),
	// A boundary can sit after the last u64 checkpoint.
	checkpoint: bcs.option(bcs.u128()),
	transactionIndex: bcs.option(bcs.u64()),
	eventIndex: bcs.option(bcs.u32()),
	itemId: bcs.option(bcs.string()),
	coverage: CoverageBcs,
	indexedCheckpoint: bcs.option(bcs.u64()),
});

const optionalBigInt = (value: string | null) => (value === null ? null : BigInt(value));

/** Positions are equal exactly when their serialized bytes are equal. */
export const positionSchema = PositionBcs.transform({
	input: (position: StreamPosition) => ({
		...position,
		kind: { [position.kind]: true } as { Item: true } | { Boundary: true } | { Progress: true },
		coverage: coverageToBcs(position.coverage),
	}),
	output: (value): StreamPosition => ({
		kind: value.kind.$kind,
		cursor: value.cursor === null ? null : Uint8Array.from(value.cursor),
		checkpoint: optionalBigInt(value.checkpoint),
		transactionIndex: optionalBigInt(value.transactionIndex),
		eventIndex: value.eventIndex,
		itemId: value.itemId,
		coverage: coverageFromBcs(value.coverage),
		indexedCheckpoint: optionalBigInt(value.indexedCheckpoint),
	}),
});

export function coverageToBcs(coverage: Coverage) {
	switch (coverage.$kind) {
		case 'Unknown':
			return null;
		case 'None':
			return { None: true as const };
		case 'Through':
			return { Through: coverage.checkpoint };
	}
}

export function coverageFromBcs(coverage: typeof CoverageBcs.$inferType): Coverage {
	if (!coverage) return { $kind: 'Unknown' };
	return coverage.$kind === 'None'
		? { $kind: 'None' }
		: { $kind: 'Through', checkpoint: BigInt(coverage.Through) };
}

const EMPTY: Omit<StreamPosition, 'kind'> = {
	cursor: null,
	checkpoint: null,
	transactionIndex: null,
	eventIndex: null,
	itemId: null,
	coverage: { $kind: 'Unknown' },
	indexedCheckpoint: null,
};

export function itemPosition(
	checkpoint: bigint,
	fields: Partial<Omit<StreamPosition, 'kind' | 'checkpoint'>> = {},
): StreamPosition {
	return { ...EMPTY, ...fields, kind: 'Item', checkpoint };
}

/** The boundary just before `checkpoint`. */
export function boundaryPosition(
	checkpoint: bigint,
	fields: Partial<Omit<StreamPosition, 'kind' | 'checkpoint'>> = {},
): StreamPosition {
	return { ...EMPTY, ...fields, kind: 'Boundary', checkpoint };
}

export function progressPosition(
	cursor: Uint8Array,
	fields: Partial<Omit<StreamPosition, 'kind' | 'cursor' | 'checkpoint'>> = {},
): StreamPosition {
	return { ...EMPTY, ...fields, kind: 'Progress', cursor };
}

export function positionBytes(position: StreamPosition): Uint8Array {
	return positionSchema.serialize(position).toBytes();
}

/**
 * Ledger order of two positions, from coordinates alone; cursors are never compared. Undefined
 * where coordinates don't decide it: a `Progress` position, or two items of one checkpoint whose
 * places in it are not reported. Within one stream a later commit supersedes an earlier one.
 */
export function comparePositions(a: StreamPosition, b: StreamPosition): -1 | 0 | 1 | undefined {
	if (a.checkpoint === null || b.checkpoint === null) return undefined;
	if (a.kind === 'Boundary' && b.kind === 'Boundary') return order(a.checkpoint, b.checkpoint);
	if (a.kind === 'Boundary') return a.checkpoint <= b.checkpoint ? -1 : 1;
	if (b.kind === 'Boundary') return b.checkpoint <= a.checkpoint ? 1 : -1;
	if (a.checkpoint !== b.checkpoint) return order(a.checkpoint, b.checkpoint);
	if (a.itemId !== null || b.itemId !== null) return a.itemId === b.itemId ? 0 : undefined;
	for (const field of ['transactionIndex', 'eventIndex'] as const) {
		const x = a[field];
		const y = b[field];
		if (x === null || y === null) {
			if (x !== y) return undefined;
		} else if (x !== y) {
			return x < y ? -1 : 1;
		}
	}
	// A checkpoint item, or one item seen twice.
	return 0;
}

function order(a: bigint, b: bigint): -1 | 0 | 1 {
	return a === b ? 0 : a < b ? -1 : 1;
}

/**
 * Ascending coverage implied by having delivered everything through `position`: what the server
 * reported, else what the position implies. A checkpoint covers itself; a transaction or event
 * covers only the checkpoints before its own, which may hold more items.
 */
export function positionCoverage(position: StreamPosition, family: StreamFamily): Coverage {
	if (position.coverage.$kind !== 'Unknown') return position.coverage;
	const { kind, checkpoint } = position;
	if (checkpoint === null) return { $kind: 'Unknown' };
	if (kind === 'Item' && family === 'checkpoints') return { $kind: 'Through', checkpoint };
	return coverageBefore(checkpoint);
}

/** Coverage of everything before `checkpoint`. */
export function coverageBefore(checkpoint: bigint): Coverage {
	return checkpoint === 0n ? { $kind: 'None' } : { $kind: 'Through', checkpoint: checkpoint - 1n };
}

/** Rejects positions this SDK cannot have produced. */
export function validatePosition(position: StreamPosition): void {
	const { kind, cursor, checkpoint, transactionIndex, eventIndex, itemId, coverage } = position;
	const invalid = (reason: string) =>
		new SuiStreamError('InvalidToken', `Invalid stream position: ${reason}`);
	// The server validates cursors; only their presence is checked here.
	if (cursor !== null && cursor.length === 0) throw invalid('empty cursor');
	if (eventIndex !== null && transactionIndex === null) {
		throw invalid('event index without a transaction index');
	}
	if (kind !== 'Item' && (transactionIndex !== null || itemId !== null)) {
		throw invalid('item coordinates outside an item');
	}
	if (kind !== 'Progress' && position.indexedCheckpoint !== null) {
		throw invalid('indexed checkpoint outside progress');
	}
	if (kind === 'Progress' ? checkpoint !== null || cursor === null : checkpoint === null) {
		throw invalid(`${kind} coordinates`);
	}
	if (coverage.$kind !== 'Through' || checkpoint === null) return;
	const limit = kind === 'Item' ? checkpoint : checkpoint - 1n;
	if (coverage.checkpoint > limit) throw invalid('coverage beyond the position');
}

/** The checkpoint a position sits in. A boundary lies before every item of its checkpoint. */
export function locatePosition(position: StreamPosition): {
	checkpoint: bigint | null;
	boundary: boolean;
} {
	return { checkpoint: position.checkpoint, boundary: position.kind === 'Boundary' };
}

/** The newest checkpoint a server must have indexed before it can resume from `position`. */
export function indexedThrough(position: StreamPosition): bigint | null {
	switch (position.kind) {
		case 'Item':
			return position.checkpoint;
		case 'Boundary':
			return position.checkpoint! - 1n;
		case 'Progress':
			return position.indexedCheckpoint;
	}
}

/**
 * Throws when `next` breaks the server's ordering within one call: positions never move backwards
 * in `order`.
 */
export function assertAdvancing(
	previous: StreamPosition | undefined,
	next: StreamPosition,
	order: 'ascending' | 'descending',
) {
	if (!previous) return;
	const comparison = comparePositions(next, previous);
	if (comparison !== undefined && comparison * (order === 'ascending' ? 1 : -1) < 0) {
		throw new SuiStreamError('Protocol', 'Ledger position regressed');
	}
}

/**
 * Carries ascending coverage along one scan pass or live feed, so every position records what it
 * covers even when the server omitted it on that frame. Descending coverage is only checked.
 */
export class CoverageTracker {
	readonly #order: 'ascending' | 'descending';
	readonly #family: StreamFamily;
	#reported: bigint | undefined;
	#floor: Coverage;

	constructor(order: 'ascending' | 'descending', family: StreamFamily, floor: Coverage) {
		this.#order = order;
		this.#family = family;
		this.#floor = order === 'ascending' ? floor : { $kind: 'Unknown' };
	}

	apply(raw: StreamPosition): StreamPosition {
		const reported = raw.coverage.$kind === 'Through' ? raw.coverage.checkpoint : undefined;
		if (reported !== undefined && this.#reported !== undefined) {
			const regressed =
				this.#order === 'ascending' ? reported < this.#reported : reported > this.#reported;
			if (regressed) throw new SuiStreamError('Protocol', 'Ledger watermark regressed');
		}
		this.#reported = reported ?? this.#reported;
		if (this.#order === 'descending') return { ...raw, coverage: { $kind: 'Unknown' } };

		const carried: Coverage =
			this.#reported === undefined
				? { $kind: 'Unknown' }
				: { $kind: 'Through', checkpoint: this.#reported };
		this.#floor = maxCoverage(this.#floor, positionCoverage(raw, this.#family));
		return { ...raw, coverage: maxCoverage(carried, this.#floor) };
	}
}

/** The first checkpoint not covered, or undefined when coverage is unknown. */
export function nextUncovered(coverage: Coverage): bigint | undefined {
	if (coverage.$kind === 'Unknown') return undefined;
	return coverage.$kind === 'None' ? 0n : coverage.checkpoint + 1n;
}

/** Orders known coverages; `Unknown` makes no claim and compares equal to everything. */
export function compareCoverage(a: Coverage, b: Coverage): number {
	const x = nextUncovered(a);
	const y = nextUncovered(b);
	if (x === undefined || y === undefined || x === y) return 0;
	return x < y ? -1 : 1;
}

/** The larger claim; any known coverage replaces `Unknown`. */
export function maxCoverage(a: Coverage, b: Coverage): Coverage {
	if (a.$kind === 'Unknown') return b;
	return compareCoverage(b, a) > 0 ? b : a;
}

/** Ascending coverage at a scan start: before a checkpoint bound, or what a position covers. */
export function boundCoverage(
	start: { checkpoint: bigint } | { position: StreamPosition } | undefined,
	family: StreamFamily,
): Coverage {
	if (!start) return { $kind: 'Unknown' };
	return 'checkpoint' in start
		? coverageBefore(start.checkpoint)
		: positionCoverage(start.position, family);
}
