// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { sleep } from '../../utils/abort.js';
import type { SuiClientTypes } from '../types.js';
import type { Bound, CoreFrame, LedgerStreamAdapter, LiveEvent } from './adapter.js';
import { StreamDisconnected } from './errors.js';
import { readPages } from './pager.js';
import type { StreamPlan } from './plan.js';
import { comparePositions, nextUncoveredAt, type StreamPosition } from './position.js';
import type { StatusReporter } from './status.js';
import { encodeToken, filterHash, sameBytes, type StreamToken } from './token.js';

/** A live feed opened through `StreamSession.openFeed`. */
export interface LiveFeed<Item> extends AsyncIterable<LiveEvent<Item>> {
	/** Reads the first Item or Progress. Iterating the feed yields it again first. */
	first(): Promise<LiveEvent<Item>>;
	close(): Promise<void>;
}

/**
 * The committed state of one stream, shared by every attempt. Tokens and reconnects resume from
 * the committed position. Every event goes through `#isStale` then `#commit`, which keeps delivery
 * exactly-once across reconnects and overlapping gap replays.
 */
export class StreamSession<Item, Frame extends { resumeToken: string }> {
	readonly signal: AbortSignal;
	readonly #plan: StreamPlan;
	readonly #adapter: LedgerStreamAdapter<Item, Frame>;
	readonly #frames: SuiClientTypes.StreamFrameOptions;
	readonly #status: StatusReporter;
	readonly #identity: Omit<StreamToken, 'position'>;
	readonly #ascending: boolean;

	#committed: StreamPosition | undefined;
	#nextUncovered: bigint | null = null;
	#attemptStart: StreamPosition | undefined;
	#subscribed = false;
	#delivering = false;
	#retentionLimit = false;

	constructor(options: {
		plan: StreamPlan;
		identity: { chain: string; filter: unknown };
		adapter: LedgerStreamAdapter<Item, Frame>;
		frames: SuiClientTypes.StreamFrameOptions | undefined;
		status: StatusReporter;
		signal: AbortSignal;
	}) {
		const { plan, adapter } = options;
		this.signal = options.signal;
		this.#plan = plan;
		this.#adapter = adapter;
		this.#frames = options.frames ?? {};
		this.#status = options.status;
		this.#ascending = plan.order === 'ascending';
		this.#identity = {
			transport: adapter.transport,
			family: adapter.family,
			chain: options.identity.chain,
			filter: filterHash(options.identity.filter),
			order: plan.order,
		};
		const start = plan.start;
		if (start && 'position' in start) this.#committed = start.position;
		if (start && this.#ascending) {
			this.#nextUncovered =
				'checkpoint' in start ? start.checkpoint : nextUncoveredAt(start.position, adapter.family);
		}
	}

	/** Resume point: the last committed position, else the planned start. */
	get start(): Bound | undefined {
		return this.#committed ? { position: this.#committed } : this.#plan.start;
	}

	get committed(): StreamPosition | undefined {
		return this.#committed;
	}

	/** Ascending: the first checkpoint not covered by what was delivered so far, if known. */
	get nextUncovered(): bigint | null {
		return this.#nextUncovered;
	}

	beginAttempt() {
		this.#attemptStart = this.#committed;
		this.#subscribed = false;
		this.#delivering = false;
	}

	/**
	 * Whether this attempt committed a new position. When following, history paged before
	 * subscribing counts. Once subscribed, the gap replay repeats on every attempt, so only positions
	 * the live feed delivers count.
	 */
	advancedThisAttempt(): boolean {
		return (
			this.#committed !== this.#attemptStart &&
			(this.#plan.mode !== 'follow' || !this.#subscribed || this.#delivering)
		);
	}

	/** The live subscription is about to open. */
	subscribing() {
		this.#attemptStart = this.#committed;
		this.#subscribed = true;
	}

	/** Reads passes until one is complete, waiting `pollInterval` while the index lags. */
	async *replay(end: bigint | undefined): AsyncGenerator<CoreFrame<Frame>, void> {
		while (!(yield* this.#pass(end))) await sleep(this.#plan.pollInterval, this.signal);
	}

	/** Commits a position no event reported, so a token exists before the first match. */
	async *baseline(position: StreamPosition): AsyncGenerator<CoreFrame<Frame>, void> {
		yield* this.#commit({ $kind: 'Progress', position });
	}

	/** This attempt received a response. Reports `Connected`; progress is counted separately. */
	connected() {
		this.#status.connected();
	}

	openFeed(events: AsyncIterable<LiveEvent<Item>>): LiveFeed<Item> {
		return new FeedReader(events, () => this.connected());
	}

	/** Commits each new event of the feed. A feed's end is a disconnect. */
	async *deliver(feed: LiveFeed<Item>): AsyncGenerator<CoreFrame<Frame>, never> {
		this.#attemptStart = this.#committed;
		this.#delivering = true;
		for await (const event of feed) {
			if (!this.#isStale(event)) yield* this.#commit(event);
		}
		throw new StreamDisconnected();
	}

	async *complete(): AsyncGenerator<SuiClientTypes.StreamCompletionFrame, void> {
		this.signal.throwIfAborted();
		if (!this.#frames.completion) return;
		yield {
			$kind: 'Complete',
			reason: this.#retentionLimit ? 'retentionLimit' : this.#plan.completion,
			...(this.#committed && { resumeToken: this.#token(this.#committed) }),
		};
	}

	// One pager pass. Returns whether it is complete.
	async *#pass(end: bigint | undefined): AsyncGenerator<CoreFrame<Frame>, boolean> {
		const pass = readPages(this.#adapter, {
			start: this.start,
			end,
			order: this.#plan.order,
			signal: this.signal,
		});
		try {
			while (true) {
				const next = await pass.next();
				this.#status.connected();
				if (next.done) {
					this.#retentionLimit ||= next.value.retentionLimit;
					return next.value.complete;
				}
				if (!this.#isStale(next.value)) yield* this.#commit(next.value);
			}
		} finally {
			await pass.return({ complete: false, retentionLimit: false });
		}
	}

	/** Whether everything at `event`'s position was already delivered. */
	#isStale({ $kind, position }: LiveEvent<Item>): boolean {
		const committed = this.#committed;
		// A reconnect that repeats a resume cursor without a checkpoint; positions with one are
		// compared by `#isBehind`.
		if (
			position.checkpoint === null &&
			committed?.checkpoint === null &&
			sameBytes(position.cursor!, committed.cursor!)
		) {
			return true;
		}
		const next = this.#ascending ? this.#nextUncovered : null;
		if ($kind === 'Progress') {
			const at = this.#nextUncoveredAt(position);
			return (
				(next !== null && at !== null && at < next) || this.#isBehind(position, committed, true)
			);
		}
		return (
			(next !== null && position.checkpoint !== null && position.checkpoint < next) ||
			this.#isBehind(position, committed, true)
		);
	}

	async *#commit(event: LiveEvent<Item>): AsyncGenerator<CoreFrame<Frame>, void> {
		// An event the adapter already buffered is neither committed nor delivered after an abort.
		this.signal.throwIfAborted();
		const { position } = event;
		const at = this.#ascending ? this.#nextUncoveredAt(position) : null;
		if (at !== null && (this.#nextUncovered === null || at > this.#nextUncovered)) {
			this.#nextUncovered = at;
		}
		this.#committed = position;
		if (event.$kind === 'Item') {
			const frame = this.#adapter.mapItem(event.item);
			yield { ...frame, resumeToken: this.#token(position) } as Frame;
		} else if (this.#frames.progress) {
			yield { $kind: 'Progress', resumeToken: this.#token(position) };
		}
	}

	/**
	 * Whether `a` comes before `b` (or equals it, when `inclusive`) in traversal order. An unknown
	 * order counts as not behind: the event is delivered at least once, never lost.
	 */
	#isBehind(a: StreamPosition, b: StreamPosition | undefined, inclusive: boolean): boolean {
		const comparison = b && comparePositions(a, b);
		if (comparison === undefined) return false;
		const traversal = this.#ascending ? comparison : -comparison;
		return traversal < 0 || (inclusive && traversal === 0);
	}

	#nextUncoveredAt(position: StreamPosition): bigint | null {
		return nextUncoveredAt(position, this.#adapter.family);
	}

	#token(position: StreamPosition): string {
		return encodeToken({ ...this.#identity, position });
	}
}

/** Reports `Connected` on the feed's first event, and buffers it so the handoff can inspect it. */
class FeedReader<Item> implements LiveFeed<Item> {
	readonly #iterator: AsyncIterator<LiveEvent<Item>>;
	readonly #onEvent: () => void;
	#pending: LiveEvent<Item> | undefined;

	constructor(events: AsyncIterable<LiveEvent<Item>>, onEvent: () => void) {
		this.#iterator = events[Symbol.asyncIterator]();
		this.#onEvent = onEvent;
	}

	async first(): Promise<LiveEvent<Item>> {
		this.#pending ??= await this.#read();
		if (!this.#pending) throw new StreamDisconnected('Live feed ended before its first event');
		return this.#pending;
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<LiveEvent<Item>> {
		const pending = this.#pending;
		this.#pending = undefined;
		if (pending) yield pending;
		for (let event = await this.#read(); event; event = await this.#read()) yield event;
	}

	async close() {
		await this.#iterator.return?.();
	}

	async #read(): Promise<LiveEvent<Item> | undefined> {
		const result = await this.#iterator.next();
		if (result.done) return undefined;
		this.#onEvent();
		return result.value;
	}
}
