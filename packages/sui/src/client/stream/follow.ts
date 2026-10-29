// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { linkedAbortController } from '../../utils/abort.js';
import type {
	CoreFrame,
	LedgerStreamAdapter,
	LiveEvent,
	LiveSubscription,
	StreamFamily,
} from './adapter.js';
import { compareBounds } from './plan.js';
import {
	boundaryPosition,
	CoverageTracker,
	indexedThrough,
	positionCoverage,
	type StreamPosition,
} from './position.js';
import type { StreamSession } from './session.js';

/**
 * The live handoff, rerun on every reconnect: subscribe after the resume point, then deliver. The
 * server backfills from there and then goes live. A transport whose subscriptions start at the
 * live tip instead pages history first and replays the gap before the first live event.
 */
export async function* followLive<Item, Frame extends { resumeToken: string }>(
	session: StreamSession<Item, Frame>,
	adapter: LedgerStreamAdapter<Item, Frame>,
): AsyncGenerator<CoreFrame<Frame>, void> {
	const replaysGap = !adapter.resumesSubscriptions;
	if (replaysGap && session.catchesUpFirst()) yield* session.replay('tip', 'history');
	// Commit a checkpoint start, so a token exists before the first match.
	const start = session.start;
	if (!session.committed && start && 'checkpoint' in start) {
		yield* session.baseline(boundaryPosition(start.checkpoint));
	}

	// Closing must not wait for a quiet subscription's pending read: abort it first.
	const attempt = linkedAbortController(session.signal);
	const subscription = adapter.subscribe(session.start, attempt.controller.signal);
	const feed = session.openFeed(
		withCoverage(subscription, adapter.family, session.committed, !replaysGap),
	);
	try {
		const first = await feed.first();
		if (!start) {
			// A fresh follow at the live tip: everything before the first live checkpoint is behind it.
			if (first.$kind === 'Item') {
				yield* session.baseline(boundaryPosition(first.position.checkpoint!));
			}
		} else if (replaysGap) {
			yield* replayGap(session, subscription, first.position);
		}
		yield* session.deliver(feed);
	} finally {
		attempt.controller.abort();
		await feed.close();
		attempt.dispose();
	}
}

async function* replayGap<Item, Frame extends { resumeToken: string }>(
	session: StreamSession<Item, Frame>,
	subscription: LiveSubscription<Item>,
	first: StreamPosition,
): AsyncGenerator<CoreFrame<Frame>, void> {
	const end = { position: first };
	// The index can be ahead of the server that took the subscription: then there is no gap.
	const comparison = compareBounds(session.start!, end, 'ascending');
	if (comparison !== undefined && comparison >= 0) return;
	subscription.readAhead?.(true);
	try {
		yield* session.replay(end, 'gap');
	} finally {
		subscription.readAhead?.(false);
	}
}

/**
 * Live events with coverage carried on from `committed` (contiguous once any gap is replayed), so
 * every position records what it covers. Progress on a feed that never reports coverage keeps
 * none: its cursor may be far past the last item, so a carried coverage would understate it.
 * It records the newest checkpoint the feed has passed as `indexedCheckpoint` instead: no match
 * lies between that checkpoint and the cursor, so a server indexed that far can resume it, and a
 * boundary from such a server never re-delivers or skips a match. `committed` counts as passed only
 * on a feed that `resumes` after it: otherwise a gap before the feed is still to be replayed, and
 * progress the feed cannot place yet is dropped rather than committed.
 */
async function* withCoverage<Item>(
	events: AsyncIterable<LiveEvent<Item>>,
	family: StreamFamily,
	committed: StreamPosition | undefined,
	resumes: boolean,
): AsyncGenerator<LiveEvent<Item>> {
	const tracker = new CoverageTracker(
		'ascending',
		family,
		committed ? positionCoverage(committed, family) : { $kind: 'Unknown' },
	);
	const placed = resumes && committed ? indexedThrough(committed) : null;
	let passed = placed === null ? undefined : max(placed, 0n);
	for await (const event of events) {
		if (event.$kind === 'Connected') {
			yield event;
		} else if (event.$kind === 'Progress' && !reports(event.position) && !tracker.reported) {
			const own = event.position.indexedCheckpoint;
			const indexedCheckpoint =
				passed === undefined || (own !== null && own > passed) ? own : passed;
			// Nothing says how far a replay must reach before this cursor, so it cannot end the gap.
			if (indexedCheckpoint === null && !resumes && committed) continue;
			yield { ...event, position: { ...event.position, indexedCheckpoint } };
		} else {
			const position = tracker.apply(event.position);
			if (event.$kind === 'Item' && position.checkpoint !== null) {
				passed = passed === undefined ? position.checkpoint : max(passed, position.checkpoint);
			}
			yield { ...event, position };
		}
	}
}

function reports(position: StreamPosition): boolean {
	return position.coverage.$kind !== 'Unknown' || position.checkpoint !== null;
}

function max(a: bigint, b: bigint): bigint {
	return a > b ? a : b;
}
