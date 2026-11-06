// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';

import type { StreamFamily } from './adapter.js';

/**
 * Stream positions, shared by every transport. Adapters build positions from what the server
 * reports and turn them back into request cursors; cursors themselves are never parsed or compared.
 *
 * - `Item`: a delivered item in `checkpoint`. Its place within the checkpoint is
 *   `transactionIndex`/`eventIndex` where reported, else only `itemId` identifies it.
 * - `Boundary`: just before `checkpoint`, or with `transactionIndex`, just before that key within
 *   it (resumed by its cursor).
 * - `Progress`: a cursor the server reported without a checkpoint (GraphQL only).
 *
 * `nextUncovered` is the first checkpoint not known to be delivered at the position, in ascending
 * order: every matching item before it was delivered. Null makes no claim.
 */
export interface StreamPosition {
	kind: 'Item' | 'Boundary' | 'Progress';
	cursor: Uint8Array | null;
	/** Null only for `Progress`. */
	checkpoint: bigint | null;
	transactionIndex: bigint | null;
	eventIndex: number | null;
	itemId: string | null;
	nextUncovered: bigint | null;
}

const PositionBcs = bcs.struct('StreamPosition', {
	kind: bcs.enum('StreamPositionKind', { Item: null, Boundary: null, Progress: null }),
	cursor: bcs.option(bcs.byteVector()),
	checkpoint: bcs.option(bcs.u64()),
	transactionIndex: bcs.option(bcs.u64()),
	eventIndex: bcs.option(bcs.u32()),
	itemId: bcs.option(bcs.string()),
	nextUncovered: bcs.option(bcs.u64()),
});

const optionalBigInt = (value: string | null) => (value === null ? null : BigInt(value));

export const positionSchema = PositionBcs.transform({
	input: (position: StreamPosition) => ({
		...position,
		kind: { [position.kind]: true } as { Item: true } | { Boundary: true } | { Progress: true },
	}),
	output: (value): StreamPosition => ({
		kind: value.kind.$kind,
		cursor: value.cursor === null ? null : Uint8Array.from(value.cursor),
		checkpoint: optionalBigInt(value.checkpoint),
		transactionIndex: optionalBigInt(value.transactionIndex),
		eventIndex: value.eventIndex,
		itemId: value.itemId,
		nextUncovered: optionalBigInt(value.nextUncovered),
	}),
});

const EMPTY: Omit<StreamPosition, 'kind'> = {
	cursor: null,
	checkpoint: null,
	transactionIndex: null,
	eventIndex: null,
	itemId: null,
	nextUncovered: null,
};

export function itemPosition(
	checkpoint: bigint,
	fields: Partial<Omit<StreamPosition, 'kind' | 'checkpoint'>> = {},
): StreamPosition {
	return { ...EMPTY, ...fields, kind: 'Item', checkpoint };
}

/**
 * The boundary just before `checkpoint`, or with indexes, just before that key within it. Zero
 * indexes are the plain boundary before `checkpoint`, which resumes without a cursor.
 */
export function boundaryPosition(
	checkpoint: bigint,
	fields: Partial<Omit<StreamPosition, 'kind' | 'checkpoint'>> = {},
): StreamPosition {
	const position: StreamPosition = { ...EMPTY, ...fields, kind: 'Boundary', checkpoint };
	if (fields.transactionIndex || fields.eventIndex) return position;
	return { ...position, cursor: null, transactionIndex: null, eventIndex: null };
}

export function progressPosition(cursor: Uint8Array): StreamPosition {
	return { ...EMPTY, kind: 'Progress', cursor };
}

/** Whether items of the position's checkpoint can lie on both sides of it. */
export function insideCheckpoint(position: StreamPosition): boolean {
	return position.kind === 'Item' || position.transactionIndex !== null;
}

/**
 * Ledger order of two positions from their coordinates. Undefined where coordinates don't decide
 * it: a `Progress` position, or two items of one checkpoint whose places are not reported.
 */
export function comparePositions(a: StreamPosition, b: StreamPosition): -1 | 0 | 1 | undefined {
	if (a.checkpoint === null || b.checkpoint === null) return undefined;
	if (a.checkpoint !== b.checkpoint) return order(a.checkpoint, b.checkpoint);
	if (a.kind === 'Boundary' && b.kind === 'Boundary') return compareKeys(a, b);
	if (a.kind === 'Boundary') return boundaryToItem(a, b);
	if (b.kind === 'Boundary') {
		const comparison = boundaryToItem(b, a);
		return comparison && (-comparison as -1 | 1);
	}
	if (a.itemId !== null || b.itemId !== null) return a.itemId === b.itemId ? 0 : undefined;
	return compareKeys(a, b);
}

function order(a: bigint, b: bigint): -1 | 0 | 1 {
	return a === b ? 0 : a < b ? -1 : 1;
}

/** Keys within one checkpoint, unset indexes counting as 0. */
function compareKeys(a: StreamPosition, b: StreamPosition): -1 | 0 | 1 {
	return (
		order(a.transactionIndex ?? 0n, b.transactionIndex ?? 0n) ||
		order(BigInt(a.eventIndex ?? 0), BigInt(b.eventIndex ?? 0))
	);
}

/** A boundary against an item of its checkpoint: it sits before the item with its key. */
function boundaryToItem(boundary: StreamPosition, item: StreamPosition): -1 | 1 | undefined {
	if (boundary.transactionIndex === null) return -1;
	if (item.transactionIndex === null) return undefined;
	return compareKeys(boundary, item) <= 0 ? -1 : 1;
}

/**
 * The first checkpoint not covered at `position`: what was recorded there, else what its kind
 * implies. A checkpoint item covers its checkpoint; anything else only the checkpoints before it.
 */
export function nextUncoveredAt(position: StreamPosition, family: StreamFamily): bigint | null {
	if (position.nextUncovered !== null) return position.nextUncovered;
	const { kind, checkpoint } = position;
	if (checkpoint === null) return null;
	return kind === 'Item' && family === 'checkpoints' ? checkpoint + 1n : checkpoint;
}
