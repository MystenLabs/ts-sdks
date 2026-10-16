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
 * The live handoff: history, subscribe, gap, live. Each reconnect runs it again from the
 * committed position.
 *
 * @yields Only frames produced by the session helpers.
 */
export async function* followLedger(
	calls: GrpcStreamCalls,
	session: FollowSession<GrpcPosition, GrpcItem, ItemFrame>,
): AsyncGenerator<CoreFrame<ItemFrame>, void> {
	// Phase 1: history. No subscription is open yet, so a long replay cannot overflow it.
	if (session.start) yield* session.replay('tip', 'history');

	// Phase 2: subscribe. On the pull path, nothing is read until it is asked for.
	const call = calls.subscribe(session.signal);
	const feed = session.openFeed(liveEvents(call, calls.family, session.committed));
	try {
		const first = await feed.first();

		// Phase 3: the gap between the resume point and the first live position.
		if (!session.start) {
			// A fresh follow starts at the live tip: commit a baseline so a token exists before
			// the first match.
			if (first.$kind === 'Item') yield* session.baseline(baselineBefore(first.position));
		} else {
			const end = gapEnd(first);
			// The index can be ahead of the server that took the subscription: then there is no gap.
			if (!reaches(session.start, end)) {
				// The gap is seconds long. Reading ahead meanwhile keeps the server from dropping
				// the subscription as a slow consumer; the bounded queue caps what it holds.
				call.readAhead(true);
				try {
					yield* session.replay(end, 'gap');
				} finally {
					call.readAhead(false);
				}
			}
		}

		// Phase 4: live. The session drops anything history or the gap already delivered.
		yield* session.deliver(feed);
	} finally {
		await feed.close();
		await call.return();
	}
}

/**
 * Where the gap replay ends. List and Subscribe share cursor semantics
 * (subscription_service.proto), so the first live cursor is an exclusive List bound.
 * A checkpoint subscription's cursor is the checkpoint it covered: a live checkpoint is
 * delivered live, and a progress-only first frame's checkpoint is replayed.
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
