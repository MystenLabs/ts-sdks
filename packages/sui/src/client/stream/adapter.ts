// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Internal contract between the ledger stream core and a transport. The core owns tokens,
 * planning, retries, deduplication and statuses so they match across transports; the adapter
 * supplies scans and a live feed, and builds positions from what its server reports.
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

export interface ScanRequest {
	start?: Bound;
	end?: Bound;
	order: SuiClientTypes.Order;
	/** Indexed tip captured when a finite range was planned; fixed for the stream's lifetime. */
	capturedTip?: bigint;
	signal: AbortSignal;
}

/** Exactly one `End` is the last event of every scan pass. */
export type ScanEvent<Item> =
	| { $kind: 'Connected' }
	| { $kind: 'Item'; position: StreamPosition; item: Item }
	| { $kind: 'Progress'; position: StreamPosition }
	| { $kind: 'Page'; end: SuiClientTypes.StreamPageEnd; coverage: Coverage }
	/**
	 * `complete: false`: the index has not reached the requested bound yet. `retentionLimit`: a read
	 * toward genesis stopped at the oldest retained checkpoint.
	 */
	| { $kind: 'End'; complete: boolean; retentionLimit?: boolean };

export type LiveEvent<Item> =
	| { $kind: 'Connected' }
	| { $kind: 'Item'; position: StreamPosition; item: Item }
	| { $kind: 'Progress'; position: StreamPosition };

export type PositionEvent<Item> = Extract<LiveEvent<Item>, { position: StreamPosition }>;

/** A live feed opened through `FollowSession.openFeed`. */
export interface LiveFeed<Item> extends AsyncIterable<PositionEvent<Item>> {
	/** Reads the first Item or Progress. `deliver()` sees it again as the feed's first event. */
	first(): Promise<PositionEvent<Item>>;
	/** Closes the underlying feed. */
	close(): Promise<void>;
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
	| SuiClientTypes.StreamCheckpointFrame
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
	 * frame (gRPC). false: the core first anchors it at `{ checkpoint: indexedTip + 1 }` (GraphQL).
	 */
	readonly anchorsAtLiveTip: boolean;

	/**
	 * Resolves names in the filter. The returned filter is hashed into every token. An adapter that
	 * reads the indexed tip with the chain identity returns it, and planning then uses it instead of
	 * calling `indexedTip`.
	 */
	initialize(signal: AbortSignal): Promise<{ chain: string; filter: unknown; indexedTip?: bigint }>;
	/** The highest checkpoint that historical scans can read. */
	indexedTip(signal: AbortSignal): Promise<bigint>;

	/**
	 * One pass: page from `start` toward `end` (or the indexed tip, or genesis when descending),
	 * then `End`. No polling and no retries; the core does both.
	 */
	scan(request: ScanRequest): AsyncIterable<ScanEvent<Item>>;
	/**
	 * The live handoff for subscribe delivery: whatever catch-up the transport needs, then
	 * `session.deliver()`. Yields only frames produced by `session` helpers. Ends only by throwing,
	 * as `session.deliver()` does.
	 */
	follow(session: FollowSession<Item, Frame>): AsyncGenerator<CoreFrame<Frame>, void>;

	mapItem(item: Item): Omit<Frame, 'resumeToken'>;
	classify(error: unknown): ErrorClass;
}

/** An adapter whose item type is known only to itself. */
export type AnyLedgerStreamAdapter = LedgerStreamAdapter<any, any>;

/** The only surface an adapter's `follow()` gets. Adapters never report statuses themselves. */
export interface FollowSession<Item, Frame> {
	readonly signal: AbortSignal;
	/** Resume point: the last committed position, else the planned start bound. */
	readonly start: Bound | undefined;
	readonly committed: StreamPosition | undefined;
	/**
	 * Whether to replay history before subscribing: a long replay could overflow a subscription, and
	 * reading pages detects pruned history. False when the stream is near the live tip: anchored at
	 * it, or after an attempt that failed during live delivery with progress.
	 */
	catchesUpFirst(): boolean;
	/**
	 * Scans until the scan reports complete, polling while the index lags. `'tip'` has no end
	 * bound. Stage `gap` reports `Recovering`.
	 */
	replay(to: Bound | 'tip', stage: 'history' | 'gap'): AsyncGenerator<CoreFrame<Frame>, void>;
	/** Commits a synthetic position (a fresh follow) so a token exists before the first match. */
	baseline(position: StreamPosition): AsyncGenerator<CoreFrame<Frame>, void>;
	/** Wraps live events; `Connected` events are reported by the core and not passed on. */
	openFeed(events: AsyncIterable<LiveEvent<Item>>): LiveFeed<Item>;
	/** Reports `Live`, then delivers the feed: drops events at or before committed state, and throws on EOF. */
	deliver(feed: LiveFeed<Item>): AsyncGenerator<CoreFrame<Frame>, never>;
}
