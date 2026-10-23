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
	positionCoverage,
	type StreamPosition,
} from './position.js';
import type { StreamSession } from './session.js';

/**
 * The live handoff, rerun on every reconnect: subscribe after the resume point, then deliver. The
 * server backfills from there and then goes live. A transport whose subscriptions start at the
 * live tip instead pages history first and replays the gap before the first live event; so does a
 * resuming transport whose subscription cannot start from the resume point.
 */
export async function* followLive<Item, Frame extends { resumeToken: string }>(
	session: StreamSession<Item, Frame>,
	adapter: LedgerStreamAdapter<Item, Frame>,
): AsyncGenerator<CoreFrame<Frame>, void> {
	const replaysGap = !adapter.resumesSubscriptions;
	// History comes first where the subscription cannot pick up from the resume point itself.
	const pagesFirst = replaysGap
		? session.catchesUpFirst()
		: session.start !== undefined && adapter.canResume?.(session.start) === false;
	if (pagesFirst) yield* session.replay('tip', 'history');
	// Commit a checkpoint start, so a token exists before the first match.
	const start = session.start;
	if (!session.committed && start && 'checkpoint' in start) {
		yield* session.baseline(boundaryPosition(start.checkpoint));
	}

	// Closing must not wait for a quiet subscription's pending read: abort it first.
	const attempt = linkedAbortController(session.signal);
	const subscription = adapter.subscribe(session.start, attempt.controller.signal);
	const feed = session.openFeed(withCoverage(subscription, adapter.family, session.committed));
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
 * every position records what it covers.
 */
async function* withCoverage<Item>(
	events: AsyncIterable<LiveEvent<Item>>,
	family: StreamFamily,
	committed: StreamPosition | undefined,
): AsyncGenerator<LiveEvent<Item>> {
	const tracker = new CoverageTracker(
		'ascending',
		family,
		committed ? positionCoverage(committed, family) : { $kind: 'Unknown' },
	);
	for await (const event of events) {
		yield event.$kind === 'Connected'
			? event
			: { ...event, position: tracker.apply(event.position) };
	}
}
