// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';

import type { Coverage, PositionCodec } from '../../client/stream/adapter.js';
import { coverageBefore, SuiStreamError } from '../../client/stream/index.js';

/**
 * A GraphQL stream position. GraphQL cursors are opaque, so positions are only ordered through the
 * checkpoints they report, never by reading cursor bytes. There are three kinds:
 *
 * - Item: a delivered node. `checkpoint` and `itemId` are set.
 * - Boundary: every checkpoint through `checkpoint` was read. `itemId` is null, `indexedCheckpoint`
 *   equals `checkpoint`, and `cursor` is empty. It is a checkpoint bound, like gRPC's checkpoint
 *   baseline: as a start it resumes at `checkpoint + 1`; as an end it includes everything through
 *   `checkpoint`. (Pre-release tokens may carry a cursor here; it is ignored.)
 * - Frontier: an empty, scan-limited page part way through a window. `checkpoint` and `itemId`
 *   are null; `indexedCheckpoint` is the highest checkpoint that scan could see, so a resumed scan
 *   waits until the index has caught up to it before trusting the cursor. It covers nothing.
 */
export interface GraphQLPosition {
	cursor: string;
	checkpoint: bigint | null;
	/** Public identity of the node: a checkpoint number, a digest, or `digest:eventIndex`. */
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

/** Every checkpoint through `checkpoint` was read. */
export function boundaryPosition(checkpoint: bigint): GraphQLPosition {
	return { cursor: '', checkpoint, itemId: null, indexedCheckpoint: checkpoint };
}

export function isBoundary(position: GraphQLPosition): boolean {
	return position.checkpoint !== null && position.itemId === null;
}

export function frontierPosition(cursor: string, indexedCheckpoint: bigint): GraphQLPosition {
	return { cursor, checkpoint: null, itemId: null, indexedCheckpoint };
}

/**
 * Equal cursors are the same position. Otherwise only positions in different checkpoints can be
 * ordered, plus an item before the boundary closing its checkpoint, and two boundaries of one
 * checkpoint, which are equal: cursors from different connections cannot be compared within a
 * checkpoint.
 */
export function comparePositions(a: GraphQLPosition, b: GraphQLPosition): -1 | 0 | 1 | undefined {
	if (a.cursor && a.cursor === b.cursor) return 0;
	if (a.checkpoint === null || b.checkpoint === null) return undefined;
	if (a.checkpoint !== b.checkpoint) return a.checkpoint < b.checkpoint ? -1 : 1;
	if (isBoundary(a) && isBoundary(b)) return 0;
	if (isBoundary(a) === isBoundary(b)) return undefined;
	return isBoundary(a) ? 1 : -1;
}

/**
 * Ascending coverage after delivering everything through `position`. A transaction or event may
 * be followed by more of its checkpoint, so it covers the checkpoints before it. A checkpoint is
 * the only item of its checkpoint, so it covers itself; reporting less would make every live
 * checkpoint look like a gap. A boundary covers its checkpoint; a frontier makes no claim.
 */
export function positionCoverage(position: GraphQLPosition, onePerCheckpoint: boolean): Coverage {
	if (position.checkpoint === null) return { $kind: 'Unknown' };
	return onePerCheckpoint || isBoundary(position)
		? { $kind: 'Through', checkpoint: position.checkpoint }
		: coverageBefore(position.checkpoint);
}

/** A boundary after checkpoint `c` is the boundary before `c + 1`. */
export function locatePosition(position: GraphQLPosition): {
	checkpoint: bigint | null;
	boundary: boolean;
} {
	if (position.checkpoint === null || !isBoundary(position)) {
		return { checkpoint: position.checkpoint, boundary: false };
	}
	return { checkpoint: position.checkpoint + 1n, boundary: true };
}

/** The checkpoint the index must reach before a scan can start from `position`. */
export function requiredCheckpoint(position: GraphQLPosition): bigint | null {
	return position.checkpoint ?? position.indexedCheckpoint;
}

function optionalBigInt(value: string | null): bigint | null {
	return value === null ? null : BigInt(value);
}
