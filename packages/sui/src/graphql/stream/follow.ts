// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
	CoreFrame,
	FollowSession,
	ItemFrame,
	LiveEvent,
} from '../../client/stream/adapter.js';
import { linkedAbortController, sleep } from '../../utils/abort.js';
import type { SuiGraphQLClient } from '../client.js';
import { lookupCheckpoints, type LedgerFamily, type LedgerItem } from './families.js';
import { itemPosition, requiredCheckpoint, type GraphQLPosition } from './position.js';
import { readIndexState } from './query.js';

type Session<Node> = FollowSession<GraphQLPosition, LedgerItem<Node>, ItemFrame>;

export interface FollowOptions {
	/** How long to wait between checkpoint lookups while the index has not placed a live item. */
	pollInterval: number;
	/** Shared by every attempt of one stream. */
	state: FollowState;
}

export interface FollowState {
	/**
	 * A live transaction (or an event's transaction) whose checkpoint lookup failed, so it was
	 * never delivered. The next handoff replays through its checkpoint, so it is not lost when no
	 * later live item arrives to trigger a gap replay.
	 */
	unplaced?: string;
	/**
	 * A checkpoint a live feed reached that its handoff replay had not covered when the attempt
	 * failed. The next handoff replays through it: its quiet replacement feed may never show it.
	 */
	reached?: bigint;
}

/**
 * The live handoff for subscribe delivery. Each reconnect runs it again from the committed
 * position; the core retries and deduplicates.
 * @yields Frames from the session's replays and live delivery; ends only by throwing.
 */
export async function* followLedger<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
	session: Session<Node>,
	options: FollowOptions,
): AsyncGenerator<CoreFrame<ItemFrame>, void> {
	const { state } = options;
	// Left by an earlier attempt; this attempt's feed may record its own while the gap replays.
	const { unplaced, reached } = state;
	// Phase 1: history. The core anchors a fresh follow at the indexed tip, so there is always a
	// start. No subscription is open yet.
	yield* session.replay('tip', 'history');

	// Phase 2: subscribe without `after`. The server's backfill-to-live handoff loses data: with
	// `after`, transactions and events lose the rest of the cursor's checkpoint because the live
	// start is floored to a checkpoint (S2), and a live feed one checkpoint ahead of its index
	// skips that checkpoint without an error (S1). So streams never ask it to backfill, and
	// phase 3 replays the handoff from history.
	// TODO: once fixed servers ship, gate these workarounds on the `x-sui-rpc-version` header.
	let opened!: () => void;
	const open = new Promise<void>((resolve) => (opened = resolve));
	// Closing must not wait for a quiet feed's pending read: abort it first.
	const attempt = linkedAbortController(session.signal);
	const feed = session.openFeed(
		liveEvents(client, family, attempt.controller.signal, opened, options),
	);
	try {
		const first = feed.first();
		// Remembered as soon as it is known, in case this attempt fails before covering it. The
		// rejection is awaited below; this only keeps an early failure from going unhandled.
		first.then(
			(event) => reach(state, event.position.checkpoint!),
			() => {},
		);
		await Promise.race([open, first]);

		// Phase 3: the gap, in two steps. First, now that the feed is open, replay through a fresh
		// indexed tip without waiting for a live item: with a sparse filter, the next one may never
		// come. Cursors from different connections cannot be ordered within a checkpoint, so whole
		// checkpoints are replayed; the core then drops live items in checkpoints the replay
		// covered.
		const through = await handoffCheckpoint(
			client,
			family,
			session,
			{ unplaced, reached },
			options,
		);
		yield* session.replay({ checkpoint: through + 1n }, 'gap');
		if (state.unplaced === unplaced) state.unplaced = undefined;

		// Second, the feed starts at the server's live tip, which can be ahead of its index (S1).
		// A first live item past the replay shows where it started: replay through its checkpoint
		// too, so nothing between is lost. A match in such a checkpoint is still only recovered
		// once a later live item arrives: filtered subscriptions report no progress (P1).
		const live = (await first).position.checkpoint!; // live events are items
		if (live > through + 1n) yield* session.replay({ checkpoint: live + 1n }, 'gap');
		// Covered by a replay, or delivered first below.
		state.reached = undefined;

		// Phase 4: live. Only the unfiltered checkpoint feed can tell that it skipped one.
		yield* session.deliver(feed, { contiguousCheckpoints: family.onePerCheckpoint });
	} finally {
		attempt.controller.abort();
		await feed.close();
		attempt.dispose();
	}
}

function reach(state: FollowState, checkpoint: bigint) {
	if (state.reached === undefined || checkpoint > state.reached) state.reached = checkpoint;
}

/**
 * The last checkpoint the handoff replays first: a fresh indexed tip, or the committed
 * position's checkpoint if a new feed starts behind it (so no checkpoint is delivered partly from
 * two connections), or what an earlier attempt's feed reached but never delivered: the checkpoint
 * of a live item a failed lookup left unplaced, or a first live checkpoint its replay never
 * covered.
 */
async function handoffCheckpoint<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
	session: Session<Node>,
	{ unplaced, reached }: Pick<FollowState, 'unplaced' | 'reached'>,
	{ pollInterval }: FollowOptions,
): Promise<bigint> {
	const { tip } = await readIndexState(client, family.name, family.filterFields(), session.signal);
	let through = tip;
	// A frontier carries the indexed checkpoint it was read at instead: the history before it
	// may have delivered items up to there.
	const resumed = session.committed ? requiredCheckpoint(session.committed) : null;
	if (resumed !== null && resumed > through) through = resumed;
	if (reached !== undefined && reached > through) through = reached;
	if (unplaced) {
		const checkpoint = await placeTransaction(client, unplaced, session.signal, pollInterval);
		if (checkpoint > through) through = checkpoint;
	}
	return through;
}

/**
 * Live item events. A node the index has not assigned a checkpoint yet is looked up again every
 * `pollInterval` until it is placed, so it is delivered in order instead of being dropped.
 * @yields `Connected` with the first result, then one item event per edge.
 */
async function* liveEvents<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
	signal: AbortSignal,
	onOpen: () => void,
	{ pollInterval, state }: FollowOptions,
): AsyncGenerator<LiveEvent<GraphQLPosition, LedgerItem<Node>>> {
	let connected = false;
	for await (const edge of family.subscribe(signal, onOpen)) {
		if (!connected) {
			connected = true;
			yield { $kind: 'Connected' };
		}
		const reported = family.checkpoint(edge.node);
		let checkpoint: bigint;
		if (typeof reported === 'bigint') {
			checkpoint = reported;
		} else {
			// Kept if the lookup fails, so the next handoff still covers this item.
			state.unplaced = reported.digest;
			checkpoint = await placeTransaction(client, reported.digest, signal, pollInterval);
			state.unplaced = undefined;
		}
		yield {
			$kind: 'Item',
			position: itemPosition(edge.cursor, checkpoint, family.identity(edge.node)),
			item: { node: edge.node, checkpoint },
		};
	}
}

/** The checkpoint of transaction `digest`, polling until the index has placed it. */
async function placeTransaction(
	client: SuiGraphQLClient,
	digest: string,
	signal: AbortSignal,
	pollInterval: number,
): Promise<bigint> {
	while (true) {
		const checkpoint = (await lookupCheckpoints(client, [digest], signal)).get(digest);
		if (checkpoint !== undefined) return checkpoint;
		await sleep(pollInterval, signal);
	}
}
