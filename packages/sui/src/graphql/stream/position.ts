// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';

import type { Coverage, PositionCodec } from '../../client/stream/adapter.js';
import { coverageBefore, SuiStreamError } from '../../client/stream/index.js';

/**
 * GraphQL cursors are opaque, so positions are ordered only by the checkpoints they carry. A
 * position is an item (`checkpoint` and `itemId`), a boundary after `checkpoint` (no `itemId`), or
 * a frontier: an empty scan page, which needs the index to reach `indexedCheckpoint` before its
 * cursor can be trusted.
 */
export interface GraphQLPosition {
	cursor: string;
	checkpoint: bigint | null;
	/** A checkpoint number, a digest, or `digest:eventIndex`. */
	itemId: string | null;
	indexedCheckpoint: bigint | null;
}

const PositionSchema = bcs
	.struct('GraphQLStreamPosition', {
		cursor: bcs.string(),
		checkpoint: bcs.option(bcs.u64()),
		itemId: bcs.option(bcs.string()),
		indexedCheckpoint: bcs.option(bcs.u64()),
	})
	.transform({
		input: (position: GraphQLPosition) => position,
		output: (value): GraphQLPosition => ({
			cursor: value.cursor,
			checkpoint: optionalBigInt(value.checkpoint),
			itemId: value.itemId,
			indexedCheckpoint: optionalBigInt(value.indexedCheckpoint),
		}),
	});

export const graphQLPositionCodec: PositionCodec<GraphQLPosition> = {
	schema: PositionSchema,
	validate(position) {
		const { checkpoint, itemId, indexedCheckpoint } = position;
		const item = checkpoint !== null && itemId !== null;
		const boundary = checkpoint !== null && itemId === null && indexedCheckpoint === checkpoint;
		const frontier = checkpoint === null && itemId === null && indexedCheckpoint !== null;
		if ((!position.cursor && !boundary) || !(item || boundary || frontier)) {
			throw new SuiStreamError('InvalidToken', 'Invalid GraphQL stream position');
		}
	},
};

export function itemPosition(cursor: string, checkpoint: bigint, itemId: string): GraphQLPosition {
	return { cursor, checkpoint, itemId, indexedCheckpoint: null };
}

export function boundaryPosition(checkpoint: bigint): GraphQLPosition {
	return { cursor: '', checkpoint, itemId: null, indexedCheckpoint: checkpoint };
}

export function isBoundary(position: GraphQLPosition): boolean {
	return position.checkpoint !== null && position.itemId === null;
}

export function frontierPosition(cursor: string, indexedCheckpoint: bigint): GraphQLPosition {
	return { cursor, checkpoint: null, itemId: null, indexedCheckpoint };
}

/** Cursors from different connections can't be compared, so items within one checkpoint are unordered. */
export function comparePositions(a: GraphQLPosition, b: GraphQLPosition): -1 | 0 | 1 | undefined {
	if (a.cursor && a.cursor === b.cursor) return 0;
	if (a.checkpoint === null || b.checkpoint === null) return undefined;
	if (a.checkpoint !== b.checkpoint) return a.checkpoint < b.checkpoint ? -1 : 1;
	if (isBoundary(a) && isBoundary(b)) return 0;
	if (isBoundary(a) === isBoundary(b)) return undefined;
	return isBoundary(a) ? 1 : -1;
}

/** A transaction or event may have more of its checkpoint after it, so it covers only earlier checkpoints. */
export function positionCoverage(position: GraphQLPosition, onePerCheckpoint: boolean): Coverage {
	if (position.checkpoint === null) return { $kind: 'Unknown' };
	return onePerCheckpoint || isBoundary(position)
		? { $kind: 'Through', checkpoint: position.checkpoint }
		: coverageBefore(position.checkpoint);
}

export function locatePosition(position: GraphQLPosition): {
	checkpoint: bigint | null;
	boundary: boolean;
} {
	if (position.checkpoint === null || !isBoundary(position)) {
		return { checkpoint: position.checkpoint, boundary: false };
	}
	return { checkpoint: position.checkpoint + 1n, boundary: true };
}

export function requiredCheckpoint(position: GraphQLPosition): bigint | null {
	return position.checkpoint ?? position.indexedCheckpoint;
}

function optionalBigInt(value: string | null): bigint | null {
	return value === null ? null : BigInt(value);
}
