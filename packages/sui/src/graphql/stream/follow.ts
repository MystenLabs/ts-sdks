// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	CoreFrame,
	FollowSession,
	ItemFrame,
	LiveEvent,
} from '../../client/stream/adapter.js';
import type { SuiGraphQLClient } from '../client.js';
import { itemEvents, type LedgerFamily, type LedgerItem } from './families.js';
import type { GraphQLPosition } from './position.js';

type Session<Node> = FollowSession<GraphQLPosition, LedgerItem<Node>, ItemFrame>;

/**
 * The live handoff for subscribe delivery. Each reconnect runs it again from the committed
 * position; the core retries and deduplicates.
 * @yields Frames from the session's replays and live delivery; ends only by throwing.
 */
export async function* followLedger<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
	session: Session<Node>,
): AsyncGenerator<CoreFrame<ItemFrame>, void> {
	// Phase 1: history. The core anchors a fresh follow at the indexed tip, so there is always a
	// start. No subscription is open yet.
	yield* session.replay('tip', 'history');

	// Phase 2: subscribe without `after`. The server's backfill-to-live handoff loses data: with
	// `after`, transactions and events lose the rest of the cursor's checkpoint because the live
	// start is floored to a checkpoint (S2), and a live feed one checkpoint ahead of its index
	// skips that checkpoint without an error (S1). So streams never ask it to backfill, and
	// phase 3 replays the handoff from history.
	// TODO: once fixed servers ship, gate these workarounds on the `x-sui-rpc-version` header.
	const feed = session.openFeed(liveEvents(client, family, session.signal));
	try {
		const first = await feed.first();

		// Phase 3: the gap. Cursors from different connections cannot be ordered within a
		// checkpoint, so replay whole checkpoints through the first live one; the core then drops
		// live items in checkpoints the replay covered.
		yield* session.replay({ checkpoint: gapEnd(first.position, session.committed) }, 'gap');

		// Phase 4: live. Only the unfiltered checkpoint feed can tell that it skipped one.
		yield* session.deliver(feed, { contiguousCheckpoints: family.onePerCheckpoint });
	} finally {
		await feed.close();
	}
}

/**
 * The exclusive gap end: after the first live checkpoint, or after the committed one if the new
 * feed starts behind it, so no checkpoint is left partly delivered from two connections.
 */
function gapEnd(first: GraphQLPosition, committed: GraphQLPosition | undefined): bigint {
	// Live events are items, and items always have a checkpoint.
	const live = first.checkpoint!;
	const resumed = committed?.checkpoint ?? null;
	return (resumed !== null && resumed > live ? resumed : live) + 1n;
}

/**
 * Live item events; nodes not yet assigned a checkpoint by the index are looked up first.
 * @yields `Connected` with the first result, then one item event per edge.
 */
async function* liveEvents<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
	signal: AbortSignal,
): AsyncGenerator<LiveEvent<GraphQLPosition, LedgerItem<Node>>> {
	let connected = false;
	for await (const edge of family.subscribe(signal)) {
		if (!connected) {
			connected = true;
			yield { $kind: 'Connected' };
		}
		yield* await itemEvents(client, family, [edge], signal);
	}
}
