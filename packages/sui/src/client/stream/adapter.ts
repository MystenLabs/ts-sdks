// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Internal contract between the ledger stream core and a transport. The core owns tokens,
 * planning, paging, the live handoff, retries, deduplication and statuses so they match across
 * transports. An adapter fetches one page at a time, opens subscriptions, and builds positions
 * from what its server reports.
 */

import type { SuiClientTypes } from '../types.js';
import type { StreamPosition } from './position.js';

export type StreamFamily = 'checkpoints' | 'transactions' | 'events';

/** Append-only: the transport tag is part of every token. */
export type StreamTransport = 'grpc' | 'graphql';

/**
 * Ascending coverage: `Through(c)` means every matching item at checkpoints `<= c` was delivered.
 * `None` means no checkpoint is covered yet (before genesis); `Unknown` means no claim.
 */
export type Coverage =
	{ $kind: 'Unknown' } | { $kind: 'None' } | { $kind: 'Through'; checkpoint: bigint };

/** A checkpoint bound, or a transport position. Inclusive at the start, exclusive at the end. */
export type Bound = { checkpoint: bigint } | { position: StreamPosition };

/** One page of a range: checkpoints `[range.start, range.end)`, then strictly between cursors. */
export interface PageRequest {
	range: { start?: bigint; end?: bigint };
	after?: Uint8Array;
	before?: Uint8Array;
	order: SuiClientTypes.Order;
	signal: AbortSignal;
}

export interface PageItem<Item> {
	position: StreamPosition;
	item: Item;
}

export interface Page<Item> {
	/** In traversal order. */
	items: PageItem<Item>[];
	/** `cursor` continues the scan where the page stopped: `after` ascending, `before` descending. */
	next: { more: boolean; cursor?: Uint8Array };
	/** Ascending: every match through this checkpoint is in this page or an earlier one. */
	covered?: bigint;
	/** The indexed tip of the server that answered. */
	viewedAt?: bigint;
	/** The oldest checkpoint the server retains for this read. */
	retainedFrom?: bigint;
}

export type LiveEvent<Item> =
	| { $kind: 'Connected' }
	| { $kind: 'Item'; position: StreamPosition; item: Item }
	| { $kind: 'Progress'; position: StreamPosition };

export type PositionEvent<Item> = Extract<LiveEvent<Item>, { position: StreamPosition }>;

export interface LiveSubscription<Item> extends AsyncIterable<LiveEvent<Item>> {
	/**
	 * While enabled, events are buffered ahead of the consumer, so a server that drops slow
	 * subscribers keeps the subscription open while the core replays the gap before it.
	 */
	readAhead?(enabled: boolean): void;
}

/**
 * How the core treats a failure:
 * - `retry`: transient; back off and reconnect, counted against `maxAttempts`.
 * - `disconnect`: a connection ended (live EOF, live buffer overflow); free after progress.
 * - `fatal`: rethrown unchanged.
 */
export type ErrorClass = 'retry' | 'disconnect' | 'fatal';

/** Stream item frames without the token, which the core adds. */
export type ItemFrame =
	| SuiClientTypes.StreamCheckpointFrame<any>
	| SuiClientTypes.StreamTransactionFrame<any>
	| SuiClientTypes.StreamEventFrame;

/** Everything the core can yield. */
export type CoreFrame<Frame> =
	Frame | SuiClientTypes.StreamProgressFrame | SuiClientTypes.StreamCompletionFrame;

export interface LedgerStreamAdapter<Item, Frame extends { resumeToken: string } = ItemFrame> {
	readonly transport: StreamTransport;
	readonly family: StreamFamily;
	/**
	 * true: a follow without a start subscribes at once and commits a baseline from the first live
	 * event. false: the core first anchors it at `{ checkpoint: indexedTip + 1 }`.
	 */
	readonly anchorsAtLiveTip: boolean;
	/**
	 * true: `subscribe(from)` backfills after `from` and then goes live. false: subscriptions start
	 * at the live tip, so the core pages history first and replays the gap before the first event.
	 */
	readonly resumesSubscriptions: boolean;

	/**
	 * Resolves names in the filter. The returned filter is hashed into every token. An adapter that
	 * reads the indexed tip with the chain identity returns it, and planning then uses it instead of
	 * calling `indexedTip`.
	 */
	initialize(signal: AbortSignal): Promise<{ chain: string; filter: unknown; indexedTip?: bigint }>;
	/** The highest checkpoint that pages can read. */
	indexedTip(signal: AbortSignal): Promise<bigint>;
	/** One request. No retries; the core retries. */
	fetchPage(request: PageRequest): Promise<Page<Item>>;
	/** A live subscription after `from` (ignored unless `resumesSubscriptions`). */
	subscribe(from: Bound | undefined, signal: AbortSignal): LiveSubscription<Item>;

	mapItem(item: Item): Omit<Frame, 'resumeToken'>;
	classify(error: unknown): ErrorClass;
}

/** An adapter whose item type is known only to itself. */
export type AnyLedgerStreamAdapter = LedgerStreamAdapter<any, any>;
