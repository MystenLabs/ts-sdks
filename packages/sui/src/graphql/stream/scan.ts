// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ResolvedCheckpointRange } from '../../client/query-filters.js';
import type { Coverage, ScanEvent, ScanRequest } from '../../client/stream/adapter.js';
import {
	assertAdvanced,
	boundaryPosition,
	coverageBefore,
	indexedThrough,
	positionCoverage,
	progressPosition,
	startBeyondTip,
	SuiStreamError,
} from '../../client/stream/index.js';
import type { SuiClientTypes } from '../../client/types.js';
import {
	cursorBytes,
	cursorString,
	itemEvents,
	type Connection,
	type LedgerFamily,
	type LedgerItem,
} from './families.js';

export const PAGE_SIZE = 50;
/** GraphQL checkpoint arguments are UInt53. */
const MAX_CHECKPOINT = BigInt(Number.MAX_SAFE_INTEGER);

/** What a page reports about the index that answered it. */
export interface IndexState {
	/** The oldest retained checkpoint. */
	first: bigint | null;
	tip: bigint;
}

/** Before the first page, nothing about the index is known. */
const UNKNOWN_INDEX: IndexState = { first: null, tip: MAX_CHECKPOINT };

/** Checkpoints `[lower, upper)`, then cursors within them. */
export interface ScanWindow {
	lower: bigint;
	upper: bigint;
	after?: string;
	before?: string;
	/** An ascending scan is complete only once the indexed tip reaches this checkpoint. */
	target?: bigint;
	/** A descending read to genesis that stops at `lower`, the oldest retained checkpoint. */
	retentionLimit?: true;
}

type Request = Pick<ScanRequest, 'start' | 'end' | 'order'>;

/** @throws {SuiStreamError} `HistoryUnavailable` when the window starts below retention. */
export function resolveScanWindow(
	request: Request,
	indexed: IndexState,
	onePerCheckpoint: boolean,
): ScanWindow {
	const ascending = request.order === 'ascending';
	const low = ascending ? request.start : request.end;
	const high = ascending ? request.end : request.start;
	const window: ScanWindow = { lower: 0n, upper: indexed.tip + 1n };

	if (low && 'position' in low && low.position.kind === 'Boundary') {
		window.lower = low.position.checkpoint!;
	} else if (low && 'position' in low) {
		window.after = cursorString(low.position.cursor!);
		const checkpoint = low.position.checkpoint;
		// Other items of a transaction's or event's checkpoint can still follow it.
		if (checkpoint !== null) window.lower = onePerCheckpoint ? checkpoint + 1n : checkpoint;
	} else if (low) {
		window.lower = checkpointBound(low) + (ascending ? 0n : 1n);
	}

	if (high && 'position' in high && high.position.kind === 'Boundary') {
		const upper = high.position.checkpoint!;
		if (upper < window.upper) window.upper = upper;
	} else if (high && 'position' in high) {
		window.before = cursorString(high.position.cursor!);
	} else if (high) {
		const upper = checkpointBound(high) + (ascending ? 0n : 1n);
		if (upper < window.upper) window.upper = upper;
	}

	if (ascending && request.end) {
		window.target =
			'checkpoint' in request.end
				? request.end.checkpoint - 1n
				: (indexedThrough(request.end.position) ?? undefined);
	}

	if (!low) {
		if (indexed.first !== null && indexed.first > 0n) {
			window.lower = indexed.first;
			window.retentionLimit = true;
		}
		return window;
	}
	const lowIsFrontier = 'position' in low && low.position.checkpoint === null;
	if (!lowIsFrontier && indexed.first !== null && window.lower < indexed.first) {
		throw new SuiStreamError(
			'HistoryUnavailable',
			`Checkpoint ${window.lower} has been pruned; the oldest available is ${indexed.first}`,
		);
	}
	return window;
}

/**
 * One scan pass, paging through the window. The first page also reports the indexed tip and the
 * retention, which fix the window for the rest of the pass.
 * @yields `Connected`, then items, progress and a `Page` per page, then one `End`.
 */
export async function* scanLedger<Node>(
	family: LedgerFamily<Node>,
	request: ScanRequest,
): AsyncGenerator<ScanEvent<LedgerItem<Node>>> {
	const { order, start, end, signal } = request;
	const descending = order === 'descending';
	yield { $kind: 'Connected' };

	const requested = resolveScanWindow(request, UNKNOWN_INDEX, family.onePerCheckpoint);
	let page = await family.page({
		range: checkpointRange(requested),
		...pageCursors(order, PAGE_SIZE, requested.after, requested.before),
		signal,
	});
	const indexed = { first: page.retainedFrom, tip: page.viewedAt };

	const resumesFromIndex = start && (descending || 'position' in start);
	if (resumesFromIndex && startBeyondTip(start, indexed.tip)) {
		yield { $kind: 'End', complete: false };
		return;
	}

	const window = resolveScanWindow(request, indexed, family.onePerCheckpoint);
	const reaches = (tip: bigint) => window.target === undefined || tip >= window.target;
	let complete = reaches(indexed.tip);
	const { retentionLimit } = window;
	if (window.lower >= window.upper) {
		// A quiet stream still needs a token before its first match.
		if (!descending && start && 'checkpoint' in start && window.lower > 0n) {
			yield { $kind: 'Progress', position: boundaryPosition(window.lower) };
		}
		yield { $kind: 'End', complete, retentionLimit };
		return;
	}

	const range = checkpointRange(window);
	const endItem =
		end && 'position' in end && end.position.kind === 'Item' ? end.position : undefined;
	const endCursor = endItem?.cursor ? cursorString(endItem.cursor) : undefined;
	let { after, before } = window;
	let last = start && 'position' in start ? start.position : undefined;
	// Load-balanced replicas can lag, so track the lowest checkpoint a page was read at.
	let seen = window.upper - 1n;
	const coverage = (exhausted: boolean): Coverage => {
		if (descending) return { $kind: 'Unknown' };
		if (exhausted && !window.before) return coverageBefore(seen + 1n);
		return last ? positionCoverage(last, family.name) : { $kind: 'Unknown' };
	};

	while (true) {
		// A replica behind this page's start would silently miss items: end and retry later.
		const first = after === window.after && before === window.before;
		const from = descending
			? last
				? indexedThrough(last)
				: window.upper - 1n
			: first && start && 'position' in start
				? indexedThrough(start.position)
				: null;
		if (from !== null && page.viewedAt < from) {
			yield { $kind: 'End', complete: false };
			return;
		}
		if (page.viewedAt < seen) seen = page.viewedAt;
		complete &&= reaches(page.viewedAt);

		const edges = descending ? [...page.edges].reverse() : page.edges;
		for (const event of itemEvents(family, edges)) {
			last = event.position;
			yield event;
		}
		const { more, cursor } = pageEnd(page, order);
		const previous = descending ? before : after;
		// Server quirk: an empty window can report more pages while returning the cursor sent.
		const stalled = edges.length === 0 && cursor !== null && cursor === previous;

		if (cursor && cursor === endCursor) {
			yield { $kind: 'Page', end: 'bound', coverage: coverage(false) };
			yield { $kind: 'End', complete: true };
			return;
		}

		if (!more || (stalled && !endItem?.itemId)) {
			// So the next pass starts here instead of rereading the window.
			const progress = exhaustedProgress(cursor, edges.length > 0, window, seen, request);
			if (progress) yield progress;
			yield {
				$kind: 'Page',
				end: end && complete ? 'bound' : 'indexedTip',
				coverage: coverage(true),
			};
			yield { $kind: 'End', complete, retentionLimit };
			return;
		}

		if (stalled && endItem?.itemId) {
			const reached = await reachedExcludedEndItem(family, {
				range,
				order,
				from: last?.cursor ? cursorString(last.cursor) : undefined,
				endItemId: endItem.itemId,
				signal,
			});
			if (reached) {
				yield { $kind: 'Page', end: 'bound', coverage: coverage(false) };
				yield { $kind: 'End', complete: true };
				return;
			}
		}
		if (!cursor) throw new SuiStreamError('Protocol', 'Pagination did not advance: no cursor');
		assertAdvanced(previous, cursor);

		if (edges.length === 0 && (!end || !descending)) yield frontierProgress(cursor, seen);
		yield { $kind: 'Page', end: 'limit', coverage: coverage(false) };
		if (descending) before = cursor;
		else after = cursor;
		page = await family.page({ range, ...pageCursors(order, PAGE_SIZE, after, before), signal });
	}
}

/**
 * Server quirk: a page bounded by an end item's cursor can stall instead of ending, so read one
 * item past the last delivered one and check whether it is the end item.
 */
async function reachedExcludedEndItem<Node>(
	family: LedgerFamily<Node>,
	options: {
		range: ResolvedCheckpointRange;
		order: SuiClientTypes.Order;
		from: string | undefined;
		endItemId: string;
		signal: AbortSignal;
	},
): Promise<boolean> {
	const { order, endItemId, signal } = options;
	const descending = order === 'descending';
	const range = descending ? { ...options.range, start: undefined } : options.range;
	let cursor = options.from;
	while (true) {
		const after = descending ? undefined : cursor;
		const before = descending ? cursor : undefined;
		const page = await family.page({ range, ...pageCursors(order, 1, after, before), signal });
		const next = descending ? page.edges.at(-1) : page.edges[0];
		if (next) return family.identity(next.node) === endItemId;
		const end = pageEnd(page, order);
		if (!end.more || !end.cursor || end.cursor === cursor) return false;
		cursor = end.cursor;
	}
}

function checkpointRange(window: ScanWindow): ResolvedCheckpointRange {
	return {
		start: window.lower,
		end: window.upper <= MAX_CHECKPOINT ? window.upper : undefined,
	};
}

/** A boundary for ascending checkpoint-bounded reads, otherwise a frontier after an empty page. */
function exhaustedProgress(
	cursor: string | null,
	hadItems: boolean,
	window: ScanWindow,
	seen: bigint,
	{ order, end }: Pick<ScanRequest, 'order' | 'end'>,
): Extract<ScanEvent<never>, { $kind: 'Progress' }> | undefined {
	if (order === 'ascending' && !window.before) {
		return { $kind: 'Progress', position: boundaryPosition(seen + 1n) };
	}
	if (hadItems || !cursor) return undefined;
	return !end || order === 'ascending' ? frontierProgress(cursor, seen) : undefined;
}

function frontierProgress(
	cursor: string,
	seen: bigint,
): Extract<ScanEvent<never>, { $kind: 'Progress' }> {
	return {
		$kind: 'Progress',
		position: progressPosition(cursorBytes(cursor), { indexedCheckpoint: seen }),
	};
}

function pageCursors(
	order: SuiClientTypes.Order,
	size: number,
	after: string | undefined,
	before: string | undefined,
) {
	return order === 'descending' ? { last: size, before, after } : { first: size, after, before };
}

function pageEnd(page: Connection<unknown>, order: SuiClientTypes.Order) {
	const { pageInfo } = page;
	return order === 'descending'
		? { more: pageInfo.hasPreviousPage, cursor: pageInfo.startCursor }
		: { more: pageInfo.hasNextPage, cursor: pageInfo.endCursor };
}

function checkpointBound(bound: { checkpoint: bigint }): bigint {
	if (bound.checkpoint > MAX_CHECKPOINT + 1n) {
		throw new SuiStreamError('InvalidOptions', `Checkpoint ${bound.checkpoint} exceeds UInt53`);
	}
	return bound.checkpoint;
}
