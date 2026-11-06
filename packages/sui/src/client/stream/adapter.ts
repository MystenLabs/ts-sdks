// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Internal contract between the ledger stream core and a transport. The core owns tokens,
 * planning, paging, the live handoff, retries, deduplication and statuses so they match across
 * transports. An adapter reads one page at a time, opens subscriptions, builds positions from what
 * its server reports, and says which failures are worth retrying.
 */

import type { SuiClientTypes } from '../types.js';
import type { StreamPosition } from './position.js';

export type StreamFamily = 'checkpoints' | 'transactions' | 'events';

/** Append-only: the transport tag is part of every token. */
export type StreamTransport = 'grpc' | 'graphql';

/** A checkpoint start (inclusive), or a position the stream continues after. */
export type Bound = { checkpoint: bigint } | { position: StreamPosition };

/** One page of a range: checkpoints `[range.start, range.end)`, after the start-side cursor. */
export interface PageRequest {
	range: { start?: bigint; end?: bigint };
	/** Ascending: continue after this cursor. */
	after?: Uint8Array;
	/** Descending: continue before this cursor. */
	before?: Uint8Array;
	order: SuiClientTypes.Order;
	signal: AbortSignal;
}

/** An item, or without one, a resume point the server reported mid-page. */
export interface PageItem<Item> {
	position: StreamPosition;
	item?: Item;
}

/** What a page reports once its items are read. */
export interface PageEnd {
	/** `cursor` continues the scan; `position` is that point, where the server reports it. */
	next: { more: boolean; cursor?: Uint8Array; position?: StreamPosition };
	/** Ascending, on the last page: every match through this checkpoint has been read. */
	covered?: bigint;
	/** A descending read without a low end stopped at this oldest retained checkpoint. */
	retainedFrom?: bigint;
	/** The server has not indexed what this page needs yet; the pass waits and reads again. */
	notIndexed?: boolean;
}

/** A page's items and resume points in traversal order, as they arrive, then its end. */
export type Page<Item> = AsyncIterator<PageItem<Item>, PageEnd, undefined>;

export type LiveEvent<Item> =
	| { $kind: 'Item'; position: StreamPosition; item: Item }
	| { $kind: 'Progress'; position: StreamPosition };

export interface LiveSubscription<Item> extends AsyncIterable<LiveEvent<Item>> {
	/** While enabled, events are buffered ahead of the consumer during a gap replay. */
	readAhead?(enabled: boolean): void;
}

/** Stream item frames without the token, which the core adds. */
export type ItemFrame =
	| SuiClientTypes.StreamCheckpoint<any>
	| SuiClientTypes.StreamTransaction<any>
	| SuiClientTypes.StreamEvent;

/** Everything the core can yield. */
export type CoreFrame<Frame> =
	Frame | SuiClientTypes.StreamProgressFrame | SuiClientTypes.StreamCompletionFrame;

export interface LedgerStreamAdapter<Item, Frame extends { resumeToken: string } = ItemFrame> {
	readonly transport: StreamTransport;
	readonly family: StreamFamily;
	/**
	 * `fromTip`: subscriptions start at the live tip, so the core pages history first and replays
	 * the gap up to the feed's first frame; every live position has a checkpoint.
	 * `resume`: `subscribe(from)` backfills after `from` on the server, then goes live.
	 */
	readonly live: 'fromTip' | 'resume';
	/** `resume` only: whether `subscribe(from)` can backfill from `from`; if not, the core pages first. */
	canResume?(from: Bound): boolean;

	/**
	 * Resolves names in the filter; the returned filter is hashed into every token. An adapter that
	 * reads the indexed tip with the chain identity returns it, and planning uses it.
	 */
	initialize(signal: AbortSignal): Promise<{ chain: string; filter: unknown; indexedTip?: bigint }>;
	/** The highest checkpoint that pages can read. */
	indexedTip(signal: AbortSignal): Promise<bigint>;
	/** One request, opened on the first read. The core always reads or closes it. */
	fetchPage(request: PageRequest): Page<Item>;
	/**
	 * A live subscription (`from` is used only by `resume` adapters). An adapter whose feed can stay
	 * quiet after it opens calls `onOpen` then, for the `Connected` status.
	 */
	subscribe(
		from: Bound | undefined,
		signal: AbortSignal,
		onOpen: () => void,
	): LiveSubscription<Item>;

	mapItem(item: Item): Omit<Frame, 'resumeToken'>;
	/** Why retrying may get past `error`, or `undefined` when it cannot. */
	retryReason(error: unknown): SuiClientTypes.RetryReason | undefined;
}

/** An adapter whose item type is known only to itself. */
export type AnyLedgerStreamAdapter = LedgerStreamAdapter<any, any>;
