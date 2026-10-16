// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/bcs';

import type { Coverage, PositionCodec } from '../../client/stream/adapter.js';
import { coverageBefore, SuiStreamError } from '../../client/stream/index.js';

/**
 * A GraphQL stream position. GraphQL cursors are opaque, so positions are only ordered through the
 * checkpoints they report, never by reading cursor bytes. There are two kinds:
 *
 * - Item: a delivered node. `checkpoint` and `itemId` are set.
 * - Frontier: where an unbounded history scan stopped with nothing left to read. `checkpoint` and
 *   `itemId` are null; `indexedCheckpoint` is the highest checkpoint that scan could see, so a
 *   resumed scan waits until the index has caught up to it before trusting the cursor.
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
		const item = position.checkpoint !== null && position.itemId !== null;
		const frontier =
			position.checkpoint === null &&
			position.itemId === null &&
			position.indexedCheckpoint !== null;
		if (!position.cursor || !(item || frontier)) {
			throw new SuiStreamError('InvalidToken', 'Invalid GraphQL stream position');
		}
	},
};

export function itemPosition(cursor: string, checkpoint: bigint, itemId: string): GraphQLPosition {
	return { cursor, checkpoint, itemId, indexedCheckpoint: null };
}

export function frontierPosition(cursor: string, indexedCheckpoint: bigint): GraphQLPosition {
	return { cursor, checkpoint: null, itemId: null, indexedCheckpoint };
}

/**
 * Equal cursors are the same position. Otherwise only items in different checkpoints can be
 * ordered: cursors from different connections cannot be compared within a checkpoint.
 */
export function comparePositions(a: GraphQLPosition, b: GraphQLPosition): -1 | 0 | 1 | undefined {
	if (a.cursor === b.cursor) return 0;
	if (a.checkpoint === null || b.checkpoint === null || a.checkpoint === b.checkpoint) {
		return undefined;
	}
	return a.checkpoint < b.checkpoint ? -1 : 1;
}

/**
 * Ascending coverage after delivering everything through `position`. A transaction or event may
 * be followed by more of its checkpoint, so it covers the checkpoints before it. A checkpoint is
 * the only item of its checkpoint, so it covers itself; reporting less would make every live
 * checkpoint look like a gap. A frontier makes no claim.
 */
export function positionCoverage(position: GraphQLPosition, onePerCheckpoint: boolean): Coverage {
	if (position.checkpoint === null) return { $kind: 'Unknown' };
	return onePerCheckpoint
		? { $kind: 'Through', checkpoint: position.checkpoint }
		: coverageBefore(position.checkpoint);
}

/** The checkpoint the index must reach before a scan can start from `position`. */
export function requiredCheckpoint(position: GraphQLPosition): bigint | null {
	return position.checkpoint ?? position.indexedCheckpoint;
}

function optionalBigInt(value: string | null): bigint | null {
	return value === null ? null : BigInt(value);
}
