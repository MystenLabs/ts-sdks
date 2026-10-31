// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { sleep } from '../../utils/abort.js';
import type { SuiClientTypes } from '../types.js';
import type {
	Bound,
	CoreFrame,
	Coverage,
	LedgerStreamAdapter,
	LiveEvent,
	PositionEvent,
} from './adapter.js';
import { StreamDisconnected } from './errors.js';
import { readPages, type PassResult } from './pager.js';
import { rangeEndBound, type StreamPlan } from './plan.js';
import type { StatusReporter } from './status.js';
import {
	compareCoverage,
	comparePositions,
	coverageBefore,
	maxCoverage,
	nextUncovered,
	positionBytes,
	positionCoverage,
	type StreamPosition,
} from './position.js';
import { encodeToken, filterHash, sameBytes, type StreamToken } from './token.js';

/**
 * Consecutive polls that may end on an out-of-range rejection before it is reported as pruned
 * history. A lagging server catches up well within them.
 */
const UNCONFIRMED_REJECTIONS = 30;

const COMPLETION_REASON = {
	Checkpoint: 'checkpointBound',
	Cursor: 'cursorBound',
	IndexedTip: 'indexedTip',
	Genesis: 'genesis',
} as const;

/** A live feed opened through `StreamSession.openFeed`. */
export interface LiveFeed<Item> extends AsyncIterable<PositionEvent<Item>> {
	/** Reads the first Item or Progress. `deliver()` sees it again as the feed's first event. */
	first(): Promise<PositionEvent<Item>>;
	/** Drops Progress up to the first Item, which `deliver()` then sees as the feed's first event. */
	firstItem(): Promise<PositionEvent<Item>>;
	close(): Promise<void>;
}

/**
 * The committed state of one stream, shared by every attempt. Tokens and reconnects use the
 * committed position. Every event goes through `#isStale` then `#commit`, which keeps delivery
 * exactly-once across reconnects, overlapping gap scans and repeating live feeds.
 */
export class StreamSession<Item, Frame extends { resumeToken: string }> {
	readonly signal: AbortSignal;
	readonly #plan: StreamPlan;
	readonly #adapter: LedgerStreamAdapter<Item, Frame>;
	readonly #frames: SuiClientTypes.StreamFrameOptions;
	readonly #status: StatusReporter;
	readonly #tokenBase: Omit<StreamToken, 'position' | 'coverage'>;

	#committed: StreamPosition | undefined;
	#committedBytes: Uint8Array | undefined;
	#lastItem: StreamPosition | undefined;
	#covered: Coverage;
	#attemptStartBytes: Uint8Array | undefined;
	#deliveredItem = false;
	#delivering = false;
	/** The committed state is within one reconnect of the live tip. */
	#nearLiveTip: boolean;
	#retentionLimit = false;
	/** Consecutive passes, across reconnects, that ended on a rejection that may be pruned history. */
	#rejectedPasses = 0;
	/** Where set, live delivery reports `Live` at the first item at or past this checkpoint. */
	readonly #liveFrom: bigint | undefined;
	#reportedLive = false;

	constructor(options: {
		plan: StreamPlan;
		identity: { chain: string; filter: unknown };
		adapter: LedgerStreamAdapter<Item, Frame>;
		frames: SuiClientTypes.StreamFrameOptions | undefined;
		status: StatusReporter;
		signal: AbortSignal;
		liveFrom?: bigint;
	}) {
		const { plan, adapter } = options;
		this.signal = options.signal;
		this.#plan = plan;
		this.#adapter = adapter;
		this.#frames = options.frames ?? {};
		this.#status = options.status;
		this.#tokenBase = {
			transport: adapter.transport,
			family: adapter.family,
			chain: options.identity.chain,
			filter: filterHash(options.identity.filter),
			range: plan.range,
		};
		// Resuming from a token: its position is already delivered.
		if (plan.start && 'position' in plan.start) {
			this.#committed = plan.start.position;
			this.#committedBytes = this.#bytes(plan.start.position);
		}
		this.#covered = this.#initialCoverage();
		this.#nearLiveTip = plan.anchored;
		this.#liveFrom = options.liveFrom;
	}

	/** Resume point: the last committed position, else the planned start bound. */
	get start(): Bound | undefined {
		return this.#committed !== undefined ? { position: this.#committed } : this.#plan.start;
	}

	get committed(): StreamPosition | undefined {
		return this.#committed;
	}

	beginAttempt(attempt: number) {
		this.#attemptStartBytes = this.#committedBytes;
		this.#deliveredItem = false;
		this.#delivering = false;
		this.#status.connecting(attempt);
	}

	/** Called when an attempt fails. Failing during live delivery after progress leaves it near the tip. */
	endAttempt() {
		this.#nearLiveTip = this.#delivering && this.advancedThisAttempt();
	}

	/**
	 * Whether to page history before subscribing at the live tip. False when the stream is near the
	 * live tip: anchored at it, or after an attempt that failed during live delivery with progress.
	 */
	catchesUpFirst(): boolean {
		return this.start !== undefined && !this.#nearLiveTip;
	}

	/** Whether an item was delivered since `beginAttempt`. */
	deliveredItemThisAttempt(): boolean {
		return this.#deliveredItem;
	}

	/** Whether the committed position changed since `beginAttempt`. */
	advancedThisAttempt(): boolean {
		const before = this.#attemptStartBytes;
		const after = this.#committedBytes;
		return before === undefined || after === undefined
			? before !== after
			: !sameBytes(before, after);
	}

	/** Delivery reached the indexed tip: a poll pass, or gap recovery before the first live item. */
	markLive() {
		this.#reportLive();
	}

	#reportLive() {
		this.#reportedLive = true;
		this.#status.live();
	}

	/**
	 * Pages until a pass reports complete, polling while the index lags. `'tip'` has no end bound.
	 * Stage `gap` reports `Recovering`.
	 */
	async *replay(
		to: Bound | 'tip',
		stage: 'history' | 'gap',
	): AsyncGenerator<CoreFrame<Frame>, void> {
		if (stage === 'gap') this.#status.recovering();
		const end = to === 'tip' ? undefined : to;
		while (true) {
			const before = this.#committedBytes;
			const { complete, mayBePruned } = yield* this.#scanOnce(end, stage);
			if (complete) break;
			// A rejection that may be pruned history is lag only if it clears. Any commit resets the
			// count, including one earlier in this pass.
			if (mayBePruned && before === this.#committedBytes) this.#rejectedPasses++;
			if (mayBePruned && this.#rejectedPasses >= UNCONFIRMED_REJECTIONS) throw mayBePruned;
			// The index has not reached `end` yet. Never move on with a partial range.
			await sleep(this.#plan.pollInterval, this.signal);
		}
		if (end && 'checkpoint' in end && this.#plan.order === 'ascending') {
			this.#cover(coverageBefore(end.checkpoint));
		}
	}

	/** Commits a synthetic position (a fresh follow) so a token exists before the first match. */
	async *baseline(position: StreamPosition): AsyncGenerator<CoreFrame<Frame>, void> {
		yield* this.#commit({ $kind: 'Progress', position });
	}

	/** Wraps live events; `Connected` events are reported by the core and not passed on. */
	openFeed(events: AsyncIterable<LiveEvent<Item>>): LiveFeed<Item> {
		return new FeedReader(events, () => this.#status.connected());
	}

	/**
	 * Reports `Live`, then delivers the feed: drops events at or before committed state. Called
	 * with the feed's first event read. With `liveFrom`, `Live` waits for the first item at or past
	 * it, unless the feed is known to be at the tip: a fresh follow that has delivered no item yet,
	 * or any reconnect after the stream was live, however the earlier attempts failed.
	 */
	async *deliver(feed: LiveFeed<Item>): AsyncGenerator<CoreFrame<Frame>, never> {
		this.#delivering = true;
		const liveFrom = this.#liveFrom;
		const atTip = this.#reportedLive || (this.#plan.anchored && this.#lastItem === undefined);
		if (liveFrom === undefined || atTip) this.#reportLive();
		for await (const event of feed) {
			if (this.#isStale(event)) continue;
			if (
				liveFrom !== undefined &&
				event.$kind === 'Item' &&
				event.position.checkpoint! >= liveFrom
			) {
				this.#reportLive();
			}
			yield* this.#commit(event);
		}
		// A live feed never completes. Its end is a disconnect, and the core reconnects.
		throw new StreamDisconnected();
	}

	async *complete(): AsyncGenerator<SuiClientTypes.StreamCompletionFrame, void> {
		this.signal.throwIfAborted();
		const { range, order, start } = this.#plan;
		if (!this.#frames.completion || range.$kind !== 'Finite') return;
		const end = rangeEndBound(range);
		yield {
			$kind: 'Complete',
			completion: {
				order,
				reason: this.#retentionLimit ? 'retentionLimit' : COMPLETION_REASON[range.end.$kind],
				resumeToken: this.#committed === undefined ? undefined : this.#committedToken(),
				range: {
					start: start && this.#publicBound(start),
					end: end && this.#publicBound(end),
					capturedCheckpoint: this.#plan.capturedTip?.toString(),
				},
			},
		};
	}

	// One pager pass.
	async *#scanOnce(
		end: Bound | undefined,
		stage: 'history' | 'gap',
	): AsyncGenerator<CoreFrame<Frame>, PassResult> {
		const { order, capturedTip } = this.#plan;
		const pass = readPages(this.#adapter, {
			start: this.start,
			end,
			order,
			capturedTip,
			signal: this.signal,
		});
		try {
			while (true) {
				const next = await pass.next();
				if (next.done) {
					this.#retentionLimit ||= next.value.retentionLimit;
					return next.value;
				}
				const event = next.value;
				switch (event.$kind) {
					case 'Connected':
						this.#status.connected();
						break;
					case 'Page':
						this.#status.page(stage, event.end, event.coverage);
						break;
					case 'Item':
					case 'Progress':
						if (!this.#isStale(event)) yield* this.#commit(event);
						break;
				}
			}
		} finally {
			await pass.return({ complete: false, retentionLimit: false });
		}
	}

	/** Whether everything at `event`'s position was already delivered. */
	#isStale(event: PositionEvent<Item>): boolean {
		const { position } = event;
		if (this.#committedBytes && sameBytes(this.#bytes(position), this.#committedBytes)) {
			return true; // a reconnect that repeats the resume cursor
		}
		if (event.$kind === 'Progress') {
			return this.#regressesCoverage(position) || this.#isBehind(position, this.#committed, false);
		}
		return (
			this.#isCovered(position) ||
			this.#isBehind(position, this.#lastItem, true) ||
			this.#isBehind(position, this.#committed, true)
		);
	}

	async *#commit(event: PositionEvent<Item>): AsyncGenerator<CoreFrame<Frame>, void> {
		// Cancellation is immediate: an event the adapter already buffered is neither committed nor
		// delivered once the caller aborts.
		this.signal.throwIfAborted();
		this.#committed = event.position;
		this.#committedBytes = this.#bytes(event.position);
		this.#rejectedPasses = 0;
		if (event.$kind === 'Item') {
			this.#lastItem = event.position;
			this.#deliveredItem = true;
		}
		if (this.#plan.order === 'ascending') this.#cover(this.#coverage(event.position));

		if (event.$kind === 'Item') {
			const frame = this.#adapter.mapItem(event.item);
			yield { ...frame, resumeToken: this.#committedToken() } as Frame;
		} else if (this.#frames.progress) {
			const coverage = this.#tokenCoverage(event.position);
			yield {
				$kind: 'Progress',
				resumeToken: this.#committedToken(),
				...(coverage.$kind === 'Through' && { coveredCheckpoint: coverage.checkpoint.toString() }),
			};
		}
	}

	#isCovered(position: StreamPosition): boolean {
		const next = nextUncovered(this.#covered);
		if (this.#plan.order !== 'ascending' || next === undefined) return false;
		const checkpoint = position.checkpoint;
		return checkpoint !== null && checkpoint < next;
	}

	#regressesCoverage(position: StreamPosition): boolean {
		return (
			this.#plan.order === 'ascending' &&
			compareCoverage(this.#coverage(position), this.#covered) < 0
		);
	}

	/**
	 * Whether `a` comes before `b` (or equals it, when `inclusive`) in traversal order. An unknown
	 * order counts as not behind: the event is delivered, at least once and never lost.
	 */
	#isBehind(a: StreamPosition, b: StreamPosition | undefined, inclusive: boolean): boolean {
		const comparison = b === undefined ? undefined : comparePositions(a, b);
		if (comparison === undefined) return false;
		const traversal = this.#plan.order === 'ascending' ? comparison : -comparison;
		return traversal < 0 || (inclusive && traversal === 0);
	}

	#cover(coverage: Coverage) {
		this.#covered = maxCoverage(this.#covered, coverage);
	}

	#initialCoverage(): Coverage {
		const start = this.#plan.start;
		if (this.#plan.order !== 'ascending' || !start) return { $kind: 'Unknown' };
		if ('checkpoint' in start) return coverageBefore(start.checkpoint);
		return maxCoverage(this.#coverage(start.position), this.#plan.startCoverage);
	}

	#committedToken(): string {
		return this.#token(this.#committed!);
	}

	#publicBound(bound: Bound): SuiClientTypes.StreamBound {
		if ('checkpoint' in bound) return { checkpoint: bound.checkpoint.toString() };
		return { resumeToken: this.#token(bound.position) };
	}

	/** A token is a function of its position and the range only. */
	#token(position: StreamPosition): string {
		return encodeToken({
			...this.#tokenBase,
			position,
			coverage: this.#tokenCoverage(position),
		});
	}

	/** The transport-neutral coverage recorded in tokens and Progress frames. */
	#tokenCoverage(position: StreamPosition): Coverage {
		return this.#plan.order === 'ascending' ? this.#coverage(position) : { $kind: 'Unknown' };
	}

	#coverage(position: StreamPosition): Coverage {
		return positionCoverage(position, this.#adapter.family);
	}

	#bytes(position: StreamPosition): Uint8Array {
		return positionBytes(position);
	}
}

/** Buffers the first event so `first()` can inspect it before `deliver()` consumes it. */
class FeedReader<Item> implements LiveFeed<Item> {
	readonly #iterator: AsyncIterator<LiveEvent<Item>>;
	readonly #onConnected: () => void;
	#pending: PositionEvent<Item> | undefined;

	constructor(events: AsyncIterable<LiveEvent<Item>>, onConnected: () => void) {
		this.#iterator = events[Symbol.asyncIterator]();
		this.#onConnected = onConnected;
	}

	async first(): Promise<PositionEvent<Item>> {
		this.#pending ??= await this.#read();
		if (!this.#pending) throw new StreamDisconnected('Live feed ended before its first event');
		return this.#pending;
	}

	async firstItem(): Promise<PositionEvent<Item>> {
		while ((await this.first()).$kind !== 'Item') this.#pending = undefined;
		return this.#pending!;
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<PositionEvent<Item>> {
		const pending = this.#pending;
		this.#pending = undefined;
		if (pending) yield pending;
		for (let event = await this.#read(); event; event = await this.#read()) yield event;
	}

	async close() {
		await this.#iterator.return?.();
	}

	async #read(): Promise<PositionEvent<Item> | undefined> {
		while (true) {
			const result = await this.#iterator.next();
			if (result.done) return undefined;
			if (result.value.$kind !== 'Connected') return result.value;
			this.#onConnected();
		}
	}
}
