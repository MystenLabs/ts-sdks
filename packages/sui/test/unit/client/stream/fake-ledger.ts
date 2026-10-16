// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A model ledger and adapter for testing the stream core.
 *
 * Positions are points in one total order: `{ checkpoint: c, slot: 0 }` is the boundary before
 * checkpoint `c`, and `{ checkpoint: c, slot: i + 1 }` is the `i`th matching item of `c`. Scans
 * page through the indexed part of the ledger; live connections replay a script. `follow()` has
 * the same phases as the real transports.
 */

import { bcs } from '@mysten/bcs';

import type {
	Bound,
	Coverage,
	ErrorClass,
	LedgerStreamAdapter,
	LiveEvent,
	ScanEvent,
	ScanRequest,
} from '../../../../src/client/stream/adapter.js';
import { createLedgerStream } from '../../../../src/client/stream/run.js';
import { coverageBefore, startBeyondTip } from '../../../../src/client/stream/index.js';
import type { SuiClientTypes } from '../../../../src/client/types.js';

export interface FakeItem {
	checkpoint: bigint;
	index: number;
}
export interface FakePosition {
	checkpoint: bigint;
	slot: number;
}
export interface FakeFrame {
	$kind: 'Item';
	/** `checkpoint:index`, for readable assertions. */
	id: string;
	resumeToken: string;
}
export type FakeOutput =
	FakeFrame | SuiClientTypes.StreamProgressFrame | SuiClientTypes.StreamCompletionFrame;

/** Retryable transport failure. */
export class NetworkError extends Error {
	override name = 'NetworkError';
}
/** A live buffer overflow: a disconnect, free only after progress. */
export class Overflow extends Error {
	override name = 'Overflow';
}

const PositionSchema = bcs
	.struct('FakePosition', { checkpoint: bcs.u64(), slot: bcs.u32() })
	.transform({
		input: (position: FakePosition) => position,
		output: (value): FakePosition => ({ checkpoint: BigInt(value.checkpoint), slot: value.slot }),
	});

export const boundary = (checkpoint: bigint | number): FakePosition => ({
	checkpoint: BigInt(checkpoint),
	slot: 0,
});
export const itemPosition = (item: FakeItem): FakePosition => ({
	checkpoint: item.checkpoint,
	slot: item.index + 1,
});
export const itemId = (item: FakeItem) => `${item.checkpoint}:${item.index}`;

export function comparePositions(a: FakePosition, b: FakePosition): -1 | 0 | 1 {
	if (a.checkpoint !== b.checkpoint) return a.checkpoint < b.checkpoint ? -1 : 1;
	return a.slot === b.slot ? 0 : a.slot < b.slot ? -1 : 1;
}

/** Items per checkpoint, from checkpoint 0. Mutable: tests move `indexedTip`. */
export class Ledger {
	readonly items: FakeItem[] = [];
	indexedTip: bigint;

	constructor(itemsPerCheckpoint: number[], indexedTip = itemsPerCheckpoint.length - 1) {
		itemsPerCheckpoint.forEach((count, checkpoint) => {
			for (let index = 0; index < count; index++) {
				this.items.push({ checkpoint: BigInt(checkpoint), index });
			}
		});
		this.indexedTip = BigInt(indexedTip);
	}

	get lastCheckpoint() {
		return this.items.at(-1)!.checkpoint;
	}

	/** Items strictly between two positions, in ledger order. */
	between(after: FakePosition, before: FakePosition): FakeItem[] {
		return this.items.filter(
			(item) =>
				comparePositions(itemPosition(item), after) > 0 &&
				comparePositions(itemPosition(item), before) < 0,
		);
	}

	item(checkpoint: number, index = 0): LiveEvent<FakePosition, FakeItem> {
		const item = { checkpoint: BigInt(checkpoint), index };
		return { $kind: 'Item', position: itemPosition(item), item };
	}

	/** Progress after all of `checkpoint`. */
	progress(checkpoint: number): LiveEvent<FakePosition, FakeItem> {
		return { $kind: 'Progress', position: boundary(checkpoint + 1) };
	}

	/** Live events for every item from `checkpoint` on. */
	liveFrom(checkpoint: bigint | number): LiveEvent<FakePosition, FakeItem>[] {
		return this.items
			.filter((item) => item.checkpoint >= BigInt(checkpoint))
			.map((item) => ({ $kind: 'Item', position: itemPosition(item), item }));
	}
}

/** One live connection: its events, then how it ends. `hang` stays open until aborted. */
export interface LiveScript {
	events: LiveEvent<FakePosition, FakeItem>[];
	end?: 'eof' | 'hang' | Error;
}

/** Per scan pass. */
export type ScanFault =
	{ failAfterItems: number; error: Error } | { omitEnd: true } | { repeatStartCursor: true };

export interface FakeOptions {
	pageSize?: number;
	chain?: string;
	filter?: unknown;
	family?: 'checkpoints' | 'transactions' | 'events';
	transport?: 'grpc' | 'graphql';
	anchorsAtLiveTip?: boolean;
	/**
	 * `cursor`: history, then a subscription at the live tip and a gap replay up to its first
	 * position (gRPC). `resume`: a subscription that resumes after the start position (GraphQL).
	 */
	handoff?: 'cursor' | 'resume';
	/** Report scan frontiers as Progress events (gRPC watermarks). */
	scanProgress?: boolean;
	/** The transport cannot order positions. */
	opaqueOrder?: boolean;
	validate?: (position: FakePosition) => void;
	/** `initialize` also returns the indexed tip, as GraphQL does. */
	initializeReadsTip?: boolean;
	initializeFaults?: Error[];
	tipFaults?: Error[];
	scanFaults?: (ScanFault | undefined)[];
	/** Called after each scan pass (e.g. to advance the index). */
	afterScan?: (ledger: Ledger) => void;
	/** `after` is where a `resume` subscription starts. */
	live?: LiveScript[] | ((connection: number, after: FakePosition | undefined) => LiveScript);
}

export interface FakeAdapter extends LedgerStreamAdapter<FakePosition, FakeItem, FakeFrame> {
	calls: {
		initialize: number;
		indexedTip: number;
		scans: ScanRequest<FakePosition>[];
		subscriptions: number;
	};
}

export function fakeAdapter(ledger: Ledger, options: FakeOptions = {}): FakeAdapter {
	const pageSize = options.pageSize ?? 2;
	const initializeFaults = [...(options.initializeFaults ?? [])];
	const tipFaults = [...(options.tipFaults ?? [])];
	const scanFaults = [...(options.scanFaults ?? [])];
	const calls: FakeAdapter['calls'] = { initialize: 0, indexedTip: 0, scans: [], subscriptions: 0 };

	function liveScript(connection: number, after: FakePosition | undefined): LiveScript {
		if (typeof options.live === 'function') return options.live(connection, after);
		return options.live?.[connection] ?? { events: [], end: 'hang' };
	}

	async function* subscribe(
		signal: AbortSignal,
		after?: FakePosition,
	): AsyncGenerator<LiveEvent<FakePosition, FakeItem>> {
		const script = liveScript(calls.subscriptions++, after);
		yield { $kind: 'Connected' };
		for (const event of script.events) {
			signal.throwIfAborted();
			yield event;
		}
		if (script.end instanceof Error) throw script.end;
		if (script.end === 'eof') return;
		await new Promise((_, reject) => {
			signal.addEventListener('abort', () => reject(signal.reason), { once: true });
		});
	}

	async function* scan(
		request: ScanRequest<FakePosition>,
	): AsyncGenerator<ScanEvent<FakePosition, FakeItem>> {
		calls.scans.push(request);
		const fault = scanFaults.shift();
		try {
			yield { $kind: 'Connected' };
			yield* request.order === 'ascending'
				? scanAscending(request, fault)
				: scanDescending(request, fault);
		} finally {
			options.afterScan?.(ledger);
		}
	}

	async function* scanAscending(
		request: ScanRequest<FakePosition>,
		fault: ScanFault | undefined,
	): AsyncGenerator<ScanEvent<FakePosition, FakeItem>> {
		const after = toPosition(request.start, 'ascending') ?? boundary(0);
		const limit = boundary(ledger.indexedTip + 1n);
		const end = toPosition(request.end, 'ascending');
		const reachable = !end || comparePositions(end, limit) <= 0;
		const stop = end && reachable ? end : limit;
		const items = ledger.between(after, stop);
		if (fault && 'repeatStartCursor' in fault && request.start && 'position' in request.start) {
			const repeated = ledger.items.find(
				(item) => comparePositions(itemPosition(item), after) === 0,
			);
			if (repeated) items.unshift(repeated);
		}
		yield* pages(items, fault);
		if (fault && 'omitEnd' in fault) return;
		// Frontier progress: everything up to a boundary end was delivered.
		if (options.scanProgress && stop.slot === 0 && comparePositions(stop, after) > 0) {
			yield { $kind: 'Progress', position: stop };
		}
		yield {
			$kind: 'Page',
			end: !reachable || !end ? 'indexedTip' : 'bound',
			coverage: coverageAt(stop),
		};
		yield { $kind: 'End', complete: reachable };
	}

	async function* scanDescending(
		request: ScanRequest<FakePosition>,
		fault: ScanFault | undefined,
	): AsyncGenerator<ScanEvent<FakePosition, FakeItem>> {
		if (startBeyondTip(request.start, ledger.indexedTip, (p) => ({ checkpoint: p.checkpoint }))) {
			yield { $kind: 'Page', end: 'indexedTip', coverage: { $kind: 'Unknown' } };
			yield { $kind: 'End', complete: false };
			return;
		}
		const before = toPosition(request.start, 'descending') ?? boundary(ledger.indexedTip + 1n);
		const after = toPosition(request.end, 'descending');
		const items = ledger.between(after ?? boundary(-1), before).reverse();
		yield* pages(items, fault);
		if (fault && 'omitEnd' in fault) return;
		yield { $kind: 'Page', end: after ? 'bound' : 'indexedTip', coverage: { $kind: 'Unknown' } };
		yield { $kind: 'End', complete: true };
	}

	async function* pages(
		items: FakeItem[],
		fault: ScanFault | undefined,
	): AsyncGenerator<ScanEvent<FakePosition, FakeItem>> {
		for (const [n, item] of items.entries()) {
			if (fault && 'failAfterItems' in fault && n === fault.failAfterItems) throw fault.error;
			yield { $kind: 'Item', position: itemPosition(item), item };
			if ((n + 1) % pageSize === 0 && n + 1 < items.length) {
				yield { $kind: 'Page', end: 'limit', coverage: { $kind: 'Unknown' } };
			}
		}
		if (fault && 'failAfterItems' in fault && fault.failAfterItems >= items.length)
			throw fault.error;
	}

	return {
		transport: options.transport ?? 'graphql',
		family: options.family ?? 'events',
		position: {
			schema: PositionSchema,
			validate: (position) => options.validate?.(position),
		},
		anchorsAtLiveTip: options.anchorsAtLiveTip ?? false,
		calls,

		async initialize() {
			calls.initialize++;
			const fault = initializeFaults.shift();
			if (fault) throw fault;
			return {
				chain: options.chain ?? 'test-chain',
				filter: options.filter ?? { sender: '0x1' },
				indexedTip: options.initializeReadsTip ? ledger.indexedTip : undefined,
			};
		},
		async indexedTip() {
			calls.indexedTip++;
			const fault = tipFaults.shift();
			if (fault) throw fault;
			return ledger.indexedTip;
		},
		scan,
		async *follow(session) {
			if (options.handoff === 'resume') {
				const after = toPosition(session.start, 'ascending');
				// A checkpoint start: commit it, so a token exists before the first match.
				if (!session.committed && after) yield* session.baseline(after);
				const feed = session.openFeed(subscribe(session.signal, after));
				try {
					yield* session.deliver(feed);
				} finally {
					await feed.close();
				}
			}
			if (session.catchesUpFirst()) yield* session.replay('tip', 'history');
			const feed = session.openFeed(subscribe(session.signal));
			try {
				const first = await feed.first();
				// The gap between the resume point and the first live event.
				if (!session.start) {
					if (first.$kind === 'Item') {
						yield* session.baseline(boundary(first.position.checkpoint));
					}
				} else {
					yield* session.replay({ position: first.position }, 'gap');
				}
				yield* session.deliver(feed);
			} finally {
				await feed.close();
			}
		},
		compare: (a, b) => (options.opaqueOrder ? undefined : comparePositions(a, b)),
		// An item covers the checkpoints before it; a checkpoint (one item each) covers itself.
		coverage: (position) =>
			options.family === 'checkpoints' && position.slot > 0
				? { $kind: 'Through', checkpoint: position.checkpoint }
				: coverageBefore(position.checkpoint),
		locate: (position) => ({ checkpoint: position.checkpoint, boundary: position.slot === 0 }),
		mapItem: (item) => ({ $kind: 'Item', id: itemId(item) }),
		classify(error): ErrorClass {
			if (error instanceof NetworkError) return 'retry';
			if (error instanceof Overflow) return 'disconnect';
			return 'fatal';
		},
	};
}

/** Bounds as positions: ascending start/end are boundaries before `c`; descending after `c`. */
function toPosition(
	bound: Bound<FakePosition> | undefined,
	order: SuiClientTypes.Order,
): FakePosition | undefined {
	if (!bound) return undefined;
	if ('position' in bound) return bound.position;
	return boundary(order === 'ascending' ? bound.checkpoint : bound.checkpoint + 1n);
}

function coverageAt(position: FakePosition): Coverage {
	return coverageBefore(position.checkpoint);
}

/** Collects the stream until it ends. */
export async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
	const frames: T[] = [];
	for await (const frame of stream) frames.push(frame);
	return frames;
}

/** Reads `count` frames, then closes the stream. */
export async function take<T>(stream: AsyncGenerator<T>, count: number): Promise<T[]> {
	const frames: T[] = [];
	while (frames.length < count) {
		const next = await stream.next();
		if (next.done) break;
		frames.push(next.value);
	}
	await stream.return(undefined);
	return frames;
}

export function ids(frames: FakeOutput[]): string[] {
	return frames.flatMap((frame) => (frame.$kind === 'Item' ? [frame.id] : []));
}

export function tokenOf(frame: FakeOutput | undefined): string {
	if (!frame || frame.$kind === 'Complete') throw new Error(`No token on ${frame?.$kind}`);
	return frame.resumeToken;
}

/** Statuses as compact strings, e.g. `Connecting(0)` or `Page(history,limit)`. */
export function statusLog() {
	const log: string[] = [];
	const onStatus = (status: SuiClientTypes.StreamStatus) => {
		switch (status.$kind) {
			case 'Connecting':
				return log.push(`Connecting(${status.attempt})`);
			case 'Page':
				return log.push(`Page(${status.stage},${status.end})`);
			case 'Retrying':
				return log.push(`Retrying(${status.attempt},${status.delay})`);
			default:
				return log.push(status.$kind);
		}
	};
	return { log, onStatus };
}

export const noDelay = { initialDelay: 0, maxDelay: 0, jitter: 0 };

export function stream(
	adapter: FakeAdapter,
	options: SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions> = {},
): AsyncGenerator<FakeOutput> {
	return createLedgerStream({ pollInterval: 1, retry: noDelay, ...options }, () => adapter);
}
