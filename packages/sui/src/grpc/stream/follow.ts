// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	Bound,
	CoreFrame,
	FollowSession,
	ItemFrame,
	PositionEvent,
} from '../../client/stream/index.js';
import { boundaryPosition, compareBounds } from '../../client/stream/index.js';
import type { GrpcItem } from './families.js';
import { liveEvents } from './live.js';
import type { GrpcStreamCalls } from './scan.js';

/**
 * The live handoff: history, subscribe, gap, live. Each reconnect reruns it.
 *
 * @yields Only frames produced by the session helpers.
 */
export async function* followLedger(
	calls: GrpcStreamCalls,
	session: FollowSession<GrpcItem, ItemFrame>,
): AsyncGenerator<CoreFrame<ItemFrame>, void> {
	// A subscription starts at the live tip, so history comes first.
	if (session.catchesUpFirst()) yield* session.replay('tip', 'history');

	const call = calls.subscribe(session.signal);
	const feed = session.openFeed(liveEvents(call, calls.family, session.committed));
	try {
		const first = await feed.first();

		if (!session.start) {
			// Commit a baseline so a fresh follow has a token before its first match.
			if (first.$kind === 'Item')
				yield* session.baseline(boundaryPosition(first.position.checkpoint!));
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
 * exclusive List bound. Checkpoint subscriptions report no cursor: their first checkpoint is
 * replayed.
 */
function gapEnd(first: PositionEvent<GrpcItem>): Bound {
	const { position } = first;
	if (position.cursor !== null) return { position };
	return { checkpoint: position.checkpoint! };
}

function reaches(start: Bound, end: Bound): boolean {
	const comparison = compareBounds(start, end, 'ascending');
	return comparison !== undefined && comparison >= 0;
}
