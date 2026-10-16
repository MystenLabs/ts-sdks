// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * The internal contract between the shared ledger stream core and a transport.
 *
 * The core owns everything that must behave the same on every transport: tokens, range planning,
 * retries, deduplication, gap repair and status reporting. A transport supplies primitives: one
 * historical scan pass, a live feed, position ordering and a position codec. Its `follow()` is a
 * short, explicit sequence of handoff phases built from `FollowSession` helpers.
 */

import type { BcsType } from '@mysten/bcs';

import type { SuiClientTypes } from '../types.js';

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
export type Bound<P> = { checkpoint: bigint } | { position: P };

export interface PositionCodec<P> {
	/** Positions are equal exactly when their serialized bytes are equal. */
	readonly schema: BcsType<P, P>;
	/** Throws `SuiStreamError('InvalidToken')` for metadata this SDK cannot have produced. */
	validate(position: P): void;
}

export interface ScanRequest<P> {
	start?: Bound<P>;
	end?: Bound<P>;
	order: SuiClientTypes.Order;
	/** Indexed tip captured when a finite range was planned; fixed for the stream's lifetime. */
	capturedTip?: bigint;
	signal: AbortSignal;
}

/** Exactly one `End` is the last event of every scan pass. */
export type ScanEvent<P, Item> =
	| { $kind: 'Connected' }
	| { $kind: 'Item'; position: P; item: Item }
	| { $kind: 'Progress'; position: P }
	| { $kind: 'Page'; end: SuiClientTypes.StreamPageEnd; coverage: Coverage }
	/** `complete: false`: the index has not reached the requested bound yet. */
	| { $kind: 'End'; complete: boolean };

export type LiveEvent<P, Item> =
	| { $kind: 'Connected' }
	| { $kind: 'Item'; position: P; item: Item }
	| { $kind: 'Progress'; position: P };

export type PositionEvent<P, Item> = Extract<LiveEvent<P, Item>, { position: P }>;

/** A live feed opened through `FollowSession.openFeed`. */
export interface LiveFeed<P, Item> extends AsyncIterable<PositionEvent<P, Item>> {
	/** Reads the first Item or Progress. `deliver()` sees it again as the feed's first event. */
	first(): Promise<PositionEvent<P, Item>>;
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

export interface LedgerStreamAdapter<P, Item, Frame extends { resumeToken: string } = ItemFrame> {
	readonly transport: StreamTransport;
	readonly family: StreamFamily;
	readonly position: PositionCodec<P>;
	/**
	 * true: a follow without a start subscribes at once and commits a baseline from the first live
	 * frame (gRPC). false: the core first anchors it at `{ checkpoint: indexedTip + 1 }` (GraphQL).
	 */
	readonly anchorsAtLiveTip: boolean;

	/** Resolves names in the filter. The returned filter is hashed into every token. */
	initialize(signal: AbortSignal): Promise<{ chain: string; filter: unknown }>;
	/** The highest checkpoint that historical scans can read. */
	indexedTip(signal: AbortSignal): Promise<bigint>;

	/**
	 * One pass: page from `start` toward `end` (or the indexed tip, or genesis when descending),
	 * then `End`. No polling and no retries; the core does both.
	 */
	scan(request: ScanRequest<P>): AsyncIterable<ScanEvent<P, Item>>;
	/**
	 * The live handoff for subscribe delivery: history, subscribe, gap, live. Yields only frames
	 * produced by `session` helpers. Ends only by throwing, as `session.deliver()` does.
	 */
	follow(session: FollowSession<P, Item, Frame>): AsyncGenerator<CoreFrame<Frame>, void>;

	/** Ledger order of two positions, or undefined when the transport cannot tell. */
	compare(a: P, b: P): -1 | 0 | 1 | undefined;
	/** Ascending coverage implied by having delivered everything through `position`. */
	coverage(position: P): Coverage;
	/**
	 * The checkpoint a position sits in. `boundary: true` means the position is exactly the
	 * boundary before `checkpoint` (nothing of `checkpoint` delivered yet).
	 */
	locate(position: P): { checkpoint: bigint | null; boundary: boolean };
	mapItem(item: Item): Omit<Frame, 'resumeToken'>;
	classify(error: unknown): ErrorClass;
}

/** An adapter whose position and item types are known only to itself. */
export type AnyLedgerStreamAdapter = LedgerStreamAdapter<any, any, any>;

/** The only surface an adapter's `follow()` gets. Adapters never report statuses themselves. */
export interface FollowSession<P, Item, Frame> {
	readonly signal: AbortSignal;
	/** Resume point: the last committed position, else the planned start bound. */
	readonly start: Bound<P> | undefined;
	readonly committed: P | undefined;
	/**
	 * Scans until the scan reports complete, polling while the index lags. `'tip'` has no end
	 * bound. Stage `gap` reports `Recovering`.
	 */
	replay(to: Bound<P> | 'tip', stage: 'history' | 'gap'): AsyncGenerator<CoreFrame<Frame>, void>;
	/** Commits a synthetic position (a fresh follow) so a token exists before the first match. */
	baseline(position: P): AsyncGenerator<CoreFrame<Frame>, void>;
	/** Wraps live events; `Connected` events are reported by the core and not passed on. */
	openFeed(events: AsyncIterable<LiveEvent<P, Item>>): LiveFeed<P, Item>;
	/**
	 * Reports `Live`, then delivers the feed: drops events at or before committed state, repairs
	 * skipped checkpoints when `contiguousCheckpoints` is set, and throws on EOF.
	 */
	deliver(
		feed: LiveFeed<P, Item>,
		options?: { contiguousCheckpoints?: boolean },
	): AsyncGenerator<CoreFrame<Frame>, never>;
}
