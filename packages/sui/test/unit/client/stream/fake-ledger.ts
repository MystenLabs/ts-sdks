// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A model ledger and adapter for testing the stream core.
 *
 * An item carries its checkpoint, a cursor and its index (or only an `itemId`, like a transport
 * that cannot order items within a checkpoint). Cursors are `checkpoint:slot`, where slot 0 is the
 * boundary before the checkpoint and slot `i + 1` is item `i`. Pages read the indexed part of the
 * ledger as one replica sees it; live connections replay a script.
 */

import type {
	Bound,
	LedgerStreamAdapter,
	LiveEvent,
	Page,
	PageEnd,
	PageRequest,
} from '../../../../src/client/stream/adapter.js';
import { createLedgerStream } from '../../../../src/client/stream/run.js';
import {
	boundaryPosition,
	itemPosition,
	SuiStreamError,
	type StreamPosition,
} from '../../../../src/client/stream/index.js';
import type { SuiClientTypes } from '../../../../src/client/types.js';

export interface FakeItem {
	checkpoint: bigint;
	index: number;
}
export interface FakeFrame {
	$kind: 'Item';
	/** `checkpoint:index`, for readable assertions. */
	id: string;
	resumeToken: string;
}
export type FakeOutput =
	FakeFrame | SuiClientTypes.StreamProgressFrame | SuiClientTypes.StreamCompletionFrame;

/** A retryable transport failure. */
export class NetworkError extends Error {
	override name = 'NetworkError';
}

/** A retryable server-side failure. */
export class ServerError extends Error {
	override name = 'ServerError';
}

export const itemId = (item: FakeItem) => `${item.checkpoint}:${item.index}`;

const encode = (checkpoint: bigint, slot: number) =>
	new TextEncoder().encode(`${checkpoint}:${slot}`);
function decode(cursor: Uint8Array): [bigint, number] {
	const [checkpoint, slot] = new TextDecoder().decode(cursor).split(':');
	return [BigInt(checkpoint), Number(slot)];
}
const slotOf = (item: FakeItem): [bigint, number] => [item.checkpoint, item.index + 1];
function compareSlots([a, i]: [bigint, number], [b, j]: [bigint, number]) {
	if (a !== b) return a < b ? -1 : 1;
	return i === j ? 0 : i < j ? -1 : 1;
}

export const positionOf = (item: FakeItem, opaque = false): StreamPosition =>
	itemPosition(item.checkpoint, {
		cursor: encode(...slotOf(item)),
		...(opaque ? { itemId: itemId(item) } : { transactionIndex: BigInt(item.index) }),
	});

/** Items per checkpoint, from checkpoint 0. Tests move `indexedTip`. */
export class Ledger {
	readonly items: FakeItem[] = [];
	indexedTip: bigint;
	/** Positions report no place within the checkpoint. */
	opaque = false;

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

	item(checkpoint: number, index = 0): LiveEvent<FakeItem> {
		const item = { checkpoint: BigInt(checkpoint), index };
		return { $kind: 'Item', position: positionOf(item, this.opaque), item };
	}

	/** A gRPC watermark: the boundary before `checkpoint`, as an entry frame or heartbeat. */
	watermark(checkpoint: bigint | number): LiveEvent<FakeItem> {
		const at = BigInt(checkpoint);
		return {
			$kind: 'Progress',
			position: boundaryPosition(at, {
				nextUncovered: at,
			}),
		};
	}

	/** A GraphQL progress edge: a cursor just before `checkpoint`, with no checkpoint reported. */
	progress(checkpoint: bigint | number): LiveEvent<FakeItem> {
		return {
			$kind: 'Progress',
			position: {
				...boundaryPosition(0n),
				kind: 'Progress',
				checkpoint: null,
				cursor: encode(BigInt(checkpoint), 0),
			},
		};
	}

	/** Live item events from `checkpoint` on. */
	liveFrom(checkpoint: bigint | number): LiveEvent<FakeItem>[] {
		return this.items
			.filter((item) => item.checkpoint >= BigInt(checkpoint))
			.map((item) => ({ $kind: 'Item', position: positionOf(item, this.opaque), item }));
	}

	/** Items after a subscription's resume point, as a server that resumes would backfill them. */
	after(from: Bound | undefined): FakeItem[] {
		if (!from) return this.items;
		if ('checkpoint' in from)
			return this.items.filter((item) => item.checkpoint >= from.checkpoint);
		const { cursor, checkpoint, kind } = from.position;
		if (cursor) return this.items.filter((item) => compareSlots(slotOf(item), decode(cursor)) > 0);
		return this.items.filter((item) =>
			kind === 'Item' ? item.checkpoint > checkpoint! : item.checkpoint >= checkpoint!,
		);
	}
}

/** One live connection: its events, then any `later` ones, then how it ends. */
export interface LiveScript {
	events: LiveEvent<FakeItem>[];
	later?: AsyncIterable<LiveEvent<FakeItem>>;
	/** `hang` stays open until aborted. */
	end?: 'eof' | 'hang' | Error;
}

/** Per page request: fail it, after `afterItems` of its items if set. */
export interface PageFault {
	error: Error;
	afterItems?: number;
}

export interface FakeOptions {
	pageSize?: number;
	chain?: string;
	filter?: unknown;
	family?: 'checkpoints' | 'transactions' | 'events';
	transport?: 'grpc' | 'graphql';
	/** `fromTip`: subscriptions start at the live tip (gRPC). `resume`: they backfill (GraphQL). */
	live?: 'fromTip' | 'resume';
	/** The oldest retained checkpoint; older history is pruned. */
	retainedFrom?: bigint;
	/**
	 * gRPC pages: watermark positions on every page, and errors for pruned reads and for reads past
	 * the index. Otherwise GraphQL pages: cursors only, and the replica's tip as what they cover.
	 */
	watermarks?: boolean;
	/** At most this many checkpoints are scanned per ascending page, so pages can come back empty. */
	scanWindow?: number;
	/** How far behind the index the replica that answers each page is. */
	replicaLag?: () => number;
	/** Items report no place within their checkpoint. */
	opaqueOrder?: boolean;
	/** `initialize` also returns the indexed tip, as GraphQL does. */
	initializeReadsTip?: boolean;
	initializeFaults?: Error[];
	tipFaults?: Error[];
	pageFaults?: (PageFault | undefined)[];
	/** Called after each page or tip read (e.g. to advance the index). */
	afterRead?: (ledger: Ledger) => void;
	/** `from` is where a `resume` subscription starts. */
	subscriptions?: LiveScript[] | ((connection: number, from: Bound | undefined) => LiveScript);
	/** Whether a subscription can backfill from `from` (always, by default). */
	canResume?: (from: Bound) => boolean;
}

export interface FakeAdapter extends LedgerStreamAdapter<FakeItem, FakeFrame> {
	calls: {
		initialize: number;
		indexedTip: number;
		pages: PageRequest[];
		subscriptions: number;
	};
}

export function fakeAdapter(ledger: Ledger, options: FakeOptions = {}): FakeAdapter {
	const pageSize = options.pageSize ?? 2;
	const initializeFaults = [...(options.initializeFaults ?? [])];
	const tipFaults = [...(options.tipFaults ?? [])];
	const pageFaults = [...(options.pageFaults ?? [])];
	const calls: FakeAdapter['calls'] = { initialize: 0, indexedTip: 0, pages: [], subscriptions: 0 };
	const floor = options.retainedFrom ?? 0n;
	ledger.opaque = options.opaqueOrder ?? false;

	function liveScript(connection: number, from: Bound | undefined): LiveScript {
		const { subscriptions } = options;
		if (typeof subscriptions === 'function') return subscriptions(connection, from);
		return subscriptions?.[connection] ?? { events: [], end: 'hang' };
	}

	async function* subscribe(
		signal: AbortSignal,
		from: Bound | undefined,
	): AsyncGenerator<LiveEvent<FakeItem>> {
		const script = liveScript(calls.subscriptions++, from);
		for (const event of script.events) {
			signal.throwIfAborted();
			yield event;
		}
		for await (const event of script.later ?? []) {
			signal.throwIfAborted();
			yield event;
		}
		if (script.end instanceof Error) throw script.end;
		if (script.end === 'eof') return;
		signal.throwIfAborted();
		await new Promise((_, reject) => {
			signal.addEventListener('abort', () => reject(signal.reason), { once: true });
		});
	}

	async function* fetchPage(request: PageRequest): Page<FakeItem> {
		calls.pages.push(request);
		const fault = pageFaults.shift();
		if (fault && fault.afterItems === undefined) throw fault.error;
		const { range, order } = request;
		const ascending = order === 'ascending';
		const seen = maxBig(0n, ledger.indexedTip - BigInt(options.replicaLag?.() ?? 0));
		const end = (pageEnd: PageEnd): PageEnd => {
			options.afterRead?.(ledger);
			return pageEnd;
		};

		if (options.watermarks && range.start !== undefined && range.start < floor) {
			throw new SuiStreamError('HistoryUnavailable', `Checkpoint ${range.start} is pruned`);
		}
		if (!ascending && range.end !== undefined && range.end - 1n > seen) {
			return end({ next: { more: false }, notIndexed: true });
		}

		const after = request.after && decode(request.after);
		const before = request.before && decode(request.before);
		const candidates = ledger.items.filter(
			(item) =>
				item.checkpoint >= floor &&
				item.checkpoint <= seen &&
				(range.start === undefined || item.checkpoint >= range.start) &&
				(range.end === undefined || item.checkpoint < range.end) &&
				(!after || compareSlots(slotOf(item), after) > 0) &&
				(!before || compareSlots(slotOf(item), before) < 0),
		);
		if (!ascending) candidates.reverse();

		// Ascending scans cover a window of checkpoints from where they start.
		const scanFrom = maxBig(range.start ?? 0n, after ? after[0] : 0n);
		const windowEnd =
			ascending && options.scanWindow ? scanFrom + BigInt(options.scanWindow) - 1n : undefined;
		const inWindow = candidates.filter(
			(item) => windowEnd === undefined || item.checkpoint <= windowEnd,
		);
		const items = inWindow.slice(0, pageSize);
		const last = items.at(-1);
		const high = range.end === undefined ? seen : minBig(seen, range.end - 1n);

		let next: PageEnd['next'];
		if (last && candidates.length > items.length && items.length === pageSize) {
			next = { more: true, cursor: encode(...slotOf(last)) };
		} else if (windowEnd !== undefined && windowEnd < high) {
			const at = windowEnd + 1n;
			next = {
				more: true,
				cursor: encode(at, 0),
				...(options.watermarks && { position: boundaryPosition(at) }),
			};
		} else {
			next = { more: false };
		}

		const read = items.map((item) => ({ position: positionOf(item, ledger.opaque), item }));
		if (fault) {
			yield* read.slice(0, fault.afterItems);
			throw fault.error;
		}
		yield* read;

		if (next.more) return end({ next });
		if (ascending) {
			if (options.watermarks && range.end !== undefined && scanFrom > seen) {
				return end({ next, notIndexed: true });
			}
			return end({ next, covered: high });
		}
		return end({ next, retainedFrom: range.start === undefined ? floor : undefined });
	}

	return {
		transport: options.transport ?? 'graphql',
		family: options.family ?? 'events',
		live: options.live ?? 'resume',
		canResume: options.canResume ?? (() => true),
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
			const tip = ledger.indexedTip;
			options.afterRead?.(ledger);
			return tip;
		},
		fetchPage,
		subscribe: (from, signal) => subscribe(signal, from),
		mapItem: (item) => ({ $kind: 'Item', id: itemId(item) }),
		retryReason: (error) =>
			error instanceof NetworkError
				? 'Unavailable'
				: error instanceof ServerError
					? 'ServerError'
					: undefined,
	};
}

function maxBig(a: bigint, b: bigint) {
	return a > b ? a : b;
}
function minBig(a: bigint, b: bigint) {
	return a < b ? a : b;
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
	if (!frame?.resumeToken) throw new Error(`No token on ${frame?.$kind}`);
	return frame.resumeToken;
}

/** Statuses as compact strings, e.g. `Connecting(0)` or `Retrying(1)`. */
export function statusLog() {
	const log: string[] = [];
	const onStatus = (status: SuiClientTypes.StreamStatus) => {
		switch (status.$kind) {
			case 'Connecting':
			case 'Retrying':
				return log.push(`${status.$kind}(${status.attempt})`);
			default:
				return log.push(status.$kind);
		}
	};
	return { log, onStatus };
}

export const noDelay = { initialDelay: 0, maxDelay: 0 };

export function stream(
	adapter: FakeAdapter,
	options: SuiClientTypes.StreamOptions<SuiClientTypes.StreamFrameOptions> = {},
): AsyncGenerator<FakeOutput> {
	return createLedgerStream({ pollInterval: 1, retry: noDelay, ...options }, () => adapter);
}
