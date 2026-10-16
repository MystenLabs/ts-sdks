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
	const start = session.start;
	if (!session.committed && start && 'checkpoint' in start) {
		// Nothing comes before genesis to resume after, so history is read first.
		if (start.checkpoint === 0n) yield* session.replay('tip', 'history');
		// Filtered subscriptions report no progress, so commit the start for a token before a match.
		else yield* session.baseline(boundaryPosition(start.checkpoint - 1n));
	}

	// Closing must not wait for a quiet feed's pending read: abort it first.
	const attempt = linkedAbortController(session.signal);
	const feed = session.openFeed(
		liveEvents(family, attempt.controller.signal, resumePoint(session.start)),
	);
	try {
		// The first result shows the subscription is open, so `Connected` comes before `Live`.
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
 * @yields `Connected` with the first result, then one item event per edge.
 * @throws {StreamDisconnected} for an item without a checkpoint, so the next connection resumes
 * before it and the server backfills it from the index.
 */
async function* liveEvents<Node>(
	family: LedgerFamily<Node>,
	signal: AbortSignal,
	resume: ResumePoint,
): AsyncGenerator<LiveEvent<GraphQLPosition, LedgerItem<Node>>> {
	let connected = false;
	for await (const edge of family.subscribe(signal, resume)) {
		if (!connected) {
			connected = true;
			yield { $kind: 'Connected' };
		}
		const checkpoint = family.checkpoint(edge.node);
		if (checkpoint === null) throw new StreamDisconnected('Live item has no checkpoint');
		yield {
			$kind: 'Item',
			position: itemPosition(edge.cursor, checkpoint, family.identity(edge.node)),
			item: { node: edge.node, checkpoint },
		};
	}
}
