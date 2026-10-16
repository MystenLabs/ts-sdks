// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ResolvedCheckpointRange } from '../../client/query-filters.js';
import type { Coverage, ScanEvent, ScanRequest } from '../../client/stream/adapter.js';
import {
	assertAdvanced,
	coverageBefore,
	startBeyondTip,
	SuiStreamError,
} from '../../client/stream/index.js';
import type { SuiClientTypes } from '../../client/types.js';
import type { SuiGraphQLClient } from '../client.js';
import { itemEvents, type Connection, type LedgerFamily, type LedgerItem } from './families.js';
import {
	boundaryPosition,
	frontierPosition,
	isBoundary,
	positionCoverage,
	requiredCheckpoint,
	type GraphQLPosition,
} from './position.js';
import type { IndexState } from './query.js';

/** Items per history page. */
export const PAGE_SIZE = 50;
/** GraphQL checkpoint arguments are UInt53. */
const MAX_CHECKPOINT = BigInt(Number.MAX_SAFE_INTEGER);

/** What one scan pass reads: checkpoints `[lower, upper)`, then cursors within them. */
export interface ScanWindow {
	lower: bigint;
	upper: bigint;
	after?: string;
	before?: string;
	/** An ascending scan is complete only once the indexed tip reaches this checkpoint. */
	target?: bigint;
}

type Request = Pick<ScanRequest<GraphQLPosition>, 'start' | 'end' | 'order'>;

/**
 * Turns a scan request into a window over the current index. Pure. Throws `HistoryUnavailable`
 * when the window starts below the oldest retained checkpoint.
 */
export function resolveScanWindow(
	request: Request,
	indexed: IndexState,
	onePerCheckpoint: boolean,
): ScanWindow {
	const ascending = request.order === 'ascending';
	// The low side is where an ascending scan starts and where a descending one ends.
	const low = ascending ? request.start : request.end;
	const high = ascending ? request.end : request.start;
	const window: ScanWindow = { lower: 0n, upper: indexed.tip + 1n };

	if (low && 'position' in low) {
		window.after = low.position.cursor;
		const checkpoint = low.position.checkpoint;
		// A checkpoint or a boundary excludes its whole checkpoint; a transaction or event shares
		// it with the items after it.
		const closesCheckpoint = onePerCheckpoint || isBoundary(low.position);
		if (checkpoint !== null) window.lower = closesCheckpoint ? checkpoint + 1n : checkpoint;
	} else if (low) {
		// An ascending start is inclusive; a descending end is exclusive.
		window.lower = checkpointBound(low) + (ascending ? 0n : 1n);
	}

	if (high && 'position' in high) {
		window.before = high.position.cursor;
		const checkpoint = high.position.checkpoint;
		// Nothing after a boundary's checkpoint lies before it.
		if (checkpoint !== null && isBoundary(high.position) && checkpoint < window.upper) {
			window.upper = checkpoint + 1n;
		}
	} else if (high) {
		// An ascending end is exclusive; a descending start is inclusive.
		const upper = checkpointBound(high) + (ascending ? 0n : 1n);
		if (upper < window.upper) window.upper = upper;
	}

	if (ascending && request.end) {
		window.target =
			'checkpoint' in request.end
				? request.end.checkpoint - 1n
				: (requiredCheckpoint(request.end.position) ?? undefined);
	}

	// A frontier has no checkpoint, so only a checkpoint-anchored low side can be checked.
	const lowIsFrontier = low && 'position' in low && low.position.checkpoint === null;
	if (!lowIsFrontier && indexed.first !== null && window.lower < indexed.first) {
		throw new SuiStreamError(
			'HistoryUnavailable',
			`Checkpoint ${window.lower} has been pruned; the oldest available is ${indexed.first}`,
		);
	}
	return window;
}

/**
 * One scan pass over the index state read for it, paging through the window.
 * @yields `Connected`, then items, frontier progress and a `Page` per page, then exactly one
 * `End`: incomplete while the index is behind the requested end.
 */
export async function* scanLedger<Node>(
	client: SuiGraphQLClient,
	family: LedgerFamily<Node>,
	request: ScanRequest<GraphQLPosition>,
	indexed: IndexState,
): AsyncGenerator<ScanEvent<GraphQLPosition, LedgerItem<Node>>> {
	const { order, start, end, signal } = request;
	const descending = order === 'descending';
	yield { $kind: 'Connected' };

	// Descending, or resuming from a position: wait until the start itself is indexed.
	const resumesFromIndex = start && (descending || 'position' in start);
	if (resumesFromIndex && startBeyondTip(start, indexed.tip, positionCheckpoint)) {
		yield { $kind: 'End', complete: false };
		return;
	}

	const window = resolveScanWindow(request, indexed, family.onePerCheckpoint);
	const complete = window.target === undefined || indexed.tip >= window.target;
	if (window.lower >= window.upper) {
		yield { $kind: 'End', complete };
		return;
	}

	const range = checkpointRange(window, family.onePerCheckpoint);
	const endItem = end && 'position' in end ? end.position : undefined;
	let { after, before } = window;
	let last = start && 'position' in start ? start.position : undefined;
	const coverage = (exhausted: boolean): Coverage => {
		if (descending) return { $kind: 'Unknown' };
		if (exhausted && !window.before) return coverageBefore(window.upper);
		return last ? positionCoverage(last, family.onePerCheckpoint) : { $kind: 'Unknown' };
	};

	while (true) {
		const page = await family.page({
			range,
			...pageCursors(order, PAGE_SIZE, after, before),
			signal,
		});
		if (!page) throw new SuiStreamError('Protocol', `GraphQL ${family.name} connection is missing`);
		const edges = descending ? [...page.edges].reverse() : page.edges;
		for (const event of await itemEvents(client, family, edges, signal)) {
			last = event.position;
			yield event;
		}
		const { more, cursor } = pageEnd(page, order);
		const previous = descending ? before : after;
		// Server quirk: an empty window can answer an empty page that reports more pages but whose
		// cursor is the one sent. Without an end item to probe for, that is the end of the window.
		const stalled = edges.length === 0 && cursor !== null && cursor === previous;

		// The server returned the excluded end item's cursor: the interval is complete.
		if (cursor && cursor === endItem?.cursor) {
			yield { $kind: 'Page', end: 'bound', coverage: coverage(false) };
			yield { $kind: 'End', complete: true };
			return;
		}

		if (!more || (stalled && !endItem?.itemId)) {
			// Where this pass stopped, so the next one (a resume, the next poll or the next wait
			// for a future end) starts there instead of rereading the window.
			const progress = cursor && edges.length === 0 && exhaustedProgress(cursor, window, request);
			if (progress) yield progress;
			yield {
				$kind: 'Page',
				end: end && complete ? 'bound' : 'indexedTip',
				coverage: coverage(true),
			};
			yield { $kind: 'End', complete };
			return;
		}

		if (stalled && endItem?.itemId) {
			const reached = await reachedExcludedEndItem(family, {
				range,
				order,
				from: last?.cursor,
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

		if (edges.length === 0 && (!end || !descending)) yield frontierProgress(cursor, window);
		yield { $kind: 'Page', end: 'limit', coverage: coverage(false) };
		if (descending) before = cursor;
		else after = cursor;
	}
}

/**
 * Some servers return a different opaque cursor for an excluded end item and keep reporting more
 * pages, so the page cursor stops moving. This reads on from the last delivered item without the
 * end bound, one item at a time: the interval is complete exactly when the next item is the
 * excluded end item.
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
	// A descending end item lies on the low side; drop that bound so the probe can reach it.
	const range = descending ? { ...options.range, start: undefined } : options.range;
	let cursor = options.from;
	while (true) {
		const after = descending ? undefined : cursor;
		const before = descending ? cursor : undefined;
		const page = await family.page({ range, ...pageCursors(order, 1, after, before), signal });
		if (!page) return false;
		const next = descending ? page.edges.at(-1) : page.edges[0];
		if (next) return family.identity(next.node) === endItemId;
		const end = pageEnd(page, order);
		if (!end.more || !end.cursor || end.cursor === cursor) return false;
		cursor = end.cursor;
	}
}

/**
 * The filter's checkpoint bounds. `checkpoints(after: <cursor of N>, afterCheckpoint: N)` returns
 * an empty page (a server bug), so with a cursor the lower bound stays one checkpoint behind and
 * that query shape is never sent. An end past UInt53 cannot be sent and is left to the cursor.
 */
function checkpointRange(window: ScanWindow, onePerCheckpoint: boolean): ResolvedCheckpointRange {
	const behind = onePerCheckpoint && window.after !== undefined && window.lower > 0n;
	return {
		start: behind ? window.lower - 1n : window.lower,
		end: window.upper <= MAX_CHECKPOINT ? window.upper : undefined,
	};
}

/**
 * Where a pass that read its whole window stopped without new items. Ascending up to a checkpoint
 * bound or the tip, that is a boundary: every checkpoint below `upper` was read. Otherwise it is a
 * frontier, which only an unbounded descending scan or a cursor-bounded one can use.
 */
function exhaustedProgress(
	cursor: string,
	window: ScanWindow,
	{ order, end }: Pick<ScanRequest<GraphQLPosition>, 'order' | 'end'>,
): Extract<ScanEvent<GraphQLPosition, never>, { $kind: 'Progress' }> | undefined {
	if (order === 'ascending' && !window.before) {
		return { $kind: 'Progress', position: boundaryPosition(cursor, window.upper - 1n) };
	}
	return !end || order === 'ascending' ? frontierProgress(cursor, window) : undefined;
}

/** Where a scan stopped part way, resumable once the index reaches the same tip again. */
function frontierProgress(
	cursor: string,
	window: ScanWindow,
): Extract<ScanEvent<GraphQLPosition, never>, { $kind: 'Progress' }> {
	return { $kind: 'Progress', position: frontierPosition(cursor, window.upper - 1n) };
}

function pageCursors(
	order: SuiClientTypes.Order,
	size: number,
	after: string | undefined,
	before: string | undefined,
) {
	return order === 'descending' ? { last: size, before, after } : { first: size, after, before };
}

/** Whether more pages follow in traversal order, and the cursor to continue from. */
function pageEnd(page: Connection<unknown>, order: SuiClientTypes.Order) {
	const { pageInfo } = page;
	return order === 'descending'
		? { more: pageInfo.hasPreviousPage, cursor: pageInfo.startCursor }
		: { more: pageInfo.hasNextPage, cursor: pageInfo.endCursor };
}

function positionCheckpoint(position: GraphQLPosition) {
	return { checkpoint: requiredCheckpoint(position) };
}

function checkpointBound(bound: { checkpoint: bigint }): bigint {
	// The exclusive end after the largest checkpoint is one past UInt53.
	if (bound.checkpoint > MAX_CHECKPOINT + 1n) {
		throw new SuiStreamError('InvalidOptions', `Checkpoint ${bound.checkpoint} exceeds UInt53`);
	}
	return bound.checkpoint;
}
