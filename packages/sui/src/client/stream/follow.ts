// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { linkedAbortController } from '../../utils/abort.js';
import type { CoreFrame, LedgerStreamAdapter } from './adapter.js';
import { SuiStreamError } from './errors.js';
import { boundaryPosition, insideCheckpoint } from './position.js';
import type { LiveFeed, StreamSession } from './session.js';

/**
 * The live handoff, rerun on every reconnect. A `resume` adapter subscribes after the resume point
 * and the server backfills from there. A `fromTip` adapter's subscription starts at the live tip,
 * so the core pages history to the indexed tip first, then replays the gap up to the feed's first
 * frame before delivering the feed. The pager and the feed never commit at the same time.
 */
export async function* followLive<Item, Frame extends { resumeToken: string }>(
	session: StreamSession<Item, Frame>,
	adapter: LedgerStreamAdapter<Item, Frame>,
): AsyncGenerator<CoreFrame<Frame>, never> {
	const start = session.start;
	const fromTip = adapter.live === 'fromTip';
	if (start && (fromTip || adapter.canResume?.(start) === false)) yield* session.replay(undefined);
	// A token exists before the first match.
	if (!session.committed && start && 'checkpoint' in start) {
		yield* session.baseline(boundaryPosition(start.checkpoint));
	}

	// Closing must not wait for a quiet subscription's pending read: abort it first.
	const attempt = linkedAbortController(session.signal);
	let feed: LiveFeed<Item> | undefined;
	try {
		session.subscribing();
		const subscription = adapter.subscribe(session.start, attempt.controller.signal, () =>
			session.connected(),
		);
		feed = session.openFeed(subscription);
		if (fromTip && start) {
			const { position } = await feed.first();
			const { checkpoint } = position;
			if (checkpoint === null) {
				throw new SuiStreamError('Protocol', 'Live frame is missing its checkpoint');
			}
			// The gap ends at the feed's first frame. Replaying through a frame inside a checkpoint
			// overlaps the feed, and the session drops what it repeats.
			const inside = adapter.family !== 'checkpoints' && insideCheckpoint(position);
			const end = inside ? checkpoint + 1n : checkpoint;
			const next = session.nextUncovered;
			if (next === null || next < end) {
				subscription.readAhead?.(true);
				try {
					yield* session.replay(end);
				} finally {
					subscription.readAhead?.(false);
				}
			}
		}
		return yield* session.deliver(feed);
	} finally {
		attempt.controller.abort();
		attempt.dispose();
		await feed?.close();
	}
}
