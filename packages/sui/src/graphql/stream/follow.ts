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
	pollInterval: number;
	/** Shared by every attempt of one stream. */
	state: FollowState;
}

export interface FollowState {
	/** Digest of an undelivered live transaction; the next handoff replays through its checkpoint. */
	unplaced?: string;
	/** A live checkpoint the failed attempt never covered; a quiet new feed may never show it again. */
	reached?: bigint;
}

/**
 * History, then subscribe, then replay the handoff gap from history, then live.
 * @yields frames from the replays and live delivery; ends only by throwing.
 */
export async function* followLedger<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
	session: Session<Node>,
	options: FollowOptions,
): AsyncGenerator<CoreFrame<ItemFrame>, void> {
	const { state } = options;
	// Read before this attempt's feed can overwrite them.
	const { unplaced, reached } = state;
	yield* session.replay('tip', 'history');

	// Subscribing with `after` loses data on current servers, so the gap is replayed from history.
	// TODO: once fixed servers ship, gate this workaround on the `x-sui-rpc-version` header.
	let opened!: () => void;
	const open = new Promise<void>((resolve) => (opened = resolve));
	// Closing must not wait for a quiet feed's pending read: abort it first.
	const attempt = linkedAbortController(session.signal);
	const feed = session.openFeed(
		liveEvents(client, family, attempt.controller.signal, opened, options),
	);
	try {
		const first = feed.first();
		// Recorded in case this attempt fails before covering it; the rejection is awaited below.
		first.then(
			(event) => reach(state, event.position.checkpoint!),
			() => {},
		);
		await Promise.race([open, first]);

		// Replay through a fresh tip without waiting for a live item, which a sparse filter may never
		// send. Whole checkpoints are replayed because cursors from two connections can't be ordered.
		const through = await handoffCheckpoint(
			client,
			family,
			session,
			{ unplaced, reached },
			options,
		);
		yield* session.replay({ checkpoint: through + 1n }, 'gap');
		if (state.unplaced === unplaced) state.unplaced = undefined;

		// The feed can start ahead of the index; replay up to its first item too.
		const live = (await first).position.checkpoint!;
		if (live > through + 1n) yield* session.replay({ checkpoint: live + 1n }, 'gap');
		state.reached = undefined;

		// Only the unfiltered checkpoint feed can detect a skipped checkpoint.
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

/** The furthest of the indexed tip, the committed position and what an earlier attempt left undelivered. */
async function handoffCheckpoint<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
	session: Session<Node>,
	{ unplaced, reached }: Pick<FollowState, 'unplaced' | 'reached'>,
	{ pollInterval }: FollowOptions,
): Promise<bigint> {
	const { tip } = await readIndexState(client, family.name, family.filterFields(), session.signal);
	let through = tip;
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
 * Live item events. Nodes the index hasn't placed yet are polled for, so they arrive in order.
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
	// Consecutive events of one transaction share its checkpoint: look it up once.
	let placed: { digest: string; checkpoint: bigint } | undefined;
	for await (const edge of family.subscribe(signal, onOpen)) {
		if (!connected) {
			connected = true;
			yield { $kind: 'Connected' };
		}
		const reported = family.checkpoint(edge.node);
		let checkpoint: bigint;
		if (typeof reported === 'bigint') {
			checkpoint = reported;
		} else if (placed?.digest === reported.digest) {
			checkpoint = placed.checkpoint;
		} else {
			state.unplaced = reported.digest;
			checkpoint = await placeTransaction(client, reported.digest, signal, pollInterval);
			state.unplaced = undefined;
			placed = { digest: reported.digest, checkpoint };
		}
		yield {
			$kind: 'Item',
			position: itemPosition(edge.cursor, checkpoint, family.identity(edge.node)),
			item: { node: edge.node, checkpoint },
		};
	}
}

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
