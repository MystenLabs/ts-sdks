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
import { linkedAbortController } from '../../utils/abort.js';
import type { LedgerFamily, LedgerItem, ResumePoint } from './families.js';
import { boundaryPosition, isBoundary, itemPosition, type GraphQLPosition } from './position.js';

type Session<Node> = FollowSession<GraphQLPosition, LedgerItem<Node>, ItemFrame>;

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
	// A stream anchored at the tip has nothing committed. Filtered subscriptions report no progress,
	// so commit the anchor for a token before the first match.
	const start = session.start;
	if (!session.committed && start && 'checkpoint' in start && start.checkpoint > 0n) {
		yield* session.baseline(boundaryPosition(start.checkpoint - 1n));
	}

	// Closing must not wait for a quiet feed's pending read: abort it first.
	const attempt = linkedAbortController(session.signal);
	const feed = session.openFeed(
		liveEvents(family, attempt.controller.signal, resumePoint(session.start)),
	);
	try {
		// Filtered subscriptions report no progress, so `Live` waits for the first item.
		await feed.first();
		yield* session.deliver(feed);
	} finally {
		attempt.controller.abort();
		await feed.close();
		attempt.dispose();
	}
}

function resumePoint(start: Bound<GraphQLPosition> | undefined): ResumePoint {
	if (!start) return {};
	if ('checkpoint' in start) return { start: start.checkpoint };
	const { position } = start;
	if (isBoundary(position)) return { start: position.checkpoint! + 1n };
	return { after: position.cursor };
}

/**
 * Live item events.
 * @yields `Connected` once the subscription opens, then one item event per edge.
 * @throws {StreamDisconnected} for an item without a checkpoint, so the next connection resumes
 * before it and the server backfills it from the index.
 */
async function* liveEvents<Node>(
	family: LedgerFamily<Node>,
	signal: AbortSignal,
	resume: ResumePoint,
): AsyncGenerator<LiveEvent<GraphQLPosition, LedgerItem<Node>>> {
	let opened!: () => void;
	const open = new Promise<void>((resolve) => (opened = resolve));
	const edges = family.subscribe(signal, resume, opened)[Symbol.asyncIterator]();
	try {
		const first = edges.next();
		// A filtered subscription can stay quiet for a long time after it opens.
		await Promise.race([open, first]);
		yield { $kind: 'Connected' };
		for (let result = await first; !result.done; result = await edges.next()) {
			const { node, cursor } = result.value;
			const checkpoint = family.checkpoint(node);
			if (checkpoint === null) throw new StreamDisconnected('Live item has no checkpoint');
			yield {
				$kind: 'Item',
				position: itemPosition(cursor, checkpoint, family.identity(node)),
				item: { node, checkpoint },
			};
		}
	} finally {
		await edges.return?.();
	}
}
