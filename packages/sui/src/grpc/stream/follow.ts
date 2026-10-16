// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	Bound,
	CoreFrame,
	FollowSession,
	ItemFrame,
	PositionEvent,
} from '../../client/stream/index.js';
import { compareBounds } from '../../client/stream/index.js';
import type { GrpcItem } from './families.js';
import { liveEvents } from './live.js';
import {
	baselineBefore,
	comparePositions,
	grpcPositionCodec,
	locatePosition,
	type GrpcPosition,
} from './position.js';
import type { GrpcStreamCalls } from './scan.js';

const ordering = {
	compare: comparePositions,
	locate: locatePosition,
	position: grpcPositionCodec(),
};

/**
 * The live handoff: history, subscribe, gap, live. Each reconnect reruns it.
 *
 * @yields Only frames produced by the session helpers.
 */
export async function* followLedger(
	calls: GrpcStreamCalls,
	session: FollowSession<GrpcPosition, GrpcItem, ItemFrame>,
): AsyncGenerator<CoreFrame<ItemFrame>, void> {
	// History first: with no subscription open yet, a long replay cannot overflow it.
	if (session.start) yield* session.replay('tip', 'history');

	const call = calls.subscribe(session.signal);
	const feed = session.openFeed(liveEvents(call, calls.family, session.committed));
	try {
		const first = await feed.first();

		if (!session.start) {
			// Commit a baseline so a fresh follow has a token before its first match.
			if (first.$kind === 'Item') yield* session.baseline(baselineBefore(first.position));
		} else {
			const end = gapEnd(first);
			// The index can be ahead of the server that took the subscription: then there is no gap.
			if (!reaches(session.start, end)) {
				// Read ahead during the gap so the server does not drop the subscription as a slow
				// consumer.
				call.readAhead(true);
				try {
					yield* session.replay(end, 'gap');
				} finally {
					call.readAhead(false);
				}
			}
		}

		yield* session.deliver(feed);
	} finally {
		await feed.close();
		await call.return();
	}
}

/**
 * Where the gap replay ends. List and Subscribe share cursors, so the first live cursor is an
 * exclusive List bound. A progress-only first checkpoint frame's checkpoint is replayed.
 */
function gapEnd(first: PositionEvent<GrpcPosition, GrpcItem>): Bound<GrpcPosition> {
	const { cursor } = first.position;
	if (cursor.$kind !== 'Checkpoint') return { position: first.position };
	return { checkpoint: first.$kind === 'Item' ? cursor.checkpoint : cursor.checkpoint + 1n };
}

function reaches(start: Bound<GrpcPosition>, end: Bound<GrpcPosition>): boolean {
	const comparison = compareBounds(start, end, 'ascending', ordering);
	return comparison !== undefined && comparison >= 0;
}
