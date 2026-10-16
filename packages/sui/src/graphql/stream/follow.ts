// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	Bound,
	CoreFrame,
	FollowSession,
	ItemFrame,
	LiveEvent,
} from '../../client/stream/adapter.js';
import { StreamDisconnected } from '../../client/stream/errors.js';
import { boundaryPosition, progressPosition } from '../../client/stream/index.js';
import { linkedAbortController } from '../../utils/abort.js';
import {
	cursorBytes,
	cursorString,
	edgePosition,
	type LedgerFamily,
	type LedgerItem,
	type ResumePoint,
} from './families.js';

type Session<Node> = FollowSession<LedgerItem<Node>, ItemFrame>;

/**
 * Subscribes after the resume point; the server backfills from there and then goes live.
 * @yields frames from live delivery; ends only by throwing.
 */
export async function* followLedger<Node>(
	family: LedgerFamily<Node>,
	session: Session<Node>,
): AsyncGenerator<CoreFrame<ItemFrame>, void> {
	// A subscription resumed below the server's retention fails without saying why, so away from
	// the live tip history is paged first, and its first page checks retention.
	if (session.catchesUpFirst()) yield* session.replay('tip', 'history');
	// A stream anchored at the tip has nothing committed: commit the anchor, so a token exists
	// before the subscription reports anything.
	const start = session.start;
	if (!session.committed && start && 'checkpoint' in start) {
		yield* session.baseline(boundaryPosition(start.checkpoint));
	}

	// Closing must not wait for a quiet feed's pending read: abort it first.
	const attempt = linkedAbortController(session.signal);
	const feed = session.openFeed(
		liveEvents(family, attempt.controller.signal, resumePoint(session.start)),
	);
	try {
		// `Live` once the subscription reports its first item or progress.
		await feed.first();
		yield* session.deliver(feed);
	} finally {
		attempt.controller.abort();
		await feed.close();
		attempt.dispose();
	}
}

/** A position with a cursor resumes after it; a boundary without one, from its checkpoint. */
function resumePoint(start: Bound | undefined): ResumePoint {
	if (!start) return {};
	if ('checkpoint' in start) return { start: start.checkpoint };
	const { cursor, checkpoint } = start.position;
	return cursor ? { after: cursorString(cursor) } : { start: checkpoint! };
}

/**
 * Live events: items, and progress for the edges without a node.
 * @yields `Connected` once the subscription opens, then one event per edge.
 * @throws {StreamDisconnected} for an item without a checkpoint, so the next connection resumes
 * before it and the server backfills it from the index.
 */
async function* liveEvents<Node>(
	family: LedgerFamily<Node>,
	signal: AbortSignal,
	resume: ResumePoint,
): AsyncGenerator<LiveEvent<LedgerItem<Node>>> {
	let opened!: () => void;
	const open = new Promise<void>((resolve) => (opened = resolve));
	const edges = family.subscribe(signal, resume, opened)[Symbol.asyncIterator]();
	try {
		const first = edges.next();
		// A filtered subscription can stay quiet for a while after it opens.
		await Promise.race([open, first]);
		yield { $kind: 'Connected' };
		for (let result = await first; !result.done; result = await edges.next()) {
			const { node, cursor } = result.value;
			if (node === null) {
				yield { $kind: 'Progress', position: progressPosition(cursorBytes(cursor)) };
				continue;
			}
			const checkpoint = family.checkpoint(node);
			if (checkpoint === null) throw new StreamDisconnected('Live item has no checkpoint');
			yield {
				$kind: 'Item',
				position: edgePosition(family, { cursor, node }, checkpoint),
				item: { node, checkpoint },
			};
		}
	} finally {
		await edges.return?.();
	}
}
