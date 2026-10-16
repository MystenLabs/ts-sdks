// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * A model ledger and adapter for testing the stream core.
 *
 * Positions are core `StreamPosition`s: an item carries its checkpoint, a cursor and its index (or
 * only an `itemId`, to model a transport that cannot order items within a checkpoint), and a
 * boundary sits before a checkpoint. Pages read the indexed part of the ledger; live connections
 * replay a script.
 */

import type {
	Bound,
	ErrorClass,
	LedgerStreamAdapter,
	LiveEvent,
	Page,
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
export type FakePosition = StreamPosition;
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

export const boundary = (checkpoint: bigint | number): FakePosition =>
	boundaryPosition(BigInt(checkpoint));
export const itemId = (item: FakeItem) => `${item.checkpoint}:${item.index}`;
/** The fake's cursor: the item id as bytes. */
export const cursorOf = (item: FakeItem) => new TextEncoder().encode(itemId(item));
/** `opaque`: the item has no reported place within its checkpoint, only an id. */
export const positionOf = (item: FakeItem, opaque = false): FakePosition =>
	itemPosition(item.checkpoint, {
		cursor: cursorOf(item),
		...(opaque ? { itemId: itemId(item) } : { transactionIndex: BigInt(item.index) }),
	});

function itemAt(cursor: Uint8Array): FakeItem {
	const [checkpoint, index] = new TextDecoder().decode(cursor).split(':');
	return { checkpoint: BigInt(checkpoint), index: Number(index) };
}

/** The fake's own total order: boundaries before every item of their checkpoint. */
function slot(position: FakePosition): [bigint, number] {
	if (position.kind !== 'Item') return [position.checkpoint!, 0];
	const index =
		position.transactionIndex ?? BigInt(position.itemId!.slice(position.itemId!.indexOf(':') + 1));
	return [position.checkpoint!, Number(index) + 1];
}

export function ledgerOrder(a: FakePosition, b: FakePosition): -1 | 0 | 1 {
	const [x, i] = slot(a);
	const [y, j] = slot(b);
	if (x !== y) return x < y ? -1 : 1;
	return i === j ? 0 : i < j ? -1 : 1;
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

	/** `opaque`: positions report no place within the checkpoint. */
	opaque = false;

	item(checkpoint: number, index = 0): LiveEvent<FakeItem> {
		const item = { checkpoint: BigInt(checkpoint), index };
		return { $kind: 'Item', position: positionOf(item, this.opaque), item };
	}

	/** Progress after all of `checkpoint`. */
	progress(checkpoint: number): LiveEvent<FakeItem> {
		return { $kind: 'Progress', position: boundary(checkpoint + 1) };
	}

	/** Live events for every item from `checkpoint` on. */
	liveFrom(checkpoint: bigint | number): LiveEvent<FakeItem>[] {
		return this.items
			.filter((item) => item.checkpoint >= BigInt(checkpoint))
			.map((item) => ({ $kind: 'Item', position: positionOf(item, this.opaque), item }));
	}
}

/** One live connection: its events, then how it ends. `hang` stays open until aborted. */
export interface LiveScript {
	events: LiveEvent<FakeItem>[];
	end?: 'eof' | 'hang' | Error;
}

/** Per page request: fail it, or repeat the item at the cursor it resumes after. */
export type PageFault = { error: Error } | { repeatCursor: true };

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
	/** The oldest retained checkpoint; older history is pruned. */
	retainedFrom?: bigint;
	/**
	 * Pages report what they covered instead of the indexed tip, and pruned reads fail (gRPC).
	 * Otherwise pages report the tip and the retention (GraphQL).
	 */
	watermarks?: boolean;
	/** Items report no place within their checkpoint, so they are unordered within it. */
	opaqueOrder?: boolean;
	/** `initialize` also returns the indexed tip, as GraphQL does. */
	initializeReadsTip?: boolean;
	initializeFaults?: Error[];
	tipFaults?: Error[];
	pageFaults?: (PageFault | undefined)[];
	/** Called after each page or tip read (e.g. to advance the index). */
	afterRead?: (ledger: Ledger) => void;
	/** `after` is where a `resume` subscription starts. */
	live?: LiveScript[] | ((connection: number, after: FakePosition | undefined) => LiveScript);
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

	function liveScript(connection: number, after: FakePosition | undefined): LiveScript {
		if (typeof options.live === 'function') return options.live(connection, after);
		return options.live?.[connection] ?? { events: [], end: 'hang' };
	}

	async function* subscribe(
		signal: AbortSignal,
		after?: FakePosition,
	): AsyncGenerator<LiveEvent<FakeItem>> {
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

	async function fetchPage(request: PageRequest): Promise<Page<FakeItem>> {
		calls.pages.push(request);
		const fault = pageFaults.shift();
		if (fault && 'error' in fault) throw fault.error;
		const { range, order } = request;
		const tip = ledger.indexedTip;
		if (options.watermarks && range.start !== undefined && range.start < floor) {
			throw new SuiStreamError('HistoryUnavailable', `Checkpoint ${range.start} is pruned`);
		}
		const after = request.after && positionOf(itemAt(request.after));
		const before = request.before && positionOf(itemAt(request.before));
		const matches = ledger.items.filter((item) => {
			const position = positionOf(item);
			return (
				item.checkpoint >= floor &&
				item.checkpoint <= tip &&
				(range.start === undefined || item.checkpoint >= range.start) &&
				(range.end === undefined || item.checkpoint < range.end) &&
				(!after || ledgerOrder(position, after) > 0) &&
				(!before || ledgerOrder(position, before) < 0)
			);
		});
		if (order === 'descending') matches.reverse();
		const items = matches.slice(0, pageSize);
		const more = matches.length > items.length;
		const resumed = order === 'ascending' ? request.after : request.before;
		if (fault && 'repeatCursor' in fault && resumed) items.unshift(itemAt(resumed));
		options.afterRead?.(ledger);
		const last = items.at(-1);
		const page: Page<FakeItem> = {
			items: items.map((item) => ({ position: positionOf(item, ledger.opaque), item })),
			next: { more, cursor: last && cursorOf(last) },
		};
		if (!options.watermarks) return { ...page, viewedAt: tip, retainedFrom: floor };
		if (order === 'ascending' && !more) {
			const end = range.end === undefined ? tip : range.end - 1n;
			return { ...page, covered: end < tip ? end : tip };
		}
		if (order === 'descending' && !more && range.start === undefined) {
			return { ...page, retainedFrom: floor };
		}
		return page;
	}

	return {
		transport: options.transport ?? 'graphql',
		family: options.family ?? 'events',
		anchorsAtLiveTip: options.anchorsAtLiveTip ?? false,
		resumesSubscriptions: options.handoff === 'resume',
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
		subscribe: (from, signal) =>
			subscribe(signal, options.handoff === 'resume' ? toPosition(from) : undefined),
		mapItem: (item) => ({ $kind: 'Item', id: itemId(item) }),
		classify(error): ErrorClass {
			if (error instanceof NetworkError) return 'retry';
			if (error instanceof Overflow) return 'disconnect';
			return 'fatal';
		},
	};
}

/** A subscription start as a position: a checkpoint is the boundary before it. */
function toPosition(bound: Bound | undefined): FakePosition | undefined {
	if (!bound) return undefined;
	return 'position' in bound ? bound.position : boundary(bound.checkpoint);
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
