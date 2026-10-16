// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { sleep } from '../../utils/abort.js';
import type { SuiClientTypes } from '../types.js';
import type {
	Bound,
	CoreFrame,
	Coverage,
	FollowSession,
	LedgerStreamAdapter,
	LiveEvent,
	LiveFeed,
	PositionEvent,
	ScanEvent,
} from './adapter.js';
import { StreamDisconnected, SuiStreamError } from './errors.js';
import { rangeEndBound, type StreamPlan } from './plan.js';
import type { StatusReporter } from './status.js';
import { encodeToken, filterHash, mapRangePosition, sameBytes, type StreamToken } from './token.js';

const COMPLETION_REASON = {
	Checkpoint: 'checkpointBound',
	Cursor: 'cursorBound',
	IndexedTip: 'indexedTip',
	Genesis: 'genesis',
} as const;

/**
 * The committed state of one stream, shared by every attempt. Tokens and reconnects use the
 * committed position. Every event goes through `#isStale` then `#commit`, which keeps delivery
 * exactly-once across reconnects, overlapping gap scans and repeating live feeds.
 */
export class StreamSession<P, Item, Frame extends { resumeToken: string }> implements FollowSession<
	P,
	Item,
	Frame
> {
	readonly signal: AbortSignal;
	readonly #plan: StreamPlan<P>;
	readonly #adapter: LedgerStreamAdapter<P, Item, Frame>;
	readonly #frames: SuiClientTypes.StreamFrameOptions;
	readonly #status: StatusReporter;
	readonly #tokenBase: Omit<StreamToken, 'position' | 'coverage'>;

	#committed: P | undefined;
	#committedBytes: Uint8Array | undefined;
	#lastItem: P | undefined;
	#covered: Coverage;
	#attemptStartBytes: Uint8Array | undefined;
	#delivering = false;
	/** The committed state is within one reconnect of the live tip. */
	#nearLiveTip = false;

	constructor(options: {
		plan: StreamPlan<P>;
		identity: { chain: string; filter: unknown };
		adapter: LedgerStreamAdapter<P, Item, Frame>;
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
		this.#tokenBase = {
			transport: adapter.transport,
			family: adapter.family,
			chain: options.identity.chain,
			filter: filterHash(options.identity.filter),
			range: mapRangePosition(plan.range, (position) => this.#bytes(position)),
		};
		// Resuming from a token: its position is already delivered.
		if (plan.start && 'position' in plan.start) {
			this.#committed = plan.start.position;
			this.#committedBytes = this.#bytes(plan.start.position);
		}
		this.#covered = this.#initialCoverage();
	}

	get start(): Bound<P> | undefined {
		return this.#committed !== undefined ? { position: this.#committed } : this.#plan.start;
	}

	get committed(): P | undefined {
		return this.#committed;
	}

	beginAttempt(attempt: number) {
		this.#attemptStartBytes = this.#committedBytes;
		this.#delivering = false;
		this.#status.connecting(attempt);
	}

	/** Called when an attempt fails. Failing during live delivery after progress leaves it near the tip. */
	endAttempt() {
		this.#nearLiveTip = this.#delivering && this.advancedThisAttempt();
	}

	catchesUpFirst(): boolean {
		return this.start !== undefined && !this.#nearLiveTip;
	}

	/** Whether the committed position changed since `beginAttempt`. */
	advancedThisAttempt(): boolean {
		const before = this.#attemptStartBytes;
		const after = this.#committedBytes;
		return before === undefined || after === undefined
			? before !== after
			: !sameBytes(before, after);
	}

	/** Poll delivery reached the indexed tip. */
	markLive() {
		this.#status.live();
	}

	async *replay(
		to: Bound<P> | 'tip',
		stage: 'history' | 'gap',
	): AsyncGenerator<CoreFrame<Frame>, void> {
		if (stage === 'gap') this.#status.recovering();
		const end = to === 'tip' ? undefined : to;
		while (!(yield* this.#scanOnce(end, stage))) {
			// The index has not reached `end` yet. Never move on with a partial range.
			await sleep(this.#plan.pollInterval, this.signal);
		}
		if (end && 'checkpoint' in end && this.#plan.order === 'ascending') {
			this.#cover(coverageBefore(end.checkpoint));
		}
	}

	async *baseline(position: P): AsyncGenerator<CoreFrame<Frame>, void> {
		yield* this.#commit({ $kind: 'Progress', position });
	}

	openFeed(events: AsyncIterable<LiveEvent<P, Item>>): LiveFeed<P, Item> {
		return new FeedReader(events, () => this.#status.connected());
	}

	async *deliver(feed: LiveFeed<P, Item>): AsyncGenerator<CoreFrame<Frame>, never> {
		this.#delivering = true;
		this.#status.live();
		for await (const event of feed) {
			if (!this.#isStale(event)) yield* this.#commit(event);
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
				reason: COMPLETION_REASON[range.end.$kind],
				resumeToken: this.#committed === undefined ? undefined : this.#committedToken(),
				range: {
					start: start && this.#publicBound(start),
					end: end && this.#publicBound(end),
					capturedCheckpoint: this.#plan.capturedTip?.toString(),
				},
			},
		};
	}

	// One scan pass. Returns whether the scan reached its end.
	async *#scanOnce(
		end: Bound<P> | undefined,
		stage: 'history' | 'gap',
	): AsyncGenerator<CoreFrame<Frame>, boolean> {
		const { order, capturedTip } = this.#plan;
		const events = this.#adapter.scan({
			start: this.start,
			end,
			order,
			capturedTip,
			signal: this.signal,
		});
		let complete: boolean | undefined;
		for await (const event of events as AsyncIterable<ScanEvent<P, Item>>) {
			if (complete !== undefined) throw new SuiStreamError('Protocol', 'Scan continued after End');
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
				case 'End':
					complete = event.complete;
					break;
			}
		}
		if (complete === undefined) throw new SuiStreamError('Protocol', 'Scan ended without End');
		return complete;
	}

	/** Whether everything at `event`'s position was already delivered. */
	#isStale(event: PositionEvent<P, Item>): boolean {
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

	async *#commit(event: PositionEvent<P, Item>): AsyncGenerator<CoreFrame<Frame>, void> {
		// Cancellation is immediate: an event the adapter already buffered is neither committed nor
		// delivered once the caller aborts.
		this.signal.throwIfAborted();
		this.#committed = event.position;
		this.#committedBytes = this.#bytes(event.position);
		if (event.$kind === 'Item') this.#lastItem = event.position;
		if (this.#plan.order === 'ascending') this.#cover(this.#adapter.coverage(event.position));

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

	#isCovered(position: P): boolean {
		const next = nextUncovered(this.#covered);
		if (this.#plan.order !== 'ascending' || next === undefined) return false;
		const checkpoint = this.#adapter.locate(position).checkpoint;
		return checkpoint !== null && checkpoint < next;
	}

	#regressesCoverage(position: P): boolean {
		return (
			this.#plan.order === 'ascending' &&
			compareCoverage(this.#adapter.coverage(position), this.#covered) < 0
		);
	}

	/**
	 * Whether `a` comes before `b` (or equals it, when `inclusive`) in traversal order. An unknown
	 * order counts as not behind: the event is delivered, at least once and never lost.
	 */
	#isBehind(a: P, b: P | undefined, inclusive: boolean): boolean {
		const comparison = b === undefined ? undefined : this.#adapter.compare(a, b);
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
		return maxCoverage(this.#adapter.coverage(start.position), this.#plan.startCoverage);
	}

	#committedToken(): string {
		return this.#token(this.#committed!, this.#committedBytes);
	}

	#publicBound(bound: Bound<P>): SuiClientTypes.StreamBound {
		if ('checkpoint' in bound) return { checkpoint: bound.checkpoint.toString() };
		return { resumeToken: this.#token(bound.position) };
	}

	/** A token is a function of its position and the range only. */
	#token(position: P, bytes = this.#bytes(position)): string {
		return encodeToken({
			...this.#tokenBase,
			position: bytes,
			coverage: this.#tokenCoverage(position),
		});
	}

	/** The transport-neutral coverage recorded in tokens and Progress frames. */
	#tokenCoverage(position: P): Coverage {
		return this.#plan.order === 'ascending'
			? this.#adapter.coverage(position)
			: { $kind: 'Unknown' };
	}

	#bytes(position: P): Uint8Array {
		return this.#adapter.position.schema.serialize(position).toBytes();
	}
}

/** Buffers the first event so `first()` can inspect it before `deliver()` consumes it. */
class FeedReader<P, Item> implements LiveFeed<P, Item> {
	readonly #iterator: AsyncIterator<LiveEvent<P, Item>>;
	readonly #onConnected: () => void;
	#pending: PositionEvent<P, Item> | undefined;

	constructor(events: AsyncIterable<LiveEvent<P, Item>>, onConnected: () => void) {
		this.#iterator = events[Symbol.asyncIterator]();
		this.#onConnected = onConnected;
	}

	async first(): Promise<PositionEvent<P, Item>> {
		this.#pending ??= await this.#read();
		if (!this.#pending) throw new StreamDisconnected('Live feed ended before its first event');
		return this.#pending;
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<PositionEvent<P, Item>> {
		const pending = this.#pending;
		this.#pending = undefined;
		if (pending) yield pending;
		for (let event = await this.#read(); event; event = await this.#read()) yield event;
	}

	async close() {
		await this.#iterator.return?.();
	}

	async #read(): Promise<PositionEvent<P, Item> | undefined> {
		while (true) {
			const result = await this.#iterator.next();
			if (result.done) return undefined;
			if (result.value.$kind !== 'Connected') return result.value;
			this.#onConnected();
		}
	}
}

/** Coverage of everything before `checkpoint`. */
export function coverageBefore(checkpoint: bigint): Coverage {
	return checkpoint === 0n ? { $kind: 'None' } : { $kind: 'Through', checkpoint: checkpoint - 1n };
}

/** The first checkpoint not covered, or undefined when coverage is unknown. */
function nextUncovered(coverage: Coverage): bigint | undefined {
	if (coverage.$kind === 'Unknown') return undefined;
	return coverage.$kind === 'None' ? 0n : coverage.checkpoint + 1n;
}

/** Orders known coverages; `Unknown` makes no claim and compares equal to everything. */
export function compareCoverage(a: Coverage, b: Coverage): number {
	const x = nextUncovered(a);
	const y = nextUncovered(b);
	if (x === undefined || y === undefined || x === y) return 0;
	return x < y ? -1 : 1;
}

/** The larger claim; any known coverage replaces `Unknown`. */
export function maxCoverage(a: Coverage, b: Coverage): Coverage {
	if (a.$kind === 'Unknown') return b;
	return compareCoverage(b, a) > 0 ? b : a;
}
