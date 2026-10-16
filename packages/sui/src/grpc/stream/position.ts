// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';

import type { Coverage, PositionCodec, StreamFamily } from '../../client/stream/index.js';
import { coverageBefore, maxCoverage, SuiStreamError } from '../../client/stream/index.js';
import type { SuiClientTypes } from '../../client/types.js';

/**
 * Where a gRPC ledger stream stands.
 *
 * - `Native`: a server `Watermark.cursor`. Opaque: never parsed, only sent back as `after`/`before`.
 * - `Checkpoint`: a checkpoint subscription's cursor `n`, or a fresh follow's baseline. Resumes at
 *   `start_checkpoint = n + 1`.
 * - `Genesis`: before checkpoint 0.
 */
export type GrpcCursor =
	| { $kind: 'Native'; bytes: Uint8Array }
	| { $kind: 'Checkpoint'; checkpoint: bigint }
	| { $kind: 'Genesis' };

/**
 * A resumable position plus the ledger coordinates the server reported with it. Positions are
 * immutable: helpers return new positions.
 */
export interface GrpcPosition {
	cursor: GrpcCursor;
	/** Checkpoint of the item delivered at this position; null for progress. */
	checkpoint: bigint | null;
	/** Ascending coverage known when this position was reached (`Unknown` when descending). */
	coverage: Coverage;
	/** Set on terminal progress: the position is the boundary just before this checkpoint. */
	checkpointBoundary: bigint | null;
	transactionIndex: bigint | null;
	eventIndex: number | null;
}

export const U64_MAX = (1n << 64n) - 1n;

const PositionBcs = bcs.struct('GrpcStreamPosition', {
	cursor: bcs.enum('GrpcStreamCursor', {
		Native: bcs.byteVector(),
		Checkpoint: bcs.u64(),
		Genesis: null,
	}),
	checkpoint: bcs.option(bcs.u64()),
	// Absent when unknown; `None` means nothing is covered yet (before genesis).
	coverage: bcs.option(bcs.enum('GrpcStreamCoverage', { None: null, Through: bcs.u64() })),
	// A boundary can sit after the last u64 checkpoint.
	checkpointBoundary: bcs.option(bcs.u128()),
	transactionIndex: bcs.option(bcs.u64()),
	eventIndex: bcs.option(bcs.u32()),
});

const bigintOrNull = (value: string | null) => (value === null ? null : BigInt(value));

export const grpcPositionSchema = PositionBcs.transform({
	input: (position: GrpcPosition) => ({
		cursor: cursorToBcs(position.cursor),
		checkpoint: position.checkpoint,
		coverage: coverageToBcs(position.coverage),
		checkpointBoundary: position.checkpointBoundary,
		transactionIndex: position.transactionIndex,
		eventIndex: position.eventIndex,
	}),
	output: (value): GrpcPosition => ({
		cursor: cursorFromBcs(value.cursor),
		checkpoint: bigintOrNull(value.checkpoint),
		coverage: coverageFromBcs(value.coverage),
		checkpointBoundary: bigintOrNull(value.checkpointBoundary),
		transactionIndex: bigintOrNull(value.transactionIndex),
		eventIndex: value.eventIndex,
	}),
});

function cursorToBcs(cursor: GrpcCursor) {
	switch (cursor.$kind) {
		case 'Native':
			return { Native: cursor.bytes };
		case 'Checkpoint':
			return { Checkpoint: cursor.checkpoint };
		case 'Genesis':
			return { Genesis: true as const };
	}
}

function cursorFromBcs(cursor: (typeof PositionBcs.$inferType)['cursor']): GrpcCursor {
	switch (cursor.$kind) {
		case 'Native':
			return { $kind: 'Native', bytes: Uint8Array.from(cursor.Native) };
		case 'Checkpoint':
			return { $kind: 'Checkpoint', checkpoint: BigInt(cursor.Checkpoint) };
		case 'Genesis':
			return { $kind: 'Genesis' };
	}
}

function coverageToBcs(coverage: Coverage) {
	switch (coverage.$kind) {
		case 'Unknown':
			return null;
		case 'None':
			return { None: true as const };
		case 'Through':
			return { Through: coverage.checkpoint };
	}
}

function coverageFromBcs(coverage: (typeof PositionBcs.$inferType)['coverage']): Coverage {
	if (!coverage) return { $kind: 'Unknown' };
	return coverage.$kind === 'None'
		? { $kind: 'None' }
		: { $kind: 'Through', checkpoint: BigInt(coverage.Through) };
}

/** A position with no ledger coordinates besides its cursor. */
function progressAt(cursor: GrpcCursor, coverage: Coverage): GrpcPosition {
	return {
		cursor,
		checkpoint: null,
		coverage,
		checkpointBoundary: null,
		transactionIndex: null,
		eventIndex: null,
	};
}

/**
 * The position just before `item`'s checkpoint. A fresh follow commits it so that a token exists
 * before the first match, and resuming it replays that whole checkpoint.
 */
export function baselineBefore(item: GrpcPosition): GrpcPosition {
	const checkpoint = item.checkpoint;
	if (checkpoint === null) throw new SuiStreamError('Protocol', 'Live item has no checkpoint');
	return checkpoint === 0n
		? progressAt({ $kind: 'Genesis' }, { $kind: 'None' })
		: progressAt(
				{ $kind: 'Checkpoint', checkpoint: checkpoint - 1n },
				{ $kind: 'Through', checkpoint: checkpoint - 1n },
			);
}

/** A checkpoint subscription frame: its cursor is the checkpoint it has fully covered. */
export function checkpointCursorPosition(cursor: bigint, hasItem: boolean): GrpcPosition {
	return {
		...progressAt(
			{ $kind: 'Checkpoint', checkpoint: cursor },
			{ $kind: 'Through', checkpoint: cursor },
		),
		checkpoint: hasItem ? cursor : null,
	};
}

/** The terminal position of a page that stopped at a checkpoint boundary. */
export function withCheckpointBoundary(position: GrpcPosition, boundary: bigint): GrpcPosition {
	return { ...position, checkpointBoundary: boundary };
}

/**
 * Ascending coverage implied by having delivered everything through `position`: what the server
 * reported, else what the cursor or item implies. A checkpoint item covers its own checkpoint;
 * a transaction or event item covers only the checkpoints before its own.
 */
export function positionCoverage(position: GrpcPosition, family: StreamFamily): Coverage {
	if (position.coverage.$kind !== 'Unknown') return position.coverage;
	const { cursor, checkpoint } = position;
	if (cursor.$kind === 'Genesis') return { $kind: 'None' };
	if (cursor.$kind === 'Checkpoint') return { $kind: 'Through', checkpoint: cursor.checkpoint };
	if (checkpoint === null) return { $kind: 'Unknown' };
	return family === 'checkpoints' ? { $kind: 'Through', checkpoint } : coverageBefore(checkpoint);
}

/**
 * The checkpoint a position sits in. `boundary` positions lie before every item of that
 * checkpoint; an item lies inside its checkpoint; a native progress cursor is not located.
 */
export function locatePosition(position: GrpcPosition): {
	checkpoint: bigint | null;
	boundary: boolean;
} {
	if (position.checkpoint !== null) return { checkpoint: position.checkpoint, boundary: false };
	const before = boundaryBefore(position);
	return before === null
		? { checkpoint: null, boundary: false }
		: { checkpoint: before, boundary: true };
}

/** For boundary positions, the checkpoint they sit just before. */
function boundaryBefore(position: GrpcPosition): bigint | null {
	switch (position.cursor.$kind) {
		case 'Genesis':
			return 0n;
		case 'Checkpoint':
			return position.cursor.checkpoint + 1n;
		case 'Native':
			return position.checkpointBoundary;
	}
}

/**
 * Ledger order of two positions, using only what the server reported: equal cursors, item
 * coordinates and checkpoint boundaries. Native cursor bytes are never interpreted, so two
 * progress cursors without boundaries, or an item and such a cursor, are unordered.
 */
export function comparePositions(a: GrpcPosition, b: GrpcPosition): -1 | 0 | 1 | undefined {
	if (sameCursor(a.cursor, b.cursor)) return 0;
	const x = ledgerPoint(a);
	const y = ledgerPoint(b);
	if (!x || !y) return undefined;
	if (x.$kind === 'Boundary' && y.$kind === 'Boundary') return order(x.before, y.before);
	if (x.$kind === 'Boundary' && y.$kind === 'Item') return x.before <= y.checkpoint ? -1 : 1;
	if (x.$kind === 'Item' && y.$kind === 'Boundary') return y.before <= x.checkpoint ? 1 : -1;
	if (x.$kind === 'Item' && y.$kind === 'Item') return compareItems(x, y);
	return undefined;
}

type LedgerPoint =
	| {
			$kind: 'Item';
			checkpoint: bigint;
			transactionIndex: bigint | null;
			eventIndex: number | null;
	  }
	| { $kind: 'Boundary'; before: bigint };

function ledgerPoint(position: GrpcPosition): LedgerPoint | undefined {
	if (position.checkpoint !== null) {
		return {
			$kind: 'Item',
			checkpoint: position.checkpoint,
			transactionIndex: position.transactionIndex,
			eventIndex: position.eventIndex,
		};
	}
	const before = boundaryBefore(position);
	return before === null ? undefined : { $kind: 'Boundary', before };
}

/** Items order by checkpoint, then by the indexes both report. */
function compareItems(
	a: Extract<LedgerPoint, { $kind: 'Item' }>,
	b: Extract<LedgerPoint, { $kind: 'Item' }>,
): -1 | 0 | 1 | undefined {
	if (a.checkpoint !== b.checkpoint) return order(a.checkpoint, b.checkpoint);
	for (const field of ['transactionIndex', 'eventIndex'] as const) {
		const x = a[field];
		const y = b[field];
		if (x === null || y === null) {
			if (x !== y) return undefined;
			continue;
		}
		if (x !== y) return x < y ? -1 : 1;
	}
	return 0;
}

function order(a: bigint, b: bigint): -1 | 0 | 1 {
	return a === b ? 0 : a < b ? -1 : 1;
}

export function sameCursor(a: GrpcCursor, b: GrpcCursor): boolean {
	switch (a.$kind) {
		case 'Native':
			return (
				b.$kind === 'Native' &&
				a.bytes.length === b.bytes.length &&
				a.bytes.every((byte, index) => byte === b.bytes[index])
			);
		case 'Checkpoint':
			return b.$kind === 'Checkpoint' && a.checkpoint === b.checkpoint;
		case 'Genesis':
			return b.$kind === 'Genesis';
	}
}

/** Rejects token positions whose metadata this adapter could not have produced. */
export function validatePosition(position: GrpcPosition): void {
	const { cursor, checkpoint, coverage, checkpointBoundary, transactionIndex, eventIndex } =
		position;
	const invalid = (reason: string) =>
		new SuiStreamError('InvalidToken', `Invalid gRPC stream position: ${reason}`);
	const hasIndexes = transactionIndex !== null || eventIndex !== null;

	switch (cursor.$kind) {
		case 'Genesis':
			if (checkpoint !== null || checkpointBoundary !== null || hasIndexes) {
				throw invalid('genesis carries ledger coordinates');
			}
			if (coverage.$kind === 'Through') throw invalid('genesis claims coverage');
			return;
		case 'Checkpoint':
			if (checkpointBoundary !== null || hasIndexes) {
				throw invalid('checkpoint cursor carries item coordinates');
			}
			if (checkpoint !== null && checkpoint !== cursor.checkpoint) {
				throw invalid('checkpoint cursor and item disagree');
			}
			if (coverage.$kind !== 'Through' || coverage.checkpoint !== cursor.checkpoint) {
				throw invalid('checkpoint cursor coverage');
			}
			return;
		case 'Native':
			// The server validates the cursor bytes; only their presence is checked here.
			if (cursor.bytes.length === 0) throw invalid('empty cursor');
			if (checkpoint !== null && checkpointBoundary !== null) {
				throw invalid('an item cannot be a checkpoint boundary');
			}
			if (checkpoint === null && hasIndexes) throw invalid('indexes without a checkpoint');
			if (eventIndex !== null && transactionIndex === null) {
				throw invalid('event index without a transaction index');
			}
	}
}

export function grpcPositionCodec(): PositionCodec<GrpcPosition> {
	return { schema: grpcPositionSchema, validate: validatePosition };
}

/**
 * Throws when `next` breaks the server's ordering guarantees relative to `previous` in one call:
 * positions never move backwards, and two items never share a cursor.
 */
export function assertAdvancing(
	previous: GrpcPosition | undefined,
	next: GrpcPosition,
	order: SuiClientTypes.Order,
) {
	if (!previous) return;
	if (next.checkpoint !== null && sameCursor(previous.cursor, next.cursor)) {
		throw new SuiStreamError('Protocol', 'Ledger item repeated its cursor');
	}
	const comparison = comparePositions(next, previous);
	if (comparison !== undefined && comparison * (order === 'ascending' ? 1 : -1) < 0) {
		throw new SuiStreamError('Protocol', 'Ledger cursor regressed');
	}
}

/**
 * Carries ascending coverage along one traversal (a scan pass, or a live feed after its gap), so
 * every position records what it covers even when its frame did not say.
 *
 * - `reported`: the highest `Watermark.checkpoint` seen so far. A lower report is a protocol
 *   error. Frames that omit it inherit it.
 * - `floor`: coverage implied by the start and by every position so far.
 *
 * Descending coverage is reported in the other direction and is only checked, never recorded.
 */
export class CoverageTracker {
	readonly #order: SuiClientTypes.Order;
	readonly #family: StreamFamily;
	#reported: bigint | undefined;
	#floor: Coverage;

	constructor(order: SuiClientTypes.Order, family: StreamFamily, floor: Coverage) {
		this.#order = order;
		this.#family = family;
		this.#floor = order === 'ascending' ? floor : { $kind: 'Unknown' };
	}

	/** Takes a position read from the server (coverage = its watermark's) and records coverage. */
	apply(raw: GrpcPosition): GrpcPosition {
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
