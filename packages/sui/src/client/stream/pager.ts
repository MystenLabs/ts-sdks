// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * The shared pager. Every paged read is one pass of it: finite ranges, descending reads, poll
 * mode, and history before a live handoff on a transport whose subscriptions cannot resume.
 *
 * Page contract (`LedgerStreamAdapter.fetchPage`): a page holds matches in checkpoints
 * `[range.start, range.end)` strictly between the `after` and `before` cursors, in traversal
 * order, as many as the server returns at once. Items are delivered as they arrive; once they are
 * read, `next.more` says whether more remain, and `next.cursor` continues after the page.
 * `covered`, `viewedAt` and `retainedFrom` report what the server knows about its index, when it
 * says.
 *
 * One pass:
 * 1. Translate the bounds. Checkpoints become the range. The start adds its cursor, so the pass
 *    resumes exactly; an end position adds only its checkpoint, and items stop at it by
 *    coordinates (`reachesEnd`).
 * 2. Fetch a page. If the server no longer retains history the pass has yet to read, the pass
 *    fails with `HistoryUnavailable`; this is checked on every page, since retention can move
 *    between them. A server that has not indexed the point the page resumes from ends the pass
 *    incomplete, so the caller retries later instead of skipping items.
 * 3. Deliver items until one reaches the end. While more pages remain, an empty page's cursor is
 *    progress, and the cursor must advance.
 * 4. After the last page, the pass commits the boundary after what it covered, so a quiet range
 *    still moves its resume point, unless it resumed from a progress cursor it cannot place. It is
 *    complete once the index has reached the end.
 */

import type { SuiClientTypes } from '../types.js';
import type { Bound, Coverage, LedgerStreamAdapter, PageEnd, PageRequest } from './adapter.js';
import { SuiStreamError } from './errors.js';
import { boundPosition } from './plan.js';
import {
	assertAdvancing,
	boundaryPosition,
	boundCoverage,
	CoverageTracker,
	indexedThrough,
	nextUncovered,
	progressPosition,
	reachesEnd,
	type StreamPosition,
} from './position.js';
import { sameBytes } from './token.js';

export interface Pass {
	start?: Bound;
	end?: Bound;
	order: SuiClientTypes.Order;
	/** The indexed tip captured when a finite range was planned. */
	capturedTip?: bigint;
	signal: AbortSignal;
}

export type PassEvent<Item> =
	| { $kind: 'Connected' }
	| { $kind: 'Item'; position: StreamPosition; item: Item }
	| { $kind: 'Progress'; position: StreamPosition }
	| { $kind: 'Page'; end: SuiClientTypes.StreamPageEnd; coverage: Coverage };

/**
 * `complete: false`: the index has not reached the end yet. `retentionLimit`: a read toward
 * genesis stopped at the oldest retained checkpoint.
 */
export interface PassResult {
	complete: boolean;
	retentionLimit: boolean;
}

export async function* readPages<Item>(
	adapter: LedgerStreamAdapter<Item, any>,
	pass: Pass,
): AsyncGenerator<PassEvent<Item>, PassResult> {
	const { order, start, end, signal } = pass;
	const ascending = order === 'ascending';
	const family = adapter.family;
	const request: PageRequest = { range: {}, order, signal };
	const [startSide, endSide] = ascending
		? (['after', 'before'] as const)
		: (['before', 'after'] as const);
	if (start) {
		narrow(request, cutAt(boundPosition(start, order), startSide, family), startSide, true);
	}
	const endCut = end && cutAt(boundPosition(end, order), endSide, family);
	if (endCut) narrow(request, endCut, endSide, false);
	// The index must reach the end; an end without a checkpoint must at least reach its coverage.
	const endCovered = endCut && nextUncovered(endCut.coverage);
	const target =
		ascending && endCut
			? (indexedThrough(endCut) ?? (endCovered === undefined ? null : endCovered - 1n))
			: null;

	const tracker = new CoverageTracker(order, family, boundCoverage(start, family));
	// An ascending checkpoint start skips nothing on a lagging server; every other start can.
	let resumesFrom =
		start && (!ascending || 'position' in start) ? boundPosition(start, order) : undefined;
	let previous: StreamPosition | undefined;
	let coverage: Coverage = { $kind: 'Unknown' };
	// Ascending: the oldest checkpoint the pass may still have to read.
	let unread = request.range.start ?? nextUncovered(boundCoverage(start, family));
	const advance = (raw: StreamPosition) => {
		const position = tracker.apply(raw);
		resumesFrom = position;
		coverage = position.coverage;
		const next = nextUncovered(coverage);
		if (next !== undefined && (unread === undefined || next > unread)) unread = next;
		return position;
	};

	// A descending start above the indexed tip would get tokens that skip what is not indexed yet.
	if (!ascending && resumesFrom && !(await startIndexed(resumesFrom))) {
		return { complete: false, retentionLimit: false };
	}

	const resumed = start !== undefined && 'position' in start;
	for (let first = true; ; first = false) {
		const page = await adapter.fetchPage({ ...request, range: { ...request.range } });
		let empty = true;
		let pageEnd: PageEnd;
		try {
			// The first read waits for the server's first answer.
			let read = await page.items.next();
			if (first) yield { $kind: 'Connected' };
			assertRetained(page.retainedFrom, order, request, unread, first, resumed);
			// A server behind the point this page resumes from would silently skip items.
			const needed = resumesFrom && indexedThrough(resumesFrom);
			if (needed != null && page.viewedAt !== undefined && page.viewedAt < needed) {
				return { complete: false, retentionLimit: false };
			}

			for (; !read.done; read = await page.items.next()) {
				const { position: raw, item } = read.value;
				if (endCut && reachesEnd(raw, endCut, order)) {
					yield { $kind: 'Page', end: 'bound', coverage };
					return { complete: true, retentionLimit: false };
				}
				assertAdvancing(previous, raw, order);
				previous = raw;
				empty = false;
				yield { $kind: 'Item', position: advance(raw), item };
			}
			pageEnd = read.value;
		} finally {
			await page.items.return?.();
		}
		const retainedFrom = pageEnd.retainedFrom ?? page.retainedFrom;
		if (pageEnd.retainedFrom !== undefined) {
			// Only a read with no low end may report retention last: no item it delivered is pruned.
			if (ascending || request.range.start !== undefined) {
				throw protocol('Retention reported after the items it applies to');
			}
			assertRetained(pageEnd.retainedFrom, order, request, unread, first, resumed);
		}

		const { more, cursor } = pageEnd.next;
		if (more) {
			if (!cursor) throw protocol('Page has more items but no cursor');
			const sent = ascending ? request.after : request.before;
			if (sent && sameBytes(sent, cursor)) throw protocol('Pagination did not advance');
			if (empty) {
				// A server resuming a descending cursor clamps to its own tip, so the cursor needs at
				// least the index this pass already relied on.
				const relied = !ascending && resumesFrom ? indexedThrough(resumesFrom) : null;
				const raw = progressPosition(cursor, {
					coverage: through(pageEnd.covered),
					indexedCheckpoint: page.viewedAt ?? relied,
				});
				yield { $kind: 'Progress', position: advance(raw) };
			}
			yield { $kind: 'Page', end: 'limit', coverage };
			if (ascending) request.after = cursor;
			else request.before = cursor;
			continue;
		}

		const reached = pageEnd.covered ?? page.viewedAt;
		// An end cursor bounds the page, so coverage stops at the cursor, short of the tip the cursor
		// was read at; the server's own tip says whether it has indexed that far.
		const indexed = endCut?.kind === 'Progress' ? maxOf(pageEnd.covered, page.viewedAt) : reached;
		const complete = target === null || indexed === undefined || indexed >= target;
		// Commit the boundary after what was covered, so a quiet range moves its resume point and a
		// finished range resumes as empty. A descending pass has covered down to a checkpoint end.
		let boundary: bigint | undefined;
		if (ascending && !request.before && !unplaced(resumesFrom)) {
			boundary = boundaryAfter(reached, request, endCut);
		} else if (!ascending && endCut?.kind === 'Boundary') boundary = endCut.checkpoint!;
		if (boundary !== undefined) {
			// Kept where it fits, so a regressing watermark is still caught.
			const covered = pageEnd.covered !== undefined && pageEnd.covered < boundary;
			const raw = boundaryPosition(boundary, {
				coverage: covered ? through(pageEnd.covered) : { $kind: 'Unknown' },
			});
			yield { $kind: 'Progress', position: advance(raw) };
		}
		yield {
			$kind: 'Page',
			end: complete && (end || !ascending) ? 'bound' : 'indexedTip',
			coverage,
		};
		return { complete, retentionLimit: !ascending && !end && (retainedFrom ?? 0n) > 0n };
	}

	async function startIndexed(position: StreamPosition) {
		const needed = indexedThrough(position);
		if (needed === null || (pass.capturedTip !== undefined && pass.capturedTip >= needed)) {
			return true;
		}
		return (await adapter.indexedTip(signal)) >= needed;
	}
}

/**
 * Narrows `request` to the items on one side of a cut. The cursor is used where the pass resumes,
 * or where there is no checkpoint; otherwise a checkpoint bound suffices.
 */
function narrow(
	request: PageRequest,
	cut: StreamPosition,
	side: 'after' | 'before',
	resumes: boolean,
) {
	const { kind, cursor, checkpoint } = cut;
	if (cursor && kind !== 'Boundary' && (resumes || checkpoint === null)) request[side] = cursor;
	if (checkpoint === null) return;
	// Other items of an item's checkpoint can lie on either side of it.
	if (side === 'after') request.range.start = checkpoint;
	else request.range.end = kind === 'Item' ? checkpoint + 1n : checkpoint;
}

/** A checkpoint is delivered whole, so a cut at one is the boundary on its far side. */
function cutAt(
	position: StreamPosition,
	side: 'after' | 'before',
	family: LedgerStreamAdapter<unknown, any>['family'],
): StreamPosition {
	if (family !== 'checkpoints' || position.kind !== 'Item') return position;
	return boundaryPosition(side === 'after' ? position.checkpoint! + 1n : position.checkpoint!);
}

/**
 * A progress cursor with nothing known about where it is: a boundary from the page's tip could sit
 * behind it, so the pass keeps the cursor instead.
 */
function unplaced(position: StreamPosition | undefined): boolean {
	return (
		position?.kind === 'Progress' &&
		position.indexedCheckpoint === null &&
		position.coverage.$kind === 'Unknown'
	);
}

/**
 * The boundary after everything an exhausted ascending page covered, within the range and never
 * past an end item, whose checkpoint may hold more items.
 */
function boundaryAfter(
	reached: bigint | undefined,
	{ range }: PageRequest,
	endCut: StreamPosition | undefined,
): bigint | undefined {
	const limit = endCut?.kind === 'Item' ? endCut.checkpoint! : range.end;
	let boundary = reached === undefined ? limit : reached + 1n;
	if (boundary === undefined) return undefined;
	if (limit !== undefined && boundary > limit) boundary = limit;
	if (range.start !== undefined && boundary < range.start) boundary = range.start;
	return boundary;
}

/**
 * Fails when the server has pruned history the pass still has to read: ascending, anything from
 * the oldest unread checkpoint; descending, the low end of the range, or on the first page a start
 * that is already below retention. A descending read to genesis instead stops at retention, and
 * resuming one exactly at the oldest retained checkpoint has nothing left to read.
 */
function assertRetained(
	retainedFrom: bigint | undefined,
	order: SuiClientTypes.Order,
	{ range }: PageRequest,
	unread: bigint | undefined,
	first: boolean,
	resumed: boolean,
) {
	if (retainedFrom === undefined) return;
	let pruned: bigint | undefined;
	if (order === 'ascending') {
		if (unread !== undefined && unread < retainedFrom) pruned = unread;
	} else if (range.start !== undefined && range.start < retainedFrom) {
		pruned = range.start;
	} else if (
		first &&
		range.end !== undefined &&
		(range.end < retainedFrom || (range.end === retainedFrom && !resumed))
	) {
		pruned = range.end - 1n;
	}
	if (pruned === undefined) return;
	throw new SuiStreamError(
		'HistoryUnavailable',
		`Checkpoint ${pruned} has been pruned; the oldest available is ${retainedFrom}`,
	);
}

function maxOf(a: bigint | undefined, b: bigint | undefined): bigint | undefined {
	if (a === undefined) return b;
	return b === undefined || a > b ? a : b;
}

function through(checkpoint: bigint | undefined): Coverage {
	return checkpoint === undefined ? { $kind: 'Unknown' } : { $kind: 'Through', checkpoint };
}

function protocol(message: string) {
	return new SuiStreamError('Protocol', message);
}
